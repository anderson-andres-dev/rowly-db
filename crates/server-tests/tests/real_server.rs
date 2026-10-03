//! Pruebas contra servidores reales (tools/test-dbs/up.sh):
//!   cargo test -p rowly-server-tests -- --ignored --test-threads=1
use rowly_server_tests::*;

struct Entry {
    drop: Option<String>,
    call: Option<String>,
    sql: String,
}

fn parse(entry: &str) -> Entry {
    let mut drop = None;
    let mut call = None;
    let mut body = Vec::new();
    for line in entry.lines() {
        if let Some(rest) = line.strip_prefix("-- drop:") {
            drop = Some(rest.trim().to_string());
        } else if let Some(rest) = line.strip_prefix("-- call:") {
            call = Some(rest.trim().to_string());
        } else {
            body.push(line);
        }
    }
    Entry {
        drop,
        call,
        sql: body.join("\n").trim().to_string(),
    }
}

fn routines_corpus(engine: Engine) -> &'static str {
    match engine {
        Engine::Postgres => include_str!("../corpus/postgres/routines.sql"),
        _ => include_str!("../corpus/mysql/routines.sql"),
    }
}

#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn the_routines_corpus_is_accepted_by_the_guard_and_created_by_every_server() {
    let mut failures = Vec::new();
    for engine in Engine::ALL {
        let conn = Conn::open(engine).await;
        for raw in entries(routines_corpus(engine)) {
            let entry = parse(&raw);
            let head: String = entry
                .sql
                .lines()
                .next()
                .unwrap_or("")
                .chars()
                .take(70)
                .collect();
            if let Some(drop) = &entry.drop {
                match conn.guarded(engine, drop).await {
                    Err(message) => failures.push(format!(
                        "{engine:?} DROP rechazado por el guard: {drop}\n  {message}"
                    )),
                    Ok(result) if is_error(&result) => failures.push(format!(
                        "{engine:?} DROP fallo en el servidor: {drop}\n  {}",
                        error_text(&result)
                    )),
                    Ok(_) => {}
                }
            }
            match conn.guarded(engine, &entry.sql).await {
                Err(message) => {
                    failures.push(format!("{engine:?} el guard rechazo: {head}\n  {message}"))
                }
                Ok(result) if is_error(&result) => failures.push(format!(
                    "{engine:?} el servidor fallo: {head}\n  {}",
                    error_text(&result)
                )),
                Ok(_) => {
                    if let Some(call) = &entry.call {
                        match conn.guarded(engine, call).await {
                            Err(message) => failures
                                .push(format!("{engine:?} CALL rechazado: {call}\n  {message}")),
                            Ok(result) if is_error(&result) => failures.push(format!(
                                "{engine:?} CALL fallo: {call}\n  {}",
                                error_text(&result)
                            )),
                            Ok(_) => {}
                        }
                    }
                }
            }
        }
    }
    assert!(failures.is_empty(), "\n{}\n", failures.join("\n"));
}

async fn rows_of(conn: &Conn, sql: &str) -> Vec<Vec<Option<String>>> {
    match conn.raw(sql).await {
        khipu_driver_core::QueryExecutionResult::ResultSet { rows, .. } => rows,
        other => panic!("se esperaban filas de {sql}: {}", error_text(&other)),
    }
}

/// Las definiciones que el propio servidor devuelve (SHOW CREATE ...,
/// pg_get_functiondef) son el SQL mas real que hay: el guard tiene que
/// aceptar todas, y las que se pueden recrear tienen que ejecutarse.
#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn the_definitions_the_server_returns_for_sakila_and_pagila_are_accepted() {
    let mut failures = Vec::new();
    let mut checked = 0;
    for engine in Engine::ALL {
        let conn = Conn::open(engine).await;
        if engine.is_mysql_family() {
            let routines = rows_of(&conn, "SELECT routine_type, routine_name FROM information_schema.routines WHERE routine_schema = 'sakila'").await;
            assert_eq!(
                routines.len(),
                6,
                "{engine:?}: Sakila trae 3 procedures y 3 funciones"
            );
            for row in routines {
                let (kind, name) = (row[0].clone().unwrap(), row[1].clone().unwrap());
                let shown = rows_of(&conn, &format!("SHOW CREATE {kind} sakila.`{name}`")).await;
                let definition = shown[0][2].clone().unwrap();
                checked += 1;
                if let Err(message) = classification(engine, &definition) {
                    failures.push(format!(
                        "{engine:?} {kind} {name}: el guard rechazo\n  {message}\n{definition}"
                    ));
                    continue;
                }
                // Recrearla en rowly_test (sin el DEFINER original) corre en el servidor.
                let copy = definition.replacen(
                    &format!("`{name}`"),
                    &format!("rowly_test.`rt_{name}`"),
                    1,
                );
                let copy = match copy.find(&kind) {
                    Some(at) => format!("CREATE {}", &copy[at..]),
                    None => copy,
                };
                let _ = conn
                    .raw(&format!("DROP {kind} IF EXISTS rowly_test.`rt_{name}`"))
                    .await;
                match conn.guarded(engine, &copy).await {
                    Err(message) => failures.push(format!(
                        "{engine:?} {kind} {name} (copia): el guard rechazo\n  {message}"
                    )),
                    Ok(result) if is_error(&result) => failures.push(format!(
                        "{engine:?} {kind} {name} (copia): el servidor fallo\n  {}",
                        error_text(&result)
                    )),
                    Ok(_) => {}
                }
                let _ = conn
                    .raw(&format!("DROP {kind} IF EXISTS rowly_test.`rt_{name}`"))
                    .await;
            }
            for row in rows_of(&conn, "SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'sakila'").await {
                let name = row[0].clone().unwrap();
                let shown = rows_of(&conn, &format!("SHOW CREATE TRIGGER sakila.`{name}`")).await;
                let definition = shown[0][2].clone().unwrap();
                checked += 1;
                if let Err(message) = classification(engine, &definition) {
                    failures.push(format!("{engine:?} trigger {name}: el guard rechazo\n  {message}\n{definition}"));
                }
            }
            for row in rows_of(
                &conn,
                "SELECT table_name FROM information_schema.views WHERE table_schema = 'sakila'",
            )
            .await
            {
                let name = row[0].clone().unwrap();
                let shown = rows_of(&conn, &format!("SHOW CREATE VIEW sakila.`{name}`")).await;
                let definition = shown[0][1].clone().unwrap();
                checked += 1;
                if let Err(message) = classification(engine, &definition) {
                    failures.push(format!(
                        "{engine:?} vista {name}: el guard rechazo\n  {}",
                        message.chars().take(110).collect::<String>()
                    ));
                }
            }
        } else {
            let functions = rows_of(&conn, "SELECT pg_get_functiondef(p.oid), p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace JOIN pg_language l ON l.oid = p.prolang WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p') AND l.lanname <> 'c' ORDER BY p.oid").await;
            assert!(functions.len() > 5, "Pagila trae funciones propias");
            for row in functions {
                let (definition, name) = (row[0].clone().unwrap(), row[1].clone().unwrap());
                checked += 1;
                match conn.guarded(engine, &definition).await {
                    Err(message) => failures.push(format!(
                        "{engine:?} funcion {name}: el guard rechazo\n  {message}\n{definition}"
                    )),
                    Ok(result) if is_error(&result) => failures.push(format!(
                        "{engine:?} funcion {name}: el servidor fallo\n  {}",
                        error_text(&result)
                    )),
                    Ok(_) => {}
                }
            }
            for row in rows_of(
                &conn,
                "SELECT pg_get_triggerdef(oid), tgname FROM pg_trigger WHERE NOT tgisinternal",
            )
            .await
            {
                let (definition, name) = (row[0].clone().unwrap(), row[1].clone().unwrap());
                checked += 1;
                if let Err(message) = classification(engine, &definition) {
                    failures.push(format!(
                        "{engine:?} trigger {name}: el guard rechazo\n  {message}\n{definition}"
                    ));
                }
            }
        }
    }
    println!("definiciones reales comprobadas: {checked}");
    assert!(
        failures.is_empty(),
        "\n{} de {checked} fallaron:\n{}\n",
        failures.len(),
        failures.join("\n")
    );
}

