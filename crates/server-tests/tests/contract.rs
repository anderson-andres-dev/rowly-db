//! Contrato de los drivers contra servidores reales (SQL_ENGINE §6.4: D1,
//! D3, D5), por la API publica que usa la app (`DbConnector`), en cada
//! version exacta de tools/test-dbs/lines.json:
//!   cargo test -p rowly-server-tests --test contract -- --ignored --test-threads=1
use khipu_driver_core::{
    ConnectionErrorKind, DbConnector, DriverError, ParameterMode, QueryExecutionOptions,
    QueryExecutionResult, RelationKind, RoutineKind, TlsMode,
};
use rowly_server_tests::*;

const OPTIONS: QueryExecutionOptions = QueryExecutionOptions { max_rows: 1000 };

async fn connector(engine: Engine) -> Box<dyn DbConnector> {
    // Comprueba la version declarada y deja la evidencia.
    let _ = Conn::open(engine).await;
    engine
        .connector(&engine.config_with_tls(TlsMode::Disabled))
        .await
        .unwrap_or_else(|error| panic!("{engine:?}: {error}"))
}

async fn run(connector: &dyn DbConnector, sql: &str) -> QueryExecutionResult {
    connector.execute_query(sql, OPTIONS).await
}

/// Ejecuta y exige que el servidor lo acepte.
async fn ok(engine: Engine, connector: &dyn DbConnector, sql: &str) {
    let result = run(connector, sql).await;
    assert!(
        !is_error(&result),
        "{engine:?}: {sql}\n  {}",
        error_text(&result)
    );
}

fn rows(engine: Engine, result: QueryExecutionResult) -> Vec<Vec<Option<String>>> {
    match result {
        QueryExecutionResult::ResultSet { rows, .. } => rows,
        other => panic!("{engine:?}: se esperaban filas: {other:?}"),
    }
}

// --- D1: resultados, NULL, tipos, truncado, DDL y errores ------------------

#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn connects_and_lists_schemas_and_tables() {
    for engine in selected(Engine::ALL) {
        let connector = connector(engine).await;
        let schemas = connector.list_schemas().await.expect("list_schemas");
        let schema = if engine.is_mysql_family() {
            "sakila"
        } else {
            "public"
        };
        assert!(
            schemas.iter().any(|name| name == schema),
            "{engine:?}: falta {schema} en {schemas:?}"
        );
        let tables = connector.list_tables(schema).await.expect("list_tables");
        assert!(
            tables.iter().any(|table| table.name == "actor"),
            "{engine:?}: falta actor en {schema}"
        );
        for table in &tables {
            assert_eq!(table.schema, schema);
        }
    }
}

#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn a_result_set_keeps_values_and_nulls() {
    for engine in selected(Engine::ALL) {
        let connector = connector(engine).await;
        let sql = if engine.is_mysql_family() {
            "SELECT 1 AS id, 'Anderson' AS name, NULL AS email"
        } else {
            "SELECT 1 AS id, 'Anderson'::text AS name, NULL::text AS email"
        };
        match run(connector.as_ref(), sql).await {
            QueryExecutionResult::ResultSet {
                columns,
                rows,
                row_count,
                truncated,
                ..
            } => {
                assert_eq!(columns.len(), 3, "{engine:?}");
                assert_eq!(row_count, 1, "{engine:?}");
                assert!(!truncated, "{engine:?}");
                assert_eq!(rows[0][1].as_deref(), Some("Anderson"), "{engine:?}");
                assert_eq!(rows[0][2], None, "{engine:?}");
            }
            other => panic!("{engine:?}: se esperaban filas: {other:?}"),
        }
    }
}

