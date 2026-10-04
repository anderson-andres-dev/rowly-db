mod introspect;
mod tls;
mod version;

use async_trait::async_trait;
use futures_util::TryStreamExt;
use khipu_driver_core::{
    ConnectionConfig, ConnectionErrorKind, ConsoleConnection, DbConnector, DriverError, Message,
    QueryCancel, QueryColumn, QueryExecutionOptions, QueryExecutionResult, QueryRow, QueryValue,
    RowSink, SchemaObjects, ServerIdentity, TlsMode, TlsStatus, TransactionError,
    TransactionStatement, probe_tcp,
};
use sqlx::mysql::{
    MySqlConnectOptions, MySqlConnection, MySqlDatabaseError, MySqlPoolOptions, MySqlRow,
};
use sqlx::{Column, Connection, Executor, MySqlPool, Row, TypeInfo};
use std::future::Future;
use std::pin::Pin;
use std::time::{Duration, Instant};

pub struct MySqlConnector {
    pool: MySqlPool,
    /// Where the console runs (see `ConsoleConnection`): a connection taken
    /// out of the pool, so it opens with the same options and session.
    console: ConsoleConnection<MySqlConnection>,
    version: version::ServerVersion,
    tls: TlsStatus,
}

/// How long the pool waits for a connection before giving up. sqlx's default
/// (30 s) leaves the app hanging too long on a host that doesn't answer.
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

/// The session is left as the server configures it, like any other MySQL
/// client: sqlx by default forces `utf8mb4_unicode_ci`, which breaks `=`
/// between a `utf8mb4_0900_ai_ci` column and a literal (error 1267), sets
/// the time zone to UTC (NOW() and TIMESTAMP values shifted) and adds
/// PIPES_AS_CONCAT to sql_mode. `SET NAMES utf8mb4` without COLLATE keeps
/// the UTF-8 the driver needs, with the server's default collation (see
/// SESSION_DEFAULTS).
fn session_options(options: MySqlConnectOptions) -> MySqlConnectOptions {
    options
        .set_names(false)
        .timezone(None)
        .pipes_as_concat(false)
        .no_engine_substitution(false)
}

/// Run on every new connection. sqlx also always asks for CLIENT_IGNORE_SPACE
/// in the handshake, which adds IGNORE_SPACE to the session's sql_mode
/// (function names become reserved words): it is taken out again unless the
/// server's own sql_mode has it. The rest of the session sql_mode (including
/// what init_connect set) is left alone.
const SESSION_DEFAULTS: &str = "SET NAMES utf8mb4, sql_mode = IF( \
    FIND_IN_SET('IGNORE_SPACE', @@global.sql_mode), \
    @@session.sql_mode, \
    TRIM(BOTH ',' FROM REPLACE(CONCAT(',', @@session.sql_mode, ','), ',IGNORE_SPACE,', ',')))";

async fn open_pool(config: &ConnectionConfig, mode: TlsMode) -> Result<MySqlPool, sqlx::Error> {
    let options = session_options(
        MySqlConnectOptions::new()
            .host(&config.host)
            .port(config.port)
            .username(&config.username)
            .password(&config.password)
            .database(&config.database),
    );
    MySqlPoolOptions::new()
        .acquire_timeout(CONNECT_TIMEOUT)
        .after_connect(|conn, _meta| {
            Box::pin(async move {
                Executor::execute(&mut *conn, SESSION_DEFAULTS).await?;
                Ok(())
            })
        })
        .connect_with(tls::apply(
            options,
            mode,
            config.ca_certificate_path.as_deref(),
        ))
        .await
}

/// Schemas every MySQL/MariaDB server has, skipped when picking a default
/// schema for a profile that doesn't name one.
const SYSTEM_SCHEMAS: [&str; 4] = ["information_schema", "mysql", "performance_schema", "sys"];

fn text_column(row: &MySqlRow, index: usize) -> Result<String, DriverError> {
    let bytes: Vec<u8> = row
        .try_get(index)
        .map_err(|error| DriverError::Query(error.to_string()))?;
    String::from_utf8(bytes).map_err(|error| DriverError::Query(error.to_string()))
}

