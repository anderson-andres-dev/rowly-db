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