/// CALL con un SELECT dentro y SHOW CREATE ... devuelven sus filas (PREPARE no
/// da columnas para ellas); un INSERT sigue siendo un comando.
#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn call_and_show_create_return_their_rows() {
    use khipu_driver_core::QueryExecutionResult::{Command, ResultSet};
    for engine in [Engine::MySql, Engine::MariaDb] {
        let conn = Conn::open(engine).await;
        for sql in [
            "DROP PROCEDURE IF EXISTS rt_sel",
            "CREATE PROCEDURE rt_sel() BEGIN SELECT 1 AS a, 'x' AS b; SELECT 2 AS c; END",
        ] {
            let result = conn.guarded(engine, sql).await.expect("el guard acepta");
            assert!(!is_error(&result), "{engine:?}: {}", error_text(&result));
        }
        match conn.guarded(engine, "CALL rt_sel()").await.unwrap() {
            ResultSet { columns, rows, .. } => {
                assert_eq!(
                    columns.iter().map(|c| c.name.as_str()).collect::<Vec<_>>(),
                    ["a", "b"],
                    "{engine:?}: el primer conjunto"
                );
                assert_eq!(
                    rows,
                    vec![vec![Some("1".to_string()), Some("x".to_string())]]
                );
            }
            other => panic!(
                "{engine:?}: CALL debia devolver filas: {}",
                error_text(&other)
            ),
        }
        for (sql, needle) in [
            ("SHOW CREATE TABLE sakila.actor", "actor_id"),
            (
                "SHOW CREATE PROCEDURE sakila.film_in_stock",
                "film_in_stock",
            ),
            (
                "SHOW CREATE FUNCTION sakila.get_customer_balance",
                "get_customer_balance",
            ),
            ("SHOW CREATE TRIGGER sakila.ins_film", "film"),
            ("SHOW CREATE VIEW sakila.actor_info", "actor_info"),
        ] {
            match conn.guarded(engine, sql).await.unwrap() {
                ResultSet { rows, .. } => {
                    assert_eq!(rows.len(), 1, "{engine:?}: {sql}");
                    assert!(
                        rows[0].iter().flatten().any(|cell| cell.contains(needle)),
                        "{engine:?}: {sql}"
                    );
                }
                other => panic!(
                    "{engine:?}: {sql} debia devolver filas: {}",
                    error_text(&other)
                ),
            }
        }
        match conn
            .guarded(engine, "INSERT INTO log (msg) VALUES ('x')")
            .await
            .unwrap()
        {
            Command { affected_rows, .. } => assert_eq!(affected_rows, 1),
            other => panic!(
                "{engine:?}: un INSERT es un comando: {}",
                error_text(&other)
            ),
        }
        let _ = conn.raw("DROP PROCEDURE IF EXISTS rt_sel").await;
    }
}

// --- Seguridad: lo que el guard acepta, el servidor lo ejecuta como UNA sentencia ---

const PAYLOADS: [&str; 2] = [
    "DROP TABLE rowly_test.victim",
    "DELETE FROM rowly_test.victim",
];

fn attacks_corpus(engine: Engine) -> &'static str {
    match engine {
        Engine::Postgres => include_str!("../corpus/postgres/attacks.sql"),
        _ => include_str!("../corpus/mysql/attacks.sql"),
    }
}

async fn fresh(conn: &Conn, engine: Engine) {
    let cleanup: &[&str] = if engine.is_mysql_family() {
        &[
            "DROP PROCEDURE IF EXISTS atk",
            "DROP FUNCTION IF EXISTS atk",
            "DROP TRIGGER IF EXISTS atk",
            "DROP EVENT IF EXISTS atk",
        ]
    } else {
        &[
            "DROP FUNCTION IF EXISTS rowly_test.atk() CASCADE",
            "DROP RULE IF EXISTS atk ON rowly_test.log",
            "DROP TRIGGER IF EXISTS atk ON rowly_test.log",
        ]
    };
    for sql in cleanup {
        conn.raw(sql).await;
    }
    let drop_victim = if engine.is_mysql_family() {
        "DROP TABLE IF EXISTS rowly_test.victim"
    } else {
        "DROP TABLE IF EXISTS rowly_test.victim CASCADE"
    };
    for sql in [
        drop_victim,
        "CREATE TABLE rowly_test.victim (id int)",
        "INSERT INTO rowly_test.victim VALUES (1)",
    ] {
        let result = conn.raw(sql).await;
        assert!(!is_error(&result), "{sql}: {}", error_text(&result));
    }
}

async fn victim_intact(conn: &Conn) -> bool {
    conn.scalar("SELECT COUNT(*) FROM rowly_test.victim")
        .await
        .as_deref()
        == Some("1")
}

struct Verdict {
    accepted: bool,
    /// El servidor sin la barrera del driver ejecuto algo mas que una sentencia.
    damaged: bool,
    /// Lo mismo, pero por el driver de la app (que prepara antes).
    driver_damaged: bool,
}

/// El guard decide; el texto corre dos veces, cada una con la tabla victima
/// nueva: sin la barrera del driver (la verdad del servidor) y por el driver.
async fn try_text(conn: &Conn, engine: Engine, text: &str) -> Verdict {
    let accepted = classification(engine, text).is_ok();
    fresh(conn, engine).await;
    Conn::multi_statement(engine, text).await;
    let damaged = !victim_intact(conn).await;
    // Por el driver solo hace falta repetirlo si sin barrera hubo dano.
    let mut driver_damaged = false;
    if damaged {
        fresh(conn, engine).await;
        conn.raw(text).await;
        driver_damaged = !victim_intact(conn).await;
    }
    Verdict {
        accepted,
        damaged,
        driver_damaged,
    }
}

#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn no_text_the_guard_accepts_runs_more_than_one_statement_on_the_server() {
    let mut violations = Vec::new();
    for engine in Engine::ALL {
        let conn = Conn::open(engine).await;
        let (mut total, mut accepted, mut dangerous) = (0, 0, 0);
        for template in entries(attacks_corpus(engine)) {
            for payload in PAYLOADS {
                let text = template.replace("{x}", payload);
                let verdict = try_text(&conn, engine, &text).await;
                total += 1;
                accepted += verdict.accepted as usize;
                dangerous += verdict.damaged as usize;
                if verdict.accepted && verdict.damaged {
                    violations.push(format!(
                        "{engine:?}: el guard acepto y el servidor ejecuto la carga:\n{text}"
                    ));
                }
                if verdict.driver_damaged {
                    violations.push(format!(
                        "{engine:?}: el driver dejo pasar una segunda sentencia:\n{text}"
                    ));
                }
            }
        }
        println!(
            "{engine:?}: {total} ataques, {dangerous} peligrosos sin guard, {accepted} aceptados"
        );
        assert!(
            dangerous >= 10,
            "{engine:?}: la prueba no mide nada si casi ningun ataque es peligroso"
        );
    }
    assert!(violations.is_empty(), "\n{}\n", violations.join("\n---\n"));
}