/// Converts a raw cell (read as the bytes the text protocol returns) into a
/// `QueryValue`: `None` is a real `NULL`; UTF-8 bytes become the text as-is;
/// non-UTF-8 bytes (e.g. BLOB) become a stable `0x`-prefixed hex string, so
/// the grid always has something displayable without losing data.
fn mysql_cell_to_query_value(row: &MySqlRow, index: usize) -> Result<QueryValue, sqlx::Error> {
    let raw: Option<Vec<u8>> = row.try_get_unchecked(index)?;
    let vector = row.column(index).type_info().name() == "VECTOR";
    Ok(raw.map(|bytes| {
        if vector {
            if let Some(text) = vector_text(&bytes) {
                return text;
            }
        }
        match String::from_utf8(bytes) {
            Ok(text) => text,
            Err(error) => format!("0x{}", hex_encode(error.as_bytes())),
        }
    }))
}

/// A MySQL 9 `VECTOR` arrives as its float32 values, little-endian. It is
/// shown as `[1,2.5,3]`, the text `STRING_TO_VECTOR` reads back. The
/// published sqlx 0.8.6 rejects the column type (0xf2) before a row gets
/// here: this applies once a published release reads it (SQL_ENGINE §9).
fn vector_text(bytes: &[u8]) -> Option<String> {
    if bytes.len() % 4 != 0 {
        return None;
    }
    let values: Vec<String> = bytes
        .chunks_exact(4)
        .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]).to_string())
        .collect();
    Some(format!("[{}]", values.join(",")))
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

/// A single, unprepared statement executed via MySQL's simple query protocol
/// (`take_arguments` returning `None` is what tells sqlx not to prepare it),
/// which returns every value as text — the same generic-decode approach
/// `mysql_cell_to_query_value` relies on.
///
/// `sqlx::raw_sql` provides exactly this, but its `Execute` impl is generic
/// over every `Database`, and proving that holds inside a boxed
/// `dyn Future + Send` (as returned by `DbConnector::execute_query`) fails to
/// type-check ("implementation of `Executor` is not general enough" —
/// launchbadge/sqlx#3591, fixed upstream in sqlx 0.9 by a breaking change we
/// aren't pulling in yet). Implementing `Execute` ourselves, concretely for
/// `MySql` only, avoids the generic-over-`DB` impl that trips up that check.
struct RawStatement<'q>(&'q str);

impl<'q> sqlx::Execute<'q, sqlx::MySql> for RawStatement<'q> {
    fn sql(&self) -> &'q str {
        self.0
    }

    fn statement(&self) -> Option<&<sqlx::MySql as sqlx::Database>::Statement<'q>> {
        None
    }

    fn take_arguments(
        &mut self,
    ) -> Result<Option<<sqlx::MySql as sqlx::Database>::Arguments<'q>>, sqlx::error::BoxDynError>
    {
        Ok(None)
    }

    fn persistent(&self) -> bool {
        false
    }
}

/// MySQL error 1295, ER_UNSUPPORTED_PS: "This command is not supported in
/// the prepared statement protocol yet".
const ER_UNSUPPORTED_PS: u16 = 1295;

fn is_unsupported_in_prepared_protocol(error: &sqlx::Error) -> bool {
    matches!(error, sqlx::Error::Database(database_error)
        if database_error
            .try_downcast_ref::<MySqlDatabaseError>()
            .is_some_and(|mysql_error| mysql_error.number() == ER_UNSUPPORTED_PS))
}

fn mysql_error_to_result(error: sqlx::Error) -> QueryExecutionResult {
    if let sqlx::Error::Database(database_error) = &error {
        if let Some(mysql_error) = database_error.try_downcast_ref::<MySqlDatabaseError>() {
            return QueryExecutionResult::Error {
                message: mysql_error.message().into(),
                code: Some(mysql_error.number().to_string()),
                position: None,
            };
        }
    }

    QueryExecutionResult::Error {
        message: error.to_string().into(),
        code: None,
        position: None,
    }
}

#[async_trait]
impl DbConnector for MySqlConnector {
    async fn connect(config: &ConnectionConfig) -> Result<Self, DriverError> {
        // En Automatico, un fallo de negociacion TLS (no de login ni de red:
        // ver tls::is_tls_failure) se reintenta sin cifrar. El pool entero
        // queda con esas opciones, asi que las conexiones que abra despues
        // no vuelven a intentar TLS.
        probe_tcp(&config.host, config.port, CONNECT_TIMEOUT).await?;
        let (pool, fell_back) = match open_pool(config, config.tls_mode).await {
            Ok(pool) => (pool, false),
            Err(error) if config.tls_mode == TlsMode::Auto && tls::is_tls_failure(&error) => {
                match open_pool(config, TlsMode::Disabled).await {
                    Ok(pool) => (pool, true),
                    Err(_) => return Err(tls::connection_error(error, config.tls_mode)),
                }
            }
            Err(error) => return Err(tls::connection_error(error, config.tls_mode)),
        };
        let raw_version = sqlx::query("SELECT VERSION()")
            .fetch_one(&pool)
            .await
            .map_err(|e| DriverError::connection(ConnectionErrorKind::Other, e.to_string()))
            .and_then(|row| text_column(&row, 0))?;
        let tls = tls::read_status(&pool, fell_back).await;
        Ok(Self {
            pool,
            console: ConsoleConnection::default(),
            version: version::ServerVersion::parse(&raw_version),
            tls,
        })
    }

