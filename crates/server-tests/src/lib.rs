//! Ayudas de las pruebas contra servidores reales. Los servidores salen de
//! `tools/test-dbs/up.sh`; las pruebas estan marcadas `#[ignore]`:
//! `cargo test -p rowly-server-tests -- --ignored --test-threads=1`.

use khipu_driver_core::{
    ConnectionConfig, DbConnector, QueryExecutionOptions, QueryExecutionResult, SchemaObjects,
    TlsMode,
};
use khipu_driver_mysql::MySqlConnector;
use khipu_driver_postgres::PostgresConnector;
use khipu_engine::Dialect;
use khipu_engine::execution_guard::{
    DestructiveClassification, GuardOptions, classify_sql, classify_sql_with,
};
use sqlx::{Connection, MySqlConnection, PgConnection};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Engine {
    MySql,
    MariaDb,
    Postgres,
}

impl Engine {
    pub const ALL: [Engine; 3] = [Engine::MySql, Engine::MariaDb, Engine::Postgres];

    pub fn dialect(self) -> Dialect {
        match self {
            Engine::MySql => Dialect::MySql,
            Engine::MariaDb => Dialect::MariaDb,
            Engine::Postgres => Dialect::Postgres,
        }
    }

    pub fn is_mysql_family(self) -> bool {
        self != Engine::Postgres
    }

    /// El contenedor de tools/test-dbs que lo sirve.
    pub fn container(self) -> &'static str {
        match self {
            Engine::MySql => "rowly-test-mysql",
            Engine::MariaDb => "rowly-test-mariadb",
            Engine::Postgres => "rowly-test-postgres",
        }
    }

    /// Donde viven las tablas de prueba: la base en MySQL y MariaDB, el schema
    /// `rowly_test` en Postgres.
    pub fn scope(self) -> &'static str {
        "rowly_test"
    }

    fn config(self) -> ConnectionConfig {
        let (port, database) = match self {
            Engine::MySql => (33306, "rowly_test"),
            Engine::MariaDb => (33307, "rowly_test"),
            Engine::Postgres => (55432, "pagila"),
        };
        ConnectionConfig {
            host: "127.0.0.1".into(),
            port,
            database: database.into(),
            username: "rowly".into(),
            password: "rowly".into(),
            tls_mode: TlsMode::Disabled,
            ca_certificate_path: None,
        }
    }
}

pub enum Conn {
    My(MySqlConnector),
    Pg(PostgresConnector),
}

impl Conn {
    pub async fn open(engine: Engine) -> Conn {
        let config = engine.config();
        match engine {
            Engine::Postgres => Conn::Pg(
                PostgresConnector::connect(&config)
                    .await
                    .expect("postgres de prueba: corre tools/test-dbs/up.sh"),
            ),
            _ => Conn::My(
                MySqlConnector::connect(&config)
                    .await
                    .expect("mysql/mariadb de prueba: corre tools/test-dbs/up.sh"),
            ),
        }
    }

    /// Ejecuta tal cual, sin guard: lo que haria el servidor con el texto.
    pub async fn raw(&self, sql: &str) -> QueryExecutionResult {
        let options = QueryExecutionOptions { max_rows: 1000 };
        match self {
            Conn::My(connector) => connector.execute_query(sql, options).await,
            Conn::Pg(connector) => connector.execute_query(sql, options).await,
        }
    }

    /// Lo que hace la app: el guard primero, el driver despues. `Err` es el
    /// guard rechazando (nada llega al servidor).
    pub async fn guarded(&self, engine: Engine, sql: &str) -> Result<QueryExecutionResult, String> {
        match classify_sql(sql.trim(), engine.dialect(), false) {
            Ok(_) => Ok(self.raw(sql).await),
            Err(error) => Err(error.to_string()),
        }
    }