/// Truncar en `max_rows` no deja nada a medias: las consultas siguientes del
/// mismo driver devuelven su resultado completo (en MySQL y MariaDB, el
/// limite de la sesion vuelve a su valor; en PostgreSQL, la conexion de la
/// consola con muchas filas pendientes se cierra en vez de descargarlas, y la
/// siguiente sentencia abre otra: la sesion cambia y se nota en
/// `console_epoch`).
#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn truncating_leaves_the_next_queries_complete() {
    for engine in selected(Engine::ALL) {
        let connector = connector(engine).await;
        let series = |n: u32| {
            if engine.is_mysql_family() {
                format!(
                    "WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < {n}) SELECT n FROM s"
                )
            } else {
                format!("SELECT n FROM generate_series(1, {n}) AS n")
            }
        };
        let few_and_many: &[u32] = if engine.is_mysql_family() {
            &[900]
        } else {
            &[900, 1_000_000]
        };
        for &pending in few_and_many {
            let epoch = connector.console_epoch();
            let truncated = connector
                .execute_query(&series(pending), QueryExecutionOptions { max_rows: 2 })
                .await;
            assert!(
                matches!(
                    truncated,
                    QueryExecutionResult::ResultSet {
                        row_count: 2,
                        truncated: true,
                        ..
                    }
                ),
                "{engine:?} con {pending} filas: {truncated:?}"
            );
            // Varias veces: el pool devuelve la conexion recien liberada.
            for _ in 0..3 {
                match run(connector.as_ref(), &series(900)).await {
                    QueryExecutionResult::ResultSet {
                        row_count,
                        truncated,
                        ..
                    } => {
                        assert_eq!(row_count, 900, "{engine:?} tras truncar {pending}");
                        assert!(!truncated, "{engine:?} tras truncar {pending}");
                    }
                    other => panic!("{engine:?} tras truncar {pending}: {other:?}"),
                }
            }
            // La primera sentencia abre la consola (epoch 1). Mas filas
            // pendientes de las que se descargan: se cerro y se abrio otra.
            let expected = epoch.max(1) + if pending > 100_000 { 2 } else { 0 };
            assert_eq!(
                connector.console_epoch(),
                expected,
                "{engine:?} tras truncar {pending}"
            );
        }
    }
}

#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn ddl_returns_a_command() {
    for engine in selected(Engine::ALL) {
        let connector = connector(engine).await;
        let result = run(
            connector.as_ref(),
            "CREATE TEMPORARY TABLE khipu_execute_query_smoke (id INT)",
        )
        .await;
        assert!(
            matches!(result, QueryExecutionResult::Command { .. }),
            "{engine:?}: {result:?}"
        );
    }
}

#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn a_server_error_keeps_its_code_and_position() {
    for engine in selected(Engine::ALL) {
        let connector = connector(engine).await;
        match run(
            connector.as_ref(),
            "SELECT * FROM this_table_does_not_exist",
        )
        .await
        {
            QueryExecutionResult::Error { code, position, .. } => {
                assert!(code.is_some(), "{engine:?}: sin codigo");
                // MySQL y MariaDB no informan la posicion; PostgreSQL si.
                if engine == Engine::Postgres {
                    assert!(position.is_some(), "{engine:?}: sin posicion");
                }
            }
            other => panic!("{engine:?}: se esperaba un error: {other:?}"),
        }
    }
}

/// La sesion queda como la del servidor, no como la deja sqlx: en MySQL y
/// MariaDB, la collation, la zona y el sql_mode (comparar un literal con una
/// columna utf8mb4_0900_ai_ci no puede dar el error 1267); en PostgreSQL, la
/// zona horaria (sqlx manda UTC).
#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn the_session_keeps_the_server_defaults() {
    for engine in selected(Engine::ALL) {
        let connector = connector(engine).await;
        let checks: &[&str] = match engine {
            Engine::MySql => &[
                "SELECT @@collation_connection, @@default_collation_for_utf8mb4",
                "SELECT @@session.time_zone, @@global.time_zone",
                "SELECT @@session.sql_mode, @@global.sql_mode",
            ],
            Engine::MariaDb => &[
                "SELECT @@collation_connection, DEFAULT_COLLATE_NAME FROM information_schema.CHARACTER_SETS WHERE CHARACTER_SET_NAME = 'utf8mb4'",
                "SELECT @@session.time_zone, @@global.time_zone",
                "SELECT @@session.sql_mode, @@global.sql_mode",
            ],
            Engine::Postgres => {
                &["SELECT current_setting('TimeZone'), current_setting('log_timezone')"]
            }
        };
        for sql in checks {
            let row = rows(engine, run(connector.as_ref(), sql).await).remove(0);
            assert_eq!(row[0], row[1], "{engine:?}: {sql}");
        }
    }
}

