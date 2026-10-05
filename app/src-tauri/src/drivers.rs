use khipu_driver_core::{
    ConnectionConfig, DbConnector, DriverError, QueryExecutionOptions, QueryExecutionResult,
    SchemaObjects, ServerIdentity, TlsStatus,
};
use khipu_driver_mysql::MySqlConnector;
use khipu_driver_postgres::PostgresConnector;
use khipu_engine::Dialect;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Instant;

/// The engine to connect to: the same values as the frontend's
/// `ConnectionDriver` ("mysql", "mariadb", "postgres"), so it crosses
/// `invoke` as is. Which driver speaks to it is decided here, not in the
/// frontend: MySQL and MariaDB share one.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DatabaseKind {
    MySql,
    MariaDb,
    Postgres,
}

impl DatabaseKind {
    pub fn dialect(self) -> Dialect {
        match self {
            DatabaseKind::MySql => Dialect::MySql,
            DatabaseKind::MariaDb => Dialect::MariaDb,
            DatabaseKind::Postgres => Dialect::Postgres,
        }
    }
}

/// A connector kept alive alongside what was introspected on connect, so
/// `execute_query` and the database explorer keep using the same pool.
pub struct ConnectedDatabase {
    pub connector: Arc<dyn DbConnector>,
    pub server: ServerIdentity,
    pub tls: TlsStatus,
    /// The schema the profile resolves unqualified names against (see
    /// `DbConnector::current_schema`); always loaded, never hidden.
    pub default_schema: String,
    pub available_schemas: Vec<String>,
    pub default_objects: SchemaObjects,
}

/// What "Probar conexión" shows (and copies to the clipboard).
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TestConnectionReport {
    pub server_version: String,
    pub default_schema: Option<String>,
    /// Round trip of a trivial query on the already-open connection: the
    /// network + server latency, without the connection handshake.
    pub latency_ms: Option<u64>,
    pub tls: TlsStatus,
}

/// Verifies that the credentials can open a database connection, then drops
/// the connector without loading or replacing the current catalog.
pub async fn test_connection(
    kind: DatabaseKind,
    config: &ConnectionConfig,
) -> Result<TestConnectionReport, DriverError> {
    match kind {
        DatabaseKind::MySql | DatabaseKind::MariaDb => {
            report(MySqlConnector::connect(config).await?).await
        }
        DatabaseKind::Postgres => report(PostgresConnector::connect(config).await?).await,
    }
}

async fn report<C: DbConnector>(connector: C) -> Result<TestConnectionReport, DriverError> {
    let start = Instant::now();
    let ping = connector
        .execute_query("SELECT 1", QueryExecutionOptions { max_rows: 1 })
        .await;
    let latency_ms = match ping {
        QueryExecutionResult::Error { .. } => None,
        _ => Some(start.elapsed().as_millis() as u64),
    };

    Ok(TestConnectionReport {
        server_version: connector.server().label,
        default_schema: connector.current_schema().await.ok(),
        latency_ms,
        tls: connector.tls_status(),
    })
}

/// Connects to the given database and introspects its default schema.
pub async fn connect(
    kind: DatabaseKind,
    config: &ConnectionConfig,
) -> Result<ConnectedDatabase, DriverError> {
    match kind {
        DatabaseKind::MySql | DatabaseKind::MariaDb => {
            open(MySqlConnector::connect(config).await?).await
        }
        DatabaseKind::Postgres => open(PostgresConnector::connect(config).await?).await,
    }
}

async fn open<C: DbConnector + 'static>(connector: C) -> Result<ConnectedDatabase, DriverError> {
    let default_schema = connector.current_schema().await?;
    let default_objects = connector.introspect_schema(&default_schema).await?;
    // Sin permiso para listar schemas, el selector ofrece solo el actual en
    // vez de impedir la conexion.
    let mut available_schemas = connector
        .list_schemas()
        .await
        .unwrap_or_else(|_| Vec::new());
    if !available_schemas.contains(&default_schema) {
        available_schemas.push(default_schema.clone());
        available_schemas.sort();
    }

    Ok(ConnectedDatabase {
        server: connector.server(),
        tls: connector.tls_status(),
        connector: Arc::new(connector),
        default_schema,
        available_schemas,
        default_objects,
    })
}

#[cfg(test)]
mod tests {
    use super::DatabaseKind;
    use khipu_engine::Dialect;

    /// Este archivo es el registro de motores del backend (perfil -> motor ->
    /// driver). El resto decide con `Dialect` y su definicion: nombrar aqui
    /// fuera un motor concreto trataria a uno nuevo como a otro sin que el
    /// compilador lo diga.
    #[test]
    fn solo_el_registro_nombra_un_motor_concreto() {
        fn sources(dir: &std::path::Path, out: &mut Vec<std::path::PathBuf>) {
            for entry in std::fs::read_dir(dir).unwrap() {
                let path = entry.unwrap().path();
                if path.is_dir() {
                    sources(&path, out);
                } else if path.extension().is_some_and(|ext| ext == "rs") {
                    out.push(path);
                }
            }
        }
        let src = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
        let mut files = Vec::new();
        sources(&src, &mut files);
        let mut named = vec!["DatabaseKind::".to_string()];
        for dialect in Dialect::ALL {
            named.push(format!("Dialect::{dialect:?}"));
            named.push(format!("\"{}\"", dialect.id()));
        }
        let mut found = Vec::new();
        for path in files {
            let relative = path
                .strip_prefix(&src)
                .unwrap()
                .to_string_lossy()
                .to_string();
            if relative == "drivers.rs" {
                continue;
            }
            let text = std::fs::read_to_string(&path).unwrap();
            let code = text.split("#[cfg(test)]").next().unwrap();
            for (number, line) in code.lines().enumerate() {
                if line.trim_start().starts_with("//") {
                    continue;
                }
                if named.iter().any(|name| line.contains(name.as_str())) {
                    found.push(format!("{relative}:{}: {}", number + 1, line.trim()));
                }
            }
        }
        assert!(
            found.is_empty(),
            "decide con el Dialect de la conexion y su definicion:\n{}",
            found.join("\n")
        );
    }

    /// Los nombres que manda el frontend (`ConnectionDriver`, en
    /// app/src/lib/connections.ts), los de tests/engines/contract.json: cada
    /// uno llega como su motor propio, y no hay otro.
    #[test]
    fn cada_motor_del_frontend_llega_como_el_suyo() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../tests/engines/contract.json");
        let contract: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap();
        let ids: Vec<&str> = contract["engines"]
            .as_array()
            .unwrap()
            .iter()
            .map(|engine| engine["id"].as_str().unwrap())
            .collect();
        for id in &ids {
            let kind: DatabaseKind = serde_json::from_value(serde_json::json!(id)).unwrap_or_else(|_| {
                panic!("DatabaseKind (app/src-tauri/src/drivers.rs) no tiene el motor {id}: sumarlo con su driver")
            });
            assert_eq!(kind.dialect().id(), *id);
        }
        let all: Vec<&str> = Dialect::ALL.iter().map(|dialect| dialect.id()).collect();
        assert_eq!(all, ids);
    }
}