struct Lcg(u64);

impl Lcg {
    fn next(&mut self) -> u64 {
        self.0 = self
            .0
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        self.0 >> 33
    }
    fn below(&mut self, n: usize) -> usize {
        (self.next() % n as u64) as usize
    }
    fn pick<'a>(&mut self, items: &[&'a str]) -> &'a str {
        items[self.below(items.len())]
    }
}

const FRAGMENTS_MYSQL: &[&str] = &[
    "BEGIN",
    "END",
    "END;",
    ";",
    "SELECT 1",
    "SELECT 1 AS begin",
    "begin",
    "end",
    "c.case",
    "c.end",
    "c.then",
    "CASE WHEN a THEN",
    "ELSE 0 END",
    "CASE",
    "IF a THEN",
    "END IF",
    "WHILE a DO",
    "END WHILE",
    "LOOP",
    "END LOOP lbl",
    "REPEAT",
    "UNTIL a",
    "END REPEAT",
    "lbl:",
    "DECLARE x INT",
    "DECLARE EXIT HANDLER FOR SQLEXCEPTION",
    "DECLARE handler INT",
    "RETURN 1",
    "SET a = 1",
    "-- c\n",
    "# c\n",
    "/* c */",
    "/*!",
    "/*!50000",
    "/*M!100000",
    "*/",
    "'",
    "'it\\'s'",
    "\"",
    "`",
    "(",
    ")",
    ",",
    ".",
    ":",
    ":=",
    "THEN",
    "ELSE",
    "DO",
    "UNTIL",
    "ELSEIF b THEN",
    "DELIMITER $$",
    "$$",
];

const FRAGMENTS_PG: &[&str] = &[
    "BEGIN",
    "BEGIN ATOMIC",
    "END",
    ";",
    "SELECT 1",
    "SELECT 1 AS begin",
    "begin",
    "end",
    "CASE WHEN a THEN",
    "ELSE 0 END",
    "$$",
    "$a$",
    "$b$",
    "'",
    "E'\\''",
    "/*",
    "*/",
    "-- c\n",
    "(",
    ")",
    "LANGUAGE sql",
    "AS",
    "RETURN 1",
    "DO",
];

const INJECTIONS: &[&str] = &[
    " ; {x} ; ",
    " ; {x} ",
    " {x} ",
    "\n{x};\n",
    " /*! ; {x} */ ",
    " /*!50000 ; {x} */ ",
    " /*M!100000 ; {x} */ ",
    " -- \n; {x}\n",
    " # \n; {x}\n",
    " END; {x}; ",
    " END; {x}; END ",
    "; {x}; --",
];

fn whitespace_positions(text: &str) -> Vec<usize> {
    text.char_indices()
        .filter(|(_, c)| c.is_whitespace())
        .map(|(at, _)| at)
        .collect()
}

fn mutate(rng: &mut Lcg, text: &str, fragments: &[&str], payload: &str) -> String {
    let mut text = text.to_string();
    for _ in 0..1 + rng.below(3) {
        let positions = whitespace_positions(&text);
        if positions.is_empty() {
            break;
        }
        let at = positions[rng.below(positions.len())];
        match rng.below(5) {
            0 | 1 => text.insert_str(at, &rng.pick(INJECTIONS).replace("{x}", payload)),
            2 => text.insert_str(at, &format!(" {} ", rng.pick(fragments))),
            3 => {
                let end = positions
                    .iter()
                    .copied()
                    .find(|p| *p > at + 1)
                    .unwrap_or(text.len());
                text.replace_range(at..end, "");
            }
            _ => {
                let end = positions
                    .iter()
                    .copied()
                    .find(|p| *p > at + 1)
                    .unwrap_or(text.len());
                let piece = text[at..end].to_string();
                text.insert_str(at, &piece);
            }
        }
    }
    text
}

fn skeletons(engine: Engine) -> Vec<String> {
    let mut list: Vec<String> = entries(routines_corpus(engine))
        .iter()
        .map(|raw| parse(raw).sql)
        .collect();
    list.extend(
        entries(attacks_corpus(engine))
            .iter()
            .map(|raw| raw.replace("{x}", "SELECT 1")),
    );
    list
}

/// Fuzz diferencial: rutinas validas mutadas (cargas insertadas entre
/// palabras, palabras estructurales sueltas, borradas o duplicadas) corren en
/// el servidor real; si el guard las acepto, la tabla victima sigue intacta.
#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn fuzzing_the_guard_against_the_real_servers_finds_no_second_statement() {
    let cases: usize = std::env::var("ROWLY_FUZZ_CASES")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(4000);
    let mut violations = Vec::new();
    let mut coverage = Vec::new();
    for engine in Engine::ALL {
        if !engine_selected(engine) {
            continue;
        }
        let conn = Conn::open(engine).await;
        let bases = skeletons(engine);
        let fragments = if engine.is_mysql_family() {
            FRAGMENTS_MYSQL
        } else {
            FRAGMENTS_PG
        };
        let seed: u64 = std::env::var("ROWLY_FUZZ_SEED")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(0);
        let mut rng = Lcg(0x5eed_u64 ^ engine as u64 ^ seed.wrapping_mul(0x9e37_79b9));
        let (mut accepted, mut dangerous, mut dangerous_and_valid) = (0usize, 0usize, 0usize);
        for _ in 0..cases {
            let base = &bases[rng.below(bases.len())];
            let payload = PAYLOADS[rng.below(PAYLOADS.len())];
            let text = mutate(&mut rng, base, fragments, payload);
            let verdict = try_text(&conn, engine, &text).await;
            accepted += verdict.accepted as usize;
            dangerous += verdict.damaged as usize;
            if verdict.damaged && !verdict.accepted {
                dangerous_and_valid += 1;
            }
            if verdict.accepted && verdict.damaged {
                violations.push(format!(
                    "{engine:?}: aceptado y ejecutado como mas de una sentencia:\n{text}"
                ));
            }
            if verdict.driver_damaged {
                violations.push(format!(
                    "{engine:?}: el driver dejo pasar una segunda sentencia:\n{text}"
                ));
            }
        }
        println!(
            "{engine:?}: {cases} casos, {accepted} aceptados por el guard, {dangerous} peligrosos ({dangerous_and_valid} rechazados a tiempo)"
        );
        coverage.push((engine, dangerous, accepted));
    }
    assert!(
        violations.is_empty(),
        "\n{} violaciones:\n{}\n",
        violations.len(),
        violations
            .iter()
            .take(12)
            .cloned()
            .collect::<Vec<_>>()
            .join("\n---\n")
    );
    for (engine, dangerous, accepted) in coverage {
        assert!(
            dangerous > 30,
            "{engine:?}: el fuzz no genera suficientes casos peligrosos ({dangerous})"
        );
        assert!(
            accepted > 100,
            "{engine:?}: el fuzz no genera suficientes casos aceptados ({accepted})"
        );
    }
}

