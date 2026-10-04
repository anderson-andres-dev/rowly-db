//! Las lineas de version de cada motor (`support/<motor>.json`, lines.rs)
//! frente a la evidencia: los servidores de prueba de `tools/test-dbs/lines.json`
//! y los fixtures de `tests/sql/<motor>/<linea>`, que `version_lines` corre en
//! servidores reales (D7). Los datos dicen como se comporta cada linea; los
//! fixtures demuestran que la frontera existe. Un dato sin su fixture falla.

use khipu_engine::Dialect;
use khipu_engine::diagnostics::{Diagnostic, DiagnosticMessage, analyze_statement_with};
use khipu_engine::lines::{EngineLines, Line, numbers};
use std::path::PathBuf;

fn repo() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn registry() -> serde_json::Value {
    let text = std::fs::read_to_string(repo().join("tools/test-dbs/lines.json")).unwrap();
    serde_json::from_str(&text).unwrap()
}

/// Las entradas de un fixture (separadas por `-- ---`); ninguna si no existe.
fn fixture(engine: &str, line: &str, file: &str) -> Vec<String> {
    let path = repo().join("tests/sql").join(engine).join(line).join(file);
    std::fs::read_to_string(path)
        .map(|text| {
            text.split("\n-- ---\n")
                .map(|entry| entry.trim().to_string())
                .filter(|entry| !entry.is_empty())
                .collect()
        })
        .unwrap_or_default()
}

fn removed_in(sql: &str, dialect: Dialect, line: &Line) -> Option<Diagnostic> {
    analyze_statement_with(sql, dialect, None, false, Some(line))
        .into_iter()
        .find(|diagnostic| {
            matches!(&diagnostic.message, DiagnosticMessage::Key { key, .. }
                if key.starts_with("diagnostic.removedInLine"))
        })
}

#[test]
fn every_registered_engine_declares_its_own_lines_and_the_test_servers_use_them() {
    let registry = registry();
    for dialect in Dialect::ALL {
        let id = dialect.id();
        let lines = dialect.lines();
        assert_eq!(
            lines.engine, id,
            "{id} registra las lineas de {}: le falta support/{id}.json",
            lines.engine
        );
        let ids: Vec<&str> = lines.lines.iter().map(|line| line.line.as_str()).collect();
        let tested: Vec<&str> = registry["engines"][id]
            .as_array()
            .unwrap_or_else(|| panic!("{id}: sin lineas en tools/test-dbs/lines.json"))
            .iter()
            .map(|line| line["line"].as_str().unwrap())
            .collect();
        assert_eq!(
            ids, tested,
            "{id}: las lineas de support/{id}.json y las de tools/test-dbs/lines.json"
        );
    }
}

#[test]
fn a_version_selects_the_closest_line_below_it() {
    let line =
        |dialect: Dialect, version: &str| dialect.lines().effective(&numbers(version)).line.clone();
    // Los dos lados de cada frontera.
    assert_eq!(line(Dialect::MySql, "8.3.0"), "8.0");
    assert_eq!(line(Dialect::MySql, "8.4.0"), "8.4");
    assert_eq!(line(Dialect::MariaDb, "10.5.29"), "10.3");
    assert_eq!(line(Dialect::MariaDb, "10.6.0"), "10.6");
    assert_eq!(line(Dialect::Postgres, "13.23"), "12");
    assert_eq!(line(Dialect::Postgres, "14.0"), "14");
    // Mas nueva que todas: la ultima (SQL_ENGINE.md §5.2).
    assert_eq!(line(Dialect::MySql, "12.1.0"), "9");
    assert_eq!(line(Dialect::Postgres, "19.0"), "18");
    // Debajo del piso conecta igual, con la primera linea.
    assert_eq!(line(Dialect::MySql, "5.6.51"), "5.7");
    assert_eq!(line(Dialect::MariaDb, "10.2.44"), "10.3");
    assert_eq!(line(Dialect::Postgres, "9.6.24"), "10");
    // Ilegible (0.0.0): la primera.
    assert_eq!(line(Dialect::MySql, "0"), "5.7");
}

