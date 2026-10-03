//! Ayudas de las pruebas contra servidores reales. Los servidores salen de
//! `tools/test-dbs/up.sh`; las pruebas estan marcadas `#[ignore]`:
//! `cargo test -p rowly-server-tests -- --ignored --test-threads=1`.

use khipu_driver_core::{
    ConnectionConfig, DbConnector, QueryExecutionOptions, QueryExecutionResult, SchemaObjects,
    TlsMode,
};
use khipu_driver_mysql::MySqlConnector;
use khipu_driver_postgres::PostgresConnector;
use khipu_engine::Dialect;
use khipu_engine::execution_guard::{
    DestructiveClassification, GuardOptions, classify_sql, classify_sql_with,
};
use sqlx::{Connection, MySqlConnection, PgConnection};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Engine {
    MySql,
    MariaDb,
    Postgres,
}

impl Engine {
    pub const ALL: [Engine; 3] = [Engine::MySql, Engine::MariaDb, Engine::Postgres];

    pub fn dialect(self) -> Dialect {
        match self {
            Engine::MySql => Dialect::MySql,
            Engine::MariaDb => Dialect::MariaDb,
            Engine::Postgres => Dialect::Postgres,
        }
    }

    pub fn is_mysql_family(self) -> bool {
        self != Engine::Postgres
    }

    /// Su nombre en ROWLY_ENGINES, lines.json y tests/sql.
    pub fn name(self) -> &'static str {
        match self {
            Engine::MySql => "mysql",
            Engine::MariaDb => "mariadb",
            Engine::Postgres => "postgres",
        }
    }

    /// El contenedor de tools/test-dbs que lo sirve.
    pub fn container(self) -> &'static str {
        match self {
            Engine::MySql => "rowly-test-mysql",
            Engine::MariaDb => "rowly-test-mariadb",
            Engine::Postgres => "rowly-test-postgres",
        }
    }

    /// Donde viven las tablas de prueba: la base en MySQL y MariaDB, el schema
    /// `rowly_test` en Postgres.
    pub fn scope(self) -> &'static str {
        "rowly_test"
    }

    fn config(self) -> ConnectionConfig {
        let (port, database) = match self {
            Engine::MySql => (33306, "rowly_test"),
            Engine::MariaDb => (33307, "rowly_test"),
            Engine::Postgres => (55432, "pagila"),
        };
        ConnectionConfig {
            host: "127.0.0.1".into(),
            port,
            database: database.into(),
            username: "rowly".into(),
            password: "rowly".into(),
            tls_mode: TlsMode::Disabled,
            ca_certificate_path: None,
        }
    }
}

pub enum Conn {
    My(MySqlConnector),
    Pg(PostgresConnector),
}

impl Conn {
    /// La conexion de prueba del motor, despues de comprobar que el servidor
    /// es exactamente la version que `tools/test-dbs/lines.json` declara para
    /// la imagen del contenedor (SQL_ENGINE §10.1), y de que el `sql_mode`
    /// global no trae `NO_BACKSLASH_ESCAPES`.
    pub async fn open(engine: Engine) -> Conn {
        Conn::open_in_mode(engine, false).await
    }

    /// Como `open`, pero exige que el `sql_mode` global sea el esperado: un
    /// modo que no toca hace fallar en falso las pruebas de cadenas (S2).
    async fn open_in_mode(engine: Engine, no_backslash_escapes: bool) -> Conn {
        let conn = Conn::open_unchecked(engine).await;
        if engine != Engine::Postgres {
            let mode = conn
                .scalar("SELECT @@GLOBAL.sql_mode")
                .await
                .unwrap_or_default();
            let found = mode.contains("NO_BACKSLASH_ESCAPES");
            assert!(
                found == no_backslash_escapes,
                "{}: el sql_mode global {} NO_BACKSLASH_ESCAPES ({mode}). {}",
                engine.container(),
                if found { "trae" } else { "no trae" },
                if found {
                    format!(
                        "Lo dejo puesto una corrida interrumpida; quitalo con:\n  docker exec {} {} -uroot -prowly -e \"{NO_BACKSLASH_ESCAPES_OFF}\"",
                        engine.container(),
                        if engine == Engine::MariaDb {
                            "mariadb"
                        } else {
                            "mysql"
                        }
                    )
                } else {
                    "NoBackslashEscapes::on no lo aplico.".to_string()
                }
            );
        }
        let declared = declared_version(engine);
        let actual = exact_version(&conn.server_version()).to_string();
        assert_eq!(
            actual,
            declared.version,
            "{}: el servidor informa {actual}, pero lines.json declara {} para {}",
            engine.container(),
            declared.version,
            declared.image
        );
        evidence(engine, &declared);
        conn
    }

