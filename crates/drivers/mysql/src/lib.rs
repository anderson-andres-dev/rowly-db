mod introspect;
mod tls;
mod version;

use async_trait::async_trait;
use futures_util::TryStreamExt;
use khipu_driver_core::{
    ConnectionConfig, ConnectionErrorKind, DbConnector, DriverError, QueryCancel, QueryColumn,
    QueryExecutionOptions, QueryExecutionResult, QueryRow, QueryValue, RowSink, SchemaObjects,
    TlsMode, TlsStatus, TransactionError, TransactionStatement, probe_tcp,
};
use sqlx::mysql::{
    MySqlConnectOptions, MySqlConnection, MySqlDatabaseError, MySqlPoolOptions, MySqlRow,
};
use sqlx::{Column, Executor, MySqlPool, Row, TypeInfo};
use std::future::Future;
use std::pin::Pin;
use std::time::{Duration, Instant};

pub struct MySqlConnector {
    pool: MySqlPool,
    version: version::ServerVersion,
    tls: TlsStatus,
}

/// How long the pool waits for a connection before giving up. sqlx's default
/// (30 s) leaves the app hanging too long on a host that doesn't answer.
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

async fn open_pool(config: &ConnectionConfig, mode: TlsMode) -> Result<MySqlPool, sqlx::Error> {
    let options = MySqlConnectOptions::new()
        .host(&config.host)
        .port(config.port)
        .username(&config.username)
        .password(&config.password)
        .database(&config.database);
    MySqlPoolOptions::new()
        .acquire_timeout(CONNECT_TIMEOUT)
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
    Ok(raw.map(|bytes| match String::from_utf8(bytes) {
        Ok(text) => text,
        Err(error) => format!("0x{}", hex_encode(error.as_bytes())),
    }))
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
                message: mysql_error.message().to_string(),
                code: Some(mysql_error.number().to_string()),
                position: None,
            };
        }
    }

    QueryExecutionResult::Error {
        message: error.to_string(),
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
            version: version::ServerVersion::parse(&raw_version),
            tls,
        })
    }

    fn server_version(&self) -> String {
        self.version.display()
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
        if self.version.is_below_minimum() {
            objects.warnings.insert(
                0,
                format!(
                    "{} es anterior a las versiones soportadas (MySQL 5.7, MariaDB 10.3): \
                     algunos objetos pueden faltar.",
                    self.version.display()
                ),
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
    ) -> Pin<Box<dyn Future<Output = Result<u64, String>> + Send + 'a>> {
        Box::pin(async move {
            let message = |error: sqlx::Error| match mysql_error_to_result(error) {
                QueryExecutionResult::Error { message, .. } => message,
                _ => "Error al leer las filas.".to_string(),
            };
            let mut conn = self.pool.acquire().await.map_err(message)?;
            let describe = conn.describe(sql).await.map_err(message)?;
            if describe.columns().is_empty() {
                return Err("La sentencia no devuelve filas: no hay nada que exportar.".to_string());
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
            let outcome: Result<(), String> = async {
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
                // Quedaron filas sin leer: devolver la conexion al pool
                // haria que sqlx las drene todas. Se cierra.
                drop(conn.detach());
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
}

impl MySqlConnector {
    async fn run_query(
        &self,
        sql: &str,
        options: QueryExecutionOptions,
        cancel: Option<&QueryCancel>,
    ) -> QueryExecutionResult {
        let mut conn = match self.pool.acquire().await {
            Ok(conn) => conn,
            Err(error) => return mysql_error_to_result(error),
        };

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
                Err(error) => return mysql_error_to_result(error),
            }
        }

        let outcome = execute_on_connection(&mut conn, sql, options).await;
        if let Some(cancel) = cancel {
            cancel.end();
        }
        if !outcome.connection_reusable {
            // Devolverla al pool haria que sqlx la "limpie" leyendo (y
            // tirando) todo lo que el servidor todavia tenga para mandar
            // — ver MAX_ROWS_TO_DRAIN. Cerrar el socket corta el envio
            // en seco; el pool abre otra conexion cuando haga falta.
            drop(conn.detach());
        }
        outcome.result
    }
}

fn cancelled_before_start() -> QueryExecutionResult {
    QueryExecutionResult::Error {
        message: "query cancelled before it started".to_string(),
        code: None,
        position: None,
    }
}

/// Rows past `max_rows` that are still read (and discarded) so the
/// connection can go back to the pool clean. MySQL can't stop sending a
/// result set midway: whatever isn't read here, sqlx reads on release
/// (`ping` -> `wait_until_ready`) before reusing the connection. Without a
/// bound, a `SELECT * FROM big_table` that shows 500 rows downloads the
/// whole table in the background, and a few of those in a row starve the
/// pool — every later query, even `SELECT 1`, waits up to `acquire_timeout`.
/// Past this bound the connection is discarded instead (see
/// `ExecutionOutcome::connection_reusable`).
const MAX_ROWS_TO_DRAIN: usize = 1000;

struct ExecutionOutcome {
    result: QueryExecutionResult,
    /// `false` when the connection still has unread rows pending (or its
    /// session state couldn't be restored) and must not go back to the pool.
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
        let outcome = match Executor::execute(&mut *conn, RawStatement(sql)).await {
            Ok(outcome) => outcome,
            Err(error) => return mysql_error_to_result(error).into(),
        };
        return QueryExecutionResult::Command {
            affected_rows: outcome.rows_affected(),
            execution_time_ms: start.elapsed().as_millis() as u64,
        }
        .into();
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

    // La conexion vuelve al pool y la usa despues el catalogo (information_
    // schema), que no puede quedar limitado a 501 filas. Si no se pudo
    // restaurar, no se reutiliza.
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

    fn config_from_env() -> ConnectionConfig {
        let host = std::env::var("KHIPU_TEST_MYSQL_HOST")
            .expect("set KHIPU_TEST_MYSQL_HOST, KHIPU_TEST_MYSQL_PORT, KHIPU_TEST_MYSQL_USER, KHIPU_TEST_MYSQL_PASSWORD and KHIPU_TEST_MYSQL_DATABASE etc. to run this test");
        let port = std::env::var("KHIPU_TEST_MYSQL_PORT")
            .expect("set KHIPU_TEST_MYSQL_HOST, KHIPU_TEST_MYSQL_PORT, KHIPU_TEST_MYSQL_USER, KHIPU_TEST_MYSQL_PASSWORD and KHIPU_TEST_MYSQL_DATABASE etc. to run this test")
            .parse()
            .expect("KHIPU_TEST_MYSQL_PORT must be a valid u16");
        let username = std::env::var("KHIPU_TEST_MYSQL_USER")
            .expect("set KHIPU_TEST_MYSQL_HOST, KHIPU_TEST_MYSQL_PORT, KHIPU_TEST_MYSQL_USER, KHIPU_TEST_MYSQL_PASSWORD and KHIPU_TEST_MYSQL_DATABASE etc. to run this test");
        let password = std::env::var("KHIPU_TEST_MYSQL_PASSWORD")
            .expect("set KHIPU_TEST_MYSQL_HOST, KHIPU_TEST_MYSQL_PORT, KHIPU_TEST_MYSQL_USER, KHIPU_TEST_MYSQL_PASSWORD and KHIPU_TEST_MYSQL_DATABASE etc. to run this test");
        let database = std::env::var("KHIPU_TEST_MYSQL_DATABASE")
            .expect("set KHIPU_TEST_MYSQL_HOST, KHIPU_TEST_MYSQL_PORT, KHIPU_TEST_MYSQL_USER, KHIPU_TEST_MYSQL_PASSWORD and KHIPU_TEST_MYSQL_DATABASE etc. to run this test");

        ConnectionConfig {
            host,
            port,
            database,
            username,
            password,
            tls_mode: TlsMode::Auto,
            ca_certificate_path: None,
        }
    }

    #[tokio::test]
    #[ignore = "requires database"]
    async fn connects_and_lists_schemas_and_tables_against_real_mysql() {
        let config = config_from_env();

        let connector = MySqlConnector::connect(&config)
            .await
            .expect("connect should succeed against a reachable MySQL instance");

        let schemas = connector
            .list_schemas()
            .await
            .expect("list_schemas should succeed");
        assert!(
            !schemas.is_empty(),
            "expected at least one schema to be reported"
        );

        let schema = schemas
            .iter()
            .find(|s| s.as_str() == config.database)
            .unwrap_or_else(|| schemas.first().expect("checked non-empty above"));

        let tables = connector
            .list_tables(schema)
            .await
            .expect("list_tables should succeed");
        for table in &tables {
            assert_eq!(table.schema, *schema);
            assert!(!table.name.is_empty());
        }
    }

    #[tokio::test]
    #[ignore = "requires database"]
    async fn execute_query_returns_result_set_with_null_and_types() {
        let connector = MySqlConnector::connect(&config_from_env())
            .await
            .expect("connect should succeed against a reachable MySQL instance");

        let result = connector
            .execute_query(
                "SELECT 1 AS id, 'Anderson' AS name, NULL AS email",
                QueryExecutionOptions { max_rows: 500 },
            )
            .await;

        match result {
            QueryExecutionResult::ResultSet {
                columns,
                rows,
                row_count,
                truncated,
                ..
            } => {
                assert_eq!(columns.len(), 3);
                assert_eq!(row_count, 1);
                assert!(!truncated);
                assert_eq!(rows[0][1], Some("Anderson".to_string()));
                assert_eq!(rows[0][2], None);
            }
            other => panic!("expected a ResultSet, got {other:?}"),
        }
    }

    #[tokio::test]
    #[ignore = "requires database"]
    async fn execute_query_truncates_at_max_rows() {
        let connector = MySqlConnector::connect(&config_from_env())
            .await
            .expect("connect should succeed against a reachable MySQL instance");

        let result = connector
            .execute_query(
                "SELECT * FROM (SELECT 1 UNION SELECT 2 UNION SELECT 3) AS t",
                QueryExecutionOptions { max_rows: 2 },
            )
            .await;

        match result {
            QueryExecutionResult::ResultSet {
                row_count,
                truncated,
                ..
            } => {
                assert_eq!(row_count, 2);
                assert!(truncated);
            }
            other => panic!("expected a ResultSet, got {other:?}"),
        }
    }

    async fn raw_connection(config: &ConnectionConfig) -> MySqlConnection {
        use sqlx::Connection;
        let options = MySqlConnectOptions::new()
            .host(&config.host)
            .port(config.port)
            .username(&config.username)
            .password(&config.password)
            .database(&config.database);
        MySqlConnection::connect_with(&options)
            .await
            .expect("connect should succeed against a reachable MySQL instance")
    }

    // El servidor corta en max_rows + 1 (sql_select_limit), asi que tras
    // truncar no queda nada pendiente en la conexion; y el limite se
    // restaura, porque la misma conexion la usa despues el catalogo.
    #[tokio::test]
    #[ignore = "requires database"]
    async fn truncated_query_leaves_connection_reusable_and_unlimited() {
        let mut conn = raw_connection(&config_from_env()).await;

        let outcome = execute_on_connection(
            &mut conn,
            "WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 900) SELECT n FROM s",
            QueryExecutionOptions { max_rows: 2 },
        )
        .await;

        match outcome.result {
            QueryExecutionResult::ResultSet {
                row_count,
                truncated,
                ..
            } => {
                assert_eq!(row_count, 2);
                assert!(truncated);
            }
            other => panic!("expected a ResultSet, got {other:?}"),
        }
        assert!(outcome.connection_reusable);

        let limit: u64 = sqlx::query_scalar("SELECT @@SESSION.sql_select_limit")
            .fetch_one(&mut conn)
            .await
            .expect("reading sql_select_limit should succeed");
        assert_eq!(
            limit,
            u64::MAX,
            "sql_select_limit must be back to its default"
        );
    }

    #[tokio::test]
    #[ignore = "requires database"]
    async fn execute_query_returns_command_for_ddl() {
        let connector = MySqlConnector::connect(&config_from_env())
            .await
            .expect("connect should succeed against a reachable MySQL instance");

        let result = connector
            .execute_query(
                "CREATE TEMPORARY TABLE khipu_execute_query_smoke (id INT)",
                QueryExecutionOptions { max_rows: 500 },
            )
            .await;

        assert!(
            matches!(result, QueryExecutionResult::Command { .. }),
            "expected a Command result, got {result:?}"
        );
    }

    #[tokio::test]
    #[ignore = "requires database"]
    async fn execute_query_returns_error_with_code_for_bad_sql() {
        let connector = MySqlConnector::connect(&config_from_env())
            .await
            .expect("connect should succeed against a reachable MySQL instance");

        let result = connector
            .execute_query(
                "SELECT * FROM this_table_does_not_exist",
                QueryExecutionOptions { max_rows: 500 },
            )
            .await;

        match result {
            QueryExecutionResult::Error { code, .. } => {
                assert!(
                    code.is_some(),
                    "expected MySQL to report a numeric error code"
                );
            }
            other => panic!("expected an Error result, got {other:?}"),
        }
    }

    /// Creates one object of every kind the explorer shows in a throwaway
    /// schema and checks `introspect_schema` finds each under the right
    /// category. Needs CREATE/DROP DATABASE, TRIGGER, CREATE ROUTINE and
    /// EVENT privileges. Checks are only asserted where the server has
    /// `check_constraints` (MySQL 8.0.16+, MariaDB).
    #[tokio::test]
    #[ignore = "requires database"]
    async fn introspect_schema_classifies_every_object_kind() {
        use khipu_driver_core::{RelationKind, RoutineKind};

        const SCHEMA: &str = "khipu_introspect_test";
        let connector = MySqlConnector::connect(&config_from_env())
            .await
            .expect("connect should succeed against a reachable MySQL instance");

        let run = |sql: String| {
            let connector = &connector;
            async move {
                let result = connector
                    .execute_query(&sql, QueryExecutionOptions { max_rows: 10 })
                    .await;
                assert!(
                    !matches!(result, QueryExecutionResult::Error { .. }),
                    "{sql} failed: {result:?}"
                );
            }
        };

        run(format!("DROP DATABASE IF EXISTS {SCHEMA}")).await;
        run(format!("CREATE DATABASE {SCHEMA}")).await;
        run(format!(
            "CREATE TABLE {SCHEMA}.customers (id INT PRIMARY KEY, email VARCHAR(100) NOT NULL, \
             UNIQUE KEY uq_email (email))"
        ))
        .await;
        run(format!(
            "CREATE TABLE {SCHEMA}.orders (id INT, line INT, customer_id INT, total DECIMAL(10,2), \
             PRIMARY KEY (id, line), KEY idx_total (total), \
             CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES {SCHEMA}.customers (id), \
             CONSTRAINT chk_total CHECK (total >= 0))"
        ))
        .await;
        run(format!(
            "CREATE VIEW {SCHEMA}.big_orders AS SELECT id, total FROM {SCHEMA}.orders WHERE total > 100"
        ))
        .await;
        run(format!(
            "CREATE TRIGGER {SCHEMA}.orders_bi BEFORE INSERT ON {SCHEMA}.orders \
             FOR EACH ROW SET NEW.total = COALESCE(NEW.total, 0)"
        ))
        .await;
        run(format!(
            "CREATE PROCEDURE {SCHEMA}.purge(IN p_before INT, OUT p_count INT) SET p_count = p_before"
        ))
        .await;
        run(format!(
            "CREATE FUNCTION {SCHEMA}.twice(p INT) RETURNS INT DETERMINISTIC RETURN p * 2"
        ))
        .await;
        run(format!(
            "CREATE EVENT {SCHEMA}.nightly ON SCHEDULE EVERY 1 DAY DISABLE DO SELECT 1"
        ))
        .await;

        let objects = connector.introspect_schema(SCHEMA).await;
        run(format!("DROP DATABASE {SCHEMA}")).await;
        let objects = objects.expect("introspect_schema should succeed");
        assert!(objects.warnings.is_empty(), "{:?}", objects.warnings);

        let table = |name: &str| {
            objects
                .tables
                .iter()
                .find(|table| table.name == name)
                .unwrap_or_else(|| panic!("{name} missing from {:?}", objects.tables))
        };
        assert_eq!(table("big_orders").kind, RelationKind::View);

        let orders = table("orders");
        assert_eq!(orders.kind, RelationKind::Table);
        let primary = orders
            .keys
            .iter()
            .find(|key| key.primary)
            .expect("orders has a PK");
        assert_eq!(primary.columns, vec!["id", "line"]);
        assert_eq!(orders.foreign_keys[0].name, "fk_orders_customer");
        assert!(orders.indexes.iter().any(|index| index.name == "idx_total"));
        assert_eq!(orders.triggers[0].timing, "BEFORE");
        assert_eq!(orders.triggers[0].events, vec!["INSERT"]);
        if connector.version.capabilities().check_constraints
            != version::CheckConstraints::Unsupported
        {
            assert!(orders.checks.iter().any(|check| check.name == "chk_total"));
        }
        assert!(
            table("customers")
                .keys
                .iter()
                .any(|key| key.name == "uq_email" && !key.primary)
        );

        let purge = objects
            .routines
            .iter()
            .find(|r| r.name == "purge")
            .expect("purge");
        assert_eq!(purge.kind, RoutineKind::Procedure);
        // MariaDB and MySQL 5.7 keep the display width ("int(11)").
        let arguments = purge.arguments.replace("(11)", "");
        assert_eq!(arguments, "p_before int, OUT p_count int");
        let twice = objects
            .routines
            .iter()
            .find(|r| r.name == "twice")
            .expect("twice");
        assert_eq!(twice.kind, RoutineKind::Function);
        assert_eq!(
            twice.return_type.as_deref().map(|t| t.replace("(11)", "")),
            Some("int".to_string())
        );

        assert_eq!(objects.events[0].name, "nightly");
        assert_eq!(objects.events[0].schedule, "EVERY 1 DAY");
    }

    /// What the server under test is expected to negotiate in `Auto`, from
    /// `KHIPU_TEST_MYSQL_EXPECT_TLS`: `encrypted` (a modern server with
    /// TLS), `fallback` (offers TLS rustls can't negotiate, e.g. MySQL 5.7),
    /// `none` (TLS not enabled on the server, e.g. the MariaDB < 11.4 image),
    /// or unset to only check the invariants that hold for any server.
    fn expected_tls() -> Option<String> {
        std::env::var("KHIPU_TEST_MYSQL_EXPECT_TLS").ok()
    }

    fn config_with_tls(mode: TlsMode) -> ConnectionConfig {
        ConnectionConfig {
            tls_mode: mode,
            ..config_from_env()
        }
    }

    #[tokio::test]
    #[ignore = "requires database"]
    async fn tls_auto_always_connects_and_reports_what_it_negotiated() {
        let connector = MySqlConnector::connect(&config_with_tls(TlsMode::Auto))
            .await
            .expect("Auto must connect whatever TLS the server offers");
        let status = connector.tls_status();

        if status.fell_back {
            assert_eq!(status.encrypted, Some(false));
        }
        match expected_tls().as_deref() {
            Some("encrypted") => {
                assert_eq!(status.encrypted, Some(true), "{status:?}");
                assert!(!status.fell_back);
                assert!(status.detail.is_some_and(|detail| detail.contains("TLS")));
            }
            Some("fallback") => assert!(status.fell_back, "{status:?}"),
            Some("none") => {
                assert_eq!(status.encrypted, Some(false), "{status:?}");
                assert!(!status.fell_back, "nothing to fall back from: {status:?}");
            }
            _ => {}
        }
    }

    #[tokio::test]
    #[ignore = "requires database"]
    async fn tls_required_encrypts_or_fails_with_an_actionable_message() {
        let result = MySqlConnector::connect(&config_with_tls(TlsMode::Required)).await;

        match (result, expected_tls().as_deref()) {
            (Ok(connector), expected) => {
                assert!(
                    matches!(expected, None | Some("encrypted")),
                    "Required must not connect without TLS"
                );
                assert_eq!(connector.tls_status().encrypted, Some(true));
                assert!(!connector.tls_status().fell_back);
            }
            (Err(DriverError::Connection { kind, detail }), expected) => {
                assert_ne!(expected, Some("encrypted"), "{detail}");
                assert!(
                    matches!(
                        kind,
                        ConnectionErrorKind::TlsIncompatible | ConnectionErrorKind::TlsUnavailable
                    ),
                    "{kind:?}: {detail}"
                );
                if expected == Some("none") {
                    assert_eq!(kind, ConnectionErrorKind::TlsUnavailable, "{detail}");
                }
            }
            (Err(other), _) => panic!("unexpected error: {other}"),
        }
    }

    #[tokio::test]
    #[ignore = "requires database"]
    async fn tls_disabled_connects_unencrypted() {
        let connector = MySqlConnector::connect(&config_with_tls(TlsMode::Disabled))
            .await
            .expect("Disabled should connect");

        let status = connector.tls_status();
        assert_eq!(status.encrypted, Some(false));
        assert!(!status.fell_back);
    }

    /// Servers in these tests use self-signed certificates, which no public
    /// CA vouches for: VerifyCa without a CA file must refuse them.
    #[tokio::test]
    #[ignore = "requires database"]
    async fn tls_verify_ca_rejects_self_signed_certificates() {
        if expected_tls().as_deref() != Some("encrypted") {
            return;
        }
        let result = MySqlConnector::connect(&config_with_tls(TlsMode::VerifyCa)).await;

        match result {
            Err(DriverError::Connection { kind, detail }) => {
                assert_eq!(kind, ConnectionErrorKind::TlsCertificate, "{detail}")
            }
            Ok(_) => panic!("a self-signed certificate must not pass VerifyCa"),
            Err(other) => panic!("unexpected error: {other}"),
        }
    }

    /// With `KHIPU_TEST_MYSQL_CA_CERT` pointing at the CA that signed the
    /// server certificate, both verifying modes must accept it: proves the CA
    /// file path actually reaches the TLS configuration. The certificate needs
    /// the test host in its subjectAltName: with sqlx 0.8.6 and current
    /// rustls, VerifyCa checks the host name too (see
    /// docs/design/explorador-base-de-datos.md, "Limitaciones conocidas").
    #[tokio::test]
    #[ignore = "requires database"]
    async fn tls_verify_ca_accepts_the_configured_ca() {
        let Ok(ca) = std::env::var("KHIPU_TEST_MYSQL_CA_CERT") else {
            return;
        };
        for mode in [TlsMode::VerifyCa, TlsMode::VerifyIdentity] {
            let config = ConnectionConfig {
                ca_certificate_path: Some(ca.clone()),
                ..config_with_tls(mode)
            };

            let connector = MySqlConnector::connect(&config)
                .await
                .unwrap_or_else(|error| panic!("{mode:?} with the server's CA: {error}"));
            assert_eq!(connector.tls_status().encrypted, Some(true));
        }
    }
}
