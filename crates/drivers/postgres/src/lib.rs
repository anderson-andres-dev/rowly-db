mod introspect;
mod tls;
mod version;

use async_trait::async_trait;
use futures_util::TryStreamExt;
use khipu_driver_core::{
    ConnectionConfig, DbConnector, DriverError, QueryColumn, QueryExecutionOptions,
    QueryExecutionResult, QueryRow, QueryValue, RowSink, SchemaObjects, TlsMode, TlsStatus,
    TransactionError, TransactionStatement,
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

async fn open_pool(config: &ConnectionConfig, mode: TlsMode) -> Result<PgPool, sqlx::Error> {
    let options = PgConnectOptions::new()
        .host(&config.host)
        .port(config.port)
        .username(&config.username)
        .password(&config.password)
        .database(&config.database);
    PgPoolOptions::new()
        .acquire_timeout(CONNECT_TIMEOUT)
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
                message: pg_error.message().to_string(),
                code: Some(pg_error.code().to_string()),
                position,
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
impl DbConnector for PostgresConnector {
    async fn connect(config: &ConnectionConfig) -> Result<Self, DriverError> {
        // En Automatico, un fallo de negociacion TLS (no de login ni de red:
        // ver tls::is_tls_failure) se reintenta sin cifrar. El pool entero
        // queda con esas opciones, asi que las conexiones que abra despues
        // no vuelven a intentar TLS.
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
                .map_err(|e| DriverError::Connection(e.to_string()))?;
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
                format!(
                    "{} es anterior a la version soportada (PostgreSQL 10): \
                     algunos objetos pueden faltar.",
                    self.version.display()
                ),
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
    ) -> Pin<Box<dyn Future<Output = Result<u64, String>> + Send + 'a>> {
        Box::pin(async move {
            let message = |error: sqlx::Error| match postgres_error_to_result(error) {
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
        Box::pin(async move {
            let mut conn = match self.pool.acquire().await {
                Ok(conn) => conn,
                Err(error) => return postgres_error_to_result(error),
            };

            let outcome = execute_on_connection(&mut conn, sql, options).await;
            if !outcome.connection_reusable {
                // Devolverla al pool haria que sqlx la "limpie" leyendo (y
                // tirando) todo lo que el servidor todavia tenga para mandar
                // — ver MAX_ROWS_TO_DRAIN. Cerrar el socket corta el envio
                // en seco; el pool abre otra conexion cuando haga falta.
                drop(conn.detach());
            }
            outcome.result
        })
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

#[cfg(test)]
mod tests {
    use super::*;

    fn config_from_env() -> ConnectionConfig {
        let host = std::env::var("KHIPU_TEST_POSTGRES_HOST")
            .expect("set KHIPU_TEST_POSTGRES_HOST, KHIPU_TEST_POSTGRES_PORT, KHIPU_TEST_POSTGRES_USER, KHIPU_TEST_POSTGRES_PASSWORD and KHIPU_TEST_POSTGRES_DATABASE etc. to run this test");
        let port = std::env::var("KHIPU_TEST_POSTGRES_PORT")
            .expect("set KHIPU_TEST_POSTGRES_HOST, KHIPU_TEST_POSTGRES_PORT, KHIPU_TEST_POSTGRES_USER, KHIPU_TEST_POSTGRES_PASSWORD and KHIPU_TEST_POSTGRES_DATABASE etc. to run this test")
            .parse()
            .expect("KHIPU_TEST_POSTGRES_PORT must be a valid u16");
        let username = std::env::var("KHIPU_TEST_POSTGRES_USER")
            .expect("set KHIPU_TEST_POSTGRES_HOST, KHIPU_TEST_POSTGRES_PORT, KHIPU_TEST_POSTGRES_USER, KHIPU_TEST_POSTGRES_PASSWORD and KHIPU_TEST_POSTGRES_DATABASE etc. to run this test");
        let password = std::env::var("KHIPU_TEST_POSTGRES_PASSWORD")
            .expect("set KHIPU_TEST_POSTGRES_HOST, KHIPU_TEST_POSTGRES_PORT, KHIPU_TEST_POSTGRES_USER, KHIPU_TEST_POSTGRES_PASSWORD and KHIPU_TEST_POSTGRES_DATABASE etc. to run this test");
        let database = std::env::var("KHIPU_TEST_POSTGRES_DATABASE")
            .expect("set KHIPU_TEST_POSTGRES_HOST, KHIPU_TEST_POSTGRES_PORT, KHIPU_TEST_POSTGRES_USER, KHIPU_TEST_POSTGRES_PASSWORD and KHIPU_TEST_POSTGRES_DATABASE etc. to run this test");

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
    async fn connects_and_lists_schemas_and_tables_against_real_postgres() {
        let config = config_from_env();

        let connector = PostgresConnector::connect(&config)
            .await
            .expect("connect should succeed against a reachable PostgreSQL instance");

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
            .find(|s| s.as_str() == "public")
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
        let connector = PostgresConnector::connect(&config_from_env())
            .await
            .expect("connect should succeed against a reachable PostgreSQL instance");

        let result = connector
            .execute_query(
                "SELECT 1 AS id, 'Anderson'::text AS name, NULL::text AS email",
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
        let connector = PostgresConnector::connect(&config_from_env())
            .await
            .expect("connect should succeed against a reachable PostgreSQL instance");

        let result = connector
            .execute_query(
                "SELECT * FROM generate_series(1, 3)",
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

    async fn raw_connection(config: &ConnectionConfig) -> PgConnection {
        use sqlx::Connection;
        let options = PgConnectOptions::new()
            .host(&config.host)
            .port(config.port)
            .username(&config.username)
            .password(&config.password)
            .database(&config.database);
        PgConnection::connect_with(&options)
            .await
            .expect("connect should succeed against a reachable Postgres instance")
    }

    #[tokio::test]
    #[ignore = "requires database"]
    async fn truncated_query_with_few_extra_rows_leaves_connection_reusable() {
        let mut conn = raw_connection(&config_from_env()).await;

        let outcome = execute_on_connection(
            &mut conn,
            "SELECT n FROM generate_series(1, 900) AS n",
            QueryExecutionOptions { max_rows: 2 },
        )
        .await;

        assert!(matches!(
            outcome.result,
            QueryExecutionResult::ResultSet {
                row_count: 2,
                truncated: true,
                ..
            }
        ));
        assert!(outcome.connection_reusable);
    }

    // Con muchas filas pendientes la conexion no debe volver al pool: sqlx
    // la "limpiaria" descargando el resto del resultado en segundo plano.
    #[tokio::test]
    #[ignore = "requires database"]
    async fn truncated_query_with_many_extra_rows_discards_connection() {
        let mut conn = raw_connection(&config_from_env()).await;

        let outcome = execute_on_connection(
            &mut conn,
            "SELECT n FROM generate_series(1, 1000000) AS n",
            QueryExecutionOptions { max_rows: 2 },
        )
        .await;

        assert!(matches!(
            outcome.result,
            QueryExecutionResult::ResultSet {
                row_count: 2,
                truncated: true,
                ..
            }
        ));
        assert!(!outcome.connection_reusable);
    }

    #[tokio::test]
    #[ignore = "requires database"]
    async fn execute_query_returns_command_for_ddl() {
        let connector = PostgresConnector::connect(&config_from_env())
            .await
            .expect("connect should succeed against a reachable PostgreSQL instance");

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
    async fn execute_query_returns_error_with_code_and_position_for_bad_sql() {
        let connector = PostgresConnector::connect(&config_from_env())
            .await
            .expect("connect should succeed against a reachable PostgreSQL instance");

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
                    "expected Postgres to report a SQLSTATE code"
                );
            }
            other => panic!("expected an Error result, got {other:?}"),
        }
    }

    /// Creates one object of every kind the explorer shows in a throwaway
    /// schema and checks `introspect_schema` finds each under the right
    /// category. Needs CREATE on the database. The procedure is only
    /// created and asserted on PostgreSQL 11+.
    #[tokio::test]
    #[ignore = "requires database"]
    async fn introspect_schema_classifies_every_object_kind() {
        use khipu_driver_core::{RelationKind, RoutineKind};

        const SCHEMA: &str = "khipu_introspect_test";
        let connector = PostgresConnector::connect(&config_from_env())
            .await
            .expect("connect should succeed against a reachable PostgreSQL instance");
        let has_procedures = connector.version.capabilities().prokind;

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

        run(format!("DROP SCHEMA IF EXISTS {SCHEMA} CASCADE")).await;
        run(format!("CREATE SCHEMA {SCHEMA}")).await;
        run(format!(
            "CREATE TABLE {SCHEMA}.customers (id int, region int, email text NOT NULL UNIQUE, \
             PRIMARY KEY (id, region))"
        ))
        .await;
        run(format!(
            "CREATE TABLE {SCHEMA}.orders (id serial PRIMARY KEY, customer_id int, region int, \
             total numeric(10,2) CONSTRAINT chk_total CHECK (total >= 0), \
             CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id, region) \
               REFERENCES {SCHEMA}.customers (id, region))"
        ))
        .await;
        run(format!("CREATE INDEX idx_total ON {SCHEMA}.orders (total)")).await;
        run(format!(
            "CREATE VIEW {SCHEMA}.big_orders AS SELECT id, total FROM {SCHEMA}.orders WHERE total > 100"
        ))
        .await;
        run(format!(
            "CREATE MATERIALIZED VIEW {SCHEMA}.order_totals AS SELECT sum(total) AS total FROM {SCHEMA}.orders"
        ))
        .await;
        run(format!("CREATE SEQUENCE {SCHEMA}.invoice_number")).await;
        run(format!(
            "CREATE FUNCTION {SCHEMA}.twice(p integer) RETURNS integer LANGUAGE sql AS 'SELECT p * 2'"
        ))
        .await;
        run(format!(
            "CREATE FUNCTION {SCHEMA}.touch() RETURNS trigger LANGUAGE plpgsql AS \
             'BEGIN RETURN NEW; END'"
        ))
        .await;
        run(format!(
            "CREATE TRIGGER orders_audit AFTER INSERT OR UPDATE ON {SCHEMA}.orders \
             FOR EACH ROW EXECUTE PROCEDURE {SCHEMA}.touch()"
        ))
        .await;
        if has_procedures {
            run(format!(
                "CREATE PROCEDURE {SCHEMA}.purge(p_before integer) LANGUAGE sql AS 'SELECT 1'"
            ))
            .await;
        }

        let objects = connector.introspect_schema(SCHEMA).await;
        run(format!("DROP SCHEMA {SCHEMA} CASCADE")).await;
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
        assert_eq!(table("order_totals").kind, RelationKind::MaterializedView);
        assert_eq!(table("order_totals").columns[0].name, "total");

        let customers = table("customers");
        let primary = customers
            .keys
            .iter()
            .find(|key| key.primary)
            .expect("customers has a PK");
        assert_eq!(primary.columns, vec!["id", "region"]);
        assert!(
            customers
                .keys
                .iter()
                .any(|key| !key.primary && key.columns == ["email"])
        );

        let orders = table("orders");
        let foreign_key: Vec<_> = orders
            .foreign_keys
            .iter()
            .map(|fk| {
                (
                    fk.name.as_str(),
                    fk.column.as_str(),
                    fk.referenced_column.as_str(),
                )
            })
            .collect();
        assert_eq!(
            foreign_key,
            vec![
                ("fk_orders_customer", "customer_id", "id"),
                ("fk_orders_customer", "region", "region"),
            ]
        );
        assert_eq!(orders.checks[0].name, "chk_total");
        let index = orders
            .indexes
            .iter()
            .find(|i| i.name == "idx_total")
            .expect("idx_total");
        assert_eq!(index.columns, vec!["total"]);
        assert_eq!(index.method.as_deref(), Some("btree"));
        assert_eq!(orders.triggers[0].timing, "AFTER");
        assert_eq!(orders.triggers[0].events, vec!["INSERT", "UPDATE"]);

        assert!(objects.sequences.iter().any(|s| s.name == "invoice_number"));
        let twice = objects
            .routines
            .iter()
            .find(|r| r.name == "twice")
            .expect("twice");
        assert_eq!(twice.kind, RoutineKind::Function);
        assert_eq!(twice.arguments, "p integer");
        assert_eq!(twice.return_type.as_deref(), Some("integer"));
        if has_procedures {
            let purge = objects
                .routines
                .iter()
                .find(|r| r.name == "purge")
                .expect("purge");
            assert_eq!(purge.kind, RoutineKind::Procedure);
            assert_eq!(purge.return_type, None);
        }
    }

    /// What the server under test is expected to negotiate in `Auto`, from
    /// `KHIPU_TEST_POSTGRES_EXPECT_TLS`: `encrypted` (a modern server with
    /// TLS), `fallback` (offers TLS rustls can't negotiate, e.g. MySQL 5.7),
    /// `none` (TLS not enabled on the server, e.g. the MariaDB < 11.4 image),
    /// or unset to only check the invariants that hold for any server.
    fn expected_tls() -> Option<String> {
        std::env::var("KHIPU_TEST_POSTGRES_EXPECT_TLS").ok()
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
        let connector = PostgresConnector::connect(&config_with_tls(TlsMode::Auto))
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
        let result = PostgresConnector::connect(&config_with_tls(TlsMode::Required)).await;

        match (result, expected_tls().as_deref()) {
            (Ok(connector), expected) => {
                assert!(
                    matches!(expected, None | Some("encrypted")),
                    "Required must not connect without TLS"
                );
                assert_eq!(connector.tls_status().encrypted, Some(true));
                assert!(!connector.tls_status().fell_back);
            }
            (Err(DriverError::Connection(message)), expected) => {
                assert_ne!(expected, Some("encrypted"), "{message}");
                assert!(
                    message.starts_with("El servidor no ofrece un cifrado TLS compatible")
                        || message.starts_with("El servidor no tiene TLS habilitado"),
                    "{message}"
                );
                if expected == Some("none") {
                    assert!(message.starts_with("El servidor no tiene TLS habilitado"));
                }
            }
            (Err(other), _) => panic!("unexpected error: {other}"),
        }
    }

    #[tokio::test]
    #[ignore = "requires database"]
    async fn tls_disabled_connects_unencrypted() {
        let connector = PostgresConnector::connect(&config_with_tls(TlsMode::Disabled))
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
        let result = PostgresConnector::connect(&config_with_tls(TlsMode::VerifyCa)).await;

        match result {
            Err(DriverError::Connection(message)) => {
                assert!(message.starts_with("Certificado inválido:"), "{message}")
            }
            Ok(_) => panic!("a self-signed certificate must not pass VerifyCa"),
            Err(other) => panic!("unexpected error: {other}"),
        }
    }

    /// With `KHIPU_TEST_POSTGRES_CA_CERT` pointing at the CA that signed the
    /// server certificate, both verifying modes must accept it: proves the CA
    /// file path actually reaches the TLS configuration. The certificate needs
    /// the test host in its subjectAltName: with sqlx 0.8.6 and current
    /// rustls, VerifyCa checks the host name too (see
    /// docs/design/explorador-base-de-datos.md, "Limitaciones conocidas").
    #[tokio::test]
    #[ignore = "requires database"]
    async fn tls_verify_ca_accepts_the_configured_ca() {
        let Ok(ca) = std::env::var("KHIPU_TEST_POSTGRES_CA_CERT") else {
            return;
        };
        for mode in [TlsMode::VerifyCa, TlsMode::VerifyIdentity] {
            let config = ConnectionConfig {
                ca_certificate_path: Some(ca.clone()),
                ..config_with_tls(mode)
            };

            let connector = PostgresConnector::connect(&config)
                .await
                .unwrap_or_else(|error| panic!("{mode:?} with the server's CA: {error}"));
            assert_eq!(connector.tls_status().encrypted, Some(true));
        }
    }
}
