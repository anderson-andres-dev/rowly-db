//! El analizador y el divisor contra SQL real (SQL_ENGINE A1, A3, A4, D2): lo
//! que los servidores aceptan no se marca, las consolas mezcladas se parten
//! como en el servidor y a medio escribir solo se ve lo que ya es un error.
//! Necesita tools/test-dbs/up.sh:
//!   cargo test -p rowly-server-tests --test analysis -- --ignored --test-threads=1
use rowly_server_tests::*;

#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn the_routines_corpus_is_accepted_by_the_guard_and_created_by_every_server() {
    let mut failures = Vec::new();
    for engine in selected(Engine::ALL) {
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
            if let Some(name) = &entry.needs {
                match conn.lacks(engine, "A1", name, &entry.sql).await {
                    Err(message) => {
                        failures.push(message);
                        continue;
                    }
                    // N/A en esta version; el guard la acepta igual.
                    Ok(true) => {
                        if let Err(message) = classification(engine, &entry.sql) {
                            failures
                                .push(format!("{engine:?} el guard rechazo: {head}\n  {message}"));
                        }
                        continue;
                    }
                    Ok(false) => {}
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

/// La definicion de la fila de un SHOW CREATE. NULL quiere decir que el
/// usuario de prueba no puede ver el cuerpo: es el entorno, no el motor.
fn shown_definition(shown: &[Vec<Option<String>>], column: usize) -> String {
    let row = shown.first().expect("SHOW CREATE sin filas");
    row[column].clone().unwrap_or_else(|| {
        panic!(
            "SHOW CREATE devolvio la definicion NULL de {:?}: el usuario de prueba no puede ver el cuerpo (permisos de tools/test-dbs/up.sh)",
            row.first().cloned().flatten()
        )
    })
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
    for engine in selected(Engine::ALL) {
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
                let definition = shown_definition(&shown, 2);
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
                let definition = shown_definition(&shown, 2);
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
                let definition = shown_definition(&shown, 1);
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
    for engine in selected([Engine::MySql, Engine::MariaDb]) {
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
            found.push((format!("{kind} {name}"), shown_definition(&shown, 2)));
        }
        for row in rows_of(
            conn,
            "SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'sakila'",
        )
        .await
        {
            let name = row[0].clone().unwrap();
            let shown = rows_of(conn, &format!("SHOW CREATE TRIGGER sakila.`{name}`")).await;
            found.push((format!("trigger {name}"), shown_definition(&shown, 2)));
        }
        for row in rows_of(
            conn,
            "SELECT table_name FROM information_schema.views WHERE table_schema = 'sakila'",
        )
        .await
        {
            let name = row[0].clone().unwrap();
            let shown = rows_of(conn, &format!("SHOW CREATE VIEW sakila.`{name}`")).await;
            found.push((format!("vista {name}"), shown_definition(&shown, 1)));
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
    for engine in selected(Engine::ALL) {
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

/// Las sentencias del fixture, cada una con la capacidad que necesita: la
/// clave opcional `needs` da pares `[comienzo de la sentencia, capacidad]`, y
/// cada comienzo tiene que encontrar exactamente una sentencia.
fn mixed_statements(text: &str) -> Vec<(String, Option<String>)> {
    let value: serde_json::Value = serde_json::from_str(text).expect("fixture JSON");
    let statements: Vec<String> = value["statements"]
        .as_array()
        .expect("statements")
        .iter()
        .map(|statement| statement.as_str().expect("texto").to_string())
        .collect();
    let mut needs: Vec<Option<String>> = vec![None; statements.len()];
    for pair in value["needs"].as_array().into_iter().flatten() {
        let (start, name) = (pair[0].as_str().unwrap(), pair[1].as_str().unwrap());
        let found: Vec<usize> = (0..statements.len())
            .filter(|&at| statements[at].starts_with(start))
            .collect();
        assert_eq!(
            found.len(),
            1,
            "needs «{start}»: {} sentencias",
            found.len()
        );
        needs[found[0]] = Some(name.to_string());
    }
    statements.into_iter().zip(needs).collect()
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
            include_str!("../../../tests/sql/mysql/common/mixed.json"),
        ),
        (
            Engine::MariaDb,
            include_str!("../../../tests/sql/mysql/common/mixed.json"),
        ),
        (
            Engine::MariaDb,
            include_str!("../../../tests/sql/mariadb/common/mixed.json"),
        ),
        (
            Engine::Postgres,
            include_str!("../../../tests/sql/postgres/common/mixed.json"),
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
    for (engine, text) in fixtures
        .into_iter()
        .filter(|(engine, _)| engine_selected(*engine))
    {
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
        for (statement, needs) in mixed_statements(text) {
            let head: String = statement
                .chars()
                .take(70)
                .collect::<String>()
                .replace('\n', " ");
            if let Some(name) = &needs {
                match conn.lacks(engine, "A1", name, &statement).await {
                    Err(message) => {
                        failures.push(message);
                        continue;
                    }
                    Ok(true) => {
                        if let Err(message) = classification(engine, &statement) {
                            failures
                                .push(format!("{engine:?} el guard rechazo: {head}\n  {message}"));
                        }
                        continue;
                    }
                    Ok(false) => {}
                }
            }
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

fn valid_corpus(engine: Engine) -> &'static str {
    match engine {
        Engine::Postgres => include_str!("../../../tests/sql/postgres/common/valid.sql"),
        _ => include_str!("../../../tests/sql/mysql/common/valid.sql"),
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
    for engine in selected(Engine::ALL) {
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
            // Cabeceras: `-- only: mysql|mariadb`, `-- no-exec` y
            // `-- needs: <capacidad>`.
            let mut execute = true;
            let mut needs = None;
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
                } else if let Some(name) = line.strip_prefix("-- needs:") {
                    needs = Some(name.trim().to_string());
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
            if let Some(name) = &needs {
                match conn.lacks(engine, "A1", name, &sql).await {
                    Err(message) => {
                        failures.push(message);
                        continue;
                    }
                    Ok(true) => continue,
                    Ok(false) => {}
                }
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
/// escribe (app/src/lib/editor/diagnostics.ts, whileTyping).
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
    for engine in selected(Engine::ALL) {
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