#[test]
fn every_test_server_and_every_verified_version_selects_the_line_it_proves() {
    let registry = registry();
    let mut verified = 0;
    for dialect in Dialect::ALL {
        let id = dialect.id();
        let mut probes = Vec::new();
        let lines = registry["engines"][id]
            .as_array()
            .unwrap_or_else(|| panic!("{id}: sin lineas en tools/test-dbs/lines.json"));
        for line in lines {
            for probe in line["probes"].as_array().unwrap() {
                let version = probe["version"].as_str().unwrap();
                probes.push((version, line["line"].as_str().unwrap()));
            }
        }
        for (version, line) in &probes {
            assert_eq!(
                dialect.lines().effective(&numbers(version)).line,
                *line,
                "{id} {version}"
            );
        }
        for server in registry["verified"][id].as_array().into_iter().flatten() {
            let version = server["version"].as_str().unwrap();
            assert!(
                probes.iter().any(|(probe, _)| probe == &version),
                "{id} {version} es verificada: tiene que ser el probe de su linea"
            );
            verified += 1;
        }
    }
    assert!(verified > 0);
}

#[test]
fn every_reserved_word_of_a_line_is_one_its_fixtures_prove() {
    for dialect in Dialect::ALL {
        let id = dialect.id();
        for line in &dialect.lines().lines {
            let rejects = fixture(id, &line.line, "rejects.sql");
            for word in &line.reserved_words {
                let alias = format!(" as {word}");
                assert!(
                    rejects
                        .iter()
                        .any(|entry| entry.to_lowercase().contains(&alias)),
                    "{id} {}: «{word}» es reservada sin un `AS {word}` en tests/sql/{id}/{}/rejects.sql",
                    line.line,
                    line.line
                );
            }
        }
    }
}

/// A9: lo que una linea elimino se marca desde esa linea, con su reemplazo,
/// y no en la anterior, donde el servidor lo acepta (version_lines lo
/// demuestra con los mismos fixtures).
#[test]
fn removed_syntax_is_marked_from_its_line_on_and_never_before() {
    let mut marked = 0;
    for dialect in Dialect::ALL {
        let id = dialect.id();
        let lines = &dialect.lines().lines;
        let last = lines.last().unwrap();
        for (index, line) in lines.iter().enumerate() {
            let rejects = fixture(id, &line.line, "rejects.sql");
            for removed in &line.removed_syntax {
                let proved = rejects.iter().any(|entry| {
                    removed_in(entry, dialect, line).is_some()
                        && removed_in(entry, dialect, last).is_some()
                });
                assert!(
                    proved,
                    "{id} {}: {:?} no marca ninguna entrada de su rejects.sql",
                    line.line, removed.words
                );
            }
            for entry in &rejects {
                if let Some(previous) = index.checked_sub(1).map(|at| &lines[at]) {
                    assert_eq!(
                        removed_in(entry, dialect, previous),
                        None,
                        "{id} {}: marcado en la linea anterior, que lo acepta:\n{entry}",
                        previous.line
                    );
                }
                if let Some(found) = removed_in(entry, dialect, line) {
                    let DiagnosticMessage::Key { params, .. } = &found.message else {
                        unreachable!()
                    };
                    assert_eq!(params["line"], line.line, "{entry}");
                    marked += 1;
                }
            }
            // Lo que la linea agrega lo acepta su servidor: nunca es sintaxis
            // eliminada, ni en ella ni en la ultima.
            for entry in fixture(id, &line.line, "accepts.sql") {
                assert_eq!(removed_in(&entry, dialect, line), None, "{entry}");
                assert_eq!(removed_in(&entry, dialect, last), None, "{entry}");
            }
        }
    }
    assert!(marked > 0);
}

#[test]
fn removed_syntax_says_where_it_is_and_what_replaces_it() {
    let lines = Dialect::MySql.lines();
    let found = removed_in(
        "show slave status;",
        Dialect::MySql,
        lines.get("9").unwrap(),
    )
    .expect("8.4 elimino SHOW SLAVE STATUS");
    assert_eq!((found.start.column, found.end.column), (1, 18));
    let DiagnosticMessage::Key { key, params } = found.message else {
        unreachable!()
    };
    assert_eq!(key, "diagnostic.removedInLineUse");
    assert_eq!(params["line"], "8.4");
    assert_eq!(params["instead"], "SHOW REPLICA STATUS");
    // Entre comillas o en otra posicion no es la sentencia eliminada.
    let nine = lines.get("9").unwrap();
    assert_eq!(
        removed_in("SELECT 'SHOW SLAVE STATUS'", Dialect::MySql, nine),
        None
    );
    assert_eq!(
        removed_in("SELECT 1 FROM `show` slave", Dialect::MySql, nine),
        None
    );
    // Un CTE que se llama oids no es WITH OIDS; un != tampoco es un postfijo.
    let eighteen = Dialect::Postgres.lines().get("18").unwrap();
    assert_eq!(
        removed_in(
            "WITH oids AS (SELECT 1) SELECT * FROM oids",
            Dialect::Postgres,
            eighteen
        ),
        None
    );
    assert_eq!(
        removed_in("SELECT 1 WHERE 1 != 2", Dialect::Postgres, eighteen),
        None
    );
    // Sin linea no hay nada que decir.
    assert!(
        analyze_statement_with("SHOW SLAVE STATUS", Dialect::MySql, None, false, None)
            .iter()
            .all(|d| !matches!(&d.message, DiagnosticMessage::Key { key, .. } if key.starts_with("diagnostic.removedInLine")))
    );
}