/// La consola corre en una sola conexion: lo que una sentencia deja en la
/// sesion (una variable, una tabla temporal, una transaccion, el sql_mode)
/// vale para las siguientes, aunque entre medio el catalogo use el pool.
#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn the_console_keeps_its_session_between_statements() {
    for engine in selected(Engine::ALL) {
        let connector = connector(engine).await;
        let (set, read) = if engine.is_mysql_family() {
            ("SET @rowly_console = 'sigue'", "SELECT @rowly_console")
        } else {
            (
                "SET application_name = 'sigue'",
                "SELECT current_setting('application_name')",
            )
        };
        ok(engine, connector.as_ref(), set).await;
        let epoch = connector.console_epoch();
        ok(
            engine,
            connector.as_ref(),
            "CREATE TEMPORARY TABLE rowly_console_tmp (id INT)",
        )
        .await;
        ok(engine, connector.as_ref(), "BEGIN").await;
        ok(
            engine,
            connector.as_ref(),
            "INSERT INTO rowly_console_tmp VALUES (1)",
        )
        .await;
        // El catalogo, en el pool, no toca la sesion de la consola.
        connector
            .introspect_schema(engine.scope())
            .await
            .unwrap_or_else(|error| panic!("{engine:?}: {error}"));
        let inside = rows(
            engine,
            run(connector.as_ref(), "SELECT COUNT(*) FROM rowly_console_tmp").await,
        );
        assert_eq!(inside[0][0].as_deref(), Some("1"), "{engine:?}");
        ok(engine, connector.as_ref(), "ROLLBACK").await;
        for _ in 0..3 {
            let row = rows(engine, run(connector.as_ref(), read).await).remove(0);
            assert_eq!(row[0].as_deref(), Some("sigue"), "{engine:?}");
            let count = rows(
                engine,
                run(connector.as_ref(), "SELECT COUNT(*) FROM rowly_console_tmp").await,
            );
            assert_eq!(count[0][0].as_deref(), Some("0"), "{engine:?}: el ROLLBACK");
        }
        if engine.is_mysql_family() {
            ok(
                engine,
                connector.as_ref(),
                "SET SESSION sql_mode = CONCAT(@@SESSION.sql_mode, ',NO_BACKSLASH_ESCAPES')",
            )
            .await;
            let mode = rows(
                engine,
                run(connector.as_ref(), "SELECT @@SESSION.sql_mode").await,
            );
            assert!(
                mode[0][0]
                    .as_deref()
                    .unwrap_or_default()
                    .contains("NO_BACKSLASH_ESCAPES"),
                "{engine:?}: {mode:?}"
            );
        }
        assert_eq!(connector.console_epoch(), epoch, "{engine:?}");
    }
}