    fn server(&self) -> ServerIdentity {
        self.version.identity()
    }

    fn tls_status(&self) -> TlsStatus {
        self.tls.clone()
    }

    async fn list_schemas(&self) -> Result<Vec<String>, DriverError> {
        sqlx::query("SELECT schema_name FROM information_schema.schemata ORDER BY schema_name")
            .fetch_all(&self.pool)
            .await
            .map_err(|e| DriverError::Query(e.to_string()))?
            .into_iter()
            .map(|row| text_column(&row, 0))
            .collect()
    }

    async fn current_schema(&self) -> Result<String, DriverError> {
        let row = sqlx::query("SELECT DATABASE()")
            .fetch_one(&self.pool)
            .await
            .map_err(|e| DriverError::Query(e.to_string()))?;
        let selected: Option<Vec<u8>> = row
            .try_get_unchecked(0)
            .map_err(|e| DriverError::Query(e.to_string()))?;
        if let Some(bytes) = selected {
            return Ok(String::from_utf8_lossy(&bytes).into_owned());
        }

        // Perfil sin base: se toma el primer schema de usuario, igual que
        // haria alguien abriendo el servidor por primera vez.
        let schemas = self.list_schemas().await?;
        Ok(schemas
            .iter()
            .find(|schema| !SYSTEM_SCHEMAS.contains(&schema.as_str()))
            .or_else(|| schemas.first())
            .cloned()
            .unwrap_or_else(|| "information_schema".to_string()))
    }

    async fn introspect_schema(&self, schema: &str) -> Result<SchemaObjects, DriverError> {
        let mut objects =
            introspect::introspect_schema(&self.pool, schema, self.version.capabilities()).await?;
        if self.version.is_below_compatibility_floor() {
            objects.warnings.insert(
                0,
                Message::key("introspect.belowCompatibilityFloor")
                    .with("version", self.version.display())
                    .with("floor", "MySQL 5.7, MariaDB 10.3"),
            );
        }
        Ok(objects)
    }

    async fn table_definition(&self, schema: &str, table: &str) -> Result<String, DriverError> {
        // Los identificadores no se pueden bindear como parametros (solo
        // valores); se escapan a mano (backtick duplicado, la convencion de
        // MySQL) e interpolan en el SQL en vez de bindearlos.
        let sql = format!(
            "SHOW CREATE TABLE `{}`.`{}`",
            schema.replace('`', "``"),
            table.replace('`', "``")
        );

        let row = sqlx::query(&sql)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| DriverError::Query(e.to_string()))?;

