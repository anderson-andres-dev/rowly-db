//! Corpus de SQL valido y realista (tests/corpus/valid): ninguna sentencia
//! puede dar un diagnostico. Es la red contra los falsos positivos: una
//! consulta real que se marque mal se pega en el archivo que corresponde y
//! queda cubierta.
//!
//! - `common.sql`: valida en todos los motores (`Dialect::ALL`).
//! - `mysql.sql`: MySQL y MariaDB.
//! - `postgres.sql`: PostgreSQL.
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

fn check(file: &str, dialects: &[Dialect]) {
    let path = format!("{}/tests/corpus/valid/{file}", env!("CARGO_MANIFEST_DIR"));
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
    check("common.sql", &Dialect::ALL);
}

#[test]
fn lo_de_mysql_y_mariadb_no_da_falsos_positivos() {
    check("mysql.sql", &[Dialect::MySql, Dialect::MariaDb]);
}

#[test]
fn lo_de_postgres_no_da_falsos_positivos() {
    check("postgres.sql", &[Dialect::Postgres]);
}
