//! Seguridad contra servidores reales (SQL_ENGINE S2, S3, S5): lo que el guard
//! acepta corre como una sola sentencia, nada que dañe datos pasa como no
//! destructivo y el guard lee las cadenas como el servidor en cada modo.
//! Necesita tools/test-dbs/up.sh:
//!   cargo test -p rowly-server-tests --test safety -- --ignored --test-threads=1
use rowly_server_tests::*;

// --- Seguridad: lo que el guard acepta, el servidor lo ejecuta como UNA sentencia ---

const PAYLOADS: [&str; 2] = [
    "DROP TABLE rowly_test.victim",
    "DELETE FROM rowly_test.victim",
];

fn attacks_corpus(engine: Engine) -> &'static str {
    match engine {
        Engine::Postgres => include_str!("../../../tests/sql/postgres/common/attacks.sql"),
        _ => include_str!("../../../tests/sql/mysql/common/attacks.sql"),
    }
}

async fn fresh(conn: &Conn, engine: Engine) {
    let cleanup: &[&str] = if engine.is_mysql_family() {
        &[
            "DROP PROCEDURE IF EXISTS atk",
            "DROP FUNCTION IF EXISTS atk",
            "DROP TRIGGER IF EXISTS atk",
            "DROP EVENT IF EXISTS atk",
        ]
    } else {
        &[
            "DROP FUNCTION IF EXISTS rowly_test.atk() CASCADE",
            "DROP RULE IF EXISTS atk ON rowly_test.log",
            "DROP TRIGGER IF EXISTS atk ON rowly_test.log",
        ]
    };
    for sql in cleanup {
        conn.raw(sql).await;
    }
    let drop_victim = if engine.is_mysql_family() {
        "DROP TABLE IF EXISTS rowly_test.victim"
    } else {
        "DROP TABLE IF EXISTS rowly_test.victim CASCADE"
    };
    for sql in [
        drop_victim,
        "CREATE TABLE rowly_test.victim (id int)",
        "INSERT INTO rowly_test.victim VALUES (1)",
    ] {
        let result = conn.raw(sql).await;
        assert!(!is_error(&result), "{sql}: {}", error_text(&result));
    }
}

async fn victim_intact(conn: &Conn) -> bool {
    conn.scalar("SELECT COUNT(*) FROM rowly_test.victim")
        .await
        .as_deref()
        == Some("1")
}

struct Verdict {
    accepted: bool,
    /// El servidor sin la barrera del driver ejecuto algo mas que una sentencia.
    damaged: bool,
    /// Lo mismo, pero por el driver de la app (que prepara antes).
    driver_damaged: bool,
}

/// El guard decide; el texto corre dos veces, cada una con la tabla victima
/// nueva: sin la barrera del driver (la verdad del servidor) y por el driver.
async fn try_text(conn: &Conn, engine: Engine, text: &str) -> Verdict {
    let accepted = classification(engine, text).is_ok();
    fresh(conn, engine).await;
    Conn::multi_statement(engine, text).await;
    let damaged = !victim_intact(conn).await;
    // Por el driver solo hace falta repetirlo si sin barrera hubo dano.
    let mut driver_damaged = false;
    if damaged {
        fresh(conn, engine).await;
        conn.raw(text).await;
        driver_damaged = !victim_intact(conn).await;
    }
    Verdict {
        accepted,
        damaged,
        driver_damaged,
    }
}

#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn no_text_the_guard_accepts_runs_more_than_one_statement_on_the_server() {
    let mut violations = Vec::new();
    for engine in selected(Engine::ALL) {
        let conn = Conn::open(engine).await;
        let (mut total, mut accepted, mut dangerous) = (0, 0, 0);
        for template in entries(attacks_corpus(engine)) {
            for payload in PAYLOADS {
                let text = template.replace("{x}", payload);
                let verdict = try_text(&conn, engine, &text).await;
                total += 1;
                accepted += verdict.accepted as usize;
                dangerous += verdict.damaged as usize;
                if verdict.accepted && verdict.damaged {
                    violations.push(format!(
                        "{engine:?}: el guard acepto y el servidor ejecuto la carga:\n{text}"
                    ));
                }
                if verdict.driver_damaged {
                    violations.push(format!(
                        "{engine:?}: el driver dejo pasar una segunda sentencia:\n{text}"
                    ));
                }
            }
        }
        println!(
            "{engine:?}: {total} ataques, {dangerous} peligrosos sin guard, {accepted} aceptados"
        );
        assert!(
            dangerous >= 10,
            "{engine:?}: la prueba no mide nada si casi ningun ataque es peligroso"
        );
    }
    assert!(violations.is_empty(), "\n{}\n", violations.join("\n---\n"));
}

