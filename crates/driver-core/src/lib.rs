pub mod assembly;
mod connection_error;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::future::Future;
use std::pin::Pin;

pub use connection_error::{ConnectionErrorKind, io_error_kind, probe_tcp, tls_failure_kind};

/// How a connection negotiates TLS. Chosen per connection profile.
///
/// `Auto` is the default because it connects to the widest range of
/// servers: it asks for TLS, and if negotiation fails (e.g. MySQL 5.7 only
/// offers DHE cipher suites, which rustls doesn't implement) it retries
/// unencrypted and reports that through `TlsStatus::fell_back`, so the UI
/// can say the connection isn't encrypted. Anyone who needs a guarantee
/// picks `Required` or one of the verifying modes, which never fall back.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TlsMode {
    #[default]
    Auto,
    /// TLS or fail; the certificate isn't validated.
    Required,
    /// TLS with a certificate signed by the given (or a well-known) CA.
    VerifyCa,
    /// `VerifyCa` plus the certificate must match the host name.
    VerifyIdentity,
    Disabled,
}

impl TlsMode {
    pub fn verifies_certificate(self) -> bool {
        matches!(self, TlsMode::VerifyCa | TlsMode::VerifyIdentity)
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionConfig {
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
    /// Missing in profiles saved before TLS was configurable: those keep
    /// working as `Auto`.
    #[serde(default)]
    pub tls_mode: TlsMode,
    /// PEM file with the CA to verify the server certificate against. Without
    /// it, the verifying modes use the Mozilla root set (webpki-roots), which
    /// doesn't include private CAs such as AWS RDS's or Azure's.
    #[serde(default)]
    pub ca_certificate_path: Option<String>,
}

/// What TLS a connection actually ended up with, measured on the server
/// right after connecting.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TlsStatus {
    /// `None` when the server couldn't be asked (missing privileges on the
    /// status views): unknown, not assumed either way.
    pub encrypted: Option<bool>,
    /// Protocol and cipher, e.g. `"TLSv1.3 · TLS_AES_256_GCM_SHA384"`.
    pub detail: Option<String>,
    /// TLS was attempted (`TlsMode::Auto`), failed to negotiate, and the
    /// connection was re-established unencrypted.
    pub fell_back: bool,
}

impl std::fmt::Debug for ConnectionConfig {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ConnectionConfig")
            .field("host", &self.host)
            .field("port", &self.port)
            .field("database", &self.database)
            .field("username", &self.username)
            .field("password", &"***")
            .field("tls_mode", &self.tls_mode)
            .field("ca_certificate_path", &self.ca_certificate_path)
            .finish()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
    pub is_primary_key: bool,
    pub comment: Option<String>,
    /// Default expression as the server reports it (`CURRENT_TIMESTAMP`,
    /// `'pending'`, `nextval(...)`), if the column has one.
    #[serde(default)]
    pub default_value: Option<String>,
    /// The server fills the value by itself: auto_increment / identity /
    /// serial, or a generated (computed) column. An insert leaves it out.
    #[serde(default)]
    pub generated: bool,
}

/// One column of a foreign key. A multi-column constraint yields one entry
/// per column, all sharing `name`: completion wants the per-column pairs,
/// the database explorer groups them back by `name`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ForeignKeyInfo {
    pub name: String,
    pub column: String,
    pub referenced_table: String,
    pub referenced_column: String,
}

/// What kind of relation a `TableInfo` is. Views are listed alongside tables
/// because both have columns and can be queried (completion wants both), but
/// the database explorer shows them under separate folders.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum RelationKind {
    Table,
    View,
    MaterializedView,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableInfo {
    pub schema: String,
    pub name: String,
    pub kind: RelationKind,
    pub comment: Option<String>,
    pub columns: Vec<ColumnInfo>,
    pub foreign_keys: Vec<ForeignKeyInfo>,
    pub keys: Vec<KeyInfo>,
    pub indexes: Vec<IndexInfo>,
    pub triggers: Vec<TriggerInfo>,
    pub checks: Vec<CheckInfo>,
}

