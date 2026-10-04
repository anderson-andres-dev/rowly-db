//! El SQL que escribe Rowly DB, ejecutado en servidores reales (SQL_ENGINE G2,
//! D4): cada CALL del autocompletado corre con los argumentos correctos.
//! Necesita tools/test-dbs/up.sh:
//!   cargo test -p rowly-server-tests --test generated -- --ignored --test-threads=1
use rowly_server_tests::*;

// --- Autocompletado: el CALL que escribe se ejecuta tal cual ----------------

/// Procedures con todas las formas de parametro que el autocompletado debe
/// escribir bien: sin parametros, IN implicito, OUT, INOUT, DEFAULT, VARIADIC,
/// sin nombre, tipos con comas, nombres con espacios, guiones, mayusculas y
/// palabras reservadas. (nombre, CREATE, capacidad que necesita).
fn completion_fixtures(engine: Engine) -> Vec<(&'static str, &'static str, Option<&'static str>)> {
    if engine.is_mysql_family() {
        vec![
            ("sim_none", "CREATE PROCEDURE sim_none() BEGIN END", None),
            (
                "sim_in",
                "CREATE PROCEDURE sim_in(IN a INT, IN b VARCHAR(20)) BEGIN SELECT a, b; END",
                None,
            ),
            (
                "sim_implicit",
                "CREATE PROCEDURE sim_implicit(a INT, b DATE) BEGIN END",
                None,
            ),
            (
                "sim_out",
                "CREATE PROCEDURE sim_out(IN a INT, OUT total DECIMAL(10,2)) BEGIN SET total = 1; END",
                None,
            ),
            (
                "sim_inout",
                "CREATE PROCEDURE sim_inout(INOUT counter INT) BEGIN SET counter = 1; END",
                None,
            ),
            (
                "sim_types",
                "CREATE PROCEDURE sim_types(IN e ENUM('a','b'), IN d DECIMAL(8,2), IN s SET('x','y')) BEGIN END",
                None,
            ),
            (
                "Sim Mixto-1",
                "CREATE PROCEDURE `Sim Mixto-1`(IN `Param Uno` INT, OUT `p-dos` INT) BEGIN SET `p-dos` = 1; END",
                None,
            ),
            (
                "SIM_UPPER",
                "CREATE PROCEDURE SIM_UPPER(IN X INT) BEGIN END",
                None,
            ),
            (
                "order",
                "CREATE PROCEDURE `order`(IN `select` INT) BEGIN END",
                None,
            ),
        ]
    } else {
        vec![
            (
                "sim_none",
                "CREATE PROCEDURE rowly_test.sim_none() LANGUAGE sql AS $$ SELECT 1 $$",
                None,
            ),
            (
                "sim_in",
                "CREATE PROCEDURE rowly_test.sim_in(a int, b text) LANGUAGE sql AS $$ SELECT 1 $$",
                None,
            ),
            (
                "sim_out",
                "CREATE PROCEDURE rowly_test.sim_out(a int, OUT total numeric) LANGUAGE plpgsql AS $$ BEGIN total := 1; END $$",
                Some("OUT parameters in procedures"),
            ),
            (
                "sim_inout",
                "CREATE PROCEDURE rowly_test.sim_inout(INOUT counter int) LANGUAGE plpgsql AS $$ BEGIN counter := 1; END $$",
                None,
            ),
            (
                "sim_default",
                "CREATE PROCEDURE rowly_test.sim_default(a int, b int DEFAULT 5) LANGUAGE sql AS $$ SELECT 1 $$",
                None,
            ),
            (
                "sim_unnamed",
                "CREATE PROCEDURE rowly_test.sim_unnamed(int, text) LANGUAGE sql AS $$ SELECT 1 $$",
                None,
            ),
            (
                "sim_variadic",
                "CREATE PROCEDURE rowly_test.sim_variadic(a int, VARIADIC rest int[]) LANGUAGE sql AS $$ SELECT 1 $$",
                None,
            ),
            (
                "sim_types",
                "CREATE PROCEDURE rowly_test.sim_types(d numeric(8,2), t timestamp with time zone, j jsonb) LANGUAGE sql AS $$ SELECT 1 $$",
                None,
            ),
            (
                "Sim Mixto-1",
                r#"CREATE PROCEDURE rowly_test."Sim Mixto-1"("Param Uno" int, OUT "p-dos" int) LANGUAGE plpgsql AS $$ BEGIN "p-dos" := 1; END $$"#,
                Some("OUT parameters in procedures"),
            ),
            (
                "SIM_Mayus",
                r#"CREATE PROCEDURE rowly_test."SIM_Mayus"(x int) LANGUAGE sql AS $$ SELECT 1 $$"#,
                None,
            ),
            (
                "order",
                r#"CREATE PROCEDURE rowly_test."order"("select" int) LANGUAGE sql AS $$ SELECT 1 $$"#,
                None,
            ),
        ]
    }
}

/// El CALL que escribe el autocompletado (app/src/lib/editor/catalogCompletions.ts,
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
            "src/lib/editor/catalogCompletions.server.test.ts",
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
    for engine in selected(Engine::ALL) {
        let conn = Conn::open(engine).await;
        // Lo que la version no tiene es N/A (y el servidor tiene que
        // rechazarlo): ni se crea ni se exige en el autocompletado.
        let mut fixtures = Vec::new();
        for (name, create, needs) in completion_fixtures(engine) {
            let drop = if engine.is_mysql_family() {
                format!("DROP PROCEDURE IF EXISTS `{name}`")
            } else {
                format!("DROP PROCEDURE IF EXISTS rowly_test.\"{name}\"")
            };
            let _ = conn.raw(&drop).await;
            if let Some(capability) = needs {
                match conn.lacks(engine, "G2", capability, create).await {
                    Err(message) => {
                        failures.push(message);
                        continue;
                    }
                    Ok(true) => continue,
                    Ok(false) => {}
                }
            }
            let result = conn.raw(create).await;
            assert!(
                !is_error(&result),
                "{engine:?} {name}: {}",
                error_text(&result)
            );
            fixtures.push((name, create));
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
            // La consola es una sola sesion: el OUT de un CALL anterior
            // queda en su variable. Cada CALL empieza con todas en NULL.
            if engine.is_mysql_family() && !values.is_empty() {
                let reset: Vec<String> = values
                    .iter()
                    .map(|value| format!("{value} = NULL"))
                    .collect();
                let _ = conn.raw(&format!("SET {}", reset.join(", "))).await;
            }
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