/// Los literales del grid guardan el texto tal cual con la regla de la sesion
/// que los ejecuta. Con la del motor en una sesion con NO_BACKSLASH_ESCAPES
/// se guardaba otro texto (`C:\\x` en vez de `C:\x`): la prueba lo mide.
#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn grid_literals_follow_the_session_mode() {
    use khipu_engine::editing::{
        CellValue, ColumnValue, ResultChanges, RowUpdate, build_change_statements,
    };
    let text = "C:\\x\\ty 'q'";
    for engine in selected([Engine::MySql, Engine::MariaDb]) {
        let connector = connector(engine).await;
        ok(
            engine,
            connector.as_ref(),
            "CREATE TEMPORARY TABLE rowly_grid_tmp (id INT PRIMARY KEY, note VARCHAR(40))",
        )
        .await;
        ok(
            engine,
            connector.as_ref(),
            "INSERT INTO rowly_grid_tmp VALUES (1, '')",
        )
        .await;
        for no_backslash_escapes in [false, true] {
            if no_backslash_escapes {
                ok(
                    engine,
                    connector.as_ref(),
                    "SET SESSION sql_mode = CONCAT(@@SESSION.sql_mode, ',NO_BACKSLASH_ESCAPES')",
                )
                .await;
            }
            for escapes in [true, false] {
                let changes = ResultChanges {
                    updates: vec![RowUpdate {
                        key: vec![ColumnValue {
                            column: "id".into(),
                            data_type: "int".into(),
                            value: CellValue::Text("1".into()),
                        }],
                        set: vec![ColumnValue {
                            column: "note".into(),
                            data_type: "varchar".into(),
                            value: CellValue::Text(text.into()),
                        }],
                    }],
                    ..Default::default()
                };
                let sql = build_change_statements(
                    engine.dialect(),
                    escapes,
                    None,
                    "rowly_grid_tmp",
                    &changes,
                )
                .remove(0);
                ok(engine, connector.as_ref(), sql.trim_end_matches(';')).await;
                let stored = rows(
                    engine,
                    run(connector.as_ref(), "SELECT note FROM rowly_grid_tmp").await,
                )
                .remove(0)
                .remove(0);
                // Solo la regla de la sesion guarda el texto escrito.
                assert_eq!(
                    stored.as_deref() == Some(text),
                    escapes != no_backslash_escapes,
                    "{engine:?} NO_BACKSLASH_ESCAPES={no_backslash_escapes}, escapes={escapes}: {sql} -> {stored:?}"
                );
            }
        }
    }
}

// --- D3: la introspeccion clasifica cada tipo de objeto --------------------

#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn introspection_classifies_every_object_kind() {
    for engine in selected(Engine::ALL) {
        let connector = connector(engine).await;
        if engine.is_mysql_family() {
            mysql_family_objects(engine, connector.as_ref()).await;
        } else {
            postgres_objects(engine, connector.as_ref()).await;
        }
    }
}

