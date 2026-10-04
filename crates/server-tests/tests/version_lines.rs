//! Cada linea de version existe porque algo la distingue de la anterior
//! (SQL_ENGINE.md, §5.1 y §10.2). Las lineas y los servidores de sus extremos
//! estan en `tools/test-dbs/lines.json`; lo que distingue a cada una, en
//! `tests/sql/<motor>/<linea>/{accepts,rejects}.sql`.
//!
//! `tools/test-dbs/lines.sh up [motor]` y luego
//! `cargo test -p rowly-server-tests --test version_lines -- --ignored --test-threads=1`:
//! los dos tests preparan los mismos servidores y no pueden correr a la vez.

use khipu_driver_core::QueryExecutionResult;
use rowly_server_tests::*;
use std::path::{Path, PathBuf};

fn repo() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..")
}

struct Probe {
    image: String,
    version: String,
    port: u16,
}

/// Lo que cada probe devuelve tiene que ser la version exacta que declara
/// lines.json: una etiqueta movida o una imagen equivocada no prueba la linea.
fn check_version(engine_name: &str, probe: &Probe, conn: &Conn) {
    let actual = conn.exact_version();
    assert_eq!(
        actual, probe.version,
        "{engine_name}: {} en 127.0.0.1:{} informa {actual}, lines.json declara {}",
        probe.image, probe.port, probe.version
    );
}

struct Line {
    name: String,
    probes: Vec<Probe>,
}

fn engine_named(name: &str) -> Engine {
    match name {
        "mysql" => Engine::MySql,
        "mariadb" => Engine::MariaDb,
        "postgres" => Engine::Postgres,
        other => panic!("lines.json: motor desconocido {other}"),
    }
}

fn registry() -> Vec<(String, Vec<Line>)> {
    let text = std::fs::read_to_string(repo().join("tools/test-dbs/lines.json")).unwrap();
    let json: serde_json::Value = serde_json::from_str(&text).expect("lines.json");
    json["engines"]
        .as_object()
        .unwrap()
        .iter()
        .map(|(engine, lines)| {
            let lines = lines
                .as_array()
                .unwrap()
                .iter()
                .map(|line| Line {
                    name: line["line"].as_str().unwrap().to_string(),
                    probes: line["probes"]
                        .as_array()
                        .unwrap()
                        .iter()
                        .map(|probe| Probe {
                            image: probe["image"].as_str().unwrap().to_string(),
                            version: probe["version"].as_str().unwrap().to_string(),
                            port: probe["port"].as_u64().unwrap() as u16,
                        })
                        .collect(),
                })
                .collect();
            (engine.clone(), lines)
        })
        .collect()
}

/// Las sentencias de un fixture; un archivo que no existe no tiene ninguna.
fn fixture(path: &Path) -> Vec<String> {
    std::fs::read_to_string(path)
        .map(|text| entries(&text))
        .unwrap_or_default()
}

/// Lo que dice el comentario de una entrada, para el informe.
fn label(entry: &str) -> String {
    entry
        .lines()
        .take_while(|line| line.starts_with("--"))
        .filter(|line| {
            since(line).is_none() && !line.starts_with("-- expect:") && !line.starts_with("-- gap:")
        })
        .map(|line| line.trim_start_matches('-').trim())
        .collect::<Vec<_>>()
        .join(" ")
}

/// `-- since: 11.8`: lo que cambia dentro de la linea, desde esa version
/// (SQL_ENGINE.md §5.1). Antes de ella, la linea se comporta como la anterior.
fn since(line: &str) -> Option<Vec<u32>> {
    line.strip_prefix("-- since:").map(version_numbers)
}

fn entry_since(entry: &str) -> Option<Vec<u32>> {
    entry
        .lines()
        .take_while(|line| line.starts_with("--"))
        .find_map(since)
}

/// El analizador, con la linea del servidor, marca la sentencia como
/// sintaxis que esa linea o una anterior elimino (A9).
fn marks_removed_syntax(engine: Engine, sql: &str, line: &khipu_engine::lines::Line) -> bool {
    khipu_engine::diagnostics::analyze_statement_with(
        sql,
        engine.dialect(),
        None,
        false,
        Some(line),
    )
    .iter()
    .any(|diagnostic| {
        matches!(&diagnostic.message, khipu_engine::diagnostics::DiagnosticMessage::Key { key, .. }
                if key.starts_with("diagnostic.removedInLine"))
    })
}

struct Server {
    image: String,
    version: String,
    conn: Conn,
}

impl Server {
    async fn accepts(&self, sql: &str) -> Result<(), String> {
        match self.conn.raw(sql).await {
            result @ QueryExecutionResult::Error { .. } => Err(error_text(&result)),
            _ => Ok(()),
        }
    }
}