/// El SQL que los servidores reales devuelven o aceptan: rutinas, triggers y
/// vistas de Sakila y Pagila, y el corpus propio.
async fn real_sql(engine: Engine, conn: &Conn) -> Vec<(String, String)> {
    let mut found = Vec::new();
    for raw in entries(routines_corpus(engine)) {
        let entry = parse(&raw);
        let name: String = entry
            .sql
            .lines()
            .next()
            .unwrap_or("")
            .chars()
            .take(60)
            .collect();
        found.push((format!("corpus: {name}"), entry.sql));
    }
    if engine.is_mysql_family() {
        for row in rows_of(conn, "SELECT routine_type, routine_name FROM information_schema.routines WHERE routine_schema = 'sakila'").await {
            let (kind, name) = (row[0].clone().unwrap(), row[1].clone().unwrap());
            let shown = rows_of(conn, &format!("SHOW CREATE {kind} sakila.`{name}`")).await;
            found.push((format!("{kind} {name}"), shown[0][2].clone().unwrap()));
        }
        for row in rows_of(
            conn,
            "SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'sakila'",
        )
        .await
        {
            let name = row[0].clone().unwrap();
            let shown = rows_of(conn, &format!("SHOW CREATE TRIGGER sakila.`{name}`")).await;
            found.push((format!("trigger {name}"), shown[0][2].clone().unwrap()));
        }
        for row in rows_of(
            conn,
            "SELECT table_name FROM information_schema.views WHERE table_schema = 'sakila'",
        )
        .await
        {
            let name = row[0].clone().unwrap();
            let shown = rows_of(conn, &format!("SHOW CREATE VIEW sakila.`{name}`")).await;
            found.push((format!("vista {name}"), shown[0][1].clone().unwrap()));
        }
    } else {
        for row in rows_of(conn, "SELECT pg_get_functiondef(p.oid), p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace JOIN pg_language l ON l.oid = p.prolang WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p') AND l.lanname <> 'c' ORDER BY p.oid").await {
            found.push((format!("funcion {}", row[1].clone().unwrap()), row[0].clone().unwrap()));
        }
        for row in rows_of(
            conn,
            "SELECT pg_get_triggerdef(oid), tgname FROM pg_trigger WHERE NOT tgisinternal",
        )
        .await
        {
            found.push((
                format!("trigger {}", row[1].clone().unwrap()),
                row[0].clone().unwrap(),
            ));
        }
        for row in rows_of(conn, "SELECT 'CREATE VIEW ' || viewname || ' AS ' || definition, viewname FROM pg_views WHERE schemaname = 'public'").await {
            found.push((format!("vista {}", row[1].clone().unwrap()), row[0].clone().unwrap()));
        }
    }
    found
}

/// "Analizador impecable": nada de lo que un servidor real acepta puede salir
/// marcado como error en el editor.
#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn the_analyzer_marks_nothing_in_sql_the_real_servers_accept() {
    let mut false_positives = Vec::new();
    let mut checked = 0;
    for engine in Engine::ALL {
        let conn = Conn::open(engine).await;
        for (name, sql) in real_sql(engine, &conn).await {
            checked += 1;
            let found = khipu_engine::diagnostics::analyze_statement(&sql, engine.dialect(), None);
            if !found.is_empty() {
                false_positives.push(format!(
                    "{engine:?} {name}: {:?}\n{}",
                    found.iter().take(2).collect::<Vec<_>>(),
                    sql.chars().take(400).collect::<String>()
                ));
            }
        }
    }
    println!("textos comprobados: {checked}");
    assert!(
        false_positives.is_empty(),
        "\n{} falsos positivos de {checked}:\n{}\n",
        false_positives.len(),
        false_positives.join("\n---\n")
    );
}

fn is_syntax_error(result: &khipu_driver_core::QueryExecutionResult) -> bool {
    let text = error_text(result);
    text.contains("\"1064\"") || text.contains("\"42601\"")
}

fn mixed_statements(text: &str) -> Vec<String> {
    let value: serde_json::Value = serde_json::from_str(text).expect("fixture JSON");
    value["statements"]
        .as_array()
        .expect("statements")
        .iter()
        .map(|statement| statement.as_str().expect("texto").to_string())
        .collect()
}

/// Las consolas mezcladas del corpus compartido (las que prueba el divisor):
/// cada sentencia que el divisor entrega debe aceptarla el guard, y las que
/// no dependen de usuarios ni archivos del entorno corren en el servidor.
#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn the_mixed_console_corpus_runs_through_guard_and_server() {
    let fixtures = [
        (
            Engine::MySql,
            include_str!("../../engine/tests/corpus/mixed/mysql.json"),
        ),
        (
            Engine::MariaDb,
            include_str!("../../engine/tests/corpus/mixed/mysql.json"),
        ),
        (
            Engine::MariaDb,
            include_str!("../../engine/tests/corpus/mixed/mariadb.json"),
        ),
        (
            Engine::Postgres,
            include_str!("../../engine/tests/corpus/mixed/postgres.json"),
        ),
    ];
    // Necesitan algo que el entorno no tiene (usuarios, archivos, variables).
    let environment = [
        "GRANT ",
        "REVOKE ",
        "CREATE USER",
        "LOAD DATA",
        "PREPARE ",
        "EXECUTE ",
        "DEALLOCATE ",
        "CREATE EXTENSION",
        "CREATE POLICY",
        "COPY ",
    ];
    let mut failures = Vec::new();
    for (engine, text) in fixtures {
        let conn = Conn::open(engine).await;
        let setup: &[&str] = if engine.is_mysql_family() {
            &["DROP DATABASE IF EXISTS core", "CREATE DATABASE core"]
        } else {
            &["DROP SCHEMA IF EXISTS audit CASCADE", "CREATE SCHEMA audit"]
        };
        for sql in setup {
            let result = conn.raw(sql).await;
            assert!(
                !is_error(&result) || sql.starts_with("DROP"),
                "{sql}: {}",
                error_text(&result)
            );
        }
        for statement in mixed_statements(text) {
            let head: String = statement
                .chars()
                .take(70)
                .collect::<String>()
                .replace('\n', " ");
            match conn.guarded(engine, &statement).await {
                Err(message) => {
                    failures.push(format!("{engine:?} el guard rechazo: {head}\n  {message}"))
                }
                // Un objeto que falta o un permiso son del entorno; el servidor no
                // debe encontrar errores de SINTAXIS (1064 / 42601).
                Ok(result)
                    if is_error(&result)
                        && is_syntax_error(&result)
                        && !environment
                            .iter()
                            .any(|prefix| statement.starts_with(prefix)) =>
                {
                    failures.push(format!(
                        "{engine:?} error de sintaxis en el servidor: {head}\n  {}",
                        error_text(&result)
                    ));
                }
                Ok(_) => {}
            }
        }
    }
    assert!(failures.is_empty(), "\n{}\n", failures.join("\n"));
}

