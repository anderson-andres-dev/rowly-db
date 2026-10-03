//! Los comandos de Tauri, por dominio. Cada uno adapta argumentos y llama al
//! servicio que ya existe (guard, catalogo, drivers): no se duplican.

pub mod catalog;
pub mod connection;
pub mod files;
pub mod query;
pub mod results;
