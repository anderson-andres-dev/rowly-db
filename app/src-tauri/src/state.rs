//! El estado que comparten los comandos: una conexion activa por ventana,
//! con su catalogo compartido (`Arc<SchemaCatalog>`, armado una vez cada vez
//! que cambian los schemas) y las consultas en curso que se pueden cancelar.

use crate::engine_context::{ConnectionEngineContext, SessionMode};
use crate::services::catalog;
use khipu_driver_core::{
    DbConnector, Message, QueryCancel, QueryExecutionOptions, QueryExecutionResult, SchemaObjects,
    TlsStatus,
};
use khipu_engine::Dialect;
use khipu_engine::catalog::SchemaCatalog;
use khipu_engine::execution_guard::GuardOptions;
use serde::Serialize;
use std::collections::{BTreeMap, HashMap};
use std::sync::atomic::{AtomicU64, Ordering};
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
    /// El modo de las conexiones del pool, leido al conectar. Los cambios
    /// del grid se aplican ahi, en su propia transaccion, y sus literales se
    /// escriben con este modo, no con el de la consola.
    pub(crate) pool_mode: SessionMode,
    /// `DbConnector::console_epoch` la ultima vez que se leyo el modo de la
    /// consola: si cambio, la sesion se perdio y se abrio otra.
    pub(crate) console_epoch: u64,
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

/// El modo de la sesion de la consola: ¿lleva NO_BACKSLASH_ESCAPES? Solo en
/// los motores con `sql_mode_query` (MySQL, MariaDB). Cambia como se parten
/// las cadenas, y con ello lo que el guard y el analisis ven. `None`: no se
/// pudo leer (la conexion se perdio).
pub(crate) async fn read_session_mode(
    connector: &dyn DbConnector,
    dialect: Dialect,
) -> Option<SessionMode> {
    let Some(query) = dialect.definition().sql_mode_query else {
        return Some(SessionMode::default());
    };
    match connector
        .execute_query(query, QueryExecutionOptions { max_rows: 1 })
        .await
    {
        QueryExecutionResult::ResultSet { rows, .. } => Some(SessionMode {
            no_backslash_escapes: rows
                .first()
                .and_then(|row| row.first())
                .and_then(|mode| mode.as_deref())
                .is_some_and(|mode| mode.to_ascii_uppercase().contains("NO_BACKSLASH_ESCAPES")),
        }),
        _ => None,
    }
}

/// Una sentencia que puede cambiar el `sql_mode` de la sesion: la que lo
/// nombra (`SET [SESSION] sql_mode`, `SET @@sql_mode`, un comentario
/// ejecutable de un volcado) o un `EXECUTE` de una sentencia preparada. De
/// mas no importa: solo hace que el modo se vuelva a leer del servidor. Una
/// rutina no cambia el de quien la llama: MySQL lo restaura al salir.
pub(crate) fn may_change_session_mode(sql: &str, dialect: Dialect) -> bool {
    if dialect.definition().sql_mode_query.is_none() {
        return false;
    }
    let lower = sql.to_ascii_lowercase();
    lower.contains("sql_mode") || lower.contains("execute")
}

/// Lo que cambio de la sesion de la consola despues de una sentencia.
#[derive(Debug, Default)]
pub(crate) struct ConsoleChange {
    /// El contexto con el modo nuevo (y otra generacion), si cambio.
    pub(crate) context: Option<ConnectionEngineContext>,
    /// La conexion de la consola se perdio (o se cerro) y la siguiente
    /// empieza limpia: sin `SET`, variables, tablas temporales ni la
    /// transaccion que tuviera.
    pub(crate) reset: bool,
}

/// Despues de una sentencia de la consola: si pudo cambiar el modo, o si la
/// conexion de la consola cambio, se vuelve a leer el modo del servidor. Un
/// modo distinto es una generacion nueva: el guard, el analisis y el editor
/// dejan de usar el anterior.
pub(crate) async fn follow_console(
    window: &str,
    state: &AppState,
    connector: &Arc<dyn DbConnector>,
    dialect: Dialect,
    sql: &str,
) -> ConsoleChange {
    let known_epoch = {
        let guard = state
            .connections
            .lock()
            .expect("connections mutex poisoned");
        match guard.get(window) {
            Some(active) if Arc::ptr_eq(&active.connector, connector) => active.console_epoch,
            _ => return ConsoleChange::default(),
        }
    };
    if connector.console_epoch() == known_epoch && !may_change_session_mode(sql, dialect) {
        return ConsoleChange::default();
    }
    let mode = read_session_mode(&**connector, dialect).await;
    let epoch = connector.console_epoch();

    let mut guard = state
        .connections
        .lock()
        .expect("connections mutex poisoned");
    let Some(active) = guard
        .get_mut(window)
        .filter(|active| Arc::ptr_eq(&active.connector, connector))
    else {
        return ConsoleChange::default();
    };
    record_console(
        &mut active.context,
        &mut active.console_epoch,
        epoch,
        mode,
        &state.generations,
    )
}