/// Con NO_BACKSLASH_ESCAPES el servidor corta las cadenas en otro sitio: el
/// guard, avisado del modo, tiene que leer el texto como el servidor.
#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh; cambia el sql_mode global y lo restaura"]
async fn the_guard_reads_strings_like_a_server_in_no_backslash_escapes_mode() {
    use khipu_engine::execution_guard::GuardOptions;
    let templates = [
        "SELECT '\\'; {x}; --'",
        "SELECT '\\' , '\\'; {x}; --'",
        "SELECT 'a\\'; {x}; SELECT '\\'",
        "DELETE FROM rowly_test.canary WHERE note = '\\'; {x}; --'",
        "SELECT \"\\\"; {x}; --\"",
        "SELECT 1 /*!50000 ; {x} ; SELECT '\\' */",
    ];
    let mut failures = Vec::new();
    for engine in [Engine::MySql, Engine::MariaDb] {
        let mode_on = NoBackslashEscapes::on(engine);
        let conn = mode_on.open().await;
        let mode = conn
            .scalar("SELECT @@SESSION.sql_mode")
            .await
            .unwrap_or_default();
        assert!(
            mode.contains("NO_BACKSLASH_ESCAPES"),
            "{engine:?}: el modo no se aplico: {mode}"
        );
        let (mut dangerous, mut missed_without_option) = (0, 0);
        for template in templates {
            for payload in PAYLOADS {
                let text = template.replace("{x}", payload);
                fresh(&conn, engine).await;
                Conn::multi_statement(engine, &text).await;
                let damaged = !victim_intact(&conn).await;
                dangerous += damaged as usize;
                let aware = classification_with(
                    engine,
                    &text,
                    GuardOptions {
                        no_backslash_escapes: true,
                    },
                )
                .is_ok();
                let unaware = classification_with(engine, &text, GuardOptions::default()).is_ok();
                if damaged && aware {
                    failures.push(format!("{engine:?}: avisado del modo, el guard acepto un texto que ejecuta la carga:\n{text}"));
                }
                if damaged && unaware {
                    missed_without_option += 1;
                }
            }
        }
        drop(conn);
        drop(mode_on);
        println!(
            "{engine:?}: {dangerous} peligrosos en este modo, {missed_without_option} que el guard sin aviso habria dejado pasar"
        );
        assert!(
            dangerous > 0,
            "{engine:?}: la prueba no mide nada si ninguno es peligroso"
        );
        assert!(
            missed_without_option > 0,
            "{engine:?}: sin el aviso del modo, el guard debia equivocarse en alguno (la prueba mide el aviso)"
        );
    }
    assert!(failures.is_empty(), "\n{}\n", failures.join("\n---\n"));
}

// --- Destructividad: lo que daña datos no puede pasar como NotDestructive ---

const SCRATCH: &str = "rowly_test.scratch";

async fn fresh_scratch(conn: &Conn, engine: Engine) {
    let drop = if engine.is_mysql_family() {
        format!("DROP TABLE IF EXISTS {SCRATCH}")
    } else {
        format!("DROP TABLE IF EXISTS {SCRATCH} CASCADE")
    };
    for sql in [
        drop,
        format!("CREATE TABLE {SCRATCH} (id int, c int)"),
        format!("INSERT INTO {SCRATCH} VALUES (1, 1), (2, 2), (3, 3)"),
    ] {
        let result = conn.raw(&sql).await;
        assert!(!is_error(&result), "{sql}: {}", error_text(&result));
    }
}

/// Filas, columna y valores como estaban: (3 filas, suma de c = 6).
async fn scratch_intact(conn: &Conn) -> bool {
    let rows = conn
        .scalar(&format!("SELECT COUNT(id) FROM {SCRATCH}"))
        .await;
    let sum = conn.scalar(&format!("SELECT SUM(c) FROM {SCRATCH}")).await;
    rows.as_deref() == Some("3") && sum.as_deref().map(|s| s.trim_end_matches(".0")) == Some("6")
}

#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn what_damages_data_never_passes_as_not_destructive() {
    // REPLACE, INSERT ... ON DUPLICATE y MERGE cambian filas por clave, como
    // un upsert: no son "destructivos" para el producto, y no se miden aqui.
    use khipu_engine::execution_guard::DestructiveClassification::NotDestructive;
    let common = [
        "DROP TABLE {t}",
        "DROP TABLE IF EXISTS {t}",
        "DELETE FROM {t}",
        "TRUNCATE {t}",
        "TRUNCATE TABLE {t}",
        "UPDATE {t} SET c = 0",
        "ALTER TABLE {t} DROP COLUMN c",
        "ALTER TABLE {t} DROP COLUMN IF EXISTS c",
        "WITH x AS (SELECT 1) DELETE FROM {t}",
        "WITH x AS (SELECT 1) UPDATE {t} SET c = 0",
    ];
    let mysql = [
        "DROP TABLES {t}",
        "DROP TEMPORARY TABLES IF EXISTS zz_nada, {t}",
        "/*!40101 DROP TABLES {t} */",
        "/*!50000 DROP TABLE {t} */",
        "DELETE FROM {t} LIMIT 10",
        "DELETE FROM {t} ORDER BY id LIMIT 10",
        "DELETE {t} FROM {t}",
        "DELETE FROM {t} /*!99999 WHERE id = 1 */",
        "DELETE FROM {t} WHERE 1 = 1 /*!50000 AND id = 99 */",
        "UPDATE {t} SET c = 0 LIMIT 3",
        "UPDATE {t} SET c = 0 ORDER BY id",
        "UPDATE IGNORE {t} SET c = 0",
        "ALTER TABLE {t} DROP c",
        "ALTER IGNORE TABLE {t} DROP COLUMN c",
        "ALTER ONLINE TABLE {t} DROP COLUMN c",
        "ALTER TABLE {t} ENGINE=InnoDB, DROP COLUMN c",
        "TRUNCATE TABLE {t}; ",
    ];
    let mariadb = [
        "DELETE FROM {t} RETURNING *",
        "DELETE HISTORY FROM {t}",
        "TRUNCATE {t}",
    ];
    let postgres = [
        "DROP TABLE {t} CASCADE",
        "DELETE FROM ONLY {t}",
        "DELETE FROM {t} RETURNING *",
        "TRUNCATE {t} CASCADE",
        "TRUNCATE {t} RESTART IDENTITY",
        "WITH d AS (DELETE FROM {t} RETURNING *) SELECT count(*) FROM d",
        "WITH u AS (UPDATE {t} SET c = 0 RETURNING *) SELECT count(*) FROM u",
        "UPDATE {t} SET c = 0 RETURNING *",
        "DO $$ BEGIN DELETE FROM {t}; END $$",
        "DO $$ BEGIN DROP TABLE {t}; END $$",
        "DO $$ BEGIN EXECUTE 'delete from {t}'; END $$",
        "DO $$ BEGIN TRUNCATE {t}; END $$",
        "DO $$ BEGIN UPDATE {t} SET c = 0; END $$",
        "ALTER TABLE {t} DROP COLUMN c CASCADE",
    ];
    let mut failures = Vec::new();
    let mut damaging = 0;
    for engine in Engine::ALL {
        let conn = Conn::open(engine).await;
        let mut templates: Vec<&str> = common.to_vec();
        match engine {
            Engine::MySql => templates.extend(mysql),
            Engine::MariaDb => {
                templates.extend(mysql);
                templates.extend(mariadb);
            }
            Engine::Postgres => templates.extend(postgres),
        }
        for template in templates {
            let text = template.replace("{t}", SCRATCH);
            fresh_scratch(&conn, engine).await;
            let verdict = classification(engine, &text);
            // Lo que la app ejecutaria sin confirmar es lo que el guard deja pasar.
            if !matches!(verdict, Ok(NotDestructive)) {
                continue;
            }
            conn.raw(&text).await;
            if !scratch_intact(&conn).await {
                damaging += 1;
                failures.push(format!("{engine:?}: dano sin confirmacion: {text}"));
            }
        }
    }
    println!("sentencias que daban dano y pasaban como no destructivas: {damaging}");
    assert!(failures.is_empty(), "\n{}\n", failures.join("\n"));
}