    async fn open_unchecked(engine: Engine) -> Conn {
        let config = engine.config();
        match engine {
            Engine::Postgres => Conn::Pg(
                PostgresConnector::connect(&config)
                    .await
                    .expect("postgres de prueba: corre tools/test-dbs/up.sh"),
            ),
            _ => Conn::My(
                MySqlConnector::connect(&config)
                    .await
                    .expect("mysql/mariadb de prueba: corre tools/test-dbs/up.sh"),
            ),
        }
    }

    /// Un servidor de linea de version (`tools/test-dbs/lines.sh`): sin
    /// datos, como administrador.
    pub async fn open_line(engine: Engine, port: u16) -> Result<Conn, String> {
        let (username, database) = match engine {
            Engine::Postgres => ("postgres", "postgres"),
            _ => ("root", "mysql"),
        };
        let config = ConnectionConfig {
            host: "127.0.0.1".into(),
            port,
            database: database.into(),
            username: username.into(),
            password: "rowly".into(),
            tls_mode: TlsMode::Disabled,
            ca_certificate_path: None,
        };
        match engine {
            Engine::Postgres => PostgresConnector::connect(&config).await.map(Conn::Pg),
            _ => MySqlConnector::connect(&config).await.map(Conn::My),
        }
        .map_err(|error| error.to_string())
    }

    /// La version exacta del servidor, para compararla: `[13, 23]`.
    pub fn version(&self) -> Vec<u32> {
        version_numbers(exact_version(&self.server_version()))
    }

    /// Si el servidor tiene `capability` (ver `capability`). Si no la tiene,
    /// `sql` (lo que la usa) tiene que fallar en el servidor: solo entonces
    /// se registra como N/A de la fila `row`, con la linea donde empieza y el
    /// archivo que lo demuestra. Si el servidor lo acepta, la capacidad esta
    /// mal declarada y la prueba lo dice.
    pub async fn lacks(
        &self,
        engine: Engine,
        row: &str,
        name: &str,
        sql: &str,
    ) -> Result<bool, String> {
        let capability = capability(engine, name);
        if self.version() >= capability.since {
            return Ok(false);
        }
        let result = self.raw(sql).await;
        if !is_error(&result) {
            return Err(format!(
                "{engine:?} {}: «{name}» empieza en {} segun {}, pero el servidor acepto:\n  {}",
                exact_version(&self.server_version()),
                dotted(&capability.since),
                capability.proof,
                sql.chars().take(120).collect::<String>()
            ));
        }
        record(format!(
            "{{\"engine\":\"{engine:?}\",\"version\":\"{}\",\"row\":\"{row}\",\"na\":{},\"since\":\"{}\",\"proof\":\"{}\"}}",
            exact_version(&self.server_version()),
            serde_json::Value::from(name),
            dotted(&capability.since),
            capability.proof
        ));
        Ok(true)
    }

    /// La version que informa el servidor, como la muestra la app.
    pub fn server_version(&self) -> String {
        match self {
            Conn::My(connector) => connector.server_version(),
            Conn::Pg(connector) => connector.server_version(),
        }
    }

