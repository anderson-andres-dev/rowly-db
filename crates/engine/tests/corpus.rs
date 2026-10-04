//! Corpus de SQL valido y realista (`no-diagnostics.sql` en tests/sql,
//! SQL_ENGINE §10.1): ninguna sentencia puede dar un diagnostico. Es la red
//! contra los falsos positivos: una consulta real que se marque mal se pega
//! en el archivo que corresponde y queda cubierta.
//!
//! - `common/no-diagnostics.sql`: valida en todos los motores (`Dialect::ALL`).
//! - `mysql/common/no-diagnostics.sql`: MySQL y MariaDB.
//! - `postgres/common/no-diagnostics.sql`: PostgreSQL.
//!
//! Las consolas mezcladas (`<motor>/common/mixed.json`) y los errores que
//! tienen que seguir viendose (`common/mixed-errors.json`) los comparte el
//! frontend (sqlMixedCorpus.test.ts) y `analysis` (crates/server-tests).
//!
//! Se revisa contra el catalogo de abajo; las tablas que el propio archivo
//! crea (`CREATE [TEMPORARY] TABLE x`) cuentan como creadas en el documento,
//! igual que en el editor.

use khipu_engine::Dialect;
use khipu_engine::catalog::{CatalogColumn, CatalogTable};
use khipu_engine::diagnostics::{CatalogView, analyze_statement};
use sqlparser::keywords::Keyword;
use sqlparser::tokenizer::{Token, Tokenizer};

fn table(name: &str, columns: &[&str]) -> CatalogTable {
    CatalogTable {
        schema: "app".to_string(),
        name: name.to_string(),
        foreign_keys: vec![],
        columns: columns
            .iter()
            .map(|column| CatalogColumn {
                name: column.to_string(),
                data_type: "int".to_string(),
                nullable: true,
                is_primary_key: false,
                comment: None,
            })
            .collect(),
    }
}

fn catalog() -> Vec<CatalogTable> {
    vec![
        table(
            "clientes",
            &[
                "clie_codi",
                "clie_nomb",
                "clie_esta",
                "clie_fech",
                "ciud_codi",
            ],
        ),
        table(
            "abonados",
            &[
                "abon_codi",
                "clie_codi",
                "abon_esta",
                "abon_fech",
                "plan_codi",
            ],
        ),
        table(
            "facturas",
            &[
                "fact_codi",
                "abon_codi",
                "fact_valt",
                "fact_valc",
                "fact_faut",
                "fact_esta",
            ],
        ),
        table(
            "notas_credito",
            &["ntcr_codi", "fact_codi", "ntcr_esta", "ntcr_valo"],
        ),
        table(
            "contratos",
            &[
                "cont_codi",
                "abon_codi",
                "cont_esta",
                "cont_fini",
                "cont_ffin",
            ],
        ),
        table("planes", &["plan_codi", "plan_nomb", "plan_prec"]),
        table("ciudades", &["ciud_codi", "ciud_nomb"]),
        table(
            "asistencias",
            &[
                "asis_codi",
                "usua_codi",
                "asis_fech",
                "asis_hora",
                "asis_tipo",
            ],
        ),
        table("usuarios", &["usua_codi", "usua_nomb", "usua_mail"]),
    ]
}

/// Las sentencias del archivo, cortadas en `;` con el tokenizer del motor
/// (respeta sus cadenas, comentarios y bloques $tag$), con su linea.
fn statements(sql: &str, dialect: Dialect) -> Vec<(u64, String)> {
    let tokens = Tokenizer::new(&*dialect.as_sqlparser_dialect(), sql)
        .tokenize_with_location()
        .expect("el corpus se tokeniza");
    let offset = |line: u64, column: u64| {
        let (mut at_line, mut at_column) = (1, 1);
        for (index, character) in sql.char_indices() {
            if at_line == line && at_column == column {
                return index;
            }
            if character == '\n' {
                at_line += 1;
                at_column = 1;
            } else {
                at_column += 1;
            }
        }
        sql.len()
    };
    let mut found = Vec::new();
    let mut start: Option<(u64, usize)> = None;
    for token in &tokens {
        if token.token == Token::SemiColon {
            if let Some((line, from)) = start.take() {
                let to = offset(token.span.start.line, token.span.start.column);
                found.push((line, sql[from..to].trim().to_string()));
            }
        } else if start.is_none() && !matches!(token.token, Token::Whitespace(_) | Token::EOF) {
            start = Some((
                token.span.start.line,
                offset(token.span.start.line, token.span.start.column),
            ));
        }
    }
    if let Some((line, from)) = start {
        found.push((line, sql[from..].trim().to_string()));
    }
    found
}