struct Lcg(u64);

impl Lcg {
    fn next(&mut self) -> u64 {
        self.0 = self
            .0
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        self.0 >> 33
    }
    fn below(&mut self, n: usize) -> usize {
        (self.next() % n as u64) as usize
    }
    fn pick<'a>(&mut self, items: &[&'a str]) -> &'a str {
        items[self.below(items.len())]
    }
}

const FRAGMENTS_MYSQL: &[&str] = &[
    "BEGIN",
    "END",
    "END;",
    ";",
    "SELECT 1",
    "SELECT 1 AS begin",
    "begin",
    "end",
    "c.case",
    "c.end",
    "c.then",
    "CASE WHEN a THEN",
    "ELSE 0 END",
    "CASE",
    "IF a THEN",
    "END IF",
    "WHILE a DO",
    "END WHILE",
    "LOOP",
    "END LOOP lbl",
    "REPEAT",
    "UNTIL a",
    "END REPEAT",
    "lbl:",
    "DECLARE x INT",
    "DECLARE EXIT HANDLER FOR SQLEXCEPTION",
    "DECLARE handler INT",
    "RETURN 1",
    "SET a = 1",
    "-- c\n",
    "# c\n",
    "/* c */",
    "/*!",
    "/*!50000",
    "/*M!100000",
    "*/",
    "'",
    "'it\\'s'",
    "\"",
    "`",
    "(",
    ")",
    ",",
    ".",
    ":",
    ":=",
    "THEN",
    "ELSE",
    "DO",
    "UNTIL",
    "ELSEIF b THEN",
    "DELIMITER $$",
    "$$",
];

const FRAGMENTS_PG: &[&str] = &[
    "BEGIN",
    "BEGIN ATOMIC",
    "END",
    ";",
    "SELECT 1",
    "SELECT 1 AS begin",
    "begin",
    "end",
    "CASE WHEN a THEN",
    "ELSE 0 END",
    "$$",
    "$a$",
    "$b$",
    "'",
    "E'\\''",
    "/*",
    "*/",
    "-- c\n",
    "(",
    ")",
    "LANGUAGE sql",
    "AS",
    "RETURN 1",
    "DO",
];

const INJECTIONS: &[&str] = &[
    " ; {x} ; ",
    " ; {x} ",
    " {x} ",
    "\n{x};\n",
    " /*! ; {x} */ ",
    " /*!50000 ; {x} */ ",
    " /*M!100000 ; {x} */ ",
    " -- \n; {x}\n",
    " # \n; {x}\n",
    " END; {x}; ",
    " END; {x}; END ",
    "; {x}; --",
];

fn whitespace_positions(text: &str) -> Vec<usize> {
    text.char_indices()
        .filter(|(_, c)| c.is_whitespace())
        .map(|(at, _)| at)
        .collect()
}

fn mutate(rng: &mut Lcg, text: &str, fragments: &[&str], payload: &str) -> String {
    let mut text = text.to_string();
    for _ in 0..1 + rng.below(3) {
        let positions = whitespace_positions(&text);
        if positions.is_empty() {
            break;
        }
        let at = positions[rng.below(positions.len())];
        match rng.below(5) {
            0 | 1 => text.insert_str(at, &rng.pick(INJECTIONS).replace("{x}", payload)),
            2 => text.insert_str(at, &format!(" {} ", rng.pick(fragments))),
            3 => {
                let end = positions
                    .iter()
                    .copied()
                    .find(|p| *p > at + 1)
                    .unwrap_or(text.len());
                text.replace_range(at..end, "");
            }
            _ => {
                let end = positions
                    .iter()
                    .copied()
                    .find(|p| *p > at + 1)
                    .unwrap_or(text.len());
                let piece = text[at..end].to_string();
                text.insert_str(at, &piece);
            }
        }
    }
    text
}

