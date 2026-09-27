//! Exportacion de resultados a archivo ("Exportar datos"): la consulta se
//! vuelve a ejecutar SIN limite de filas y cada fila se escribe al archivo
//! apenas llega (DbConnector::stream_query), en el formato elegido. Nada se
//! acumula en memoria ni pasa por el WebView: sirve para consultas enormes.
//!
//! Los formatos son los mismos que el copiado del grid (gridClipboard.ts) y
//! se serializan igual: TSV, CSV, JSON, Markdown y SQL INSERT.

use khipu_driver_core::{Message, QueryColumn, QueryValue, RowSink};
use khipu_engine::Dialect;
use serde::Deserialize;
use std::fs::File;
use std::io::{BufWriter, Write};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ExportFormat {
    Tsv,
    Csv,
    Json,
    Markdown,
    Sql,
}

/// Solo se escriben archivos de datos: el WebView elige la ruta (dialogo
/// nativo), pero aunque mandara otra cosa no puede pisar un `.bashrc`.
const ALLOWED_EXTENSIONS: &[&str] = &["tsv", "csv", "json", "md", "sql", "txt"];

pub fn validated_path(path: &str) -> Result<PathBuf, Message> {
    let path = PathBuf::from(path);
    if !path.is_absolute() {
        return Err(Message::key("files.pathNotAbsolute"));
    }
    let allowed = path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            ALLOWED_EXTENSIONS
                .iter()
                .any(|allowed| allowed.eq_ignore_ascii_case(extension))
        });
    if !allowed {
        return Err(Message::key("export.extensions").with(
            "extensions",
            ALLOWED_EXTENSIONS
                .iter()
                .map(|extension| format!(".{extension}"))
                .collect::<Vec<_>>()
                .join(", "),
        ));
    }
    Ok(path)
}

fn is_numeric(data_type: &str) -> bool {
    let data_type = data_type.to_ascii_lowercase();
    [
        "int", "decimal", "numeric", "float", "double", "real", "serial", "money",
    ]
    .iter()
    .any(|numeric| data_type.contains(numeric))
}

fn is_json(data_type: &str) -> bool {
    matches!(data_type.to_ascii_lowercase().as_str(), "json" | "jsonb")
}

fn is_plain_number(value: &str) -> bool {
    let digits = value.strip_prefix('-').unwrap_or(value);
    let mut parts = digits.splitn(2, '.');
    let integer = parts.next().unwrap_or("");
    let fraction = parts.next();
    !integer.is_empty()
        && integer.bytes().all(|byte| byte.is_ascii_digit())
        && fraction.is_none_or(|fraction| {
            !fraction.is_empty() && fraction.bytes().all(|byte| byte.is_ascii_digit())
        })
}