async fn mysql_family_objects(engine: Engine, connector: &dyn DbConnector) {
    // `core`: la base de trabajo del usuario de prueba (seed de up.sh).
    const SCHEMA: &str = "core";
    for sql in [
        format!("DROP DATABASE IF EXISTS {SCHEMA}"),
        format!("CREATE DATABASE {SCHEMA}"),
        format!(
            "CREATE TABLE {SCHEMA}.customers (id INT PRIMARY KEY, email VARCHAR(100) NOT NULL, UNIQUE KEY uq_email (email))"
        ),
        format!(
            "CREATE TABLE {SCHEMA}.orders (id INT, line INT, customer_id INT, total DECIMAL(10,2), \
             PRIMARY KEY (id, line), KEY idx_total (total), \
             CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES {SCHEMA}.customers (id), \
             CONSTRAINT chk_total CHECK (total >= 0))"
        ),
        format!(
            "CREATE VIEW {SCHEMA}.big_orders AS SELECT id, total FROM {SCHEMA}.orders WHERE total > 100"
        ),
        format!(
            "CREATE TRIGGER {SCHEMA}.orders_bi BEFORE INSERT ON {SCHEMA}.orders FOR EACH ROW SET NEW.total = COALESCE(NEW.total, 0)"
        ),
        format!(
            "CREATE PROCEDURE {SCHEMA}.purge(IN p_before INT, OUT p_count INT) SET p_count = p_before"
        ),
        format!("CREATE FUNCTION {SCHEMA}.twice(p INT) RETURNS INT DETERMINISTIC RETURN p * 2"),
        format!("CREATE EVENT {SCHEMA}.nightly ON SCHEDULE EVERY 1 DAY DISABLE DO SELECT 1"),
    ] {
        ok(engine, connector, &sql).await;
    }
    let objects = connector.introspect_schema(SCHEMA).await;
    ok(engine, connector, &format!("DROP DATABASE {SCHEMA}")).await;
    let objects = objects.expect("introspect_schema");
    assert!(
        objects.warnings.is_empty(),
        "{engine:?}: {:?}",
        objects.warnings
    );

    let table = |name: &str| {
        objects
            .tables
            .iter()
            .find(|table| table.name == name)
            .unwrap_or_else(|| panic!("{engine:?}: falta {name}"))
    };
    assert_eq!(table("big_orders").kind, RelationKind::View);
    let orders = table("orders");
    assert_eq!(orders.kind, RelationKind::Table);
    let primary = orders.keys.iter().find(|key| key.primary).expect("PK");
    assert_eq!(primary.columns, vec!["id", "line"]);
    assert_eq!(orders.foreign_keys[0].name, "fk_orders_customer");
    assert!(orders.indexes.iter().any(|index| index.name == "idx_total"));
    assert_eq!(orders.triggers[0].timing, "BEFORE");
    assert_eq!(orders.triggers[0].events, vec!["INSERT"]);
    // Toda version verificada tiene CHECK en el catalogo (MySQL 8.0.16+).
    assert!(orders.checks.iter().any(|check| check.name == "chk_total"));
    assert!(
        table("customers")
            .keys
            .iter()
            .any(|key| key.name == "uq_email" && !key.primary)
    );

    let routine = |name: &str| {
        objects
            .routines
            .iter()
            .find(|routine| routine.name == name)
            .unwrap_or_else(|| panic!("{engine:?}: falta {name}"))
    };
    let purge = routine("purge");
    assert_eq!(purge.kind, RoutineKind::Procedure);
    // MariaDB conserva el ancho de display ("int(11)").
    assert_eq!(
        purge.arguments.replace("(11)", ""),
        "p_before int, OUT p_count int"
    );
    let described: Vec<_> = purge
        .parameters
        .iter()
        .map(|p| (p.name.as_deref(), p.mode))
        .collect();
    assert_eq!(
        described,
        vec![
            (Some("p_before"), ParameterMode::In),
            (Some("p_count"), ParameterMode::Out),
        ]
    );
    let twice = routine("twice");
    assert_eq!(twice.kind, RoutineKind::Function);
    assert_eq!(
        twice.return_type.as_deref().map(|t| t.replace("(11)", "")),
        Some("int".to_string())
    );
    // El valor de retorno (ordinal 0) no es un parametro.
    assert_eq!(twice.parameters.len(), 1);
    assert_eq!(twice.parameters[0].mode, ParameterMode::In);
    assert_eq!(objects.events[0].name, "nightly");
    assert_eq!(objects.events[0].schedule, "EVERY 1 DAY");
}

