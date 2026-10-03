mod introspect;
mod tls;
mod version;

use async_trait::async_trait;
use futures_util::TryStreamExt;
use khipu_driver_core::{
    ConnectionConfig, ConnectionErrorKind, DbConnector, DriverError, Message, QueryCancel,
    QueryColumn, QueryExecutionOptions, QueryExecutionResult, QueryRow, QueryValue, RowSink,
    SchemaObjects, TlsMode, TlsStatus, TransactionError, TransactionStatement, probe_tcp,
};
use sqlx::postgres::{
    PgConnectOptions, PgConnection, PgDatabaseError, PgErrorPosition, PgPoolOptions,
};
use sqlx::{Column, Executor, PgPool, Row, TypeInfo};
use std::future::Future;
use std::pin::Pin;
use std::time::{Duration, Instant};

pub struct PostgresConnector {
    pool: PgPool,
    version: version::ServerVersion,
    tls: TlsStatus,
}

/// How long the pool waits for a connection before giving up. sqlx's default
/// (30 s) leaves the app hanging too long on a host that doesn't answer.
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

/// sqlx sends `TimeZone=UTC` in the startup packet, and a client setting
/// outranks postgresql.conf and `ALTER DATABASE/ROLE ... SET timezone`, so
/// timestamptz values and now() came out in UTC whatever the server says.
/// The session is put back on the server's zone, like psql: the most
/// specific database/role setting (role+database, role, database), else
/// the server's configured zone (`log_timezone`, which initdb sets to the
/// same zone and a client can't override).
const RESTORE_SERVER_TIME_ZONE: &str = "\
    SELECT set_config('TimeZone', COALESCE(( \
        SELECT substring(config FROM position('=' IN config) + 1) \
        FROM pg_db_role_setting setting, unnest(setting.setconfig) config \
        WHERE config ILIKE 'timezone=%' \
          AND setting.setrole IN (0, (SELECT oid FROM pg_roles WHERE rolname = current_user)) \
          AND setting.setdatabase IN (0, (SELECT oid FROM pg_database WHERE datname = current_database())) \
        ORDER BY setting.setrole <> 0 AND setting.setdatabase <> 0 DESC, setting.setrole <> 0 DESC \
        LIMIT 1 \
    ), current_setting('log_timezone')), false)";