/// Las bases del fuzz: el corpus de rutinas que la version del servidor
/// tiene (lo que es N/A no corre ni sano) y los ataques.
fn skeletons(engine: Engine, version: &[u32]) -> Vec<String> {
    let mut list: Vec<String> = entries(routines_corpus(engine))
        .iter()
        .map(|raw| parse(raw))
        .filter(|entry| {
            entry
                .needs
                .as_ref()
                .is_none_or(|name| version >= capability(engine, name).since.as_slice())
        })
        .map(|entry| entry.sql)
        .collect();
    list.extend(
        entries(attacks_corpus(engine))
            .iter()
            .map(|raw| raw.replace("{x}", "SELECT 1")),
    );
    list
}

/// Fuzz diferencial: rutinas validas mutadas (cargas insertadas entre
/// palabras, palabras estructurales sueltas, borradas o duplicadas) corren en
/// el servidor real; si el guard las acepto, la tabla victima sigue intacta.
#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn fuzzing_the_guard_against_the_real_servers_finds_no_second_statement() {
    let cases: usize = std::env::var("ROWLY_FUZZ_CASES")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(4000);
    let mut violations = Vec::new();
    let mut coverage = Vec::new();
    for engine in selected(Engine::ALL) {
        let conn = Conn::open(engine).await;
        let bases = skeletons(engine, &conn.version());
        let fragments = if engine.is_mysql_family() {
            FRAGMENTS_MYSQL
        } else {
            FRAGMENTS_PG
        };
        let seed: u64 = std::env::var("ROWLY_FUZZ_SEED")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(0);
        let mut rng = Lcg(0x5eed_u64 ^ engine as u64 ^ seed.wrapping_mul(0x9e37_79b9));
        let (mut accepted, mut dangerous, mut dangerous_and_valid) = (0usize, 0usize, 0usize);
        for _ in 0..cases {
            let base = &bases[rng.below(bases.len())];
            let payload = PAYLOADS[rng.below(PAYLOADS.len())];
            let text = mutate(&mut rng, base, fragments, payload);
            let verdict = try_text(&conn, engine, &text).await;
            accepted += verdict.accepted as usize;
            dangerous += verdict.damaged as usize;
            if verdict.damaged && !verdict.accepted {
                dangerous_and_valid += 1;
            }
            if verdict.accepted && verdict.damaged {
                violations.push(format!(
                    "{engine:?}: aceptado y ejecutado como mas de una sentencia:\n{text}"
                ));
            }
            if verdict.driver_damaged {
                violations.push(format!(
                    "{engine:?}: el driver dejo pasar una segunda sentencia:\n{text}"
                ));
            }
        }
        println!(
            "{engine:?}: {cases} casos, {accepted} aceptados por el guard, {dangerous} peligrosos ({dangerous_and_valid} rechazados a tiempo)"
        );
        coverage.push((engine, dangerous, accepted));
    }
    assert!(
        violations.is_empty(),
        "\n{} violaciones:\n{}\n",
        violations.len(),
        violations
            .iter()
            .take(12)
            .cloned()
            .collect::<Vec<_>>()
            .join("\n---\n")
    );
    for (engine, dangerous, accepted) in coverage {
        assert!(
            dangerous > 30,
            "{engine:?}: el fuzz no genera suficientes casos peligrosos ({dangerous})"
        );
        assert!(
            accepted > 100,
            "{engine:?}: el fuzz no genera suficientes casos aceptados ({accepted})"
        );
    }
}

