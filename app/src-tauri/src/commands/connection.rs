//! Conectar, desconectar, probar una conexion y las contrasenas guardadas.

use crate::engine_context::ConnectionEngineContext;
use crate::state::{ActiveConnection, AppState, build_catalog, read_session_mode};
use crate::{credentials, drivers};
use khipu_driver_core::{ConnectionConfig, ConnectionErrorKind, DriverError, Message};
use serde::Serialize;
use std::collections::BTreeMap;
use std::sync::atomic::Ordering;
/// Why connecting (or testing a connection) failed: the cause, which the
/// frontend explains in the app's language, and the raw detail to copy.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ConnectFailure {
    kind: ConnectionErrorKind,
    detail: String,
}

impl From<DriverError> for ConnectFailure {
    fn from(error: DriverError) -> Self {
        match error {
            DriverError::Connection { kind, detail } => Self { kind, detail },
            // Ya conectado, fallo leer el catalogo inicial.
            DriverError::Query(detail) => Self {
                kind: ConnectionErrorKind::Other,
                detail,
            },
        }
    }
}

#[tauri::command]
pub async fn connect(
    kind: drivers::DatabaseKind,
    config: ConnectionConfig,
    production: Option<bool>,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<usize, ConnectFailure> {
    // Las lineas activas no cambian mientras se conecta: las capacidades que
    // fija el driver y la linea del contexto salen de la misma revision.
    let activation = crate::support::ACTIVATION.read().await;
    let connected = drivers::connect(kind, &config).await?;
    let table_count = connected.default_objects.tables.len();
    let mut schemas = BTreeMap::new();
    schemas.insert(connected.default_schema.clone(), connected.default_objects);
    let catalog = build_catalog(&schemas);
    // El modo de la consola, que al conectar es tambien el del pool.
    let session_mode = read_session_mode(&*connected.connector, kind.dialect())
        .await
        .unwrap_or_default();
    let console_epoch = connected.connector.console_epoch();
    let generation = state.generations.fetch_add(1, Ordering::Relaxed) + 1;
    let context =
        ConnectionEngineContext::new(generation, kind.dialect(), connected.server, session_mode);
    drop(activation);

    state
        .connections
        .lock()
        .expect("connections mutex poisoned")
        .insert(
            window.label().to_string(),
            ActiveConnection {
                connector: connected.connector,
                dialect: kind.dialect(),
                production: production.unwrap_or(false),
                context,
                pool_mode: session_mode,
                console_epoch,
                tls: connected.tls,
                default_schema: connected.default_schema,
                available_schemas: connected.available_schemas,
                schemas,
                catalog,
            },
        );

    Ok(table_count)
}

#[tauri::command]
pub fn disconnect(window: tauri::Window, state: tauri::State<'_, AppState>) {
    state
        .connections
        .lock()
        .expect("connections mutex poisoned")
        .remove(window.label());
}

#[tauri::command]
pub async fn test_connection(
    kind: drivers::DatabaseKind,
    config: ConnectionConfig,
) -> Result<drivers::TestConnectionReport, ConnectFailure> {
    Ok(drivers::test_connection(kind, &config).await?)
}

#[tauri::command]
pub async fn save_connection_password(profile_id: String, password: String) -> Result<(), Message> {
    credentials::save(profile_id, password)
        .await
        .map_err(Message::from)
}

#[tauri::command]
pub async fn load_connection_password(profile_id: String) -> Result<Option<String>, Message> {
    credentials::load(profile_id).await.map_err(Message::from)
}

#[tauri::command]
pub async fn delete_connection_password(profile_id: String) -> Result<(), Message> {
    credentials::delete(profile_id).await.map_err(Message::from)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_connection_failure_keeps_its_shape() {
        let failure = ConnectFailure::from(DriverError::Connection {
            kind: ConnectionErrorKind::TlsUnavailable,
            detail: "no TLS".into(),
        });
        assert_eq!(
            serde_json::to_value(&failure).unwrap(),
            serde_json::json!({ "kind": "tlsUnavailable", "detail": "no TLS" })
        );
    }
}
