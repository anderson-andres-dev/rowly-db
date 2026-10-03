//! El texto de las consolas y los archivos .sql.

use crate::{console_texts, sql_files, text_encoding};
use khipu_driver_core::Message;
#[tauri::command]
pub async fn write_console_text(
    app: tauri::AppHandle,
    key: String,
    contents: String,
) -> Result<(), Message> {
    console_texts::write(&app, &key, contents).await
}

#[tauri::command]
pub async fn read_console_text(
    app: tauri::AppHandle,
    key: String,
) -> Result<Option<String>, Message> {
    console_texts::read(&app, &key).await
}

#[tauri::command]
pub async fn prune_console_texts(app: tauri::AppHandle, keep: Vec<String>) -> Result<(), Message> {
    console_texts::prune(&app, keep).await
}

#[tauri::command]
pub async fn read_sql_file(path: String) -> Result<sql_files::SqlFileText, Message> {
    sql_files::read(path).await
}

/// Sin `encoding` (una consola que se guarda por primera vez), UTF-8.
#[tauri::command]
pub async fn write_sql_file(
    path: String,
    contents: String,
    encoding: Option<text_encoding::TextEncoding>,
) -> Result<(), Message> {
    sql_files::write(
        path,
        contents,
        encoding.unwrap_or(text_encoding::TextEncoding::Utf8),
    )
    .await
}

#[tauri::command]
pub async fn rename_sql_file(path: String, new_name: String) -> Result<String, Message> {
    sql_files::rename(path, new_name).await
}

#[tauri::command]
pub async fn list_sql_dir(path: String) -> Result<Vec<sql_files::SqlDirEntry>, Message> {
    sql_files::list_dir(path).await
}

#[tauri::command]
pub async fn create_sql_file(dir: String, name: String) -> Result<String, Message> {
    sql_files::create(dir, name).await
}

#[tauri::command]
pub async fn trash_sql_file(path: String) -> Result<(), Message> {
    sql_files::trash(path).await
}