/// Con NO_BACKSLASH_ESCAPES el servidor corta las cadenas en otro sitio: el
/// guard, avisado del modo, tiene que leer el texto como el servidor.
#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh; cambia el sql_mode global y lo restaura"]
async fn the_guard_reads_strings_like_a_server_in_no_backslash_escapes_mode() {
    use khipu_engine::execution_guard::GuardOptions;
    let templates = [
        "SELECT '\\'; {x}; --'",
        "SELECT '\\' , '\\'; {x}; --'",
        "SELECT 'a\\'; {x}; SELECT '\\'",
        "DELETE FROM rowly_test.canary WHERE note = '\\'; {x}; --'",
        "SELECT \"\\\"; {x}; --\"",
        "SELECT 1 /*!50000 ; {x} ; SELECT '\\' */",
    ];
    let mut failures = Vec::new();
    for engine in selected([Engine::MySql, Engine::MariaDb]) {
        let mode_on = NoBackslashEscapes::on(engine);
        let conn = mode_on.open().await;
        let mode = conn
            .scalar("SELECT @@SESSION.sql_mode")
            .await
            .unwrap_or_default();
        assert!(
            mode.contains("NO_BACKSLASH_ESCAPES"),
            "{engine:?}: el modo no se aplico: {mode}"
        );
        let (mut dangerous, mut missed_without_option) = (0, 0);
        for template in templates {
            for payload in PAYLOADS {
                let text = template.replace("{x}", payload);
                fresh(&conn, engine).await;
                Conn::multi_statement(engine, &text).await;
                let damaged = !victim_intact(&conn).await;
                dangerous += damaged as usize;
                let aware = classification_with(
                    engine,
                    &text,
                    GuardOptions {
                        no_backslash_escapes: true,
                    },
                )
                .is_ok();
                let unaware = classification_with(engine, &text, GuardOptions::default()).is_ok();
                if damaged && aware {
                    failures.push(format!("{engine:?}: avisado del modo, el guard acepto un texto que ejecuta la carga:\n{text}"));
                }
                if damaged && unaware {
                    missed_without_option += 1;
                }
            }
        }
        drop(conn);
        drop(mode_on);
        println!(
            "{engine:?}: {dangerous} peligrosos en este modo, {missed_without_option} que el guard sin aviso habria dejado pasar"
        );
        assert!(
            dangerous > 0,
            "{engine:?}: la prueba no mide nada si ninguno es peligroso"
        );
        assert!(
            missed_without_option > 0,
            "{engine:?}: sin el aviso del modo, el guard debia equivocarse en alguno (la prueba mide el aviso)"
        );
    }
    assert!(failures.is_empty(), "\n{}\n", failures.join("\n---\n"));
}

// --- Destructividad: lo que daña datos no puede pasar como NotDestructive ---

const SCRATCH: &str = "rowly_test.scratch";

async fn fresh_scratch(conn: &Conn, engine: Engine) {
    let drop = if engine.is_mysql_family() {
        format!("DROP TABLE IF EXISTS {SCRATCH}")
    } else {
        format!("DROP TABLE IF EXISTS {SCRATCH} CASCADE")
    };
    for sql in [
        drop,
        format!("CREATE TABLE {SCRATCH} (id int, c int)"),
        format!("INSERT INTO {SCRATCH} VALUES (1, 1), (2, 2), (3, 3)"),
    ] {
        let result = conn.raw(&sql).await;
        assert!(!is_error(&result), "{sql}: {}", error_text(&result));
    }
}

/// Filas, columna y valores como estaban: (3 filas, suma de c = 6).
async fn scratch_intact(conn: &Conn) -> bool {
    let rows = conn
        .scalar(&format!("SELECT COUNT(id) FROM {SCRATCH}"))
        .await;
    let sum = conn.scalar(&format!("SELECT SUM(c) FROM {SCRATCH}")).await;
    rows.as_deref() == Some("3") && sum.as_deref().map(|s| s.trim_end_matches(".0")) == Some("6")
}