/// Lo que el archivo crea: `CREATE [TEMPORARY|TEMP] TABLE [IF NOT EXISTS] x`.
fn created(sql: &str, dialect: Dialect) -> Vec<String> {
    let words: Vec<Token> = Tokenizer::new(&*dialect.as_sqlparser_dialect(), sql)
        .tokenize()
        .expect("el corpus se tokeniza")
        .into_iter()
        .filter(|token| !matches!(token, Token::Whitespace(_)))
        .collect();
    let keyword = |token: &Token| match token {
        Token::Word(word) => word.keyword,
        _ => Keyword::NoKeyword,
    };
    let mut names = Vec::new();
    for (index, token) in words.iter().enumerate() {
        if keyword(token) != Keyword::TABLE || index == 0 {
            continue;
        }
        let before = &words[..index];
        let is_create = matches!(before.last().map(keyword), Some(Keyword::CREATE))
            || (matches!(
                before.last().map(keyword),
                Some(Keyword::TEMPORARY | Keyword::TEMP)
            ) && matches!(
                before.get(before.len().wrapping_sub(2)).map(keyword),
                Some(Keyword::CREATE)
            ));
        if !is_create {
            continue;
        }
        let mut rest = words[index + 1..].iter();
        let mut name = rest.next();
        if name.map(keyword) == Some(Keyword::IF) {
            name = rest.nth(2);
        }
        if let Some(Token::Word(word)) = name {
            names.push(word.value.clone());
        }
    }
    names
}

/// Un archivo de tests/sql (SQL_ENGINE §10.1), relativo a esa carpeta.
fn sql_path(file: &str) -> String {
    format!("{}/../../tests/sql/{file}", env!("CARGO_MANIFEST_DIR"))
}

fn check(file: &str, dialects: &[Dialect]) {
    let path = sql_path(file);
    let sql = std::fs::read_to_string(&path).expect("el archivo del corpus existe");
    let tables = catalog();
    let mut problems = Vec::new();
    let mut checked = 0;
    for &dialect in dialects {
        let created = created(&sql, dialect);
        let view = CatalogView {
            tables: &tables,
            loaded_schemas: vec!["app"],
            default_schema: "app",
            created: created.iter().map(String::as_str).collect(),
        };
        for (line, statement) in statements(&sql, dialect) {
            checked += 1;
            for diagnostic in analyze_statement(&statement, dialect, Some(&view)) {
                problems.push(format!(
                    "{file}:{line} {dialect:?}: {:?} en {}:{}\n    {}",
                    diagnostic.message,
                    diagnostic.start.line,
                    diagnostic.start.column,
                    statement.lines().next().unwrap_or_default()
                ));
            }
        }
    }
    assert!(checked > 10, "{file}: el corpus quedo casi vacio");
    assert!(
        problems.is_empty(),
        "falsos positivos:\n{}",
        problems.join("\n")
    );
}

#[test]
fn lo_comun_no_da_falsos_positivos_en_ningun_motor() {
    check("common/no-diagnostics.sql", &Dialect::ALL);
}

#[test]
fn lo_de_mysql_y_mariadb_no_da_falsos_positivos() {
    check(
        "mysql/common/no-diagnostics.sql",
        &[Dialect::MySql, Dialect::MariaDb],
    );
}

#[test]
fn lo_de_postgres_no_da_falsos_positivos() {
    check("postgres/common/no-diagnostics.sql", &[Dialect::Postgres]);
}