async fn postgres_objects(engine: Engine, connector: &dyn DbConnector) {
    const SCHEMA: &str = "khipu_introspect_test";
    for sql in [
        format!("DROP SCHEMA IF EXISTS {SCHEMA} CASCADE"),
        format!("CREATE SCHEMA {SCHEMA}"),
        format!(
            "CREATE TABLE {SCHEMA}.customers (id int, region int, email text NOT NULL UNIQUE, PRIMARY KEY (id, region))"
        ),
        format!(
            "CREATE TABLE {SCHEMA}.orders (id serial PRIMARY KEY, customer_id int, region int, \
             total numeric(10,2) CONSTRAINT chk_total CHECK (total >= 0), \
             CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id, region) REFERENCES {SCHEMA}.customers (id, region))"
        ),
        format!("CREATE INDEX idx_total ON {SCHEMA}.orders (total)"),
        format!(
            "CREATE VIEW {SCHEMA}.big_orders AS SELECT id, total FROM {SCHEMA}.orders WHERE total > 100"
        ),
        format!(
            "CREATE MATERIALIZED VIEW {SCHEMA}.order_totals AS SELECT sum(total) AS total FROM {SCHEMA}.orders"
        ),
        format!("CREATE SEQUENCE {SCHEMA}.invoice_number"),
        format!(
            "CREATE FUNCTION {SCHEMA}.twice(p integer) RETURNS integer LANGUAGE sql AS 'SELECT p * 2'"
        ),
        format!(
            "CREATE FUNCTION {SCHEMA}.touch() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RETURN NEW; END'"
        ),
        format!(
            "CREATE FUNCTION {SCHEMA}.calc(p_id integer, INOUT p_total numeric, \
             p_note text DEFAULT 'x', VARIADIC p_tags text[] DEFAULT '{{}}') LANGUAGE sql AS 'SELECT p_total'"
        ),
        format!(
            "CREATE TRIGGER orders_audit AFTER INSERT OR UPDATE ON {SCHEMA}.orders FOR EACH ROW EXECUTE PROCEDURE {SCHEMA}.touch()"
        ),
        // Toda version verificada tiene procedures (11+).
        format!("CREATE PROCEDURE {SCHEMA}.purge(p_before integer) LANGUAGE sql AS 'SELECT 1'"),
    ] {
        ok(engine, connector, &sql).await;
    }
    let objects = connector.introspect_schema(SCHEMA).await;
    ok(engine, connector, &format!("DROP SCHEMA {SCHEMA} CASCADE")).await;
    let objects = objects.expect("introspect_schema");
    assert!(
        objects.warnings.is_empty(),
        "{engine:?}: {:?}",
        objects.warnings
    );

    let table = |name: &str| {
        objects
            .tables
            .iter()
            .find(|table| table.name == name)
            .unwrap_or_else(|| panic!("{engine:?}: falta {name}"))
    };
    assert_eq!(table("big_orders").kind, RelationKind::View);
    assert_eq!(table("order_totals").kind, RelationKind::MaterializedView);
    assert_eq!(table("order_totals").columns[0].name, "total");
    let customers = table("customers");
    let primary = customers.keys.iter().find(|key| key.primary).expect("PK");
    assert_eq!(primary.columns, vec!["id", "region"]);
    assert!(
        customers
            .keys
            .iter()
            .any(|key| !key.primary && key.columns == ["email"])
    );
    let orders = table("orders");
    let foreign_key: Vec<_> = orders
        .foreign_keys
        .iter()
        .map(|fk| {
            (
                fk.name.as_str(),
                fk.column.as_str(),
                fk.referenced_column.as_str(),
            )
        })
        .collect();
    assert_eq!(
        foreign_key,
        vec![
            ("fk_orders_customer", "customer_id", "id"),
            ("fk_orders_customer", "region", "region"),
        ]
    );
    assert_eq!(orders.checks[0].name, "chk_total");
    let index = orders
        .indexes
        .iter()
        .find(|index| index.name == "idx_total")
        .expect("idx_total");
    assert_eq!(index.columns, vec!["total"]);
    assert_eq!(index.method.as_deref(), Some("btree"));
    assert_eq!(orders.triggers[0].timing, "AFTER");
    assert_eq!(orders.triggers[0].events, vec!["INSERT", "UPDATE"]);
    assert!(objects.sequences.iter().any(|s| s.name == "invoice_number"));

    let routine = |name: &str| {
        objects
            .routines
            .iter()
            .find(|routine| routine.name == name)
            .unwrap_or_else(|| panic!("{engine:?}: falta {name}"))
    };
    let twice = routine("twice");
    assert_eq!(twice.kind, RoutineKind::Function);
    assert_eq!(twice.arguments, "p integer");
    assert_eq!(twice.return_type.as_deref(), Some("integer"));
    assert_eq!(twice.parameters.len(), 1);
    assert_eq!(twice.parameters[0].name.as_deref(), Some("p"));
    assert_eq!(twice.parameters[0].data_type, "integer");
    let described: Vec<_> = routine("calc")
        .parameters
        .iter()
        .map(|p| {
            (
                p.name.as_deref(),
                p.mode,
                p.data_type.as_str(),
                p.has_default,
            )
        })
        .collect();
    assert_eq!(
        described,
        vec![
            (Some("p_id"), ParameterMode::In, "integer", false),
            (Some("p_total"), ParameterMode::InOut, "numeric", false),
            (Some("p_note"), ParameterMode::In, "text", true),
            (Some("p_tags"), ParameterMode::Variadic, "text[]", true),
        ]
    );
    let purge = routine("purge");
    assert_eq!(purge.kind, RoutineKind::Procedure);
    assert_eq!(purge.return_type, None);
    assert_eq!(purge.parameters[0].name.as_deref(), Some("p_before"));
}

