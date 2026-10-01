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

/// ROWLY_ENGINES=mysql,postgres limita la prueba a esos motores.
fn engine_selected(engine: Engine) -> bool {
    match std::env::var("ROWLY_ENGINES") {
        Ok(list) => list.split(',').any(|name| {
            name.trim().eq_ignore_ascii_case(match engine {
                Engine::MySql => "mysql",
                Engine::MariaDb => "mariadb",
                Engine::Postgres => "postgres",
            })
        }),
        Err(_) => true,
    }
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