        text_column(&row, 1)
    }

    // Matches the `Pin<Box<dyn Future>>` shape the trait declares (see the
    // doc comment on `DbConnector::execute_query` for why this isn't `async
    // fn`/`#[async_trait]` like the other methods).
    fn stream_query<'a>(
        &'a self,
        sql: &'a str,
        sink: &'a mut dyn RowSink,
    ) -> Pin<Box<dyn Future<Output = Result<u64, Message>> + Send + 'a>> {
        Box::pin(async move {
            let message = |error: sqlx::Error| match mysql_error_to_result(error) {
                QueryExecutionResult::Error { message, .. } => message,
                _ => Message::key("export.readFailed"),
            };
            let mut console = self.open_console().await.map_err(message)?;
            let conn = console.connection();
            let describe = conn.describe(sql).await.map_err(message)?;
            if describe.columns().is_empty() {
                return Err(Message::key("export.noRows"));
            }
            let columns: Vec<QueryColumn> = describe
                .columns()
                .iter()
                .enumerate()
                .map(|(index, column)| QueryColumn {
                    name: column.name().to_string(),
                    data_type: column.type_info().name().to_string(),
                    nullable: describe.nullable(index),
                })
                .collect();
            sink.begin(&columns)?;

            let mut count = 0u64;
            let mut values: Vec<QueryValue> = Vec::with_capacity(columns.len());
            let mut finished = false;
            let outcome: Result<(), Message> = async {
                let mut stream = Executor::fetch(&mut *conn, RawStatement(sql));
                while let Some(row) = stream.try_next().await.map_err(message)? {
                    values.clear();
                    for index in 0..columns.len() {
                        values.push(mysql_cell_to_query_value(&row, index).map_err(message)?);
                    }
                    sink.row(&values)?;
                    count += 1;
                }
                finished = true;
                Ok(())
            }
            .await;
            if !finished {
                // Quedaron filas sin leer: leerlas todas para seguir usando
                // la conexion podria tardar sin limite. Se cierra.
                console.discard();
            }
            outcome?;
            sink.finish()?;
            Ok(count)
        })
    }

    fn execute_in_transaction<'a>(
        &'a self,
        statements: &'a [TransactionStatement],
    ) -> Pin<Box<dyn Future<Output = Result<u64, TransactionError>> + Send + 'a>> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                TransactionError::from_result(None, mysql_error_to_result(error))
            })?;
            let mut total = 0;
            for (index, statement) in statements.iter().enumerate() {
                match Executor::execute(&mut *tx, RawStatement(&statement.sql)).await {
                    Ok(done) => {
                        let affected = done.rows_affected();
                        if statement.expect_one_row && affected != 1 {
                            let _ = tx.rollback().await;
                            return Err(TransactionError::unexpected_rows(index, affected));
                        }
                        total += affected;
                    }
                    Err(error) => {
                        let _ = tx.rollback().await;
                        return Err(TransactionError::from_result(
                            Some(index),
                            mysql_error_to_result(error),
                        ));
                    }
                }
            }
            tx.commit().await.map_err(|error| {
                TransactionError::from_result(None, mysql_error_to_result(error))
            })?;
            Ok(total)
        })
    }

    fn execute_query<'a>(
        &'a self,
        sql: &'a str,
        options: QueryExecutionOptions,
    ) -> Pin<Box<dyn Future<Output = QueryExecutionResult> + Send + 'a>> {
        Box::pin(self.run_query(sql, options, None))
    }

    fn execute_query_cancellable<'a>(
        &'a self,
        sql: &'a str,
        options: QueryExecutionOptions,
        cancel: &'a QueryCancel,
    ) -> Pin<Box<dyn Future<Output = QueryExecutionResult> + Send + 'a>> {
        Box::pin(self.run_query(sql, options, Some(cancel)))
    }

    async fn cancel_query(&self, cancel: &QueryCancel) -> Result<(), DriverError> {
        let Some(id) = cancel.request() else {
            return Ok(());
        };
        Executor::execute(&self.pool, RawStatement(&format!("KILL QUERY {id}")))
            .await
            .map(|_| ())
            .map_err(|error| DriverError::Query(error.to_string()))
    }

    fn console_epoch(&self) -> u64 {
        self.console.epoch()
    }
}

impl MySqlConnector {
    async fn run_query(
        &self,
        sql: &str,
        options: QueryExecutionOptions,
        cancel: Option<&QueryCancel>,
    ) -> QueryExecutionResult {
        let mut console = match self.open_console().await {
            Ok(console) => console,
            Err(error) => return mysql_error_to_result(error),
        };
        let conn = console.connection();

        // Id de la conexion en el servidor: cancelar la interrumpe desde otra
        // (ver QueryCancel). Si ya se cancelo mientras se esperaba una
        // conexion, ni se empieza.
        if let Some(cancel) = cancel {
            match sqlx::query_scalar::<_, u64>("SELECT CONNECTION_ID()")
                .fetch_one(&mut *conn)
                .await
            {
                Ok(id) if !cancel.begin(id) => return cancelled_before_start(),
                Ok(_) => {}
                Err(error) => {
                    if conn.ping().await.is_err() {
                        console.discard();
                    }
                    return mysql_error_to_result(error);
                }
            }
        }

        let outcome = execute_on_connection(conn, sql, options).await;
        if let Some(cancel) = cancel {
            cancel.end();
        }
        // Seguir usandola obligaria a leer (y tirar) todo lo que el servidor
        // todavia tenga para mandar — ver MAX_ROWS_TO_DRAIN — o ya no
        // responde. Cerrar el socket corta el envio en seco; la siguiente
        // sentencia abre otra sesion.
        let lost = matches!(outcome.result, QueryExecutionResult::Error { .. })
            && conn.ping().await.is_err();
        if !outcome.connection_reusable || lost {
            console.discard();
        }
        outcome.result
    }