#[tokio::test]
#[ignore = "requiere tools/test-dbs/lines.sh up"]
async fn every_version_line_is_told_apart_from_the_previous_one() {
    let mut failures = Vec::new();
    let mut report = Vec::new();
    let mut removed_marked = 0;
    for (engine_name, lines) in registry() {
        let engine = engine_named(&engine_name);
        if !engine_selected(engine) {
            continue;
        }
        let dir = repo().join("tests/sql").join(&engine_name);
        let setup = fixture(&dir.join("setup.sql"));

        // Un servidor por extremo de cada linea, preparado con setup.sql.
        let mut servers: Vec<Vec<Server>> = Vec::new();
        for line in &lines {
            let mut ends = Vec::new();
            for probe in &line.probes {
                let conn = Conn::open_line(engine, probe.port)
                    .await
                    .unwrap_or_else(|error| {
                        panic!(
                            "{engine_name} {} ({}) en 127.0.0.1:{}: {error}\n\
                         levantalo con tools/test-dbs/lines.sh up {engine_name}",
                            line.name, probe.image, probe.port
                        )
                    });
                check_version(&engine_name, probe, &conn);
                // D6: la version que informa el servidor real cae en la linea
                // que este probe demuestra (support/<motor>.json).
                let effective = engine.dialect().lines().effective(&conn.version());
                assert_eq!(
                    effective.line, line.name,
                    "{engine_name} {}: support/{engine_name}.json la asigna a la linea {}",
                    probe.version, effective.line
                );
                for statement in &setup {
                    let _ = conn.raw(statement).await;
                }
                ends.push(Server {
                    image: probe.image.clone(),
                    version: conn.exact_version(),
                    conn,
                });
            }
            servers.push(ends);
        }

        // Un directorio de linea que lines.json no conoce no prueba nada.
        for entry in std::fs::read_dir(&dir).unwrap().flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            // `common/` es el corpus valido en cada linea (SQL_ENGINE §10.1).
            if entry.path().is_dir()
                && name != "common"
                && !lines.iter().any(|line| line.name == name)
            {
                failures.push(format!(
                    "{engine_name}: tests/sql/{engine_name}/{name} no es una linea de lines.json"
                ));
            }
        }

        for index in 0..lines.len() {
            let line = &lines[index];
            let versions: Vec<&str> = servers[index].iter().map(|s| s.version.as_str()).collect();
            if index == 0 {
                report.push(format!(
                    "{engine_name} {} ({}): base",
                    line.name,
                    versions.join(", ")
                ));
                continue;
            }
            let previous = &lines[index - 1];
            let accepts = fixture(&dir.join(&line.name).join("accepts.sql"));
            let rejects = fixture(&dir.join(&line.name).join("rejects.sql"));
            if accepts.is_empty() && rejects.is_empty() {
                failures.push(format!(
                    "{engine_name} {}: nada la distingue de {}; o se le escribe un fixture o se une a ella",
                    line.name, previous.name
                ));
                continue;
            }
            // Lo nuevo pasa en sus dos extremos y falla en los de la anterior;
            // lo eliminado, al reves.
            for (entries, new_in_line) in [(&accepts, true), (&rejects, false)] {
                for sql in entries {
                    // Con `since`, los servidores de la linea anteriores a esa
                    // version cuentan como la linea anterior, y tiene que
                    // haberlos a los dos lados.
                    let from = entry_since(sql);
                    if let Some(from) = &from {
                        let below = servers[index]
                            .iter()
                            .filter(|s| version_numbers(&s.version) < *from)
                            .count();
                        if below == 0 || below == servers[index].len() {
                            failures.push(format!(
                                "{engine_name} {}: «{}» tiene since sin servidores de la linea a los dos lados",
                                line.name,
                                label(sql)
                            ));
                        }
                    }
                    for (ends, in_line) in [(&servers[index], true), (&servers[index - 1], false)] {
                        for server in ends {
                            let changed = in_line
                                && from
                                    .as_ref()
                                    .is_none_or(|from| version_numbers(&server.version) >= *from);
                            let should_pass = changed == new_in_line;
                            let outcome = server.accepts(sql).await;
                            // A9: lo que el analizador marca como eliminado en
                            // la linea de este servidor, el servidor lo rechaza.
                            let line_of_server = engine
                                .dialect()
                                .lines()
                                .effective(&version_numbers(&server.version));
                            if marks_removed_syntax(engine, sql, line_of_server) {
                                removed_marked += 1;
                                if outcome.is_ok() {
                                    failures.push(format!(
                                        "{engine_name} {}: «{}» marcado como eliminado en {} y el servidor lo acepta",
                                        line.name,
                                        label(sql),
                                        server.version
                                    ));
                                }
                            }
                            if outcome.is_ok() != should_pass {
                                failures.push(format!(
                                    "{engine_name} {}: «{}» en {} ({}) {}\n    {}",
                                    line.name,
                                    label(sql),
                                    server.image,
                                    server.version,
                                    if should_pass {
                                        "fallo y debia pasar"
                                    } else {
                                        "paso y debia fallar"
                                    },
                                    outcome.err().unwrap_or_default()
                                ));
                            }
                        }
                    }
                }
            }
            report.push(format!(
                "{engine_name} {} ({}): {} nuevas, {} eliminadas frente a {}",
                line.name,
                versions.join(", "),
                accepts.len(),
                rejects.len(),
                previous.name
            ));
        }
    }
    report.push(format!(
        "sintaxis eliminada marcada por el analizador (A9): {removed_marked}"
    ));
    println!("{}", report.join("\n"));
    assert!(
        failures.is_empty(),
        "\n{} problemas:\n{}\n",
        failures.len(),
        failures.join("\n")
    );
}