    /// Lo que haria el servidor con el texto SIN la barrera del driver (que
    /// prepara antes de ejecutar y asi rechaza varias sentencias): protocolo de
    /// texto con varias sentencias, como lo hace el cliente `mysql` o `psql`.
    pub async fn multi_statement(engine: Engine, sql: &str) {
        let config = engine.config();
        match engine {
            Engine::Postgres => {
                let url = format!(
                    "postgres://rowly:rowly@127.0.0.1:{}/{}",
                    config.port, config.database
                );
                let mut conn = PgConnection::connect(&url)
                    .await
                    .expect("postgres de prueba");
                let _ = sqlx::raw_sql(sql).execute(&mut conn).await;
            }
            _ => {
                let url = format!(
                    "mysql://rowly:rowly@127.0.0.1:{}/{}",
                    config.port, config.database
                );
                let mut conn = MySqlConnection::connect(&url)
                    .await
                    .expect("mysql de prueba");
                let _ = sqlx::raw_sql(sql).execute(&mut conn).await;
            }
        }
    }

    /// Lo que la app lee de un schema para el explorador y el autocompletado.
    pub async fn introspect(&self, schema: &str) -> SchemaObjects {
        match self {
            Conn::My(connector) => connector.introspect_schema(schema).await,
            Conn::Pg(connector) => connector.introspect_schema(schema).await,
        }
        .expect("introspeccion")
    }

    pub async fn scalar(&self, sql: &str) -> Option<String> {
        match self.raw(sql).await {
            QueryExecutionResult::ResultSet { rows, .. } => {
                rows.first().and_then(|row| row.first().cloned()).flatten()
            }
            _ => None,
        }
    }
}

pub fn classification(engine: Engine, sql: &str) -> Result<DestructiveClassification, String> {
    classify_sql(sql.trim(), engine.dialect(), false).map_err(|error| error.to_string())
}

pub fn classification_with(
    engine: Engine,
    sql: &str,
    options: GuardOptions,
) -> Result<DestructiveClassification, String> {
    classify_sql_with(sql.trim(), engine.dialect(), false, options)
        .map_err(|error| error.to_string())
}

pub fn is_error(result: &QueryExecutionResult) -> bool {
    matches!(result, QueryExecutionResult::Error { .. })
}

pub fn error_text(result: &QueryExecutionResult) -> String {
    match result {
        QueryExecutionResult::Error { message, code, .. } => {
            format!("{code:?}: {message:?}")
        }
        other => format!("{other:?}").chars().take(80).collect(),
    }
}

/// Las entradas de un fichero del corpus, separadas por una linea `-- ---`.
pub fn entries(text: &str) -> Vec<String> {
    text.split("\n-- ---\n")
        .map(|entry| entry.trim().to_string())
        .filter(|entry| !entry.is_empty())
        .collect()
}

/// Ejecuta un comando en el contenedor del motor como administrador: lo que
/// la app no puede hacer con el usuario de prueba (cambiar el sql_mode global).
pub fn try_admin(engine: Engine, sql: &str) -> bool {
    let mut command = std::process::Command::new("docker");
    command.arg("exec").arg(engine.container());
    match engine {
        Engine::MySql => command.args(["mysql", "-uroot", "-prowly", "rowly_test", "-e", sql]),
        Engine::MariaDb => command.args(["mariadb", "-uroot", "-prowly", "rowly_test", "-e", sql]),
        Engine::Postgres => command.args(["psql", "-U", "rowly", "-d", "pagila", "-c", sql]),
    };
    command
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

pub fn admin(engine: Engine, sql: &str) {
    let mut command = std::process::Command::new("docker");
    command.arg("exec").arg(engine.container());
    match engine {
        Engine::MySql => command.args(["mysql", "-uroot", "-prowly", "-e", sql]),
        Engine::MariaDb => command.args(["mariadb", "-uroot", "-prowly", "-e", sql]),
        Engine::Postgres => command.args(["psql", "-U", "rowly", "-d", "pagila", "-c", sql]),
    };
    let status = command.output().expect("docker exec");
    assert!(
        status.status.success(),
        "admin fallo: {sql}\n{}",
        String::from_utf8_lossy(&status.stderr)
    );
}