    async fn open_console(
        &self,
    ) -> Result<khipu_driver_core::ConsoleGuard<'_, MySqlConnection>, sqlx::Error> {
        self.console
            .lock(async || Ok(self.pool.acquire().await?.detach()))
            .await
    }
}

fn cancelled_before_start() -> QueryExecutionResult {
    QueryExecutionResult::Error {
        message: Message::key("query.cancelledBeforeStart"),
        code: None,
        position: None,
    }
}

/// Rows past `max_rows` that are still read (and discarded) so the console
/// connection can run the next statement. MySQL can't stop sending a
/// result set midway: whatever isn't read here, the next
/// statement would have to read first. Without a
/// bound, a `SELECT * FROM big_table` that shows 500 rows downloads the
/// whole table in the background, and a few of those in a row starve the
/// console — every later query, even `SELECT 1`, waits behind it. Past this
/// bound the connection is closed instead, and the session with it (see
/// `ExecutionOutcome::connection_reusable`).
const MAX_ROWS_TO_DRAIN: usize = 1000;

struct ExecutionOutcome {
    result: QueryExecutionResult,
    /// `false` when the connection still has unread rows pending (or its
    /// session state couldn't be restored) and must be closed.
    connection_reusable: bool,
}

impl From<QueryExecutionResult> for ExecutionOutcome {
    fn from(result: QueryExecutionResult) -> Self {
        Self {
            result,
            connection_reusable: true,
        }
    }
}

async fn execute_on_connection(
    conn: &mut MySqlConnection,
    sql: &str,
    options: QueryExecutionOptions,
) -> ExecutionOutcome {
    let start = Instant::now();

    // describe() prepara la sentencia para saber si devuelve columnas. MySQL
    // no deja preparar algunas (CREATE TRIGGER/PROCEDURE/FUNCTION/EVENT, entre
    // otras: ER_UNSUPPORTED_PS); ninguna de esas devuelve filas, asi que van
    // directo por el camino de comandos, que no usa el protocolo preparado.
    let describe = match conn.describe(sql).await {
        Ok(describe) => Some(describe),
        Err(error) if is_unsupported_in_prepared_protocol(&error) => None,
        Err(error) => return mysql_error_to_result(error).into(),
    };

    let Some(describe) = describe.filter(|describe| !describe.columns().is_empty()) else {
        return run_without_columns(conn, sql, options, start).await;
    };

    // El servidor deja de producir filas en max_rows + 1 (la extra es solo
    // para saber si hubo truncado) en vez de mandar la tabla entera: es lo
    // mismo que hace Connector/J con setMaxRows. Solo afecta al SELECT de
    // nivel superior — no a subconsultas ni a INSERT ... SELECT — y un LIMIT
    // explicito en la consulta tiene prioridad sobre esto. Si el SET falla
    // (un servidor que no lo soporte) la consulta corre igual y la cota de
    // MAX_ROWS_TO_DRAIN sigue protegiendo el pool.
    let select_limit_set = Executor::execute(
        &mut *conn,
        RawStatement(&format!(
            "SET SESSION sql_select_limit = {}",
            options.max_rows + 1
        )),
    )
    .await
    .is_ok();

    let mut outcome = read_result_set(conn, sql, &describe, options, start).await;

    // La sesion sigue: la sentencia siguiente no puede quedar limitada a
    // estas filas. Si no se pudo restaurar, no se reutiliza.
    if select_limit_set && outcome.connection_reusable {
        let restored = Executor::execute(
            &mut *conn,
            RawStatement("SET SESSION sql_select_limit = DEFAULT"),
        )
        .await
        .is_ok();
        outcome.connection_reusable = restored;
    }

    outcome
}