/// `-- expect: valor`: lo que debe mostrar la primera celda.
/// `-- gap: <error>`: un hueco conocido del driver (SQL_ENGINE §9). La
/// lectura tiene que fallar con ese error; si un dia funciona, la prueba lo
/// dice para que se quite la marca y vuelva a ser una lectura comprobada.
fn known_gap(entry: &str) -> Option<String> {
    entry
        .lines()
        .take_while(|line| line.starts_with("--"))
        .find_map(|line| line.strip_prefix("-- gap:"))
        .map(|value| value.trim().to_string())
}

fn expected(entry: &str) -> Option<String> {
    entry
        .lines()
        .take_while(|line| line.starts_with("--"))
        .find_map(|line| line.strip_prefix("-- expect:"))
        .map(|value| value.trim().to_string())
}

/// Lo que devuelve cada linea lo lee el driver (SQL_ENGINE.md, D8): las
/// consultas de `tests/sql/<motor>/<linea>/reads.sql` devuelven filas en
/// cada servidor de la linea, con el valor de `-- expect:` si lo hay.
#[tokio::test]
#[ignore = "requiere tools/test-dbs/lines.sh up"]
async fn every_column_type_a_line_returns_is_read() {
    let mut failures = Vec::new();
    let mut checked = 0;
    let mut gaps = 0;
    for (engine_name, lines) in registry() {
        let engine = engine_named(&engine_name);
        if !engine_selected(engine) {
            continue;
        }
        for line in &lines {
            let reads = fixture(
                &repo()
                    .join("tests/sql")
                    .join(&engine_name)
                    .join(&line.name)
                    .join("reads.sql"),
            );
            if reads.is_empty() {
                continue;
            }
            for probe in &line.probes {
                let conn = Conn::open_line(engine, probe.port).await.unwrap_or_else(|error| {
                    panic!("{engine_name} {} ({}): {error}\nlevantalo con tools/test-dbs/lines.sh up {engine_name}", line.name, probe.image)
                });
                check_version(&engine_name, probe, &conn);
                let version = conn.exact_version();
                // Cada test prepara lo suyo (SQL_ENGINE.md §10.2).
                for statement in &fixture(
                    &repo()
                        .join("tests/sql")
                        .join(&engine_name)
                        .join("setup.sql"),
                ) {
                    let _ = conn.raw(statement).await;
                }
                for sql in &reads {
                    if entry_since(sql).is_some_and(|from| version_numbers(&version) < from) {
                        continue;
                    }
                    checked += 1;
                    let result = conn.raw(sql).await;
                    if let Some(gap) = known_gap(sql) {
                        let problem = match &result {
                            QueryExecutionResult::ResultSet { .. } => Some(
                                "ya se lee: quitar la marca -- gap y su hueco de SQL_ENGINE §9"
                                    .to_string(),
                            ),
                            other if !error_text(other).contains(&gap) => Some(format!(
                                "fallo con otro error que el del hueco ({gap}): {}",
                                error_text(other)
                            )),
                            _ => None,
                        };
                        if let Some(problem) = problem {
                            failures.push(format!(
                                "{engine_name} {} ({version}): «{}» {problem}",
                                line.name,
                                label(sql)
                            ));
                        } else {
                            gaps += 1;
                        }
                        continue;
                    }
                    let problem = match result {
                        QueryExecutionResult::ResultSet { rows, .. } => {
                            let first = rows.first().and_then(|row| row.first().cloned()).flatten();
                            match expected(sql) {
                                Some(want) if first.as_deref() != Some(want.as_str()) => {
                                    Some(format!("mostro {first:?} y debia mostrar {want:?}"))
                                }
                                _ => None,
                            }
                        }
                        other => Some(error_text(&other)),
                    };
                    if let Some(problem) = problem {
                        failures.push(format!(
                            "{engine_name} {} ({version}): «{}» {problem}",
                            line.name,
                            label(sql)
                        ));
                    }
                }
            }
        }
    }
    println!(
        "lecturas comprobadas: {checked} (huecos conocidos que siguen fallando igual: {gaps})"
    );
    assert!(
        failures.is_empty(),
        "\n{} problemas:\n{}\n",
        failures.len(),
        failures.join("\n")
    );
}