#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn what_damages_data_never_passes_as_not_destructive() {
    // REPLACE, INSERT ... ON DUPLICATE y MERGE cambian filas por clave, como
    // un upsert: no son "destructivos" para el producto, y no se miden aqui.
    use khipu_engine::execution_guard::DestructiveClassification::NotDestructive;
    let common = [
        "DROP TABLE {t}",
        "DROP TABLE IF EXISTS {t}",
        "DELETE FROM {t}",
        "TRUNCATE {t}",
        "TRUNCATE TABLE {t}",
        "UPDATE {t} SET c = 0",
        "ALTER TABLE {t} DROP COLUMN c",
        "ALTER TABLE {t} DROP COLUMN IF EXISTS c",
        "WITH x AS (SELECT 1) DELETE FROM {t}",
        "WITH x AS (SELECT 1) UPDATE {t} SET c = 0",
    ];
    let mysql = [
        "DROP TABLES {t}",
        "DROP TEMPORARY TABLES IF EXISTS zz_nada, {t}",
        "/*!40101 DROP TABLES {t} */",
        "/*!50000 DROP TABLE {t} */",
        "DELETE FROM {t} LIMIT 10",
        "DELETE FROM {t} ORDER BY id LIMIT 10",
        "DELETE {t} FROM {t}",
        "DELETE FROM {t} /*!99999 WHERE id = 1 */",
        "DELETE FROM {t} WHERE 1 = 1 /*!50000 AND id = 99 */",
        "UPDATE {t} SET c = 0 LIMIT 3",
        "UPDATE {t} SET c = 0 ORDER BY id",
        "UPDATE IGNORE {t} SET c = 0",
        "ALTER TABLE {t} DROP c",
        "ALTER IGNORE TABLE {t} DROP COLUMN c",
        "ALTER ONLINE TABLE {t} DROP COLUMN c",
        "ALTER TABLE {t} ENGINE=InnoDB, DROP COLUMN c",
        "TRUNCATE TABLE {t}; ",
    ];
    let mariadb = [
        "DELETE FROM {t} RETURNING *",
        "DELETE HISTORY FROM {t}",
        "TRUNCATE {t}",
    ];
    let postgres = [
        "DROP TABLE {t} CASCADE",
        "DELETE FROM ONLY {t}",
        "DELETE FROM {t} RETURNING *",
        "TRUNCATE {t} CASCADE",
        "TRUNCATE {t} RESTART IDENTITY",
        "WITH d AS (DELETE FROM {t} RETURNING *) SELECT count(*) FROM d",
        "WITH u AS (UPDATE {t} SET c = 0 RETURNING *) SELECT count(*) FROM u",
        "UPDATE {t} SET c = 0 RETURNING *",
        "DO $$ BEGIN DELETE FROM {t}; END $$",
        "DO $$ BEGIN DROP TABLE {t}; END $$",
        "DO $$ BEGIN EXECUTE 'delete from {t}'; END $$",
        "DO $$ BEGIN TRUNCATE {t}; END $$",
        "DO $$ BEGIN UPDATE {t} SET c = 0; END $$",
        "ALTER TABLE {t} DROP COLUMN c CASCADE",
    ];
    let mut failures = Vec::new();
    let mut damaging = 0;
    for engine in selected(Engine::ALL) {
        let conn = Conn::open(engine).await;
        let mut templates: Vec<&str> = common.to_vec();
        match engine {
            Engine::MySql => templates.extend(mysql),
            Engine::MariaDb => {
                templates.extend(mysql);
                templates.extend(mariadb);
            }
            Engine::Postgres => templates.extend(postgres),
        }
        for template in templates {
            let text = template.replace("{t}", SCRATCH);
            fresh_scratch(&conn, engine).await;
            let verdict = classification(engine, &text);
            // Lo que la app ejecutaria sin confirmar es lo que el guard deja pasar.
            if !matches!(verdict, Ok(NotDestructive)) {
                continue;
            }
            conn.raw(&text).await;
            if !scratch_intact(&conn).await {
                damaging += 1;
                failures.push(format!("{engine:?}: dano sin confirmacion: {text}"));
            }
        }
    }
    println!("sentencias que daban dano y pasaban como no destructivas: {damaging}");
    assert!(failures.is_empty(), "\n{}\n", failures.join("\n"));
}
