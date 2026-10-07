//! Ejecutar SQL: paginar y ordenar, clasificar con el guard antes de
//! ejecutar, analizar mientras se escribe, cancelar y contar filas.

use crate::engine_context::ConnectionEngineContext;
use crate::state::{AppState, RunningQuery, follow_console, with_active_connection};
use khipu_driver_core::{Message, QueryCancel, QueryExecutionOptions, QueryExecutionResult};
use khipu_engine::Dialect;
use khipu_engine::execution_guard::{
    DestructiveClassification, DestructiveStatement, GuardOptions, classify_sql_with,
};
use khipu_engine::pagination::ColumnFilter;
use serde::Serialize;
use std::sync::Arc;
/// Page size when the frontend doesn't ask for one.
pub(crate) const DEFAULT_QUERY_ROW_LIMIT: usize = 500;
/// Upper bound for a requested page size ("Todas" included): the result grid
/// mounts every row it receives, so this keeps a single page from freezing
/// the WebView. Whatever the WebView asks for is clamped to this.
pub(crate) const MAX_QUERY_ROW_LIMIT: usize = 10_000;

/// Page requested by the frontend (row offset + page size).
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PageRequest {
    offset: u64,
    page_size: usize,
    /// Orden pedido desde los encabezados del grid (vacio = el de la
    /// consulta).
    #[serde(default)]
    sort: Vec<khipu_engine::pagination::SortKey>,
    /// Filtros del embudo de las columnas (vacio = sin filtro). Se aplican
    /// antes de ordenar y paginar; si no se pueden escribir, `PageInfo`
    /// lo dice y la UI filtra lo cargado.
    #[serde(default)]
    filters: Vec<ColumnFilter>,
}

/// How the returned rows map onto the full result. `pageable: false` means
/// the statement couldn't be rewritten with LIMIT/OFFSET (SHOW, FOR
/// UPDATE, ...): only the first page is available.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PageInfo {
    offset: u64,
    page_size: usize,
    pageable: bool,
    /// La sentencia se puede ordenar desde el grid (se puede reescribir su
    /// ORDER BY). Si no, los encabezados no ofrecen ordenar.
    sortable: bool,
    /// Los filtros pedidos se aplicaron en la base: las filas, la pagina y
    /// el total ya son los filtrados.
    filtered: bool,
}

#[derive(Debug, Serialize)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub(crate) enum ExecuteQueryResponse {
    ConfirmationRequired {
        statement: DestructiveStatement,
    },
    Completed {
        result: QueryExecutionResult,
        #[serde(skip_serializing_if = "Option::is_none")]
        page: Option<PageInfo>,
        /// La sentencia cambio el modo de la sesion: el contexto nuevo, con
        /// otra generacion (state::follow_console).
        #[serde(skip_serializing_if = "Option::is_none")]
        context: Option<Box<ConnectionEngineContext>>,
        /// La sesion de la consola se perdio y la que sigue empieza limpia.
        #[serde(skip_serializing_if = "std::ops::Not::not")]
        session_reset: bool,
    },
}

impl ExecuteQueryResponse {
    /// Un resultado sin pagina ni cambios en la sesion.
    fn completed(result: QueryExecutionResult) -> Self {
        Self::Completed {
            result,
            page: None,
            context: None,
            session_reset: false,
        }
    }
}