    /// Ejecuta tal cual, sin guard: lo que haria el servidor con el texto.
    pub async fn raw(&self, sql: &str) -> QueryExecutionResult {
        let options = QueryExecutionOptions { max_rows: 1000 };
        match self {
            Conn::My(connector) => connector.execute_query(sql, options).await,
            Conn::Pg(connector) => connector.execute_query(sql, options).await,
        }
    }

    /// Lo que hace la app: el guard primero, el driver despues. `Err` es el
    /// guard rechazando (nada llega al servidor).
    pub async fn guarded(&self, engine: Engine, sql: &str) -> Result<QueryExecutionResult, String> {
        match classify_sql(sql.trim(), engine.dialect(), false) {
            Ok(_) => Ok(self.raw(sql).await),
            Err(error) => Err(error.to_string()),
        }
    }

    /// Lo que haria el servidor con el texto SIN la barrera del driver (que
    /// prepara antes de ejecutar y asi rechaza varias sentencias): protocolo de
    /// texto con varias sentencias, como lo hace el cliente `mysql` o `psql`.
    pub async fn multi_statement(engine: Engine, sql: &str) {
        let config = engine.config();
        match engine {
            Engine::Postgres => {
                let url = format!(
                    "postgres://rowly:rowly@127.0.0.1:{}/{}",
                    config.port, config.database
                );
                let mut conn = PgConnection::connect(&url)
                    .await
                    .expect("postgres de prueba");
                let _ = sqlx::raw_sql(sql).execute(&mut conn).await;
            }
            _ => {
                let url = format!(
                    "mysql://rowly:rowly@127.0.0.1:{}/{}",
                    config.port, config.database
                );
                let mut conn = MySqlConnection::connect(&url)
                    .await
                    .expect("mysql de prueba");
                let _ = sqlx::raw_sql(sql).execute(&mut conn).await;
            }
        }
    }

    /// Lo que la app lee de un schema para el explorador y el autocompletado.
    pub async fn introspect(&self, schema: &str) -> SchemaObjects {
        match self {
            Conn::My(connector) => connector.introspect_schema(schema).await,
            Conn::Pg(connector) => connector.introspect_schema(schema).await,
        }
        .expect("introspeccion")
    }

    pub async fn scalar(&self, sql: &str) -> Option<String> {
        match self.raw(sql).await {
            QueryExecutionResult::ResultSet { rows, .. } => {
                rows.first().and_then(|row| row.first().cloned()).flatten()
            }
            _ => None,
        }
    }
}

/// Los numeros de una version: `[11, 8, 9]` de "11.8.9" o "11.8.9-MariaDB".
pub fn version_numbers(text: &str) -> Vec<u32> {
    text.split(|c: char| !c.is_ascii_digit() && c != '.')
        .find(|part| part.chars().next().is_some_and(|c| c.is_ascii_digit()))
        .unwrap_or("")
        .split('.')
        .filter_map(|part| part.parse().ok())
        .collect()
}

fn dotted(version: &[u32]) -> String {
    version
        .iter()
        .map(u32::to_string)
        .collect::<Vec<_>>()
        .join(".")
}

/// Una capacidad que agrega una linea de version.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Capability {
    /// Desde que version existe: la linea, o su `-- since:`.
    pub since: Vec<u32>,
    /// El archivo cuya entrada lo demuestra (D7).
    pub proof: String,
}

