//! Lo que hacen los comandos, sin Tauri: convertir el catalogo del driver,
//! guardar los textos de las consolas y los archivos .sql, exportar y editar
//! resultados. Los comandos (commands/) adaptan argumentos y llaman aqui.

pub(crate) mod catalog;
pub(crate) mod console_texts;
pub(crate) mod export;
pub(crate) mod result_editing;
pub(crate) mod sql_files;