#[test]
fn the_line_data_is_rejected_when_the_app_cannot_apply_it() {
    let line = |body: &str| format!(r#"{{"format":1,"engine":"x","lines":[{body}]}}"#);
    let rejected = [
        r#"{"format":2,"engine":"x","lines":[{"line":"1","revision":1}]}"#.to_string(),
        r#"{"format":1,"engine":"x","lines":[]}"#.to_string(),
        // Un campo que esta app no conoce no se ignora.
        line(r#"{"line":"1","revision":1,"code":"x"}"#),
        line(r#"{"line":"1","revision":1,"capabilities":{"teleport":"1"}}"#),
        line(r#"{"line":"1","revision":0}"#),
        line(r#"{"line":"1.x","revision":1}"#),
        line(r#"{"line":"2","revision":1},{"line":"1","revision":1}"#),
        line(r#"{"line":"1","revision":1},{"line":"1.0","revision":1}"#),
        // Una capacidad fuera de su linea, o declarada dos veces.
        line(
            r#"{"line":"1","revision":1},{"line":"2","revision":1,"capabilities":{"sequences":"1.5"}}"#,
        ),
        line(
            r#"{"line":"1","revision":1,"capabilities":{"sequences":"2"}},{"line":"2","revision":1}"#,
        ),
        line(
            r#"{"line":"1","revision":1,"capabilities":{"sequences":"1"}},{"line":"2","revision":1,"capabilities":{"sequences":"2"}}"#,
        ),
        line(r#"{"line":"1","revision":1,"reservedWords":["Rank"]}"#),
        line(r#"{"line":"1","revision":1,"removedSyntax":[{"words":["^","$"]}]}"#),
        line(r#"{"line":"1","revision":1,"removedSyntax":[{"words":["A","^"]}]}"#),
    ];
    for json in rejected {
        assert!(EngineLines::parse(&json).is_err(), "{json}");
    }
    // La primera linea puede declarar lo que ya existia debajo de ella.
    assert!(
        EngineLines::parse(&line(
            r#"{"line":"10.3","revision":1,"capabilities":{"checkConstraints":"10.2.1"}}"#
        ))
        .is_ok()
    );
}

/// Las copias que M4 elimino no vuelven: los drivers no deciden por su cuenta
/// desde que version existe una capacidad, y el backend no saca la linea de
/// los servidores de prueba. Los dos preguntan a las lineas del motor.
#[test]
fn no_known_consumer_declares_versioned_behavior_by_itself_again() {
    let read = |path: &str| std::fs::read_to_string(repo().join(path)).unwrap();
    for driver in ["mysql", "postgres"] {
        let path = format!("crates/drivers/{driver}/src/version.rs");
        let source = read(&path);
        let start = source
            .find("pub fn capabilities(")
            .unwrap_or_else(|| panic!("{path}: sin capabilities()"));
        let body = &source[start..start + source[start..].find("\n    }\n").unwrap()];
        assert!(
            body.contains(".lines()") && body.contains("supports("),
            "{path}: capabilities() pregunta a las lineas"
        );
        for copy in ["at_least", "10_000", " >= ", " < "] {
            assert!(
                !body.contains(copy),
                "{path}: capabilities() compara versiones ({copy}); va en support/"
            );
        }
    }
    let context = read("app/src-tauri/src/engine_context.rs");
    assert!(context.contains(".lines().effective("));
    assert!(
        !context.contains("engines:"),
        "engine_context.rs: la linea efectiva sale de support/, no de los probes de tools/test-dbs/lines.json"
    );
}