fn valid_corpus(engine: Engine) -> &'static str {
    match engine {
        Engine::Postgres => include_str!("../corpus/postgres/valid.sql"),
        _ => include_str!("../corpus/mysql/valid.sql"),
    }
}

/// DDL y DML corrientes, autovalidados: cada sentencia corre bien en el
/// servidor real, asi que ni el guard ni el analizador pueden objetarla.
#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn common_valid_ddl_and_dml_is_never_objected_to() {
    // Dependen de la conexion del pool (transaccion, bloqueo) y no de la sintaxis.
    let per_connection = [
        "SAVEPOINT",
        "ROLLBACK TO",
        "BEGIN",
        "COMMIT",
        "LOCK TABLES",
        "UNLOCK TABLES",
        "SET LOCAL",
        "START TRANSACTION",
    ];
    let mut failures = Vec::new();
    let mut checked = 0;
    for engine in Engine::ALL {
        let conn = Conn::open(engine).await;
        let scope = if engine.is_mysql_family() {
            "core"
        } else {
            "valid_test"
        };
        let setup: &[&str] = if engine.is_mysql_family() {
            &["DROP DATABASE IF EXISTS core", "CREATE DATABASE core"]
        } else {
            &[
                "DROP SCHEMA IF EXISTS valid_test CASCADE",
                "CREATE SCHEMA valid_test",
            ]
        };
        for sql in setup {
            let result = conn.raw(sql).await;
            assert!(!is_error(&result), "{sql}: {}", error_text(&result));
        }
        for mut template in entries(valid_corpus(engine)) {
            // Cabeceras: `-- only: mysql|mariadb` y `-- no-exec`.
            let mut execute = true;
            while let Some(line) = template.lines().next().filter(|l| l.starts_with("-- ")) {
                if let Some(only) = line.strip_prefix("-- only:") {
                    let wanted = only.trim();
                    if (wanted == "mysql") != (engine == Engine::MySql)
                        && (wanted == "mariadb") != (engine == Engine::MariaDb)
                    {
                        template.clear();
                        break;
                    }
                } else if line == "-- no-exec" {
                    execute = false;
                } else {
                    break;
                }
                template = template.lines().skip(1).collect::<Vec<_>>().join("\n");
            }
            if template.is_empty() {
                continue;
            }
            let sql = template.replace("{s}", scope);
            let head: String = sql.chars().take(90).collect::<String>().replace('\n', " ");
            checked += 1;
            if let Err(message) = classification(engine, &sql) {
                failures.push(format!("{engine:?} el guard rechazo: {head}\n  {message}"));
            }
            let found = khipu_engine::diagnostics::analyze_statement(&sql, engine.dialect(), None);
            if !found.is_empty() {
                failures.push(format!(
                    "{engine:?} el analizador marco: {head}\n  {:?}",
                    found
                        .iter()
                        .take(2)
                        .map(|d| (d.start, &d.message))
                        .collect::<Vec<_>>()
                ));
            }
            if !execute {
                continue;
            }
            let result = conn.raw(&sql).await;
            if is_error(&result) && !per_connection.iter().any(|prefix| sql.starts_with(prefix)) {
                failures.push(format!(
                    "{engine:?} el SERVIDOR rechazo (el corpus esta mal): {head}\n  {}",
                    error_text(&result)
                ));
            }
        }
    }
    println!("sentencias comprobadas: {checked}");
    assert!(
        failures.is_empty(),
        "\n{} problemas de {checked}:\n{}\n",
        failures.len(),
        failures.join("\n")
    );
}

// --- Autocompletado: el CALL que escribe se ejecuta tal cual ----------------

/// Procedures con todas las formas de parametro que el autocompletado debe
/// escribir bien: sin parametros, IN implicito, OUT, INOUT, DEFAULT, VARIADIC,
/// sin nombre, tipos con comas, nombres con espacios, guiones, mayusculas y
/// palabras reservadas. (nombre, CREATE).
fn completion_fixtures(engine: Engine) -> Vec<(&'static str, &'static str)> {
    if engine.is_mysql_family() {
        vec![
            ("sim_none", "CREATE PROCEDURE sim_none() BEGIN END"),
            (
                "sim_in",
                "CREATE PROCEDURE sim_in(IN a INT, IN b VARCHAR(20)) BEGIN SELECT a, b; END",
            ),
            (
                "sim_implicit",
                "CREATE PROCEDURE sim_implicit(a INT, b DATE) BEGIN END",
            ),
            (
                "sim_out",
                "CREATE PROCEDURE sim_out(IN a INT, OUT total DECIMAL(10,2)) BEGIN SET total = 1; END",
            ),
            (
                "sim_inout",
                "CREATE PROCEDURE sim_inout(INOUT counter INT) BEGIN SET counter = 1; END",
            ),
            (
                "sim_types",
                "CREATE PROCEDURE sim_types(IN e ENUM('a','b'), IN d DECIMAL(8,2), IN s SET('x','y')) BEGIN END",
            ),
            (
                "Sim Mixto-1",
                "CREATE PROCEDURE `Sim Mixto-1`(IN `Param Uno` INT, OUT `p-dos` INT) BEGIN SET `p-dos` = 1; END",
            ),
            (
                "SIM_UPPER",
                "CREATE PROCEDURE SIM_UPPER(IN X INT) BEGIN END",
            ),
            (
                "order",
                "CREATE PROCEDURE `order`(IN `select` INT) BEGIN END",
            ),
        ]
    } else {
        vec![
            (
                "sim_none",
                "CREATE PROCEDURE rowly_test.sim_none() LANGUAGE sql AS $$ SELECT 1 $$",
            ),
            (
                "sim_in",
                "CREATE PROCEDURE rowly_test.sim_in(a int, b text) LANGUAGE sql AS $$ SELECT 1 $$",
            ),
            (
                "sim_out",
                "CREATE PROCEDURE rowly_test.sim_out(a int, OUT total numeric) LANGUAGE plpgsql AS $$ BEGIN total := 1; END $$",
            ),
            (
                "sim_inout",
                "CREATE PROCEDURE rowly_test.sim_inout(INOUT counter int) LANGUAGE plpgsql AS $$ BEGIN counter := 1; END $$",
            ),
            (
                "sim_default",
                "CREATE PROCEDURE rowly_test.sim_default(a int, b int DEFAULT 5) LANGUAGE sql AS $$ SELECT 1 $$",
            ),
            (
                "sim_unnamed",
                "CREATE PROCEDURE rowly_test.sim_unnamed(int, text) LANGUAGE sql AS $$ SELECT 1 $$",
            ),
            (
                "sim_variadic",
                "CREATE PROCEDURE rowly_test.sim_variadic(a int, VARIADIC rest int[]) LANGUAGE sql AS $$ SELECT 1 $$",
            ),
            (
                "sim_types",
                "CREATE PROCEDURE rowly_test.sim_types(d numeric(8,2), t timestamp with time zone, j jsonb) LANGUAGE sql AS $$ SELECT 1 $$",
            ),
            (
                "Sim Mixto-1",
                r#"CREATE PROCEDURE rowly_test."Sim Mixto-1"("Param Uno" int, OUT "p-dos" int) LANGUAGE plpgsql AS $$ BEGIN "p-dos" := 1; END $$"#,
            ),
            (
                "SIM_Mayus",
                r#"CREATE PROCEDURE rowly_test."SIM_Mayus"(x int) LANGUAGE sql AS $$ SELECT 1 $$"#,
            ),
            (
                "order",
                r#"CREATE PROCEDURE rowly_test."order"("select" int) LANGUAGE sql AS $$ SELECT 1 $$"#,
            ),
        ]
    }
}