async fn open_pool(config: &ConnectionConfig, mode: TlsMode) -> Result<PgPool, sqlx::Error> {
    let options = PgConnectOptions::new()
        .host(&config.host)
        .port(config.port)
        .username(&config.username)
        .password(&config.password)
        .database(&config.database);
    PgPoolOptions::new()
        .acquire_timeout(CONNECT_TIMEOUT)
        .after_connect(|conn, _meta| {
            Box::pin(async move {
                // A server without these catalogs (a Postgres-compatible
                // one) keeps sqlx's UTC rather than refusing to connect.
                let _ = sqlx::query(RESTORE_SERVER_TIME_ZONE)
                    .execute(&mut *conn)
                    .await;
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

/// A single, unprepared statement executed via Postgres's simple query
/// protocol (`take_arguments` returning `None` tells sqlx not to prepare
/// it), which returns every value in text format. `sqlx::raw_sql` provides
/// this too, but calling it inside the boxed `dyn Future` that
/// `DbConnector::execute_query` returns fails to type-check
/// ("implementation of `Executor` is not general enough" —
/// launchbadge/sqlx#3591, fixed upstream only in sqlx 0.9, which this
/// workspace isn't on yet) because `RawSql`'s `Execute` impl is generic over
/// every `Database`. Implementing `Execute` ourselves, concretely for
/// `Postgres` only, avoids that.
struct RawStatement<'q>(&'q str);

impl<'q> sqlx::Execute<'q, sqlx::Postgres> for RawStatement<'q> {
    fn sql(&self) -> &'q str {
        self.0
    }

    fn statement(&self) -> Option<&<sqlx::Postgres as sqlx::Database>::Statement<'q>> {
        None
    }

    fn take_arguments(
        &mut self,
    ) -> Result<Option<<sqlx::Postgres as sqlx::Database>::Arguments<'q>>, sqlx::error::BoxDynError>
    {
        Ok(None)
    }

    fn persistent(&self) -> bool {
        false
    }
}

fn postgres_error_to_result(error: sqlx::Error) -> QueryExecutionResult {
    if let sqlx::Error::Database(database_error) = &error {
        if let Some(pg_error) = database_error.try_downcast_ref::<PgDatabaseError>() {
            let position = match pg_error.position() {
                Some(PgErrorPosition::Original(position)) => Some(position as u64),
                _ => None,
            };
            return QueryExecutionResult::Error {
                message: pg_error.message().into(),
                code: Some(pg_error.code().to_string()),
                position,
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
impl DbConnector for PostgresConnector {
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
        let raw_version: String =
            sqlx::query_scalar("SELECT current_setting('server_version_num')")
                .fetch_one(&pool)
                .await
                .map_err(|e| DriverError::connection(ConnectionErrorKind::Other, e.to_string()))?;
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

    // pg_namespace en vez de information_schema.schemata, que solo lista
    // los schemas de los que el rol es dueño. Se ocultan los internos de
    // TOAST y los temporales de cada sesion, y los que el rol no puede usar.
    async fn list_schemas(&self) -> Result<Vec<String>, DriverError> {
        sqlx::query_scalar(
            "SELECT nspname::text FROM pg_namespace \
             WHERE nspname NOT LIKE 'pg\\_toast%' AND nspname NOT LIKE 'pg\\_temp\\_%' \
               AND has_schema_privilege(oid, 'USAGE') \
             ORDER BY nspname",
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DriverError::Query(e.to_string()))
    }

    // current_schema() es NULL si ningun schema del search_path existe; en
    // ese caso se cae a "public", el default de toda base nueva.
    async fn current_schema(&self) -> Result<String, DriverError> {
        let schema: Option<String> = sqlx::query_scalar("SELECT current_schema()::text")
            .fetch_one(&self.pool)
            .await
            .map_err(|e| DriverError::Query(e.to_string()))?;
        Ok(schema.unwrap_or_else(|| "public".to_string()))
    }

    async fn introspect_schema(&self, schema: &str) -> Result<SchemaObjects, DriverError> {
        let mut objects =
            introspect::introspect_schema(&self.pool, schema, self.version.capabilities()).await?;
        if self.version.is_below_minimum() {
            objects.warnings.insert(
                0,
                Message::key("introspect.unsupportedVersion")
                    .with("version", self.version.display())
                    .with("minimum", "PostgreSQL 10"),
            );
        }
        Ok(objects)
    }

    // Postgres no tiene un equivalente de una sola sentencia a `SHOW CREATE
    // TABLE` de MySQL; se reconstruye a mano desde pg_catalog. `quote_ident`
    // (mismo patron que list_tables mas arriba) hace la resolucion segura
    // sin tener que armar el SQL con el nombre interpolado a mano.
    async fn table_definition(&self, schema: &str, table: &str) -> Result<String, DriverError> {
        let column_rows = sqlx::query(
            "SELECT a.attname, format_type(a.atttypid, a.atttypmod), a.attnotnull, \
             pg_get_expr(d.adbin, d.adrelid) \
             FROM pg_attribute a \
             LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum \
             WHERE a.attrelid = (quote_ident($1) || '.' || quote_ident($2))::regclass \
               AND a.attnum > 0 AND NOT a.attisdropped \
             ORDER BY a.attnum",
        )
        .bind(schema)
        .bind(table)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DriverError::Query(e.to_string()))?;

        if column_rows.is_empty() {
            return Err(DriverError::Query(format!(
                "no se encontraron columnas para {schema}.{table}"
            )));
        }

        let pk_rows = sqlx::query(
            "SELECT a.attname FROM pg_index i \
             JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) \
             WHERE i.indrelid = (quote_ident($1) || '.' || quote_ident($2))::regclass AND i.indisprimary \
             ORDER BY array_position(i.indkey, a.attnum)",
        )
        .bind(schema)
        .bind(table)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DriverError::Query(e.to_string()))?;

        let mut primary_key = Vec::with_capacity(pk_rows.len());
        for row in &pk_rows {
            let name: String = row
                .try_get(0)
                .map_err(|e| DriverError::Query(e.to_string()))?;
            primary_key.push(name);
        }

        let mut lines = Vec::with_capacity(column_rows.len());
        for row in &column_rows {
            let name: String = row
                .try_get(0)
                .map_err(|e| DriverError::Query(e.to_string()))?;
            let data_type: String = row
                .try_get(1)
                .map_err(|e| DriverError::Query(e.to_string()))?;
            let not_null: bool = row
                .try_get(2)
                .map_err(|e| DriverError::Query(e.to_string()))?;
            let default_value: Option<String> = row
                .try_get(3)
                .map_err(|e| DriverError::Query(e.to_string()))?;

            let mut line = format!("    {name} {data_type}");
            if let Some(default_value) = default_value {
                line.push_str(&format!(" DEFAULT {default_value}"));
            }
            if not_null {
                line.push_str(" NOT NULL");
            }
            lines.push(line);
        }

        if !primary_key.is_empty() {
            lines.push(format!("    PRIMARY KEY ({})", primary_key.join(", ")));
        }

        Ok(format!(
            "CREATE TABLE {schema}.{table} (\n{}\n);",
            lines.join(",\n")
        ))
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
            let message = |error: sqlx::Error| match postgres_error_to_result(error) {
                QueryExecutionResult::Error { message, .. } => message,
                _ => Message::key("export.readFailed"),
            };
            let mut conn = self.pool.acquire().await.map_err(message)?;
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
                        values.push(
                            row.try_get_unchecked::<QueryValue, _>(index)
                                .map_err(message)?,
                        );
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
                TransactionError::from_result(None, postgres_error_to_result(error))
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
                            postgres_error_to_result(error),
                        ));
                    }
                }
            }
            tx.commit().await.map_err(|error| {
                TransactionError::from_result(None, postgres_error_to_result(error))
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
        sqlx::query("SELECT pg_cancel_backend($1)")
            .bind(id as i32)
            .execute(&self.pool)
            .await
            .map(|_| ())
            .map_err(|error| DriverError::Query(error.to_string()))
    }
}

