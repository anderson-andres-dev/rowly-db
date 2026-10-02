//! Coste de conectar, leer el catalogo, clasificar y analizar, por motor,
//! contra los servidores de `tools/test-dbs/up.sh`. Separa el trabajo de
//! Rowly DB (guard, analisis) del tiempo de red y servidor (conectar,
//! introspeccion), como pide la referencia de rendimiento de C0.
//!
//! ```bash
//! tools/test-dbs/up.sh
//! cargo run --release -p rowly-server-tests --example catalog_bench -- out.json
//! ```
//!
//! El catalogo grande (500 tablas de 12 columnas con clave foranea) se crea
//! en el schema `rowly_bench_large` de los contenedores de prueba y se borra
//! al terminar. Nunca se ejecuta contra una base de usuario.

use std::time::Instant;

use khipu_engine::diagnostics::analyze_statement;
use khipu_engine::execution_guard::classify_sql;
use rowly_server_tests::{Conn, Engine, admin, entries};

const LARGE_TABLES: usize = 500;
const REPEAT: usize = 5;

fn percentiles(mut samples: Vec<f64>) -> serde_json::Value {
    samples.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let at = |p: f64| samples[((samples.len() - 1) as f64 * p).round() as usize];
    serde_json::json!({
        "n": samples.len(),
        "p50": (at(0.5) * 1000.0).round() / 1000.0,
        "p95": (at(0.95) * 1000.0).round() / 1000.0,
        "max": (at(1.0) * 1000.0).round() / 1000.0,
    })
}

fn ms(start: Instant) -> f64 {
    start.elapsed().as_secs_f64() * 1000.0
}

fn large_schema_sql(engine: Engine) -> Vec<String> {
    let mut statements = vec![];
    match engine {
        Engine::Postgres => {
            statements.push("DROP SCHEMA IF EXISTS rowly_bench_large CASCADE".into());
            statements.push("CREATE SCHEMA rowly_bench_large".into());
        }
        _ => {
            statements.push("DROP DATABASE IF EXISTS rowly_bench_large".into());
            statements.push("CREATE DATABASE rowly_bench_large".into());
            // Se crea como root; la app la lee como `rowly`.
            statements.push("GRANT ALL ON rowly_bench_large.* TO 'rowly'@'%'".into());
        }
    }
    for i in 0..LARGE_TABLES {
        let parent = if i == 0 {
            String::new()
        } else {
            // Clave foranea a nivel de tabla: MySQL ignora `REFERENCES` en linea.
            format!(
                ", parent_id INT, FOREIGN KEY (parent_id) REFERENCES rowly_bench_large.t{:03}(id)",
                i - 1
            )
        };
        let columns = (0..10)
            .map(|c| format!("c{c} VARCHAR(40)"))
            .collect::<Vec<_>>()
            .join(", ");
        statements.push(format!(
            "CREATE TABLE rowly_bench_large.t{i:03} (id INT PRIMARY KEY, {columns}{parent})"
        ));
    }
    statements
}

fn drop_large(engine: Engine) {
    admin(
        engine,
        match engine {
            Engine::Postgres => "DROP SCHEMA IF EXISTS rowly_bench_large CASCADE",
            _ => "DROP DATABASE IF EXISTS rowly_bench_large",
        },
    );
}

fn corpus(engine: Engine) -> &'static str {
    match engine {
        Engine::Postgres => include_str!("../corpus/postgres/valid.sql"),
        _ => include_str!("../corpus/mysql/valid.sql"),
    }
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let out = std::env::args().nth(1);
    let mut report = serde_json::Map::new();
    for engine in Engine::ALL {
        let mut connect = vec![];
        let mut version = String::new();
        for _ in 0..REPEAT {
            let start = Instant::now();
            let conn = Conn::open(engine).await;
            connect.push(ms(start));
            version = conn.server_version();
        }
        let conn = Conn::open(engine).await;
        let small_schema = match engine {
            Engine::Postgres => "public",
            _ => "sakila",
        };
        let mut small = vec![];
        let mut small_tables = 0;
        for _ in 0..REPEAT {
            let start = Instant::now();
            small_tables = conn.introspect(small_schema).await.tables.len();
            small.push(ms(start));
        }

        // En bloques: un solo argumento de `docker exec` no pasa de 128 KiB.
        for chunk in large_schema_sql(engine).chunks(100) {
            admin(engine, &chunk.join(";\n"));
        }
        let mut large = vec![];
        let mut large_tables = 0;
        for _ in 0..REPEAT {
            let start = Instant::now();
            large_tables = conn.introspect("rowly_bench_large").await.tables.len();
            large.push(ms(start));
        }
        drop_large(engine);

        // Trabajo propio de Rowly DB, sin red: guard y analisis del corpus valido.
        let statements = entries(corpus(engine));
        let dialect = engine.dialect();
        let mut guard = vec![];
        let mut analysis = vec![];
        for _ in 0..REPEAT {
            for sql in &statements {
                let start = Instant::now();
                let _ = classify_sql(sql, dialect, false);
                guard.push(ms(start));
                let start = Instant::now();
                let _ = analyze_statement(sql, dialect, None);
                analysis.push(ms(start));
            }
        }

        report.insert(
            format!("{engine:?}").to_lowercase(),
            serde_json::json!({
                "serverVersion": version,
                "connectMs": percentiles(connect),
                "introspectSmall": { "schema": small_schema, "tables": small_tables, "ms": percentiles(small) },
                "introspectLarge": { "tables": large_tables, "ms": percentiles(large) },
                "guardPerStatementMs": percentiles(guard),
                "analysisPerStatementMs": percentiles(analysis),
                "corpusStatements": statements.len(),
            }),
        );
        eprintln!("{engine:?} {version}: listo");
    }
    let json = serde_json::to_string_pretty(&serde_json::json!({
        "format": 1,
        "scenario": "catalog-and-engine",
        "repeat": REPEAT,
        "note": "connect/introspect incluyen red local y servidor; guard/analisis son CPU de Rowly DB",
        "engines": report,
    }))
    .unwrap();
    match out {
        Some(path) => std::fs::write(path, json + "\n").unwrap(),
        None => println!("{json}"),
    }
}
