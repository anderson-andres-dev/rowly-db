//! Lo que se hace con un resultado: editar sus filas desde el grid y
//! exportarlo a un archivo.

use crate::commands::query::read_only;
use crate::services::export;
use crate::services::result_editing;
use crate::state::{AppState, with_active_connection};
use khipu_driver_core::Message;
use serde::Serialize;
use std::sync::Arc;
/// Whether the rows of `sql` can be edited from the grid, and how each
/// result column maps onto the source table. `Err` carries the reason
/// shown to the user.
#[tauri::command]
pub fn result_edit_info(
    sql: String,
    column_names: Vec<String>,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<result_editing::ResultEditInfo, Message> {
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
pub fn preview_result_changes(
    target: result_editing::EditTarget,
    changes: khipu_engine::editing::ResultChanges,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<String>, Message> {
    with_active_connection(&window, &state, |active| {
        let statements = result_editing::statements(
            active.dialect,
            active.grid_backslash_escapes(),
            &active.schemas,
            &target,
            &changes,
        )?;
        Ok(statements
            .into_iter()
            .map(|statement| statement.sql)
            .collect())
    })
}

/// In production every write needs the user's explicit confirmation, and the
/// backend checks it: the UI shows the preview, but does not decide alone.
pub(crate) fn production_write_allowed(production: bool, confirmed: bool) -> Result<(), Message> {
    if production && !confirmed {
        return Err(Message::key("changes.productionNeedsConfirmation"));
    }
    Ok(())
}

/// Applies the pending grid changes in one transaction (all or nothing).
/// `confirmed`: the user confirmed this exact set of changes in the preview.
#[tauri::command]
pub async fn apply_result_changes(
    target: result_editing::EditTarget,
    changes: khipu_engine::editing::ResultChanges,
    confirmed: Option<bool>,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<u64, khipu_driver_core::TransactionError> {
    let (connector, statements) = with_active_connection(&window, &state, |active| {
        production_write_allowed(active.production, confirmed.unwrap_or(false))?;
        let statements = result_editing::statements(
            active.dialect,
            active.grid_backslash_escapes(),
            &active.schemas,
            &target,
            &changes,
        )?;
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
pub(crate) struct ExportSummary {
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
pub(crate) struct ExportRequest {
    sql: String,
    #[serde(default)]
    sort: Vec<khipu_engine::pagination::SortKey>,
    format: export::ExportFormat,
    headers: bool,
    table_name: String,
    path: String,
}

#[tauri::command]
pub async fn export_query_to_file(
    request: ExportRequest,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<ExportSummary, Message> {
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
    let (connector, export_sql, dialect) = with_active_connection(&window, &state, |active| {
        // El guard decide, con las opciones de la sesion (commands::query::read_only).
        if !read_only(
            &sql,
            active.dialect,
            active.production,
            active.guard_options(),
        )? {
            return Err(Message::key("export.readOnly"));
        }
        // El archivo sale en el mismo orden que el grid (orden de los
        // encabezados, aplicado en la base igual que al paginar).
        let sorted =
            khipu_engine::pagination::sort_sql(&sql, active.dialect, active.guard_options(), &sort);
        Ok((
            Arc::clone(&active.connector),
            sorted.unwrap_or_else(|| sql.clone()),
            active.dialect,
        ))
    })?;
    let start = std::time::Instant::now();
    let mut sink = export::FileSink::create(&path, format, headers, table_name, dialect)?;
    let rows = connector.stream_query(&export_sql, &mut sink).await?;
    Ok(ExportSummary {
        rows,
        path: path.to_string_lossy().into_owned(),
        elapsed_ms: start.elapsed().as_millis() as u64,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn grid_changes_in_production_need_the_users_confirmation() {
        assert!(production_write_allowed(true, false).is_err());
        assert!(production_write_allowed(true, true).is_ok());
        assert!(production_write_allowed(false, false).is_ok());
    }

    #[test]
    fn export_requests_and_summaries_keep_their_shape() {
        let summary = ExportSummary {
            rows: 3,
            path: "/tmp/x.csv".into(),
            elapsed_ms: 12,
        };
        assert_eq!(
            serde_json::to_value(&summary).unwrap(),
            serde_json::json!({ "rows": 3, "path": "/tmp/x.csv", "elapsedMs": 12 })
        );
        let request: ExportRequest = serde_json::from_value(serde_json::json!({
            "sql": "SELECT 1", "format": "csv", "headers": true, "tableName": "t", "path": "/tmp/x.csv"
        }))
        .unwrap();
        assert!(request.headers && request.sort.is_empty());
    }
}