fn csv_field(value: &str) -> String {
    if value.contains([',', '"', '\n', '\r']) {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

pub struct FileSink {
    out: BufWriter<File>,
    format: ExportFormat,
    headers: bool,
    table_name: String,
    // Los textos del INSERT, como literales del motor de la conexion.
    dialect: Dialect,
    columns: Vec<QueryColumn>,
    rows: u64,
}

impl FileSink {
    pub fn create(
        path: &Path,
        format: ExportFormat,
        headers: bool,
        table_name: String,
        dialect: Dialect,
    ) -> Result<Self, Message> {
        let file = File::create(path).map_err(|error| {
            Message::key("files.createFailed")
                .with("path", path.display())
                .with("error", error)
        })?;
        Ok(Self {
            out: BufWriter::with_capacity(256 * 1024, file),
            format,
            headers,
            table_name,
            dialect,
            columns: Vec::new(),
            rows: 0,
        })
    }

    fn write(&mut self, text: &str) -> Result<(), Message> {
        self.out
            .write_all(text.as_bytes())
            .map_err(|error| Message::key("export.writeFailed").with("error", error))
    }

    fn json_value(&self, value: &QueryValue, column: &QueryColumn) -> String {
        match value {
            None => "null".to_string(),
            Some(text) if is_numeric(&column.data_type) && is_plain_number(text) => text.clone(),
            Some(text)
                if is_json(&column.data_type)
                    && serde_json::from_str::<serde_json::Value>(text).is_ok() =>
            {
                text.clone()
            }
            Some(text) => serde_json::to_string(text).unwrap_or_else(|_| "\"\"".to_string()),
        }
    }

    fn sql_value(&self, value: &QueryValue, column: &QueryColumn) -> String {
        match value {
            None => "NULL".to_string(),
            Some(text) if is_numeric(&column.data_type) && is_plain_number(text) => text.clone(),
            Some(text) => self.dialect.string_literal(text),
        }
    }
}

impl RowSink for FileSink {
    fn begin(&mut self, columns: &[QueryColumn]) -> Result<(), Message> {
        self.columns = columns.to_vec();
        let names: Vec<String> = columns.iter().map(|column| column.name.clone()).collect();
        match self.format {
            ExportFormat::Tsv if self.headers => self.write(&format!("{}\n", names.join("\t"))),
            ExportFormat::Csv if self.headers => {
                let line = names
                    .iter()
                    .map(|name| csv_field(name))
                    .collect::<Vec<_>>()
                    .join(",");
                self.write(&format!("{line}\n"))
            }
            ExportFormat::Json => self.write("["),
            ExportFormat::Markdown => {
                let header = names.join(" | ");
                let rule = names.iter().map(|_| "---").collect::<Vec<_>>().join(" | ");
                self.write(&format!("| {header} |\n| {rule} |\n"))
            }
            _ => Ok(()),
        }
    }

    fn row(&mut self, row: &[QueryValue]) -> Result<(), Message> {
        let line = match self.format {
            ExportFormat::Tsv => {
                let fields: Vec<String> = row
                    .iter()
                    .map(|value| {
                        value
                            .as_deref()
                            .unwrap_or("")
                            .replace(['\t', '\n', '\r'], " ")
                    })
                    .collect();
                format!("{}\n", fields.join("\t"))
            }
            ExportFormat::Csv => {
                let fields: Vec<String> = row
                    .iter()
                    .map(|value| value.as_deref().map(csv_field).unwrap_or_default())
                    .collect();
                format!("{}\n", fields.join(","))
            }
            ExportFormat::Json => {
                let fields: Vec<String> = row
                    .iter()
                    .zip(&self.columns)
                    .map(|(value, column)| {
                        format!(
                            "\n    {}: {}",
                            serde_json::to_string(&column.name).unwrap_or_default(),
                            self.json_value(value, column)
                        )
                    })
                    .collect();
                let separator = if self.rows == 0 { "\n" } else { ",\n" };
                format!("{separator}  {{{}\n  }}", fields.join(","))
            }
            ExportFormat::Markdown => {
                let fields: Vec<String> = row
                    .iter()
                    .map(|value| match value {
                        None => "NULL".to_string(),
                        Some(text) => text.replace('|', "\\|").replace(['\n', '\r'], " "),
                    })
                    .collect();
                format!("| {} |\n", fields.join(" | "))
            }
            ExportFormat::Sql => {
                let names: Vec<&str> = self
                    .columns
                    .iter()
                    .map(|column| column.name.as_str())
                    .collect();
                let values: Vec<String> = row
                    .iter()
                    .zip(&self.columns)
                    .map(|(value, column)| self.sql_value(value, column))
                    .collect();
                format!(
                    "INSERT INTO {} ({}) VALUES ({});\n",
                    self.table_name,
                    names.join(", "),
                    values.join(", ")
                )
            }
        };
        self.rows += 1;
        self.write(&line)
    }

    fn finish(&mut self) -> Result<(), Message> {
        if self.format == ExportFormat::Json {
            let closing = if self.rows == 0 { "]\n" } else { "\n]\n" };
            self.write(closing)?;
        }
        self.out
            .flush()
            .map_err(|error| Message::key("export.finishFailed").with("error", error))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn columns() -> Vec<QueryColumn> {
        vec![
            QueryColumn {
                name: "id".to_string(),
                data_type: "INT".to_string(),
                nullable: Some(false),
            },
            QueryColumn {
                name: "ctx".to_string(),
                data_type: "JSON".to_string(),
                nullable: Some(true),
            },
            QueryColumn {
                name: "name".to_string(),
                data_type: "VARCHAR".to_string(),
                nullable: Some(true),
            },
        ]
    }

    fn export(format: ExportFormat, headers: bool) -> String {
        export_as(format, headers, Dialect::Postgres, "o'h, \"x\"")
    }

    fn export_as(format: ExportFormat, headers: bool, dialect: Dialect, name: &str) -> String {
        let dir = std::env::temp_dir().join(format!("khipu-export-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join(format!("{format:?}-{dialect:?}.txt"));
        let mut sink =
            FileSink::create(&path, format, headers, "core.t".to_string(), dialect).unwrap();
        sink.begin(&columns()).unwrap();
        sink.row(&[
            Some("1".into()),
            Some("{\"a\": 1}".into()),
            Some(name.into()),
        ])
        .unwrap();
        sink.row(&[Some("2".into()), None, None]).unwrap();
        sink.finish().unwrap();
        drop(sink);
        std::fs::read_to_string(&path).unwrap()
    }

    #[test]
    fn json_es_valido_y_respeta_tipos() {
        let text = export(ExportFormat::Json, false);
        let parsed: serde_json::Value = serde_json::from_str(&text).unwrap();
        assert_eq!(
            parsed,
            serde_json::json!([
                {"id": 1, "ctx": {"a": 1}, "name": "o'h, \"x\""},
                {"id": 2, "ctx": null, "name": null}
            ])
        );
    }

    #[test]
    fn csv_tsv_y_sql() {
        assert_eq!(
            export(ExportFormat::Csv, true),
            "id,ctx,name\n1,\"{\"\"a\"\": 1}\",\"o'h, \"\"x\"\"\"\n2,,\n"
        );
        assert_eq!(
            export(ExportFormat::Tsv, false),
            "1\t{\"a\": 1}\to'h, \"x\"\n2\t\t\n"
        );
        assert_eq!(
            export(ExportFormat::Sql, false),
            "INSERT INTO core.t (id, ctx, name) VALUES (1, '{\"a\": 1}', 'o''h, \"x\"');\n\
             INSERT INTO core.t (id, ctx, name) VALUES (2, NULL, NULL);\n"
        );
    }

    #[test]
    fn sql_con_los_literales_de_cada_motor() {
        // En MySQL la barra invertida escapa: se duplica; en Postgres no.
        assert!(
            export_as(ExportFormat::Sql, false, Dialect::MySql, "C:\\tmp").contains("'C:\\\\tmp'")
        );
        assert!(
            export_as(ExportFormat::Sql, false, Dialect::Postgres, "C:\\tmp").contains("'C:\\tmp'")
        );
    }

    #[cfg(unix)]
    #[test]
    fn solo_extensiones_de_datos() {
        assert!(validated_path("/tmp/datos.csv").is_ok());
        assert!(validated_path("/tmp/datos.JSON").is_ok());
        assert!(validated_path("/home/u/.bashrc").is_err());
        assert!(validated_path("datos.csv").is_err());
    }
}
