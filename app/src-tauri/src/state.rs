//! El estado que comparten los comandos: una conexion activa por ventana,
//! con su catalogo compartido (`Arc<SchemaCatalog>`, armado una vez cada vez
//! que cambian los schemas) y las consultas en curso que se pueden cancelar.

use crate::catalog_adapter;
use crate::engine_context::ConnectionEngineContext;
use khipu_driver_core::{
    DbConnector, Message, QueryCancel, QueryExecutionOptions, QueryExecutionResult, SchemaObjects,
    TlsStatus,
};
use khipu_engine::Dialect;
use khipu_engine::catalog::SchemaCatalog;
use khipu_engine::execution_guard::GuardOptions;
use serde::Serialize;
use std::collections::{BTreeMap, HashMap};
use std::sync::atomic::AtomicU64;
use std::sync::{Arc, Mutex};

/// The connector from the most recent successful `connect` and every schema
/// introspected through it, kept alive so `execute_query` and the database
/// explorer have something to work against.
pub(crate) struct ActiveConnection {
    pub(crate) connector: Arc<dyn DbConnector>,
    pub(crate) dialect: Dialect,
    /// The profile is marked as production: every write asks for
    /// confirmation (`DestructiveStatement::WriteInProduction`).
    pub(crate) production: bool,
    /// Motor, servidor, modo de sesion, linea y generacion, armados una vez
    /// al conectar (engine_context.rs). Solo `schema_epoch` cambia despues.
    pub(crate) context: ConnectionEngineContext,
    pub(crate) tls: TlsStatus,
    pub(crate) default_schema: String,
    pub(crate) available_schemas: Vec<String>,
    /// Schemas currently shown in the explorer. Always includes
    /// `default_schema`; the others come and go via `set_visible_schemas`.
    pub(crate) schemas: BTreeMap<String, SchemaObjects>,
    /// `schemas` as the engine's catalog, built once each time they change
    /// (`set_schemas`). `analyze_sql` runs after every typing pause: it used
    /// to clone every table and column on each call, with the connections
    /// lock held (so a query started meanwhile had to wait).
    pub(crate) catalog: Arc<SchemaCatalog>,
}

/// ¿El modo de la sesion lleva NO_BACKSLASH_ESCAPES? Solo en los motores
/// con `sql_mode_query` (MySQL, MariaDB). Cambia como se parten las cadenas, y
/// con ello lo que el guard ve.
pub(crate) async fn uses_no_backslash_escapes(
    connector: &dyn DbConnector,
    dialect: Dialect,
) -> bool {
    let Some(query) = dialect.definition().sql_mode_query else {
        return false;
    };
    match connector
        .execute_query(query, QueryExecutionOptions { max_rows: 1 })
        .await
    {
        QueryExecutionResult::ResultSet { rows, .. } => rows
            .first()
            .and_then(|row| row.first())
            .and_then(|mode| mode.as_deref())
            .is_some_and(|mode| mode.to_ascii_uppercase().contains("NO_BACKSLASH_ESCAPES")),
        _ => false,
    }
}

pub(crate) fn build_catalog(schemas: &BTreeMap<String, SchemaObjects>) -> Arc<SchemaCatalog> {
    Arc::new(catalog_adapter::tables_to_catalog(
        schemas
            .values()
            .flat_map(|objects| objects.tables.iter().cloned()),
    ))
}

impl ActiveConnection {
    pub(crate) fn guard_options(&self) -> GuardOptions {
        GuardOptions {
            no_backslash_escapes: self.context.session_mode.no_backslash_escapes,
        }
    }

    /// The only way to change `schemas`: keeps `catalog` in step, and moves
    /// `schema_epoch` so what was analyzed against the old ones is let go.
    pub(crate) fn set_schemas(
        &mut self,
        update: impl FnOnce(&mut BTreeMap<String, SchemaObjects>),
    ) {
        update(&mut self.schemas);
        self.catalog = build_catalog(&self.schemas);
        self.context.schema_epoch += 1;
    }

    pub(crate) fn explorer(&self) -> DatabaseExplorer {
        // El schema por defecto primero, el resto en orden alfabetico.
        let mut schemas: Vec<SchemaObjects> = Vec::with_capacity(self.schemas.len());
        if let Some(default) = self.schemas.get(&self.default_schema) {
            schemas.push(default.clone());
        }
        schemas.extend(
            self.schemas
                .values()
                .filter(|objects| objects.schema != self.default_schema)
                .cloned(),
        );

        DatabaseExplorer {
            context: self.context.clone(),
            tls: self.tls.clone(),
            default_schema: self.default_schema.clone(),
            available_schemas: self.available_schemas.clone(),
            schemas,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DatabaseExplorer {
    context: ConnectionEngineContext,
    tls: TlsStatus,
    default_schema: String,
    available_schemas: Vec<String>,
    schemas: Vec<SchemaObjects>,
}

/// One active connection per window, keyed by the window label: each window
/// ("main", or a "connection-*" one opened from the connection switcher)
/// works against its own database, so connecting in one never replaces the
/// connection another window is using. A window's entry is dropped when the
/// window is destroyed (see `run`).
#[derive(Default)]
pub(crate) struct AppState {
    pub(crate) connections: Mutex<HashMap<String, ActiveConnection>>,
    /// The last generation given to a connection (`ConnectionEngineContext`),
    /// across every window: a reconnection never reuses one.
    pub(crate) generations: AtomicU64,
    /// Queries running now that `cancel_query` can interrupt, by the
    /// execution id the frontend gave them.
    pub(crate) running: Mutex<HashMap<String, Arc<QueryCancel>>>,
}

/// Removes a running query from `AppState::running` when it ends, however
/// it ends.
pub(crate) struct RunningQuery<'a> {
    pub(crate) state: &'a AppState,
    pub(crate) id: String,
}

impl Drop for RunningQuery<'_> {
    fn drop(&mut self) {
        self.state
            .running
            .lock()
            .expect("running queries mutex poisoned")
            .remove(&self.id);
    }
}

/// Runs `f` against the active connection while holding the lock. Only
/// for synchronous work (analysis, SQL generation): the catalog is read in
/// place instead of cloned.
pub(crate) fn with_active_connection<T>(
    window: &tauri::Window,
    state: &tauri::State<'_, AppState>,
    f: impl FnOnce(&ActiveConnection) -> Result<T, Message>,
) -> Result<T, Message> {
    let guard = state
        .connections
        .lock()
        .expect("connections mutex poisoned");
    let active = guard
        .get(window.label())
        .ok_or_else(|| Message::key("noActiveConnection"))?;
    f(active)
}