// --- D5: TLS, segun lo que ofrece el servidor (`tls` en lines.json) ---------

#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn tls_auto_always_connects_and_reports_what_it_negotiated() {
    for engine in selected(Engine::ALL) {
        let _ = connector(engine).await;
        let expected = declared_tls(engine);
        let auto = engine
            .connector(&engine.config_with_tls(TlsMode::Auto))
            .await
            .unwrap_or_else(|error| panic!("{engine:?}: Auto conecta siempre: {error}"));
        let status = auto.tls_status();
        if status.fell_back {
            assert_eq!(status.encrypted, Some(false), "{engine:?}");
        }
        match expected.as_str() {
            "encrypted" => {
                assert_eq!(status.encrypted, Some(true), "{engine:?}: {status:?}");
                assert!(!status.fell_back, "{engine:?}");
                assert!(
                    status
                        .detail
                        .as_deref()
                        .is_some_and(|detail| detail.contains("TLS")),
                    "{engine:?}: {status:?}"
                );
            }
            "fallback" => assert!(status.fell_back, "{engine:?}: {status:?}"),
            "none" => {
                assert_eq!(status.encrypted, Some(false), "{engine:?}: {status:?}");
                assert!(
                    !status.fell_back,
                    "{engine:?}: nada de que volver: {status:?}"
                );
            }
            other => panic!("{engine:?}: tls {other:?} desconocido en lines.json"),
        }
    }
}

#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn tls_required_encrypts_or_fails_with_an_actionable_message() {
    for engine in selected(Engine::ALL) {
        let _ = connector(engine).await;
        let expected = declared_tls(engine);
        match engine
            .connector(&engine.config_with_tls(TlsMode::Required))
            .await
        {
            Ok(required) => {
                assert_eq!(
                    expected, "encrypted",
                    "{engine:?}: Required no conecta sin TLS"
                );
                assert_eq!(required.tls_status().encrypted, Some(true), "{engine:?}");
                assert!(!required.tls_status().fell_back, "{engine:?}");
            }
            Err(DriverError::Connection { kind, detail }) => {
                assert_ne!(expected, "encrypted", "{engine:?}: {detail}");
                assert!(
                    matches!(
                        kind,
                        ConnectionErrorKind::TlsIncompatible | ConnectionErrorKind::TlsUnavailable
                    ),
                    "{engine:?}: {kind:?}: {detail}"
                );
                if expected == "none" {
                    assert_eq!(
                        kind,
                        ConnectionErrorKind::TlsUnavailable,
                        "{engine:?}: {detail}"
                    );
                }
            }
            Err(other) => panic!("{engine:?}: error inesperado: {other}"),
        }
    }
}

#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn tls_disabled_connects_unencrypted() {
    for engine in selected(Engine::ALL) {
        let status = connector(engine).await.tls_status();
        assert_eq!(status.encrypted, Some(false), "{engine:?}");
        assert!(!status.fell_back, "{engine:?}");
    }
}

/// Los servidores de prueba usan certificados autofirmados, que ninguna CA
/// publica respalda: VerifyCa sin archivo de CA tiene que rechazarlos. Un
/// servidor sin TLS no tiene certificado que rechazar: N/A.
#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn tls_verify_ca_rejects_self_signed_certificates() {
    for engine in selected(Engine::ALL) {
        let _ = connector(engine).await;
        if declared_tls(engine) != "encrypted" {
            continue;
        }
        match engine
            .connector(&engine.config_with_tls(TlsMode::VerifyCa))
            .await
        {
            Err(DriverError::Connection { kind, detail }) => {
                assert_eq!(
                    kind,
                    ConnectionErrorKind::TlsCertificate,
                    "{engine:?}: {detail}"
                )
            }
            Ok(_) => panic!("{engine:?}: un certificado autofirmado no pasa VerifyCa"),
            Err(other) => panic!("{engine:?}: error inesperado: {other}"),
        }
    }
}