#[test]
fn consolas_mezcladas_no_dan_falsos_positivos() {
    for (file, dialects) in [
        (
            "mysql/common/mixed.json",
            &[Dialect::MySql, Dialect::MariaDb][..],
        ),
        ("mariadb/common/mixed.json", &[Dialect::MariaDb][..]),
        ("postgres/common/mixed.json", &[Dialect::Postgres][..]),
    ] {
        let path = sql_path(file);
        let text = std::fs::read_to_string(path).unwrap();
        let fixture: serde_json::Value = serde_json::from_str(&text).unwrap();
        let sql = fixture["sql"].as_str().unwrap();
        let statements = fixture["statements"].as_array().unwrap();
        assert!(
            statements.len() > 20 || file.starts_with("mariadb/") && statements.len() >= 3,
            "{file}: corpus insuficiente"
        );
        let mut after = 0;
        for statement in statements {
            let statement = statement.as_str().unwrap();
            let at = sql[after..]
                .find(statement)
                .expect("sentencia en el script")
                + after;
            after = at + statement.len();
            for &dialect in dialects {
                let found = analyze_statement(statement, dialect, None);
                assert!(
                    found.is_empty(),
                    "{file} {dialect:?}: {statement}\n{found:?}"
                );
            }
        }
    }
}

#[test]
fn errores_ordinarios_siguen_detectandose() {
    let path = sql_path("common/mixed-errors.json");
    let text = std::fs::read_to_string(path).unwrap();
    let cases: serde_json::Value = serde_json::from_str(&text).unwrap();
    for case in cases.as_array().unwrap() {
        let sql = case["sql"].as_str().unwrap();
        let expected = case["key"].as_str().unwrap();
        let dialects: Vec<Dialect> = if case["dialects"].is_array() {
            vec![Dialect::MySql, Dialect::MariaDb]
        } else {
            Dialect::ALL.to_vec()
        };
        for dialect in dialects {
            let (statement, line_offset) = match sql.find(";\nCREATE PROCEDURE") {
                Some(at) => (&sql[at + 2..], sql[..at + 2].matches('\n').count() as u64),
                None => (sql, 0),
            };
            let found = analyze_statement(statement, dialect, None);
            let first = found
                .first()
                .unwrap_or_else(|| panic!("{dialect:?}: {sql}"));
            match &first.message {
                khipu_engine::diagnostics::DiagnosticMessage::Key { key, .. } => {
                    assert_eq!(key, expected, "{dialect:?}: {sql}");
                }
                other => panic!("{dialect:?}: {sql}: {other:?}"),
            }
            if let (Some(line), Some(column)) = (case["line"].as_u64(), case["column"].as_u64()) {
                assert_eq!(
                    (first.start.line + line_offset, first.start.column),
                    (line, column),
                    "{dialect:?}: {sql}: {found:?}"
                );
            }
        }
    }
}

#[test]
fn comentario_mysql_de_version_no_da_diagnosticos() {
    let sql = "/*!50003 CREATE*/ /*!50003 DEFINER=`u`@`%`*/ PROCEDURE p() BEGIN SELECT 1; END";
    for dialect in [Dialect::MySql, Dialect::MariaDb] {
        let found = analyze_statement(sql, dialect, None);
        assert!(found.is_empty(), "{dialect:?}: {found:?}");
    }
}

#[test]
fn rutinas_mysql_validas_no_dan_falsos_positivos() {
    let path = sql_path("common/mixed-routines.json");
    let text = std::fs::read_to_string(path).unwrap();
    let cases: Vec<String> = serde_json::from_str(&text).unwrap();
    assert!(cases.len() >= 20);
    let tables = catalog();
    let view = CatalogView {
        tables: &tables,
        loaded_schemas: vec!["app"],
        default_schema: "app",
        created: vec![],
    };
    for sql in cases {
        for dialect in [Dialect::MySql, Dialect::MariaDb] {
            let found = analyze_statement(&sql, dialect, Some(&view));
            assert!(found.is_empty(), "{dialect:?}: {sql}\n{found:?}");
        }
    }
}