impl PostgresConnector {
    async fn run_query(
        &self,
        sql: &str,
        options: QueryExecutionOptions,
        cancel: Option<&QueryCancel>,
    ) -> QueryExecutionResult {
        let mut conn = match self.pool.acquire().await {
            Ok(conn) => conn,
            Err(error) => return postgres_error_to_result(error),
        };

        // Id de la conexion en el servidor: cancelar la interrumpe desde otra
        // (ver QueryCancel). Si ya se cancelo mientras se esperaba una
        // conexion, ni se empieza.
        if let Some(cancel) = cancel {
            match sqlx::query_scalar::<_, i32>("SELECT pg_backend_pid()")
                .fetch_one(&mut *conn)
                .await
            {
                Ok(id) if !cancel.begin(id as u64) => return cancelled_before_start(),
                Ok(_) => {}
                Err(error) => return postgres_error_to_result(error),
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
        message: Message::key("query.cancelledBeforeStart"),
        code: None,
        position: None,
    }
}

/// Rows past `max_rows` that are still read (and discarded) so the
/// connection can go back to the pool clean. The simple query protocol
/// streams the whole result set and can't be stopped midway: whatever isn't
/// read here, sqlx reads on release (`ping`) before reusing the connection.
/// Without a bound, a `SELECT * FROM big_table` that shows 500 rows
/// downloads the whole table in the background, and a few of those in a row
/// starve the pool — every later query waits up to `acquire_timeout`. Past
/// this bound the connection is discarded instead (see
/// `ExecutionOutcome::connection_reusable`).
const MAX_ROWS_TO_DRAIN: usize = 1000;

struct ExecutionOutcome {
    result: QueryExecutionResult,
    /// `false` when the connection still has unread rows pending and must
    /// not go back to the pool.
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
    conn: &mut PgConnection,
    sql: &str,
    options: QueryExecutionOptions,
) -> ExecutionOutcome {
    let start = Instant::now();

    let describe = match conn.describe(sql).await {
        Ok(describe) => describe,
        Err(error) => return postgres_error_to_result(error).into(),
    };

    if describe.columns().is_empty() {
        let outcome = match Executor::execute(&mut *conn, RawStatement(sql)).await {
            Ok(outcome) => outcome,
            Err(error) => return postgres_error_to_result(error).into(),
        };
        return QueryExecutionResult::Command {
            affected_rows: outcome.rows_affected(),
            execution_time_ms: start.elapsed().as_millis() as u64,
        }
        .into();
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
                    result: postgres_error_to_result(error),
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

        let mut query_row: QueryRow = Vec::with_capacity(columns.len());
        for index in 0..columns.len() {
            let value: Result<QueryValue, sqlx::Error> = row.try_get_unchecked(index);
            match value {
                Ok(value) => query_row.push(value),
                Err(error) => {
                    return ExecutionOutcome {
                        result: postgres_error_to_result(error),
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