/// Una sentencia de la que PREPARE no dio columnas: DML y DDL, pero tambien
/// las que devuelven filas sin que el servidor las describa al prepararlas
/// (CALL con un SELECT dentro, SHOW CREATE ...). Se leen las filas que llegan:
/// con ellas es un resultado (las columnas salen de la primera fila, y de
/// varios conjuntos se muestra el primero); sin ellas, un comando.
async fn run_without_columns(
    conn: &mut MySqlConnection,
    sql: &str,
    options: QueryExecutionOptions,
    start: Instant,
) -> ExecutionOutcome {
    let mut stream = Executor::fetch_many(&mut *conn, RawStatement(sql));
    let mut columns: Option<Vec<QueryColumn>> = None;
    let mut rows: Vec<QueryRow> = Vec::new();
    let mut affected_rows = 0;
    let mut first_set_done = false;
    let mut truncated = false;
    let mut discarded = 0;
    let mut stream_finished = false;
    loop {
        let item = match stream.try_next().await {
            Ok(Some(item)) => item,
            Ok(None) => {
                stream_finished = true;
                break;
            }
            Err(error) => {
                return ExecutionOutcome {
                    result: mysql_error_to_result(error),
                    connection_reusable: false,
                };
            }
        };
        match item {
            sqlx::Either::Left(done) => {
                affected_rows += done.rows_affected();
                first_set_done = columns.is_some();
            }
            sqlx::Either::Right(_) if first_set_done => {}
            sqlx::Either::Right(row) => {
                let columns = columns.get_or_insert_with(|| {
                    row.columns()
                        .iter()
                        .map(|column| QueryColumn {
                            name: column.name().to_string(),
                            data_type: column.type_info().name().to_string(),
                            nullable: None,
                        })
                        .collect()
                });
                if rows.len() >= options.max_rows {
                    truncated = true;
                    discarded += 1;
                    if discarded > MAX_ROWS_TO_DRAIN {
                        break;
                    }
                    continue;
                }
                let mut query_row = Vec::with_capacity(columns.len());
                for index in 0..columns.len() {
                    match mysql_cell_to_query_value(&row, index) {
                        Ok(value) => query_row.push(value),
                        Err(error) => {
                            return ExecutionOutcome {
                                result: mysql_error_to_result(error),
                                connection_reusable: false,
                            };
                        }
                    }
                }
                rows.push(query_row);
            }
        }
    }
    drop(stream);

    let execution_time_ms = start.elapsed().as_millis() as u64;
    let result = match columns {
        Some(columns) => QueryExecutionResult::ResultSet {
            row_count: rows.len() as u64,
            columns,
            rows,
            execution_time_ms,
            truncated,
        },
        None => QueryExecutionResult::Command {
            affected_rows,
            execution_time_ms,
        },
    };
    ExecutionOutcome {
        result,
        connection_reusable: stream_finished,
    }
}

async fn read_result_set(
    conn: &mut MySqlConnection,
    sql: &str,
    describe: &sqlx::Describe<sqlx::MySql>,
    options: QueryExecutionOptions,
    start: Instant,
) -> ExecutionOutcome {
    let columns: Vec<QueryColumn> = describe
        .columns()
        .iter()
        .enumerate()
        .map(|(index, column)| QueryColumn {
            name: column.name().to_string(),
            data_type: column.type_info().name().to_string(),
            nullable: describe.nullable(index),
        })
        .collect();

    let mut stream = Executor::fetch(&mut *conn, RawStatement(sql));
    let mut rows: Vec<QueryRow> = Vec::new();
    let mut truncated = false;
    let mut discarded = 0;
    let mut stream_finished = false;
    loop {
        let row = match stream.try_next().await {
            Ok(Some(row)) => row,
            Ok(None) => {
                stream_finished = true;
                break;
            }
            Err(error) => {
                return ExecutionOutcome {
                    result: mysql_error_to_result(error),
                    connection_reusable: false,
                };
            }
        };

        if rows.len() >= options.max_rows {
            truncated = true;
            discarded += 1;
            if discarded > MAX_ROWS_TO_DRAIN {
                break;
            }
            continue;
        }

        let mut query_row = Vec::with_capacity(columns.len());
        for index in 0..columns.len() {
            match mysql_cell_to_query_value(&row, index) {
                Ok(value) => query_row.push(value),
                Err(error) => {
                    return ExecutionOutcome {
                        result: mysql_error_to_result(error),
                        connection_reusable: false,
                    };
                }
            }
        }
        rows.push(query_row);
    }
    drop(stream);

    ExecutionOutcome {
        result: QueryExecutionResult::ResultSet {
            row_count: rows.len() as u64,
            columns,
            rows,
            execution_time_ms: start.elapsed().as_millis() as u64,
            truncated,
        },
        connection_reusable: stream_finished,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_vector_reads_as_the_text_string_to_vector_accepts() {
        let bytes: Vec<u8> = [1.0f32, 2.5, -3.0]
            .iter()
            .flat_map(|value| value.to_le_bytes())
            .collect();
        assert_eq!(vector_text(&bytes).as_deref(), Some("[1,2.5,-3]"));
        assert_eq!(vector_text(&[]).as_deref(), Some("[]"));
        assert_eq!(vector_text(&[1, 2, 3]), None);
    }
}
