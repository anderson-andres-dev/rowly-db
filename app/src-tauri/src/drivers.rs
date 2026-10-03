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
