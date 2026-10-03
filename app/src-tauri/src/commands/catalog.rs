//! El catalogo de la conexion: tablas para completar, el explorador, los
//! schemas visibles y la definicion de una tabla.

use crate::state::{ActiveConnection, AppState, DatabaseExplorer};
use khipu_driver_core::{Message, SchemaObjects};
use khipu_engine::catalog::CatalogTable;
use std::collections::BTreeMap;
use std::sync::Arc;
/// Tables and views of every loaded schema, for completion: adding a schema
/// in the explorer also makes its tables completable.
#[tauri::command]
pub fn list_tables(window: tauri::Window, state: tauri::State<'_, AppState>) -> Vec<CatalogTable> {
    state
        .connections
        .lock()
        .expect("connections mutex poisoned")
        .get(window.label())
        .map(|active| active.catalog.tables.clone())
        .unwrap_or_default()
}

#[tauri::command]
pub fn database_explorer(
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

pub(crate) fn schemas_to_load(
    wanted: &[String],
    existing: &BTreeMap<String, SchemaObjects>,
    refresh: bool,
) -> Vec<String> {
    wanted
        .iter()
        .filter(|name| refresh || !existing.contains_key(*name))
        .cloned()
        .collect()
}

/// Muestra `names` mas el schema por defecto. Introspecta los nuevos, o
/// todos si se pide refresh, y descarta los demas. Ignora nombres que el
/// servidor no liste. Si un schema falla, conserva su aviso en `warnings`.
#[tauri::command]
pub async fn set_visible_schemas(
    names: Vec<String>,
    refresh: Option<bool>,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<DatabaseExplorer, Message> {
    let (connector, generation, mut wanted, mut to_load, default_schema) = {
        let guard = state
            .connections
            .lock()
            .expect("connections mutex poisoned");
        let active = guard
            .get(window.label())
            .ok_or_else(|| Message::key("noActiveConnection"))?;

        let mut wanted: Vec<String> = names
            .into_iter()
            .filter(|name| active.available_schemas.contains(name))
            .collect();
        if !wanted.contains(&active.default_schema) {
            wanted.push(active.default_schema.clone());
        }
        let to_load = schemas_to_load(&wanted, &active.schemas, refresh.unwrap_or(false));
        (
            Arc::clone(&active.connector),
            active.context.generation,
            wanted,
            to_load,
            active.default_schema.clone(),
        )
    };

    let available = if refresh.unwrap_or(false) {
        connector.list_schemas().await.ok()
    } else {
        None
    };
    if let Some(names) = &available {
        wanted.retain(|name| name == &default_schema || names.contains(name));
        to_load.retain(|name| wanted.contains(name));
    }

    let mut loaded = Vec::with_capacity(to_load.len());
    for name in to_load {
        let objects = match connector.introspect_schema(&name).await {
            Ok(objects) => objects,
            Err(error) => {
                let mut objects = SchemaObjects::new(&name);
                objects
                    .warnings
                    .push(Message::key("introspect.schema").with("error", error));
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
        .ok_or_else(|| Message::key("noActiveConnection"))?;
    // Si mientras se introspectaba se conecto a otra base (otra generacion,
    // aunque sea el mismo perfil), lo cargado es de la conexion anterior y no
    // se mezcla con la nueva.
    if active.context.generation != generation {
        return Err(Message::key("connectionChanged"));
    }
    if let Some(names) = available {
        active.available_schemas = names;
    }
    active.set_schemas(|schemas| {
        schemas.retain(|name, _| wanted.contains(name));
        for objects in loaded {
            schemas.insert(objects.schema.clone(), objects);
        }
    });
    Ok(active.explorer())
}

#[tauri::command]
pub async fn table_definition(
    schema: String,
    table: String,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
) -> Result<String, Message> {
    let connector = {
        let guard = state
            .connections
            .lock()
            .expect("connections mutex poisoned");
        match guard.get(window.label()) {
            Some(active) => Arc::clone(&active.connector),
            None => return Err(Message::key("noActiveConnection")),
        }
    };

    connector
        .table_definition(&schema, &table)
        .await
        .map_err(|e| Message::from(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catalog_refresh_reloads_visible_schemas() {
        let wanted = vec!["core".to_string(), "other".to_string()];
        let existing = BTreeMap::from([("core".to_string(), SchemaObjects::new("core"))]);
        assert_eq!(schemas_to_load(&wanted, &existing, false), vec!["other"]);
        assert_eq!(schemas_to_load(&wanted, &existing, true), wanted);
    }
}
