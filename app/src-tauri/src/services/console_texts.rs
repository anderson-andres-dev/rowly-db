//! Texto de las consolas grandes, fuera del `localStorage` del WebView.
//!
//! `localStorage` admite unos 5–10 MB; una consola de 100 000 líneas o más no
//! cabe. Esos textos se guardan como archivos en
//! `<datos de la app>/consoles/<clave>.sql`. La clave la
//! arma el frontend a partir del id de la consola; solo se aceptan letras,
//! números, `-` y `_`, así que no puede salir de esa carpeta.

use khipu_driver_core::Message;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use tauri::Manager;

fn valid_key(key: &str) -> bool {
    !key.is_empty()
        && key.len() <= 120
        && key
            .chars()
            .all(|char| char.is_ascii_alphanumeric() || char == '-' || char == '_')
}

fn texts_dir(app: &tauri::AppHandle) -> Result<PathBuf, Message> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|error| Message::from(error.to_string()))?;
    Ok(base.join("consoles"))
}

fn text_path(dir: &Path, key: &str) -> Result<PathBuf, Message> {
    if !valid_key(key) {
        return Err(Message::key("files.invalidName"));
    }
    Ok(dir.join(format!("{key}.sql")))
}

fn io_failure(key: &str, path: &Path, error: impl ToString) -> Message {
    Message::key(key)
        .with("path", path.display())
        .with("error", error.to_string())
}

/// Escribe el texto de una consola. Primero a un temporal y después se
/// renombra: un corte a mitad nunca deja el archivo a medias.
pub async fn write(app: &tauri::AppHandle, key: &str, contents: String) -> Result<(), Message> {
    let dir = texts_dir(app)?;
    let path = text_path(&dir, key)?;
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|error| io_failure("files.saveFailed", &dir, error))?;
    let temporary = dir.join(format!("{key}.sql.tmp"));
    tokio::fs::write(&temporary, contents)
        .await
        .map_err(|error| io_failure("files.saveFailed", &temporary, error))?;
    tokio::fs::rename(&temporary, &path)
        .await
        .map_err(|error| io_failure("files.saveFailed", &path, error))
}

/// El texto guardado, o `None` si no hay.
pub async fn read(app: &tauri::AppHandle, key: &str) -> Result<Option<String>, Message> {
    let dir = texts_dir(app)?;
    let path = text_path(&dir, key)?;
    match tokio::fs::read_to_string(&path).await {
        Ok(contents) => Ok(Some(contents)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(io_failure("files.readFailed", &path, error)),
    }
}

/// Borra los textos de consolas que ya no existen (todo lo que no esté en
/// `keep`).
pub async fn prune(app: &tauri::AppHandle, keep: Vec<String>) -> Result<(), Message> {
    let dir = texts_dir(app)?;
    let keep: HashSet<String> = keep.into_iter().map(|key| format!("{key}.sql")).collect();
    let mut entries = match tokio::fs::read_dir(&dir).await {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(io_failure("files.readFailed", &dir, error)),
    };
    while let Ok(Some(entry)) = entries.next_entry().await {
        let name = entry.file_name().to_string_lossy().into_owned();
        if !keep.contains(&name) {
            let _ = tokio::fs::remove_file(entry.path()).await;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn solo_acepta_claves_sin_rutas() {
        assert!(valid_key("3f2c9a1e-7b1d-4c55-9d7e-0a1b2c3d4e5f"));
        assert!(valid_key("console-1790000000-abc_saved"));
        assert!(!valid_key(""));
        assert!(!valid_key("../fuera"));
        assert!(!valid_key("a/b"));
        assert!(!valid_key("a.sql"));
        assert!(!valid_key(&"x".repeat(121)));
    }
}