impl TableInfo {
    /// A relation with no columns or constraints yet; drivers fill it in as
    /// they read each category of the catalog.
    pub fn new(schema: &str, name: String, kind: RelationKind, comment: Option<String>) -> Self {
        Self {
            schema: schema.to_string(),
            name,
            kind,
            comment,
            columns: Vec::new(),
            foreign_keys: Vec::new(),
            keys: Vec::new(),
            indexes: Vec::new(),
            triggers: Vec::new(),
            checks: Vec::new(),
        }
    }
}

/// A primary key or unique constraint.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyInfo {
    pub name: String,
    pub columns: Vec<String>,
    pub primary: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexInfo {
    pub name: String,
    /// Column names, or the expression text for expression indexes.
    pub columns: Vec<String>,
    pub unique: bool,
    pub primary: bool,
    /// Access method as the engine names it (`BTREE`, `HASH`, `gin`, ...).
    pub method: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerInfo {
    pub name: String,
    /// `BEFORE`, `AFTER` or `INSTEAD OF`.
    pub timing: String,
    /// `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE` — more than one on Postgres.
    pub events: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckInfo {
    pub name: String,
    pub expression: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum RoutineKind {
    Procedure,
    Function,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoutineInfo {
    pub name: String,
    pub kind: RoutineKind,
    /// The parameter list as it would appear in a signature, without the
    /// surrounding parentheses (`"p_id int, OUT p_total decimal"`).
    pub arguments: String,
    /// `None` for procedures.
    pub return_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SequenceInfo {
    pub name: String,
    pub data_type: Option<String>,
}

/// A scheduled event (MySQL/MariaDB only).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventInfo {
    pub name: String,
    /// `ENABLED`, `DISABLED` or `SLAVESIDE_DISABLED`, as the server reports it.
    pub status: String,
    /// Human-readable schedule: `"EVERY 1 DAY"` or `"AT 2026-01-01 00:00:00"`.
    pub schedule: String,
}

/// Everything the database explorer shows for one schema.
///
/// Introspection is best effort past the relations themselves: if a
/// secondary category (triggers, routines, events, checks...) can't be read
/// — missing privileges, a server version without that catalog view — that
/// category stays empty and a human-readable note goes to `warnings`,
/// instead of the whole schema failing to load.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchemaObjects {
    pub schema: String,
    pub tables: Vec<TableInfo>,
    pub routines: Vec<RoutineInfo>,
    pub sequences: Vec<SequenceInfo>,
    pub events: Vec<EventInfo>,
    pub warnings: Vec<String>,
}

impl SchemaObjects {
    pub fn new(schema: &str) -> Self {
        Self {
            schema: schema.to_string(),
            tables: Vec::new(),
            routines: Vec::new(),
            sequences: Vec::new(),
            events: Vec::new(),
            warnings: Vec::new(),
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum DriverError {
    #[error("connection failed: {detail}")]
    Connection {
        kind: ConnectionErrorKind,
        detail: String,
    },
    #[error("query failed: {0}")]
    Query(String),
}

/// How many rows `execute_query` is allowed to return before it must stop
/// reading the result stream and report `truncated: true` instead.
#[derive(Debug, Clone, Copy)]
pub struct QueryExecutionOptions {
    pub max_rows: usize,
}

/// A column produced by executing a query, as opposed to `ColumnInfo`, which
/// describes a column of a catalog table. Query columns can be expressions,
/// aliases, or duplicated names, so they are kept separate.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryColumn {
    pub name: String,

    #[serde(rename = "type")]
    pub data_type: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub nullable: Option<bool>,
}

/// A single cell. `None` is a real SQL `NULL`; every other value (including
/// the literal strings `"NULL"`, `""` and `"0"`) is a `Some(String)`, so the
/// frontend never has to guess which one it received. The real type lives in
/// `QueryColumn::data_type`, not here — this stays a string to avoid losing
/// precision on `DECIMAL`/`NUMERIC` or integers outside JavaScript's safe range.
pub type QueryValue = Option<String>;
pub type QueryRow = Vec<QueryValue>;

/// The outcome of executing one SQL statement. A driver never turns a SQL
/// error into a `DriverError` here: that variant lives in this enum instead,
/// because the caller (the result panel) renders it as normal output, not as
/// a transport failure.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum QueryExecutionResult {
    ResultSet {
        columns: Vec<QueryColumn>,
        rows: Vec<QueryRow>,
        row_count: u64,
        execution_time_ms: u64,
        truncated: bool,
    },
    Command {
        affected_rows: u64,
        execution_time_ms: u64,
    },
    Error {
        message: String,

        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,

        #[serde(skip_serializing_if = "Option::is_none")]
        position: Option<u64>,
    },
}

/// Implemented by each database driver crate (khipu-driver-mysql, khipu-driver-postgres, ...).
/// The engine depends only on this trait, never on a concrete driver. The app does
/// depend on the concrete driver crates, since it builds them through a factory
/// (`app/src-tauri/src/drivers.rs`) — adding a new database is adding a new crate
/// that implements this trait plus a branch in that factory.
#[async_trait]
pub trait DbConnector: Send + Sync {
    async fn connect(config: &ConnectionConfig) -> Result<Self, DriverError>
    where
        Self: Sized;

    /// Server product and version as detected on connect, for display
    /// (`"MySQL 8.0.35"`, `"MariaDB 10.6.12"`, `"PostgreSQL 16.2"`).
    fn server_version(&self) -> String;

    /// TLS negotiated on connect (see `TlsStatus`).
    fn tls_status(&self) -> TlsStatus;

    async fn list_schemas(&self) -> Result<Vec<String>, DriverError>;

    /// The schema unqualified names resolve against for this connection:
    /// the database of the profile on MySQL, `current_schema()` on Postgres.
    async fn current_schema(&self) -> Result<String, DriverError>;

    /// Every object the database explorer shows for `schema`. Fails only if
    /// the relations themselves can't be listed; see `SchemaObjects` for how
    /// secondary categories degrade.
    async fn introspect_schema(&self, schema: &str) -> Result<SchemaObjects, DriverError>;

    /// Tables and views of `schema` with their columns and constraints.
    async fn list_tables(&self, schema: &str) -> Result<Vec<TableInfo>, DriverError> {
        Ok(self.introspect_schema(schema).await?.tables)
    }

    /// The DDL text for one table, fetched live from the engine (`SHOW
    /// CREATE TABLE` on MySQL; reconstructed from `pg_catalog` on Postgres,
    /// which has no single-statement equivalent). A real round trip on
    /// purpose, not a client-side rendering of the already-loaded catalog:
    /// this is what lets a missing grant (e.g. `SHOW VIEW` on MySQL) surface
    /// as a normal `DriverError::Query` instead of silently succeeding with
    /// stale/incomplete data.
    async fn table_definition(&self, schema: &str, table: &str) -> Result<String, DriverError>;

    /// Runs a single SQL statement. Never returns `DriverError`: a SQL error
    /// from the server is `QueryExecutionResult::Error`, a renderable state
    /// of the result panel rather than a transport failure. Callers are
    /// responsible for rejecting empty/multi-statement input before calling
    /// this — a driver assumes `sql` is one non-empty statement.
    ///
    /// Written as a plain method returning a boxed future (the same shape
    /// `#[async_trait]` generates for `async fn`) instead of `async fn`,
    /// because `sqlx::raw_sql(..).fetch(..)` inside an `async_trait`-boxed
    /// method fails to type-check with "implementation of `Executor` is not
    /// general enough" (a known sqlx/async-trait interaction, see
    /// launchbadge/sqlx#3591); a manual `Box::pin(async move { .. })` in the
    /// implementation sidesteps it.
    fn execute_query<'a>(
        &'a self,
        sql: &'a str,
        options: QueryExecutionOptions,
    ) -> Pin<Box<dyn Future<Output = QueryExecutionResult> + Send + 'a>>;

    /// Runs every statement in ONE transaction, in order: either all of them
    /// are committed or none (rollback on the first failure). Returns the
    /// total of affected rows. Same boxed-future shape as `execute_query`.
    fn execute_in_transaction<'a>(
        &'a self,
        statements: &'a [TransactionStatement],
    ) -> Pin<Box<dyn Future<Output = Result<u64, TransactionError>> + Send + 'a>>;

    /// Runs a query that returns rows and hands every row to `sink` as it
    /// arrives, WITHOUT any row limit and without keeping them in memory:
    /// exporting millions of rows costs the same memory as exporting ten.
    /// Returns the number of rows streamed. Errors (SQL, or the sink failing
    /// to write) come back as a readable message.
    fn stream_query<'a>(
        &'a self,
        sql: &'a str,
        sink: &'a mut dyn RowSink,
    ) -> Pin<Box<dyn Future<Output = Result<u64, String>> + Send + 'a>>;
}

/// Destination of `DbConnector::stream_query` (e.g. a file being written).
pub trait RowSink: Send {
    /// Called once, before the first row.
    fn begin(&mut self, columns: &[QueryColumn]) -> Result<(), String>;
    fn row(&mut self, row: &[QueryValue]) -> Result<(), String>;
    /// Called once after the last row (not called if streaming failed).
    fn finish(&mut self) -> Result<(), String>;
}

/// One statement of `DbConnector::execute_in_transaction`.
#[derive(Debug, Clone)]
pub struct TransactionStatement {
    pub sql: String,
    /// It must affect exactly one row (an UPDATE/DELETE of the row being
    /// edited): 0 means someone else changed or deleted it meanwhile, and the
    /// whole transaction is rolled back instead of silently doing nothing.
    pub expect_one_row: bool,
}

/// Why `execute_in_transaction` rolled back.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionError {
    /// Index of the statement that failed (None: begin/commit failed).
    pub statement_index: Option<usize>,
    pub message: String,
    pub code: Option<String>,
}