/// Una capacidad por su nombre: el comentario de su entrada en
/// `tests/sql/<motor>/<linea>/accepts.sql`. D7 demuestra que el servidor la
/// acepta desde esa linea y la rechaza en la anterior, asi que un N/A tiene
/// un motivo verificable y la frontera se declara una sola vez.
pub fn capability(engine: Engine, name: &str) -> Capability {
    let key = |text: &str| text.trim().trim_end_matches('.').to_lowercase();
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/sql")
        .join(engine.name());
    let mut lines: Vec<_> = std::fs::read_dir(&root)
        .unwrap_or_else(|_| panic!("{}", root.display()))
        .filter_map(|dir| dir.ok())
        .filter(|dir| dir.path().join("accepts.sql").is_file())
        .collect();
    lines.sort_by_key(|dir| version_numbers(&dir.file_name().to_string_lossy()));
    for dir in lines {
        let line = dir.file_name().to_string_lossy().to_string();
        let text = std::fs::read_to_string(dir.path().join("accepts.sql")).unwrap();
        for entry in entries(&text) {
            let comments: Vec<&str> = entry
                .lines()
                .filter_map(|line| line.strip_prefix("--"))
                .collect();
            if !comments.iter().any(|comment| key(comment) == key(name)) {
                continue;
            }
            let since = comments
                .iter()
                .find_map(|comment| comment.trim().strip_prefix("since:"))
                .map(version_numbers)
                .unwrap_or_else(|| version_numbers(&line));
            return Capability {
                since,
                proof: format!("tests/sql/{}/{line}/accepts.sql", engine.name()),
            };
        }
    }
    panic!(
        "{engine:?}: «{name}» no esta en ningun tests/sql/{}/<linea>/accepts.sql; declarala ahi para que D7 la demuestre",
        engine.name()
    )
}

/// La version exacta de lo que muestra la app ("8.4.11" de "MySQL 8.4.11").
pub fn exact_version(display: &str) -> &str {
    display.rsplit(' ').next().unwrap_or(display)
}

/// Un servidor de lines.json: imagen fijada por digest y version declarada.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Declared {
    pub image: String,
    pub digest: String,
    pub version: String,
}

pub fn lines_json() -> serde_json::Value {
    let path =
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../tools/test-dbs/lines.json");
    serde_json::from_str(&std::fs::read_to_string(path).expect("tools/test-dbs/lines.json"))
        .expect("lines.json valido")
}

/// Todo lo que lines.json declara, con su digest: versiones verificadas y
/// probes de linea.
pub fn declared_servers(json: &serde_json::Value) -> Vec<Declared> {
    let mut found = Vec::new();
    let mut push = |item: &serde_json::Value| {
        if let (Some(image), Some(digest), Some(version)) = (
            item["image"].as_str(),
            item["digest"].as_str(),
            item["version"].as_str(),
        ) {
            found.push(Declared {
                image: image.into(),
                digest: digest.into(),
                version: version.into(),
            });
        }
    };
    for list in json["verified"]
        .as_object()
        .into_iter()
        .flat_map(|o| o.values())
    {
        list.as_array().into_iter().flatten().for_each(&mut push);
    }
    for lines in json["engines"]
        .as_object()
        .into_iter()
        .flat_map(|o| o.values())
    {
        for line in lines.as_array().into_iter().flatten() {
            line["probes"]
                .as_array()
                .into_iter()
                .flatten()
                .for_each(&mut push);
        }
    }
    found
}

/// La version que lines.json declara para la imagen del contenedor del
/// motor. Un contenedor sin digest o con una imagen no declarada no puede
/// verificar nada: la prueba se detiene y lo dice.
pub fn declared_version(engine: Engine) -> Declared {
    let output = std::process::Command::new("docker")
        .args(["inspect", "-f", "{{.Config.Image}}", engine.container()])
        .output()
        .expect("docker inspect");
    let image = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let digest = image.split('@').nth(1).unwrap_or_else(|| {
        panic!(
            "{}: la imagen {image:?} no esta fijada por digest (tools/test-dbs/lines.json)",
            engine.container()
        )
    });
    declared_servers(&lines_json())
        .into_iter()
        .find(|server| server.digest == digest)
        .unwrap_or_else(|| {
            panic!(
                "{}: {image} no esta declarada en tools/test-dbs/lines.json",
                engine.container()
            )
        })
}

/// Una linea por servidor y corrida: la evidencia de la version exacta
/// (SQL_ENGINE §7).
fn evidence(engine: Engine, declared: &Declared) {
    record(format!(
        "{{\"engine\":\"{engine:?}\",\"version\":\"{}\",\"image\":\"{}\",\"digest\":\"{}\"}}",
        declared.version, declared.image, declared.digest
    ));
}

