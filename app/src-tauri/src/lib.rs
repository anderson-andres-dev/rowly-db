mod catalog_adapter;
mod credentials;
mod drivers;
mod export;
mod result_editing;
mod sql_files;
mod updates;

use khipu_driver_core::{
    ConnectionConfig, DbConnector, QueryExecutionOptions, QueryExecutionResult, SchemaObjects,
    TlsStatus,
};
use khipu_engine::Dialect;
use khipu_engine::catalog::CatalogTable;
use khipu_engine::execution_guard::{
    DestructiveClassification, DestructiveStatement, classify_destructive_sql,
};
use serde::Serialize;
use std::collections::{BTreeMap, HashMap};
use std::sync::{Arc, Mutex};
use tauri::Manager;
use tauri_plugin_window_state::StateFlags;

/// Page size when the frontend doesn't ask for one.
const DEFAULT_QUERY_ROW_LIMIT: usize = 500;
/// Upper bound for a requested page size ("Todas" included): the result grid
/// mounts every row it receives, so this keeps a single page from freezing
/// the WebView. Whatever the WebView asks for is clamped to this.
const MAX_QUERY_ROW_LIMIT: usize = 10_000;

/// Page requested by the frontend (row offset + page size).
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct PageRequest {
    offset: u64,
    page_size: usize,
    /// Orden pedido desde los encabezados del grid (vacio = el de la
    /// consulta).
    #[serde(default)]
    sort: Vec<khipu_engine::pagination::SortKey>,
}

/// How the returned rows map onto the full result. `pageable: false` means
/// the statement couldn't be rewritten with LIMIT/OFFSET (SHOW, FOR
/// UPDATE, ...): only the first page is available.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
struct PageInfo {
    offset: u64,
    page_size: usize,
    pageable: bool,
    /// La sentencia se puede ordenar desde el grid (se puede reescribir su
    /// ORDER BY). Si no, los encabezados no ofrecen ordenar.
    sortable: bool,
}

/// The connector from the most recent successful `connect` and every schema
/// introspected through it, kept alive so `execute_query` and the database
/// explorer have something to work against.
struct ActiveConnection {
    connector: Arc<dyn DbConnector>,
    dialect: Dialect,
    server_version: String,
    tls: TlsStatus,
    default_schema: String,
    available_schemas: Vec<String>,
    /// Schemas currently shown in the explorer. Always includes
    /// `default_schema`; the others come and go via `set_visible_schemas`.
    schemas: BTreeMap<String, SchemaObjects>,
}