impl TransactionError {
    /// From a driver `QueryExecutionResult::Error` (anything else becomes a
    /// generic message).
    pub fn from_result(statement_index: Option<usize>, result: QueryExecutionResult) -> Self {
        match result {
            QueryExecutionResult::Error { message, code, .. } => Self {
                statement_index,
                message,
                code,
            },
            _ => Self {
                statement_index,
                message: "Error desconocido al aplicar los cambios.".to_string(),
                code: None,
            },
        }
    }

    pub fn unexpected_rows(statement_index: usize, affected: u64) -> Self {
        Self {
            statement_index: Some(statement_index),
            message: if affected == 0 {
                "La fila ya no existe o su clave cambió (otra sesión la modificó). No se aplicó ningún cambio.".to_string()
            } else {
                format!(
                    "La sentencia afectaría {affected} filas en lugar de 1. No se aplicó ningún cambio."
                )
            },
            code: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn table_info_serializes_to_camel_case() {
        let mut table = TableInfo::new(
            "core",
            "orders".to_string(),
            RelationKind::MaterializedView,
            None,
        );
        table.foreign_keys.push(ForeignKeyInfo {
            name: "fk_orders_user".to_string(),
            column: "user_id".to_string(),
            referenced_table: "users".to_string(),
            referenced_column: "id".to_string(),
        });

        let value = serde_json::to_value(&table).unwrap();

        assert_eq!(value["kind"], "materializedView");
        assert_eq!(value["foreignKeys"][0]["referencedTable"], "users");
        assert!(value["keys"].as_array().unwrap().is_empty());
    }

    #[test]
    fn config_without_tls_fields_defaults_to_auto() {
        let config: ConnectionConfig = serde_json::from_value(serde_json::json!({
            "host": "db", "port": 3306, "database": "core", "username": "u", "password": "p"
        }))
        .unwrap();

        assert_eq!(config.tls_mode, TlsMode::Auto);
        assert_eq!(config.ca_certificate_path, None);
    }

    #[test]
    fn config_reads_camel_case_tls_fields() {
        let config: ConnectionConfig = serde_json::from_value(serde_json::json!({
            "host": "db", "port": 3306, "database": "core", "username": "u", "password": "p",
            "tlsMode": "verifyIdentity", "caCertificatePath": "/etc/ca.pem"
        }))
        .unwrap();

        assert_eq!(config.tls_mode, TlsMode::VerifyIdentity);
        assert!(config.tls_mode.verifies_certificate());
        assert_eq!(config.ca_certificate_path.as_deref(), Some("/etc/ca.pem"));
    }

    #[test]
    fn debug_output_redacts_password() {
        let config = ConnectionConfig {
            host: "db.example.com".to_string(),
            port: 5432,
            database: "mydb".to_string(),
            username: "myuser".to_string(),
            password: "supersecreto123".to_string(),
            tls_mode: TlsMode::Auto,
            ca_certificate_path: None,
        };

        let debug_output = format!("{config:?}");

        assert!(!debug_output.contains("supersecreto123"));
        assert!(debug_output.contains("db.example.com"));
        assert!(debug_output.contains("myuser"));
    }

    #[test]
    fn query_column_uses_camel_case_and_omits_missing_nullable() {
        let column = QueryColumn {
            name: "id".to_string(),
            data_type: "int4".to_string(),
            nullable: None,
        };

        let value = serde_json::to_value(&column).unwrap();

        assert_eq!(value, serde_json::json!({ "name": "id", "type": "int4" }));
    }

    #[test]
    fn query_column_serializes_nullable_when_present() {
        let column = QueryColumn {
            name: "id".to_string(),
            data_type: "int4".to_string(),
            nullable: Some(false),
        };

        let value = serde_json::to_value(&column).unwrap();

        assert_eq!(
            value,
            serde_json::json!({ "name": "id", "type": "int4", "nullable": false })
        );
    }

    #[test]
    fn result_set_serializes_with_camel_case_discriminant() {
        let result = QueryExecutionResult::ResultSet {
            columns: vec![QueryColumn {
                name: "name".to_string(),
                data_type: "text".to_string(),
                nullable: Some(true),
            }],
            rows: vec![vec![Some("Anderson".to_string())], vec![None]],
            row_count: 2,
            execution_time_ms: 12,
            truncated: false,
        };

        let value = serde_json::to_value(&result).unwrap();

        assert_eq!(value["type"], "resultSet");
        assert_eq!(value["rowCount"], 2);
        assert_eq!(value["executionTimeMs"], 12);
        assert_eq!(value["truncated"], false);
        assert_eq!(value["rows"][0][0], "Anderson");
        assert!(value["rows"][1][0].is_null());
    }

    #[test]
    fn command_serializes_with_camel_case_discriminant() {
        let result = QueryExecutionResult::Command {
            affected_rows: 3,
            execution_time_ms: 5,
        };

        let value = serde_json::to_value(&result).unwrap();

        assert_eq!(
            value,
            serde_json::json!({ "type": "command", "affectedRows": 3, "executionTimeMs": 5 })
        );
    }

    #[test]
    fn error_omits_code_and_position_when_none() {
        let result = QueryExecutionResult::Error {
            message: "syntax error".to_string(),
            code: None,
            position: None,
        };

        let value = serde_json::to_value(&result).unwrap();

        assert_eq!(
            value,
            serde_json::json!({ "type": "error", "message": "syntax error" })
        );
    }

    #[test]
    fn error_includes_code_and_position_when_present() {
        let result = QueryExecutionResult::Error {
            message: "syntax error".to_string(),
            code: Some("42601".to_string()),
            position: Some(7),
        };

        let value = serde_json::to_value(&result).unwrap();

        assert_eq!(
            value,
            serde_json::json!({
                "type": "error",
                "message": "syntax error",
                "code": "42601",
                "position": 7
            })
        );
    }

    #[test]
    fn null_none_empty_and_zero_string_are_distinguishable_in_json() {
        let row: QueryRow = vec![
            None,
            Some("NULL".to_string()),
            Some(String::new()),
            Some("0".to_string()),
        ];

        let value = serde_json::to_value(&row).unwrap();

        assert!(value[0].is_null());
        assert_eq!(value[1], "NULL");
        assert_eq!(value[2], "");
        assert_eq!(value[3], "0");
    }
}