/// Una linea de evidencia, una vez por corrida. Con ROWLY_EVIDENCE=<archivo>
/// tambien se agrega ahi.
fn record(line: String) {
    use std::sync::Mutex;
    static SEEN: Mutex<Vec<String>> = Mutex::new(Vec::new());
    let mut seen = SEEN.lock().unwrap();
    if seen.contains(&line) {
        return;
    }
    seen.push(line.clone());
    eprintln!("evidencia: {line}");
    if let Ok(path) = std::env::var("ROWLY_EVIDENCE") {
        use std::io::Write;
        if let Ok(mut file) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
        {
            let _ = writeln!(file, "{line}");
        }
    }
}

/// Los motores de `engines` que pide ROWLY_ENGINES. Cada prueba recorre sus
/// motores con esto: en CI cada job levanta un solo servidor, y una prueba que
/// intentara conectar a otro fallaria por el job, no por el motor.
pub fn selected(engines: impl IntoIterator<Item = Engine>) -> Vec<Engine> {
    engines
        .into_iter()
        .filter(|&engine| engine_selected(engine))
        .collect()
}

/// ROWLY_ENGINES=mysql,postgres limita la prueba a esos motores.
/// Un nombre que no es de ningun motor se rechaza: si no, la prueba no
/// seleccionaria nada y pasaria sin medir.
pub fn engine_selected(engine: Engine) -> bool {
    match std::env::var("ROWLY_ENGINES") {
        Ok(list) => {
            let asked: Vec<&str> = list.split(',').map(str::trim).collect();
            if let Some(unknown) = asked.iter().find(|asked| {
                !Engine::ALL
                    .iter()
                    .any(|&e| asked.eq_ignore_ascii_case(e.name()))
            }) {
                panic!(
                    "ROWLY_ENGINES={list}: {unknown:?} no es un motor (mysql, mariadb, postgres)"
                );
            }
            asked
                .iter()
                .any(|asked| asked.eq_ignore_ascii_case(engine.name()))
        }
        Err(_) => true,
    }
}

pub fn classification(engine: Engine, sql: &str) -> Result<DestructiveClassification, String> {
    classify_sql(sql.trim(), engine.dialect(), false).map_err(|error| error.to_string())
}

pub fn classification_with(
    engine: Engine,
    sql: &str,
    options: GuardOptions,
) -> Result<DestructiveClassification, String> {
    classify_sql_with(sql.trim(), engine.dialect(), false, options)
        .map_err(|error| error.to_string())
}

pub fn is_error(result: &QueryExecutionResult) -> bool {
    matches!(result, QueryExecutionResult::Error { .. })
}

pub fn error_text(result: &QueryExecutionResult) -> String {
    match result {
        QueryExecutionResult::Error { message, code, .. } => {
            format!("{code:?}: {message:?}")
        }
        other => format!("{other:?}").chars().take(80).collect(),
    }
}

const NO_BACKSLASH_ESCAPES_ON: &str =
    "SET GLOBAL sql_mode = CONCAT(@@GLOBAL.sql_mode, ',NO_BACKSLASH_ESCAPES')";
const NO_BACKSLASH_ESCAPES_OFF: &str = "SET GLOBAL sql_mode = REPLACE(REPLACE(@@GLOBAL.sql_mode, ',NO_BACKSLASH_ESCAPES', ''), 'NO_BACKSLASH_ESCAPES,', '')";

/// `NO_BACKSLASH_ESCAPES` en el `sql_mode` global de MySQL o MariaDB mientras
/// vive: al soltarse lo quita, tambien si la prueba entra en panico. Sin esto,
/// una corrida interrumpida deja el servidor en ese modo y las pruebas de
/// cadenas fallan en falso en la siguiente.
pub struct NoBackslashEscapes(Engine);

