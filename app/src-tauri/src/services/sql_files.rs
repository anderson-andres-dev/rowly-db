//! Lectura y escritura de scripts `.sql` del usuario.
//!
//! Las rutas llegan desde el frontend (elegidas en los dialogos nativos de
//! abrir/guardar), asi que estos comandos solo aceptan archivos con
//! extension `.sql`: no sirven para leer ni pisar otros archivos del disco.

use crate::text_encoding::TextEncoding;
use khipu_driver_core::Message;
use serde::Serialize;
use std::path::{Path, PathBuf};

fn sql_path(path: &str) -> Result<PathBuf, Message> {
    let path = PathBuf::from(path);
    if !path.is_absolute() {
        return Err(Message::key("files.pathNotAbsolute"));
    }
    let is_sql = path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("sql"));
    if !is_sql {
        return Err(Message::key("files.onlySql"));
    }
    Ok(path)
}

fn absolute_dir(path: &str) -> Result<PathBuf, Message> {
    let path = PathBuf::from(path);
    if !path.is_absolute() {
        return Err(Message::key("files.folderNotAbsolute"));
    }
    Ok(path)
}

/// Una operacion de disco que fallo: la clave dice cual, con la ruta y el
/// error del sistema.
fn io_failure(key: &str, path: &Path, error: impl ToString) -> Message {
    Message::key(key)
        .with("path", path.display())
        .with("error", error.to_string())
}

fn is_sql_file_name(name: &str) -> bool {
    Path::new(name)
        .extension()
        .is_some_and(|extension| extension.eq_ignore_ascii_case("sql"))
}

/// Nombre de archivo escrito por el usuario: sin separadores de carpeta y
/// con `.sql` agregado si no lo trae.
fn sql_file_name(name: &str) -> Result<String, Message> {
    let trimmed = name.trim();
    if trimmed.is_empty() || trimmed.contains(['/', '\\']) || trimmed == "." || trimmed == ".." {
        return Err(Message::key("files.invalidName"));
    }
    Ok(if is_sql_file_name(trimmed) {
        trimmed.to_string()
    } else {
        format!("{trimmed}.sql")
    })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SqlDirEntry {
    name: String,
    path: String,
    is_dir: bool,
}

/// Contenido de UNA carpeta (sin recursion: el arbol pide cada subcarpeta
/// al expandirla). Solo carpetas y archivos .sql, sin ocultos; carpetas
/// primero y luego por nombre, sin distinguir mayusculas.
pub async fn list_dir(path: String) -> Result<Vec<SqlDirEntry>, Message> {
    let dir = absolute_dir(&path)?;
    let mut reader = tokio::fs::read_dir(&dir)
        .await
        .map_err(|error| io_failure("files.openFailed", &dir, error))?;
    let mut entries = Vec::new();
    while let Some(entry) = reader
        .next_entry()
        .await
        .map_err(|error| io_failure("files.readFailed", &dir, error))?
    {
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') {
            continue;
        }
        // metadata() sigue enlaces simbolicos: un enlace a carpeta se
        // muestra como carpeta.
        let Ok(metadata) = tokio::fs::metadata(entry.path()).await else {
            continue;
        };
        let is_dir = metadata.is_dir();
        // Carpetas y archivos .sql; lo demas no se lista.
        if !(is_dir || metadata.is_file() && is_sql_file_name(&name)) {
            continue;
        }
        entries.push(SqlDirEntry {
            name,
            path: entry.path().to_string_lossy().into_owned(),
            is_dir,
        });
    }
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(entries)
}

/// Crea un .sql vacio en `dir` y devuelve su ruta. Falla si ya existe.
pub async fn create(dir: String, name: String) -> Result<String, Message> {
    let dir = absolute_dir(&dir)?;
    let path = dir.join(sql_file_name(&name)?);
    tokio::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
        .await
        .map_err(|error| match error.kind() {
            std::io::ErrorKind::AlreadyExists => {
                Message::key("files.alreadyExists").with("path", path.display())
            }
            _ => io_failure("files.createFailed", &path, error),
        })?;
    Ok(path.to_string_lossy().into_owned())
}