#[tauri::command]
pub async fn execute_query(
    sql: String,
    confirmed_statement: Option<DestructiveStatement>,
    page: Option<PageRequest>,
    execution_id: Option<String>,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<ExecuteQueryResponse, Message> {
    let sql = sql.trim();
    if sql.is_empty() {
        return Ok(ExecuteQueryResponse::completed(
            QueryExecutionResult::Error {
                message: Message::key("query.empty"),
                code: None,
                position: None,
            },
        ));
    }

    let (connector, dialect, production, guard_options) = {
        let guard = state
            .connections
            .lock()
            .expect("connections mutex poisoned");
        match guard.get(window.label()) {
            Some(active) => (
                Arc::clone(&active.connector),
                active.dialect,
                active.production,
                active.guard_options(),
            ),
            None => {
                return Ok(ExecuteQueryResponse::completed(
                    QueryExecutionResult::Error {
                        message: Message::key("noActiveConnection"),
                        code: None,
                        position: None,
                    },
                ));
            }
        }
    };

    let classification = match classify_sql_with(sql, dialect, production, guard_options) {
        Ok(classification) => classification,
        Err(error) => {
            return Ok(ExecuteQueryResponse::completed(
                QueryExecutionResult::Error {
                    message: error.to_string().into(),
                    code: None,
                    position: None,
                },
            ));
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
            return Ok(ExecuteQueryResponse::completed(
                QueryExecutionResult::Error {
                    message: Message::key("query.staleConfirmation"),
                    code: None,
                    position: None,
                },
            ));
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
    // Primero el filtro, despues el orden (sobre todas las filas que pasan)
    // y por ultimo la pagina.
    let sort = page
        .as_ref()
        .map(|page| page.sort.clone())
        .unwrap_or_default();
    let filtered_sql = page.as_ref().and_then(|page| {
        khipu_engine::pagination::filter_sql(sql, dialect, guard_options, &page.filters)
    });
    let filtered = filtered_sql.is_some();
    let source_sql = filtered_sql.as_deref().unwrap_or(sql);
    let sortable = khipu_engine::pagination::sort_sql(
        sql,
        dialect,
        guard_options,
        &[khipu_engine::pagination::SortKey {
            column: 0,
            descending: false,
        }],
    )
    .is_some();
    let sorted_sql = khipu_engine::pagination::sort_sql(source_sql, dialect, guard_options, &sort);
    let base_sql = sorted_sql.as_deref().unwrap_or(source_sql);
    let paged_sql = khipu_engine::pagination::paginate_sql(
        base_sql,
        dialect,
        guard_options,
        offset,
        page_size as u64 + 1,
    );
    let pageable = paged_sql.is_some();
    let final_sql = paged_sql.as_deref().unwrap_or(base_sql);
    let options = QueryExecutionOptions {
        max_rows: page_size,
    };
    let result = match execution_id {
        Some(id) => {
            let cancel = Arc::new(QueryCancel::default());
            state
                .running
                .lock()
                .expect("running queries mutex poisoned")
                .insert(id.clone(), Arc::clone(&cancel));
            let _running = RunningQuery { state: &state, id };
            connector
                .execute_query_cancellable(final_sql, options, &cancel)
                .await
        }
        None => connector.execute_query(final_sql, options).await,
    };

    // La posicion del error, referida al SQL del usuario y no al reescrito
    // para ordenar o paginar (error_position.rs).
    let result = match result {
        QueryExecutionResult::Error {
            message,
            code,
            position: Some(position),
        } => QueryExecutionResult::Error {
            message,
            code,
            position: khipu_engine::error_position::map_error_position(sql, final_sql, position),
        },
        other => other,
    };
    let page = matches!(result, QueryExecutionResult::ResultSet { .. }).then_some(PageInfo {
        offset: if pageable { offset } else { 0 },
        page_size,
        pageable,
        sortable,
        filtered,
    });
    let change = follow_console(window.label(), &state, &connector, dialect, sql).await;
    Ok(ExecuteQueryResponse::Completed {
        result,
        page,
        context: change.context.map(Box::new),
        session_reset: change.reset,
    })
}

/// Lo que se vuelve a leer del servidor sin que el usuario lo ejecute de nuevo
/// (contar filas, exportar): solo una lectura, y lo decide el guard con las
/// opciones de la sesion (NO_BACKSLASH_ESCAPES incluido), como en
/// execute_query. `Err`: el guard no lo pudo leer.
pub(crate) fn read_only(
    sql: &str,
    dialect: Dialect,
    production: bool,
    options: GuardOptions,
) -> Result<bool, Message> {
    match classify_sql_with(sql, dialect, production, options) {
        Ok(DestructiveClassification::NotDestructive) => {
            Ok(khipu_engine::pagination::is_read_only_query(sql, dialect))
        }
        Ok(DestructiveClassification::RequiresConfirmation(_)) => Ok(false),
        Err(error) => Err(error.to_string().into()),
    }
}

/// What a script needs to know before running anything: for each
/// statement, whether it needs confirmation (same rules as `execute_query`)
/// or can't be analyzed at all. The frontend confirms them all at once and
/// then runs them one by one with `execute_query`, which checks each again.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StatementCheck {
    #[serde(skip_serializing_if = "Option::is_none")]
    confirmation: Option<DestructiveStatement>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[tauri::command]
pub fn classify_statements(
    statements: Vec<String>,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<StatementCheck>, Message> {
    let (dialect, production, options) = {
        let guard = state
            .connections
            .lock()
            .expect("connections mutex poisoned");
        let active = guard
            .get(window.label())
            .ok_or_else(|| Message::key("noActiveConnection"))?;
        (active.dialect, active.production, active.guard_options())
    };
    Ok(statements
        .iter()
        .map(|statement| check_statement(statement, dialect, production, options))
        .collect())
}

pub(crate) fn check_statement(
    statement: &str,
    dialect: Dialect,
    production: bool,
    options: GuardOptions,
) -> StatementCheck {
    match classify_sql_with(statement.trim(), dialect, production, options) {
        Ok(DestructiveClassification::NotDestructive) => StatementCheck {
            confirmation: None,
            error: None,
        },
        Ok(DestructiveClassification::RequiresConfirmation(kind)) => StatementCheck {
            confirmation: Some(kind),
            error: None,
        },
        Err(error) => StatementCheck {
            confirmation: None,
            error: Some(error.to_string()),
        },
    }
}

/// Diagnostics while typing (khipu_engine::diagnostics): syntax, and names
/// checked against the loaded catalog. Never touches the database. One list
/// per statement, positions relative to it.
#[tauri::command]
pub fn analyze_sql(
    statements: Vec<String>,
    // Lo que crea el documento (CREATE [TEMPORARY] TABLE/VIEW): ver
    // `CatalogView::created`.
    created: Option<Vec<String>>,
    // La generacion y el `schema_epoch` del contexto con que el editor arma
    // su cache (ConnectionEngineContext): si la conexion o sus schemas ya
    // cambiaron, el resultado se guardaria con la clave de otros.
    generation: u64,
    schema_epoch: u64,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Vec<khipu_engine::diagnostics::Diagnostic>>, Message> {
    // Solo lo necesario bajo el candado (el catalogo es compartido: no se
    // copia); el analisis corre despues, sin bloquear execute_query.
    let (catalog, dialect, no_backslash_escapes, line, default_schema, loaded_schemas) =
        with_active_connection(&window, &state, |active| {
            if !active.context.is_current(generation, schema_epoch) {
                return Err(Message::key("analysisOutdated"));
            }
            Ok((
                Arc::clone(&active.catalog),
                active.dialect,
                active.context.session_mode.no_backslash_escapes,
                active.context.analysis_line(),
                active.default_schema.clone(),
                active.schemas.keys().cloned().collect::<Vec<_>>(),
            ))
        })?;
    // La linea con la instantanea de lineas que la conexion tomo al conectar.
    let line = line
        .as_ref()
        .and_then(|(lines, id)| lines.get(id).map(|line| (&**lines, line)));
    let view = khipu_engine::diagnostics::CatalogView {
        tables: &catalog.tables,
        loaded_schemas: loaded_schemas.iter().map(String::as_str).collect(),
        default_schema: &default_schema,
        created: created.iter().flatten().map(String::as_str).collect(),
    };
    Ok(statements
        .iter()
        .map(|statement| {
            khipu_engine::diagnostics::analyze_statement_with(
                statement,
                dialect,
                Some(&view),
                no_backslash_escapes,
                line,
            )
        })
        .collect())
}

/// Interrupts the query started with `execution_id` (see `execute_query`).
/// It then ends with the server's own error, which the frontend shows as
/// cancelled. Nothing to do if it already ended.
#[tauri::command]
pub async fn cancel_query(
    execution_id: String,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<(), Message> {
    let Some(cancel) = state
        .running
        .lock()
        .expect("running queries mutex poisoned")
        .get(&execution_id)
        .cloned()
    else {
        return Ok(());
    };
    let connector = {
        let guard = state
            .connections
            .lock()
            .expect("connections mutex poisoned");
        match guard.get(window.label()) {
            Some(active) => Arc::clone(&active.connector),
            None => return Ok(()),
        }
    };
    connector
        .cancel_query(&cancel)
        .await
        .map_err(|e| Message::from(e.to_string()))
}

/// Total rows `sql` would return, via `SELECT COUNT(*) FROM (...)`. Only
/// for statements `execute_query` can paginate. With `filters`, the rows
/// that pass them (the same rewrite `execute_query` pages).
#[tauri::command]
pub async fn count_query_rows(
    sql: String,
    filters: Option<Vec<ColumnFilter>>,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<u64, Message> {
    let sql = sql.trim();
    let (connector, count_sql) = with_active_connection(&window, &state, |active| {
        // El texto llega de la UI: el guard decide aqui, no la ejecucion
        // anterior que la UI recuerda.
        read_only(
            sql,
            active.dialect,
            active.production,
            active.guard_options(),
        )?
        .then_some(())
        .ok_or_else(|| Message::key("count.unsupported"))?;
        let filters = filters.as_deref().unwrap_or_default();
        let filtered = if filters.iter().any(|filter| !filter.excluded.is_empty()) {
            Some(
                khipu_engine::pagination::filter_sql(
                    sql,
                    active.dialect,
                    active.guard_options(),
                    filters,
                )
                .ok_or_else(|| Message::key("count.unsupported"))?,
            )
        } else {
            None
        };
        let count_sql = khipu_engine::pagination::count_sql(
            filtered.as_deref().unwrap_or(sql),
            active.dialect,
            active.guard_options(),
        )
        .ok_or_else(|| Message::key("count.unsupported"))?;
        Ok((Arc::clone(&active.connector), count_sql))
    })?;
    match connector
        .execute_query(&count_sql, QueryExecutionOptions { max_rows: 1 })
        .await
    {
        QueryExecutionResult::ResultSet { rows, .. } => rows
            .first()
            .and_then(|row| row.first().cloned().flatten())
            .and_then(|value| value.parse::<u64>().ok())
            .ok_or_else(|| Message::key("count.noTotal")),
        QueryExecutionResult::Error { message, .. } => Err(message),
        QueryExecutionResult::Command { .. } => Err(Message::key("count.noTotal")),
    }
}

/// Tope de valores distintos que muestra el embudo de una columna (los mas
/// frecuentes): el resto se acota buscando.
const MAX_COLUMN_VALUES: usize = 5_000;

/// Un valor distinto de la columna, con cuantas filas quedan con los
/// filtros de las otras columnas y cuantas lo tienen en total.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ColumnValue {
    value: Option<String>,
    remaining: u64,
    rows: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ColumnValues {
    values: Vec<ColumnValue>,
    /// Hay mas valores que los que vinieron.
    truncated: bool,
}

/// Los valores del embudo de `column` en todo el resultado de `sql`, no
/// solo en la pagina cargada (`pagination::column_values_sql`).
#[tauri::command]
pub async fn column_values(
    sql: String,
    filters: Vec<ColumnFilter>,
    column: ColumnFilter,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<ColumnValues, Message> {
    let sql = sql.trim();
    let (connector, values_sql) = with_active_connection(&window, &state, |active| {
        read_only(
            sql,
            active.dialect,
            active.production,
            active.guard_options(),
        )?
        .then_some(())
        .ok_or_else(|| Message::key("filter.unsupported"))?;
        let values_sql = khipu_engine::pagination::column_values_sql(
            sql,
            active.dialect,
            active.guard_options(),
            &filters,
            &column,
            MAX_COLUMN_VALUES as u64 + 1,
        )
        .ok_or_else(|| Message::key("filter.unsupported"))?;
        Ok((Arc::clone(&active.connector), values_sql))
    })?;
    let count = |value: Option<&Option<String>>| {
        value
            .and_then(|value| value.as_deref())
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or(0)
    };
    match connector
        .execute_query(
            &values_sql,
            QueryExecutionOptions {
                max_rows: MAX_COLUMN_VALUES,
            },
        )
        .await
    {
        QueryExecutionResult::ResultSet {
            rows, truncated, ..
        } => Ok(ColumnValues {
            values: rows
                .iter()
                .map(|row| ColumnValue {
                    value: row.first().cloned().flatten(),
                    remaining: count(row.get(1)),
                    rows: count(row.get(2)),
                })
                .collect(),
            truncated,
        }),
        QueryExecutionResult::Error { message, .. } => Err(message),
        QueryExecutionResult::Command { .. } => Err(Message::key("filter.unsupported")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_script_is_checked_statement_by_statement() {
        let checks: Vec<StatementCheck> = ["SELECT 1;", "DELETE FROM t;", "SELEC nada"]
            .iter()
            .map(|sql| check_statement(sql, Dialect::MySql, false, GuardOptions::default()))
            .collect();
        assert!(checks[0].confirmation.is_none() && checks[0].error.is_none());
        assert_eq!(
            checks[1].confirmation,
            Some(DestructiveStatement::DeleteWithoutWhere)
        );
        assert!(checks[2].error.is_some());
    }

    #[test]
    fn routine_is_checked_whole_and_is_not_rewritten_before_execution() {
        let sql = "CREATE PROCEDURE p() BEGIN SELECT 1; SELECT 2; END";
        assert!(
            check_statement(sql, Dialect::MySql, false, GuardOptions::default())
                .error
                .is_none()
        );
        assert!(
            khipu_engine::pagination::sort_sql(
                sql,
                Dialect::MySql,
                GuardOptions::default(),
                &[khipu_engine::pagination::SortKey {
                    column: 0,
                    descending: false,
                }]
            )
            .is_none()
        );
        assert!(
            khipu_engine::pagination::paginate_sql(
                sql,
                Dialect::MySql,
                GuardOptions::default(),
                0,
                501
            )
            .is_none()
        );
        let bad = "CREATE PROCEDURE p() BEGIN SELECT 1; END; DROP TABLE t";
        assert!(
            check_statement(bad, Dialect::MySql, false, GuardOptions::default())
                .error
                .is_some()
        );
    }

    #[test]
    fn only_what_the_guard_reads_as_a_single_read_is_counted_or_exported() {
        let plain = GuardOptions::default();
        let read = |sql: &str, options| read_only(sql, Dialect::MySql, false, options);
        assert_eq!(read("SELECT * FROM t", plain), Ok(true));
        assert_eq!(read("DELETE FROM t WHERE id = 1", plain), Ok(false));
        assert_eq!(read("UPDATE t SET a = 1 RETURNING a", plain), Ok(false));
        assert!(read("SELECT 1; DELETE FROM t", plain).is_err());
        // Con NO_BACKSLASH_ESCAPES la barra no escapa: lo que sigue a la
        // cadena es otra sentencia, y el guard lo ve.
        let sql = "SELECT '\\'; DELETE FROM t; -- '";
        let no_escapes = GuardOptions {
            no_backslash_escapes: true,
        };
        assert!(read(sql, no_escapes).is_err());
        // Con las reglas normales la barra escapa la comilla: es una sola
        // lectura. Sin las opciones de la sesion se habria contado.
        assert_eq!(read(sql, plain), Ok(true));
        // En produccion, leer no pide confirmacion: se puede contar.
        assert_eq!(
            read_only("SELECT 1", Dialect::Postgres, true, plain),
            Ok(true)
        );
    }

    #[test]
    fn in_production_every_write_needs_confirmation() {
        let insert = check_statement(
            "INSERT INTO t VALUES (1)",
            Dialect::Postgres,
            true,
            GuardOptions::default(),
        );
        assert_eq!(
            insert.confirmation,
            Some(DestructiveStatement::WriteInProduction)
        );
        let select = check_statement("SELECT 1", Dialect::Postgres, true, GuardOptions::default());
        assert!(select.confirmation.is_none());
    }

    /// La forma que lee el frontend (queryExecution.ts): no cambia al mover
    /// los comandos de sitio.
    #[test]
    fn execute_query_answers_keep_their_shape() {
        let confirmation = ExecuteQueryResponse::ConfirmationRequired {
            statement: DestructiveStatement::DeleteWithoutWhere,
        };
        assert_eq!(
            serde_json::to_value(&confirmation).unwrap(),
            serde_json::json!({ "type": "confirmationRequired", "statement": "deleteWithoutWhere" })
        );
        let completed = ExecuteQueryResponse::Completed {
            result: QueryExecutionResult::Command {
                affected_rows: 2,
                execution_time_ms: 3,
            },
            page: Some(PageInfo {
                offset: 0,
                page_size: 500,
                pageable: true,
                sortable: false,
                filtered: false,
            }),
            context: None,
            session_reset: true,
        };
        let value = serde_json::to_value(&completed).unwrap();
        assert_eq!(value["type"], "completed");
        assert_eq!(
            value["page"],
            serde_json::json!({ "offset": 0, "pageSize": 500, "pageable": true, "sortable": false, "filtered": false })
        );
        assert_eq!(value["sessionReset"], true);
        // La pagina que pide el frontend, con los filtros del embudo (NULL
        // como null) y sin ellos.
        let request: PageRequest = serde_json::from_value(serde_json::json!({
            "offset": 0,
            "pageSize": 100,
            "filters": [{ "name": "estado", "dataType": "VARCHAR", "excluded": ["baja", null] }]
        }))
        .unwrap();
        assert_eq!(
            request.filters,
            [ColumnFilter {
                name: "estado".into(),
                data_type: "VARCHAR".into(),
                excluded: vec![Some("baja".into()), None],
            }]
        );
        let request: PageRequest =
            serde_json::from_value(serde_json::json!({ "offset": 0, "pageSize": 100 })).unwrap();
        assert!(request.filters.is_empty());
        let without_page = ExecuteQueryResponse::completed(QueryExecutionResult::Command {
            affected_rows: 0,
            execution_time_ms: 0,
        });
        let value = serde_json::to_value(&without_page).unwrap();
        assert!(value.get("page").is_none());
        assert!(value.get("context").is_none());
        assert!(value.get("sessionReset").is_none());
        let check = check_statement(
            "DELETE FROM t",
            Dialect::MySql,
            false,
            GuardOptions::default(),
        );
        assert_eq!(
            serde_json::to_value(&check).unwrap(),
            serde_json::json!({ "confirmation": "deleteWithoutWhere" })
        );
        let page: PageRequest =
            serde_json::from_value(serde_json::json!({ "offset": 100, "pageSize": 50 })).unwrap();
        assert_eq!((page.offset, page.page_size, page.sort.len()), (100, 50, 0));
    }
}