/// Lo que se leyo de la consola (`epoch` y el modo, si se pudo) sobre lo que
/// se sabia de ella.
fn record_console(
    context: &mut ConnectionEngineContext,
    known_epoch: &mut u64,
    epoch: u64,
    mode: Option<SessionMode>,
    generations: &AtomicU64,
) -> ConsoleChange {
    let reset = khipu_driver_core::session_lost(*known_epoch, epoch);
    *known_epoch = epoch;
    let context = match mode {
        Some(mode) if mode != context.session_mode => {
            context.session_mode = mode;
            context.generation = generations.fetch_add(1, Ordering::Relaxed) + 1;
            Some(context.clone())
        }
        _ => None,
    };
    ConsoleChange { context, reset }
}

#[cfg(test)]
mod tests {
    use super::*;
    use khipu_driver_core::ServerIdentity;

    fn context() -> ConnectionEngineContext {
        ConnectionEngineContext::new(
            1,
            Dialect::MySql,
            ServerIdentity {
                engine: "mysql",
                version: vec![8, 4, 11],
                label: "MySQL 8.4.11".into(),
            },
            SessionMode::default(),
        )
    }

    #[test]
    fn only_statements_that_can_change_the_mode_read_it_again() {
        for sql in [
            "SET SESSION sql_mode = 'NO_BACKSLASH_ESCAPES'",
            "set @@SQL_MODE = ''",
            "/*!40101 SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */",
            "EXECUTE cambiar_modo",
        ] {
            assert!(may_change_session_mode(sql, Dialect::MySql), "{sql}");
            assert!(may_change_session_mode(sql, Dialect::MariaDb), "{sql}");
        }
        assert!(!may_change_session_mode("SELECT 1", Dialect::MySql));
        assert!(!may_change_session_mode("SET @x = 1", Dialect::MySql));
        // PostgreSQL no tiene sql_mode: su regla es la del motor.
        assert!(!may_change_session_mode(
            "SET standard_conforming_strings = off",
            Dialect::Postgres
        ));
    }

    #[test]
    fn a_new_mode_is_a_new_generation_and_a_new_connection_is_a_reset() {
        let generations = AtomicU64::new(1);
        let mut context = context();
        // Al conectar sin leer el modo (PostgreSQL), la consola aun no existe.
        let mut known_epoch = 0;

        // La primera sentencia la abre: no se perdio ninguna sesion.
        let change = record_console(
            &mut context,
            &mut known_epoch,
            1,
            Some(SessionMode::default()),
            &generations,
        );
        assert!(change.context.is_none() && !change.reset);
        assert_eq!(known_epoch, 1);
        let no_backslash = SessionMode {
            no_backslash_escapes: true,
        };

        // El mismo modo en la misma conexion: nada cambia.
        let change = record_console(
            &mut context,
            &mut known_epoch,
            1,
            Some(SessionMode::default()),
            &generations,
        );
        assert!(change.context.is_none() && !change.reset);
        assert_eq!(context.generation, 1);

        // SET sql_mode: otra generacion, con el modo nuevo.
        let change = record_console(
            &mut context,
            &mut known_epoch,
            1,
            Some(no_backslash),
            &generations,
        );
        let changed = change.context.expect("contexto nuevo");
        assert_eq!(changed.generation, 2);
        assert!(changed.session_mode.no_backslash_escapes);
        assert!(!change.reset);
        assert!(!context.is_current(1, 0));

        // La conexion se perdio y se abrio otra, con el modo del servidor.
        let change = record_console(
            &mut context,
            &mut known_epoch,
            3,
            Some(SessionMode::default()),
            &generations,
        );
        assert!(change.reset);
        assert_eq!(change.context.map(|context| context.generation), Some(3));

        // No se pudo leer el modo: se conserva el conocido.
        let change = record_console(&mut context, &mut known_epoch, 4, None, &generations);
        assert!(change.reset && change.context.is_none());
        assert_eq!(context.generation, 3);
    }
}

pub(crate) fn build_catalog(schemas: &BTreeMap<String, SchemaObjects>) -> Arc<SchemaCatalog> {
    Arc::new(catalog::tables_to_catalog(
        schemas
            .values()
            .flat_map(|objects| objects.tables.iter().cloned()),
    ))
}

impl ActiveConnection {
    /// La regla de la barra invertida en los literales que genera el grid:
    /// la de las conexiones del pool, donde se aplican (`pool_mode`).
    pub(crate) fn grid_backslash_escapes(&self) -> bool {
        self.dialect.backslash_escapes() && !self.pool_mode.no_backslash_escapes
    }

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
    /// Las terminales integradas abiertas, cada una de su ventana
    /// (terminal.rs).
    pub(crate) terminals: crate::terminal::Registry,
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