/// El CALL que escribe el autocompletado (app/src/lib/sqlCatalogCompletions.ts,
/// via su test .server) para cada procedure de `schemas`.
fn completion_calls(
    engine: Engine,
    default_schema: &str,
    schemas: &[khipu_driver_core::SchemaObjects],
) -> Vec<(String, String)> {
    let driver = match engine {
        Engine::MySql => "mysql",
        Engine::MariaDb => "mariadb",
        Engine::Postgres => "postgres",
    };
    let dir = std::env::temp_dir().join(format!("rowly-completion-{driver}"));
    std::fs::create_dir_all(&dir).unwrap();
    let input = dir.join("in.json");
    let output = dir.join("out.json");
    let _ = std::fs::remove_file(&output);
    let request = serde_json::json!({
        "driver": driver,
        "defaultSchema": default_schema,
        "schemas": schemas,
    });
    std::fs::write(&input, request.to_string()).unwrap();
    let app = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../app");
    let run = std::process::Command::new("npx")
        .args([
            "vitest",
            "run",
            "src/lib/sqlCatalogCompletions.server.test.ts",
        ])
        .current_dir(app)
        .env("ROWLY_ROUTINES_IN", &input)
        .env("ROWLY_ROUTINES_OUT", &output)
        .output()
        .expect("npx vitest");
    assert!(
        run.status.success(),
        "vitest fallo:\n{}",
        String::from_utf8_lossy(&run.stdout)
    );
    let calls: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(&output).unwrap()).unwrap();
    calls
        .as_array()
        .unwrap()
        .iter()
        .map(|call| {
            (
                call["label"].as_str().unwrap().to_string(),
                call["call"].as_str().unwrap().to_string(),
            )
        })
        .collect()
}

/// Los argumentos del CALL: lo que hay entre sus parentesis, separado por
/// comas (los campos llevan el nombre del parametro).
fn call_arguments(call: &str) -> (&str, Vec<&str>) {
    let close = call.rfind(')').expect("el CALL lleva parentesis");
    let open = call[..close].rfind('(').unwrap();
    let inside = &call[open + 1..close];
    let args = if inside.is_empty() {
        Vec::new()
    } else {
        inside.split(", ").collect()
    };
    (&call[..open], args)
}

#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn completion_calls_run_on_the_real_servers() {
    let mut failures = Vec::new();
    let mut checked = 0;
    for engine in Engine::ALL {
        if !engine_selected(engine) {
            continue;
        }
        let conn = Conn::open(engine).await;
        let fixtures = completion_fixtures(engine);
        for (name, create) in &fixtures {
            let drop = if engine.is_mysql_family() {
                format!("DROP PROCEDURE IF EXISTS `{name}`")
            } else {
                format!("DROP PROCEDURE IF EXISTS rowly_test.\"{name}\"")
            };
            let _ = conn.raw(&drop).await;
            let result = conn.raw(create).await;
            assert!(
                !is_error(&result),
                "{engine:?} {name}: {}",
                error_text(&result)
            );
        }
        // MySQL: las de prueba en la base actual y Sakila en otra (con su
        // schema delante). Postgres: las de prueba fuera del schema actual.
        let (default_schema, other) = if engine.is_mysql_family() {
            ("rowly_test", "sakila")
        } else {
            ("public", "rowly_test")
        };
        let schemas = vec![
            conn.introspect(default_schema).await,
            conn.introspect(other).await,
        ];
        let calls = completion_calls(engine, default_schema, &schemas);
        let fixture_label = |label: &str| {
            let name = label.rsplit_once('.').map_or(label, |(_, name)| name);
            fixtures.iter().any(|(fixture, _)| *fixture == name)
        };
        for (fixture, _) in &fixtures {
            if !calls.iter().any(|(label, _)| label.ends_with(fixture)) {
                failures.push(format!("{engine:?}: el autocompletado no ofrece {fixture}"));
            }
        }
        for (label, call) in &calls {
            if !fixture_label(label) && !label.starts_with("sakila.") {
                continue;
            }
            checked += 1;
            let found = khipu_engine::diagnostics::analyze_statement(call, engine.dialect(), None);
            if !found.is_empty() {
                failures.push(format!(
                    "{engine:?} el analizador marco: {call}\n  {found:?}"
                ));
            }
            let (head, args) = call_arguments(call);
            let values: Vec<String> = (0..args.len())
                .map(|index| {
                    if engine.is_mysql_family() {
                        format!("@sim_{index}")
                    } else {
                        "NULL".to_string()
                    }
                })
                .collect();
            let runnable = format!("{head}({})", values.join(", "));
            match conn.guarded(engine, &runnable).await {
                Err(message) => failures.push(format!(
                    "{engine:?} el guard rechazo: {runnable}\n  {message}"
                )),
                Ok(result) if is_error(&result) => failures.push(format!(
                    "{engine:?} el servidor rechazo: {call}\n  como {runnable}\n  {}",
                    error_text(&result)
                )),
                Ok(_) => {}
            }
            // Control: con un argumento menos el servidor lo rechaza (si no,
            // la prueba no distinguiria una lista mal hecha). Salvo que el
            // ultimo tenga DEFAULT.
            let routine_name = label
                .rsplit_once('.')
                .map_or(label.as_str(), |(_, name)| name);
            let has_default = schemas
                .iter()
                .flat_map(|objects| &objects.routines)
                .any(|routine| {
                    routine.name == routine_name
                        && routine
                            .parameters
                            .iter()
                            .any(|parameter| parameter.has_default)
                });
            if !values.is_empty() && !has_default {
                let short = format!("{head}({})", values[..values.len() - 1].join(", "));
                if let Ok(result) = conn.guarded(engine, &short).await {
                    if !is_error(&result) {
                        failures.push(format!("{engine:?} el control no fallo: {short}"));
                    }
                }
            }
        }
        for (name, _) in &fixtures {
            let drop = if engine.is_mysql_family() {
                format!("DROP PROCEDURE IF EXISTS `{name}`")
            } else {
                format!("DROP PROCEDURE IF EXISTS rowly_test.\"{name}\"")
            };
            let _ = conn.raw(&drop).await;
        }
    }
    println!("CALL comprobados: {checked}");
    assert!(
        failures.is_empty(),
        "\n{} problemas de {checked}:\n{}\n",
        failures.len(),
        failures.join("\n")
    );
}

// --- Escribir sin ruido: a medio escribir solo se ve lo que ya es un error ---

/// Consultas de todos los dias sobre Sakila (MySQL/MariaDB) y Pagila
/// (Postgres), que comparten las tablas.
fn everyday_queries(engine: Engine) -> Vec<&'static str> {
    let mut queries = vec![
        "SELECT a.first_name, a.last_name FROM actor a WHERE a.actor_id = 1",
        "SELECT f.title, c.name FROM film f JOIN film_category fc ON fc.film_id = f.film_id JOIN category c ON c.category_id = fc.category_id WHERE f.length > 100 ORDER BY f.title LIMIT 10",
        "SELECT customer_id, COUNT(*) AS total FROM rental GROUP BY customer_id HAVING COUNT(*) > 30",
        "INSERT INTO actor (first_name, last_name) VALUES ('ANA', 'PEREZ')",
        "UPDATE customer SET active = 0 WHERE customer_id = 5",
        "DELETE FROM payment WHERE payment_id = 1",
        "SELECT * FROM film WHERE film_id IN (SELECT film_id FROM inventory WHERE store_id = 1)",
        "WITH t AS (SELECT customer_id, SUM(amount) AS s FROM payment GROUP BY customer_id) SELECT * FROM t WHERE s > 100",
        "SELECT CASE WHEN length > 120 THEN 'larga' ELSE 'corta' END AS tipo FROM film",
        "SELECT c.first_name FROM customer c LEFT JOIN address ad ON ad.address_id = c.address_id WHERE ad.district = 'Texas'",
    ];
    queries.push(if engine.is_mysql_family() {
        "CALL film_in_stock(1, 1, @n)"
    } else {
        "SELECT * FROM film_in_stock(1, 1)"
    });
    queries
}