impl ActiveConnection {
    fn explorer(&self) -> DatabaseExplorer {
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
            server_version: self.server_version.clone(),
            tls: self.tls.clone(),
            default_schema: self.default_schema.clone(),
            available_schemas: self.available_schemas.clone(),
            schemas,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DatabaseExplorer {
    server_version: String,
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
struct AppState {
    connections: Mutex<HashMap<String, ActiveConnection>>,
}

#[derive(Debug, Serialize)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
enum ExecuteQueryResponse {
    ConfirmationRequired {
        statement: DestructiveStatement,
    },
    Completed {
        result: QueryExecutionResult,
        #[serde(skip_serializing_if = "Option::is_none")]
        page: Option<PageInfo>,
    },
}

/// Tables and views of every loaded schema, for completion: adding a schema
/// in the explorer also makes its tables completable.
#[tauri::command]
fn list_tables(window: tauri::Window, state: tauri::State<'_, AppState>) -> Vec<CatalogTable> {
    state
        .connections
        .lock()
        .expect("connections mutex poisoned")
        .get(window.label())
        .map(|active| {
            catalog_adapter::tables_to_catalog(
                active
                    .schemas
                    .values()
                    .flat_map(|objects| objects.tables.iter().cloned()),
            )
            .tables
        })
        .unwrap_or_default()
}

#[tauri::command]
fn database_explorer(
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Option<DatabaseExplorer> {
    state
        .connections
        .lock()
        .expect("connections mutex poisoned")
        .get(window.label())
        .map(ActiveConnection::explorer)
}

/// Makes `names` (plus the default schema, always) the schemas shown in the
/// explorer: introspects the ones not loaded yet and drops the rest. Names
/// the server doesn't list are ignored, so a stale selection saved in the
/// frontend can't make it introspect arbitrary input.
///
/// A schema that fails to load is still added, empty, with the error in its
/// `warnings`, instead of failing the whole selection.
#[tauri::command]
async fn set_visible_schemas(
    names: Vec<String>,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<DatabaseExplorer, String> {
    let (connector, wanted, missing) = {
        let guard = state
            .connections
            .lock()
            .expect("connections mutex poisoned");
        let active = guard
            .get(window.label())
            .ok_or_else(|| "No hay ninguna conexión activa.".to_string())?;

        let mut wanted: Vec<String> = names
            .into_iter()
            .filter(|name| active.available_schemas.contains(name))
            .collect();
        if !wanted.contains(&active.default_schema) {
            wanted.push(active.default_schema.clone());
        }
        let missing: Vec<String> = wanted
            .iter()
            .filter(|name| !active.schemas.contains_key(*name))
            .cloned()
            .collect();
        (Arc::clone(&active.connector), wanted, missing)
    };

    let mut loaded = Vec::with_capacity(missing.len());
    for name in missing {
        let objects = match connector.introspect_schema(&name).await {
            Ok(objects) => objects,
            Err(error) => {
                let mut objects = SchemaObjects::new(&name);
                objects
                    .warnings
                    .push(format!("No se pudo cargar el schema: {error}"));
                objects
            }
        };
        loaded.push(objects);
    }

    let mut guard = state
        .connections
        .lock()
        .expect("connections mutex poisoned");
    let active = guard
        .get_mut(window.label())
        .ok_or_else(|| "No hay ninguna conexión activa.".to_string())?;
    // Si mientras se introspectaba se conecto a otra base, lo cargado es de
    // la conexion anterior y no se mezcla con la nueva.
    if !Arc::ptr_eq(&active.connector, &connector) {
        return Err("La conexión cambió mientras se cargaban los schemas.".to_string());
    }
    active.schemas.retain(|name, _| wanted.contains(name));
    for objects in loaded {
        active.schemas.insert(objects.schema.clone(), objects);
    }
    Ok(active.explorer())
}

#[tauri::command]
async fn connect(
    kind: drivers::DatabaseKind,
    config: ConnectionConfig,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<usize, String> {
    let connected = drivers::connect(kind, &config)
        .await
        .map_err(|e| e.to_string())?;
    let table_count = connected.default_objects.tables.len();
    let mut schemas = BTreeMap::new();
    schemas.insert(connected.default_schema.clone(), connected.default_objects);

    state
        .connections
        .lock()
        .expect("connections mutex poisoned")
        .insert(
            window.label().to_string(),
            ActiveConnection {
                connector: connected.connector,
                dialect: kind.dialect(),
                server_version: connected.server_version,
                tls: connected.tls,
                default_schema: connected.default_schema,
                available_schemas: connected.available_schemas,
                schemas,
            },
        );

    Ok(table_count)
}

#[tauri::command]
fn disconnect(window: tauri::Window, state: tauri::State<'_, AppState>) {
    state
        .connections
        .lock()
        .expect("connections mutex poisoned")
        .remove(window.label());
}

#[tauri::command]
async fn execute_query(
    sql: String,
    confirmed_statement: Option<DestructiveStatement>,
    page: Option<PageRequest>,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<ExecuteQueryResponse, String> {
    let sql = sql.trim();
    if sql.is_empty() {
        return Ok(ExecuteQueryResponse::Completed {
            page: None,
            result: QueryExecutionResult::Error {
                message: "No hay ninguna consulta para ejecutar.".to_string(),
                code: None,
                position: None,
            },
        });
    }

    let (connector, dialect) = {
        let guard = state
            .connections
            .lock()
            .expect("connections mutex poisoned");
        match guard.get(window.label()) {
            Some(active) => (Arc::clone(&active.connector), active.dialect),
            None => {
                return Ok(ExecuteQueryResponse::Completed {
                    page: None,
                    result: QueryExecutionResult::Error {
                        message: "No hay ninguna conexión activa.".to_string(),
                        code: None,
                        position: None,
                    },
                });
            }
        }
    };

    let classification = match classify_destructive_sql(sql, dialect) {
        Ok(classification) => classification,
        Err(error) => {
            return Ok(ExecuteQueryResponse::Completed {
                page: None,
                result: QueryExecutionResult::Error {
                    message: error.to_string(),
                    code: None,
                    position: None,
                },
            });
        }
    };

    match (classification, confirmed_statement) {
        (DestructiveClassification::NotDestructive, None) => {}
        (DestructiveClassification::RequiresConfirmation(statement), Some(confirmed))
            if confirmed == statement => {}
        (DestructiveClassification::RequiresConfirmation(statement), _) => {
            return Ok(ExecuteQueryResponse::ConfirmationRequired { statement });
        }
        (DestructiveClassification::NotDestructive, Some(_)) => {
            return Ok(ExecuteQueryResponse::Completed {
                page: None,
                result: QueryExecutionResult::Error {
                    message: "La confirmación ya no corresponde a esta consulta.".to_string(),
                    code: None,
                    position: None,
                },
            });
        }
    }

    let offset = page.as_ref().map_or(0, |page| page.offset);
    let page_size = page
        .as_ref()
        .map_or(DEFAULT_QUERY_ROW_LIMIT, |page| page.page_size)
        .clamp(1, MAX_QUERY_ROW_LIMIT);
    // Se piden page_size + 1 filas: si llega la extra, hay pagina siguiente
    // (el driver la descarta y marca `truncated`).
    //
    // Primero el orden (sobre la consulta entera) y despues la pagina.
    let sort = page
        .as_ref()
        .map(|page| page.sort.clone())
        .unwrap_or_default();
    let sortable = khipu_engine::pagination::sort_sql(
        sql,
        dialect,
        &[khipu_engine::pagination::SortKey {
            column: 0,
            descending: false,
        }],
    )
    .is_some();
    let sorted_sql = khipu_engine::pagination::sort_sql(sql, dialect, &sort);
    let base_sql = sorted_sql.as_deref().unwrap_or(sql);
    let paged_sql =
        khipu_engine::pagination::paginate_sql(base_sql, dialect, offset, page_size as u64 + 1);
    let pageable = paged_sql.is_some();
    let result = connector
        .execute_query(
            paged_sql.as_deref().unwrap_or(base_sql),
            QueryExecutionOptions {
                max_rows: page_size,
            },
        )
        .await;

    let page = matches!(result, QueryExecutionResult::ResultSet { .. }).then_some(PageInfo {
        offset: if pageable { offset } else { 0 },
        page_size,
        pageable,
        sortable,
    });
    Ok(ExecuteQueryResponse::Completed { result, page })
}

/// Total rows `sql` would return, via `SELECT COUNT(*) FROM (...)`. Only
/// for statements `execute_query` can paginate.
#[tauri::command]
async fn count_query_rows(
    sql: String,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<u64, String> {
    let (connector, dialect) = {
        let guard = state
            .connections
            .lock()
            .expect("connections mutex poisoned");
        let active = guard
            .get(window.label())
            .ok_or_else(|| "No hay ninguna conexión activa.".to_string())?;
        (Arc::clone(&active.connector), active.dialect)
    };
    let count_sql = khipu_engine::pagination::count_sql(sql.trim(), dialect)
        .ok_or_else(|| "No se puede contar el total de esta consulta.".to_string())?;
    match connector
        .execute_query(&count_sql, QueryExecutionOptions { max_rows: 1 })
        .await
    {
        QueryExecutionResult::ResultSet { rows, .. } => rows
            .first()
            .and_then(|row| row.first().cloned().flatten())
            .and_then(|value| value.parse::<u64>().ok())
            .ok_or_else(|| "El servidor no devolvió un total.".to_string()),
        QueryExecutionResult::Error { message, .. } => Err(message),
        QueryExecutionResult::Command { .. } => {
            Err("El servidor no devolvió un total.".to_string())
        }
    }
}

#[tauri::command]
async fn table_definition(
    schema: String,
    table: String,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let connector = {
        let guard = state
            .connections
            .lock()
            .expect("connections mutex poisoned");
        match guard.get(window.label()) {
            Some(active) => Arc::clone(&active.connector),
            None => return Err("No hay ninguna conexión activa.".to_string()),
        }
    };

    connector
        .table_definition(&schema, &table)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn test_connection(
    kind: drivers::DatabaseKind,
    config: ConnectionConfig,
) -> Result<drivers::TestConnectionReport, String> {
    drivers::test_connection(kind, &config)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_connection_password(profile_id: String, password: String) -> Result<(), String> {
    credentials::save(profile_id, password).await
}

#[tauri::command]
async fn load_connection_password(profile_id: String) -> Result<Option<String>, String> {
    credentials::load(profile_id).await
}

#[tauri::command]
async fn delete_connection_password(profile_id: String) -> Result<(), String> {
    credentials::delete(profile_id).await
}

#[tauri::command]
async fn read_sql_file(path: String) -> Result<String, String> {
    sql_files::read(path).await
}

#[tauri::command]
async fn write_sql_file(path: String, contents: String) -> Result<(), String> {
    sql_files::write(path, contents).await
}

#[tauri::command]
async fn rename_sql_file(path: String, new_name: String) -> Result<String, String> {
    sql_files::rename(path, new_name).await
}

#[tauri::command]
async fn list_sql_dir(path: String) -> Result<Vec<sql_files::SqlDirEntry>, String> {
    sql_files::list_dir(path).await
}

#[tauri::command]
async fn create_sql_file(dir: String, name: String) -> Result<String, String> {
    sql_files::create(dir, name).await
}

#[tauri::command]
async fn trash_sql_file(path: String) -> Result<(), String> {
    sql_files::trash(path).await
}

/// Runs `f` against the active connection while holding the lock. Only
/// for synchronous work (analysis, SQL generation): the catalog is read in
/// place instead of cloned.
fn with_active_connection<T>(
    window: &tauri::Window,
    state: &tauri::State<'_, AppState>,
    f: impl FnOnce(&ActiveConnection) -> Result<T, String>,
) -> Result<T, String> {
    let guard = state
        .connections
        .lock()
        .expect("connections mutex poisoned");
    let active = guard
        .get(window.label())
        .ok_or_else(|| "No hay ninguna conexión activa.".to_string())?;
    f(active)
}

/// Whether the rows of `sql` can be edited from the grid, and how each
/// result column maps onto the source table. `Err` carries the reason
/// shown to the user.
#[tauri::command]
fn result_edit_info(
    sql: String,
    column_names: Vec<String>,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<result_editing::ResultEditInfo, String> {
    with_active_connection(&window, &state, |active| {
        result_editing::edit_info(
            sql.trim(),
            active.dialect,
            &active.default_schema,
            &active.schemas,
            &column_names,
        )
    })
}

/// The exact SQL `apply_result_changes` would run, for the preview.
#[tauri::command]
fn preview_result_changes(
    target: result_editing::EditTarget,
    changes: khipu_engine::editing::ResultChanges,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<String>, String> {
    with_active_connection(&window, &state, |active| {
        let statements =
            result_editing::statements(active.dialect, &active.schemas, &target, &changes)?;
        Ok(statements
            .into_iter()
            .map(|statement| statement.sql)
            .collect())
    })
}

/// Applies the pending grid changes in one transaction (all or nothing).
#[tauri::command]
async fn apply_result_changes(
    target: result_editing::EditTarget,
    changes: khipu_engine::editing::ResultChanges,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<u64, khipu_driver_core::TransactionError> {
    let (connector, statements) = with_active_connection(&window, &state, |active| {
        let statements =
            result_editing::statements(active.dialect, &active.schemas, &target, &changes)?;
        Ok((Arc::clone(&active.connector), statements))
    })
    .map_err(|message| khipu_driver_core::TransactionError {
        statement_index: None,
        message,
        code: None,
    })?;
    if statements.is_empty() {
        return Ok(0);
    }
    connector.execute_in_transaction(&statements).await
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportSummary {
    rows: u64,
    path: String,
    elapsed_ms: u64,
}

/// "Exportar datos": vuelve a ejecutar la consulta del resultado SIN limite
/// de filas y la escribe al archivo fila por fila (export.rs). Solo para
/// consultas de lectura: re-ejecutar un UPDATE ... RETURNING modificaria
/// los datos otra vez.
/// Lo que pide "Exportar datos" (ver export_query_to_file).
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportRequest {
    sql: String,
    #[serde(default)]
    sort: Vec<khipu_engine::pagination::SortKey>,
    format: export::ExportFormat,
    headers: bool,
    table_name: String,
    path: String,
}

#[tauri::command]
async fn export_query_to_file(
    request: ExportRequest,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<ExportSummary, String> {
    let ExportRequest {
        sql,
        sort,
        format,
        headers,
        table_name,
        path,
    } = request;
    let sql = sql.trim().to_string();
    let path = export::validated_path(&path)?;
    let (connector, export_sql) = with_active_connection(&window, &state, |active| {
        if !khipu_engine::pagination::is_read_only_query(&sql, active.dialect) {
            return Err("Solo se pueden exportar consultas de lectura (SELECT).".to_string());
        }
        // El archivo sale en el mismo orden que el grid (orden de los
        // encabezados, aplicado en la base igual que al paginar).
        let sorted = khipu_engine::pagination::sort_sql(&sql, active.dialect, &sort);
        Ok((
            Arc::clone(&active.connector),
            sorted.unwrap_or_else(|| sql.clone()),
        ))
    })?;
    let start = std::time::Instant::now();
    let mut sink = export::FileSink::create(&path, format, headers, table_name)?;
    let rows = connector.stream_query(&export_sql, &mut sink).await?;
    Ok(ExportSummary {
        rows,
        path: path.to_string_lossy().into_owned(),
        elapsed_ms: start.elapsed().as_millis() as u64,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        // Remembers size, position and maximized state of the main window.
        // Connection windows get a random label (connectionWindow.ts), so
        // tracking them would only pile up entries that are never reused.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::SIZE | StateFlags::POSITION | StateFlags::MAXIMIZED)
                .with_filter(|label| label == "main")
                .build(),
        )
        .manage(AppState::default())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(state) = window.try_state::<AppState>() {
                    state
                        .connections
                        .lock()
                        .expect("connections mutex poisoned")
                        .remove(window.label());
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            list_tables,
            database_explorer,
            set_visible_schemas,
            connect,
            disconnect,
            execute_query,
            table_definition,
            test_connection,
            save_connection_password,
            load_connection_password,
            delete_connection_password,
            read_sql_file,
            write_sql_file,
            rename_sql_file,
            list_sql_dir,
            create_sql_file,
            trash_sql_file,
            count_query_rows,
            result_edit_info,
            preview_result_changes,
            apply_result_changes,
            export_query_to_file,
            updates::update_context,
            updates::list_releases,
            updates::install_release,
            updates::restart_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