/// Manda el .sql a la papelera del sistema (no lo borra para siempre).
pub async fn trash(path: String) -> Result<(), Message> {
    let path = sql_path(&path)?;
    tauri::async_runtime::spawn_blocking(move || {
        ::trash::delete(&path).map_err(|error| io_failure("files.trashFailed", &path, error))
    })
    .await
    .map_err(|error| Message::from(error.to_string()))?
}

/// El texto de un .sql y el encoding en que estaba (text_encoding.rs).
#[derive(Debug, Serialize)]
pub struct SqlFileText {
    pub contents: String,
    pub encoding: TextEncoding,
}

pub async fn read(path: String) -> Result<SqlFileText, Message> {
    let path = sql_path(&path)?;
    let bytes = tokio::fs::read(&path)
        .await
        .map_err(|error| io_failure("files.readFailed", &path, error))?;
    let (contents, encoding) = crate::text_encoding::decode(&bytes);
    Ok(SqlFileText { contents, encoding })
}

/// Guarda en el encoding del archivo. Un caracter que no tiene lugar en el
/// (un emoji en Windows-1252) no se guarda a medias: se avisa cual es.
pub async fn write(path: String, contents: String, encoding: TextEncoding) -> Result<(), Message> {
    let path = sql_path(&path)?;
    let bytes = crate::text_encoding::encode(&contents, encoding).map_err(|character| {
        Message::key("files.unencodable")
            .with("character", character)
            .with("encoding", encoding_label(encoding))
    })?;
    tokio::fs::write(&path, bytes)
        .await
        .map_err(|error| io_failure("files.saveFailed", &path, error))
}

fn encoding_label(encoding: TextEncoding) -> &'static str {
    match encoding {
        TextEncoding::Utf8 => "UTF-8",
        TextEncoding::Utf8Bom => "UTF-8 BOM",
        TextEncoding::Utf16Le => "UTF-16 LE",
        TextEncoding::Utf16Be => "UTF-16 BE",
        TextEncoding::Windows1252 => "Windows-1252",
    }
}

/// Renombra el archivo dentro de su misma carpeta y devuelve la ruta nueva.
/// `new_name` es solo el nombre (sin carpeta); si no trae `.sql`, se agrega.
pub async fn rename(path: String, new_name: String) -> Result<String, Message> {
    let from = sql_path(&path)?;
    let file_name = sql_file_name(&new_name)?;
    let to = from
        .parent()
        .ok_or_else(|| Message::key("files.noParent"))?
        .join(file_name);
    if to == from {
        return Ok(to.to_string_lossy().into_owned());
    }
    if tokio::fs::try_exists(&to).await.unwrap_or(false) {
        return Err(Message::key("files.alreadyExists").with("path", to.display()));
    }
    tokio::fs::rename(&from, &to)
        .await
        .map_err(|error| io_failure("files.renameFailed", &from, error))?;
    Ok(to.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::{sql_file_name, sql_path};

    #[test]
    fn nombre_de_archivo_agrega_extension_y_rechaza_carpetas() {
        assert_eq!(sql_file_name("ventas").unwrap(), "ventas.sql");
        assert_eq!(sql_file_name("ventas.SQL").unwrap(), "ventas.SQL");
        assert!(sql_file_name("../ventas").is_err());
        assert!(sql_file_name("  ").is_err());
    }

    #[cfg(unix)]
    #[test]
    fn solo_acepta_rutas_absolutas_sql() {
        assert!(sql_path("/tmp/consulta.sql").is_ok());
        assert!(sql_path("/tmp/CONSULTA.SQL").is_ok());
        assert!(sql_path("/etc/passwd").is_err());
        assert!(sql_path("consulta.sql").is_err());
    }
}