/// Lo que app/src/lib/editor/analysisSession.ts cuenta como "sin terminar".
const UNFINISHED_KEYS: [&str; 7] = [
    "diagnostic.incomplete",
    "diagnostic.unclosedParen",
    "diagnostic.unclosedCase",
    "diagnostic.unterminatedString",
    "diagnostic.unterminatedIdentifier",
    "diagnostic.unterminatedDollarQuote",
    "diagnostic.unterminatedComment",
];
const UNRESOLVED_KEYS: [&str; 4] = [
    "diagnostic.unknownTable",
    "diagnostic.unknownColumn",
    "diagnostic.unknownColumnAny",
    "diagnostic.unknownQualifier",
];
/// Los genericos de sqlparser (`VAGUE_KEYS` del editor), mas los que no
/// traducimos: con el cursor al final de la sentencia no se muestran.
const VAGUE_KEYS: [&str; 6] = [
    "diagnostic.unexpected",
    "diagnostic.expected",
    "diagnostic.expectedStatement",
    "diagnostic.expectedExpression",
    "diagnostic.expectedIdentifier",
    "diagnostic.expectedClose",
];
const UNFINISHED_AT_END_KEYS: [&str; 3] = [
    "diagnostic.trailingComma",
    "diagnostic.extraComma",
    "diagnostic.missingValue",
];

fn char_offset(text: &str, position: khipu_engine::diagnostics::Position) -> usize {
    let mut line = 1;
    let mut column = 1;
    for (index, character) in text.chars().enumerate() {
        if line == position.line && column == position.column {
            return index;
        }
        if character == '\n' {
            line += 1;
            column = 1;
        } else {
            column += 1;
        }
    }
    text.chars().count()
}

/// Lo que el editor mostraria con el cursor al final de `prefix` mientras se
/// escribe (app/src/lib/sqlDiagnostics.ts, whileTyping).
fn shown_while_typing(
    prefix: &str,
    found: &[khipu_engine::diagnostics::Diagnostic],
) -> Vec<String> {
    let chars: Vec<char> = prefix.chars().collect();
    let head = chars.len();
    found
        .iter()
        .filter_map(|diagnostic| {
            let (key, vague) = match &diagnostic.message {
                khipu_engine::diagnostics::DiagnosticMessage::Key { key, .. } => {
                    (key.as_str(), VAGUE_KEYS.contains(&key.as_str()))
                }
                khipu_engine::diagnostics::DiagnosticMessage::Raw(text) => (text.as_str(), true),
            };
            let from = char_offset(prefix, diagnostic.start);
            let to = char_offset(prefix, diagnostic.end).min(head);
            let rest_blank = chars[to..].iter().all(|c| c.is_whitespace());
            // El cursor siempre esta al final de la sentencia.
            let hidden = vague
                || UNFINISHED_KEYS.contains(&key)
                || UNRESOLVED_KEYS.contains(&key)
                || (UNFINISHED_AT_END_KEYS.contains(&key) && rest_blank)
                || (from <= head && rest_blank);
            (!hidden).then(|| format!("{key} {:?}", diagnostic.message))
        })
        .collect()
}

#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn typing_real_sql_shows_nothing_that_is_only_unfinished() {
    let mut noise: std::collections::BTreeMap<String, (usize, String)> = Default::default();
    let mut checked = 0;
    for engine in Engine::ALL {
        if !engine_selected(engine) {
            continue;
        }
        let conn = Conn::open(engine).await;
        let schema = if engine.is_mysql_family() {
            "sakila"
        } else {
            "public"
        };
        let tables: Vec<khipu_engine::catalog::CatalogTable> = conn
            .introspect(schema)
            .await
            .tables
            .into_iter()
            .map(|table| khipu_engine::catalog::CatalogTable {
                schema: table.schema,
                name: table.name,
                columns: table
                    .columns
                    .into_iter()
                    .map(|column| khipu_engine::catalog::CatalogColumn {
                        name: column.name,
                        data_type: column.data_type,
                        nullable: column.nullable,
                        is_primary_key: column.is_primary_key,
                        comment: column.comment,
                    })
                    .collect(),
                foreign_keys: Vec::new(),
            })
            .collect();
        let view = khipu_engine::diagnostics::CatalogView {
            tables: &tables,
            loaded_schemas: vec![schema],
            default_schema: schema,
            created: Vec::new(),
        };
        // Las de todos los dias, letra por letra y con el catalogo; el SQL
        // real de rutinas, vistas y triggers, palabra por palabra.
        let mut texts: Vec<(
            String,
            Option<&khipu_engine::diagnostics::CatalogView>,
            bool,
        )> = everyday_queries(engine)
            .into_iter()
            .map(|sql| (sql.to_string(), Some(&view), true))
            .collect();
        texts.extend(
            real_sql(engine, &conn)
                .await
                .into_iter()
                .map(|(_, sql)| (sql, None, false)),
        );
        for (sql, catalog, by_char) in &texts {
            let chars: Vec<char> = sql.chars().collect();
            for end in 1..chars.len() {
                // Todo letra por letra para buscar panicos; el ruido de los
                // textos largos, al terminar cada palabra.
                let count_noise = *by_char || chars[end].is_whitespace();
                let prefix: String = chars[..end].iter().collect();
                checked += 1;
                // Un panico no corta la prueba: se anota con su texto y se sigue.
                let analyzed = std::panic::catch_unwind(|| {
                    khipu_engine::diagnostics::analyze_statement(
                        &prefix,
                        engine.dialect(),
                        *catalog,
                    )
                });
                let Ok(found) = analyzed else {
                    let entry = noise
                        .entry(format!("{engine:?} PANICO"))
                        .or_insert((0, String::new()));
                    entry.0 += 1;
                    if entry.1.len() < 2000 {
                        let tail: Vec<char> = prefix.chars().collect();
                        let tail: String = tail[tail.len().saturating_sub(70)..].iter().collect();
                        entry.1.push_str(&format!("\n    …{tail:?}"));
                    }
                    continue;
                };
                if !count_noise {
                    continue;
                }
                for shown in shown_while_typing(&prefix, &found) {
                    let key = format!("{engine:?} {}", shown.split(' ').next().unwrap());
                    let entry = noise.entry(key).or_insert((0, String::new()));
                    entry.0 += 1;
                    if entry.1.is_empty() {
                        entry.1 = format!("{prefix}|\n    {shown}");
                    }
                }
            }
        }
    }
    println!("prefijos comprobados: {checked}");
    for (key, (count, example)) in &noise {
        println!(
            "{key}: {count}\n  {}",
            example.chars().take(400).collect::<String>()
        );
    }
    assert!(noise.is_empty(), "{} tipos de ruido", noise.len());
}