impl NoBackslashEscapes {
    pub fn on(engine: Engine) -> NoBackslashEscapes {
        assert!(engine != Engine::Postgres, "PostgreSQL no tiene sql_mode");
        admin(engine, NO_BACKSLASH_ESCAPES_OFF);
        let guard = NoBackslashEscapes(engine);
        admin(engine, NO_BACKSLASH_ESCAPES_ON);
        guard
    }

    /// La conexion de prueba, comprobando que el modo esta aplicado.
    pub async fn open(&self) -> Conn {
        Conn::open_in_mode(self.0, true).await
    }
}

impl Drop for NoBackslashEscapes {
    fn drop(&mut self) {
        // Sin panico dentro de drop: abortaria el proceso durante otro panico.
        if !try_admin(self.0, NO_BACKSLASH_ESCAPES_OFF) {
            eprintln!(
                "{}: no se pudo quitar NO_BACKSLASH_ESCAPES del sql_mode global",
                self.0.container()
            );
        }
    }
}

/// Las entradas de un fichero del corpus, separadas por una linea `-- ---`.
pub fn entries(text: &str) -> Vec<String> {
    text.split("\n-- ---\n")
        .map(|entry| entry.trim().to_string())
        .filter(|entry| !entry.is_empty())
        .collect()
}

/// Ejecuta un comando en el contenedor del motor como administrador: lo que
/// la app no puede hacer con el usuario de prueba (cambiar el sql_mode global).
pub fn try_admin(engine: Engine, sql: &str) -> bool {
    let mut command = std::process::Command::new("docker");
    command.arg("exec").arg(engine.container());
    match engine {
        Engine::MySql => command.args(["mysql", "-uroot", "-prowly", "rowly_test", "-e", sql]),
        Engine::MariaDb => command.args(["mariadb", "-uroot", "-prowly", "rowly_test", "-e", sql]),
        Engine::Postgres => command.args(["psql", "-U", "rowly", "-d", "pagila", "-c", sql]),
    };
    command
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

pub fn admin(engine: Engine, sql: &str) {
    let mut command = std::process::Command::new("docker");
    command.arg("exec").arg(engine.container());
    match engine {
        Engine::MySql => command.args(["mysql", "-uroot", "-prowly", "-e", sql]),
        Engine::MariaDb => command.args(["mariadb", "-uroot", "-prowly", "-e", sql]),
        Engine::Postgres => command.args(["psql", "-U", "rowly", "-d", "pagila", "-c", sql]),
    };
    let status = command.output().expect("docker exec");
    assert!(
        status.status.success(),
        "admin fallo: {sql}\n{}",
        String::from_utf8_lossy(&status.stderr)
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_capability_starts_in_the_line_whose_accepts_declares_it() {
        let merge = capability(Engine::Postgres, "MERGE.");
        assert_eq!(merge.since, vec![15]);
        assert_eq!(merge.proof, "tests/sql/postgres/15/accepts.sql");
        // Sin punto final y con otras mayusculas es la misma.
        assert_eq!(capability(Engine::Postgres, "merge"), merge);
        assert_eq!(
            capability(Engine::Postgres, "OUT parameters in procedures").since,
            vec![14]
        );
    }

    #[test]
    fn since_inside_a_line_wins_over_the_line() {
        let default = capability(Engine::MariaDb, "DEFAULT on procedure parameters.");
        assert_eq!(default.since, vec![11, 8]);
        assert_eq!(default.proof, "tests/sql/mariadb/11.7/accepts.sql");
    }

    #[test]
    #[should_panic(expected = "declarala ahi para que D7 la demuestre")]
    fn an_undeclared_capability_stops_the_test() {
        capability(Engine::Postgres, "time travel");
    }

    #[test]
    fn versions_compare_by_their_numbers() {
        assert_eq!(version_numbers("11.8.9-MariaDB"), vec![11, 8, 9]);
        assert_eq!(version_numbers("PostgreSQL 13.23"), vec![13, 23]);
        assert!(version_numbers("13.23") < vec![14]);
        assert!(version_numbers("10.6.28") < vec![11, 8]);
        assert!(version_numbers("14.0") >= vec![14]);
    }
}
