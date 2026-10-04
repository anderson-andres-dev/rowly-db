//! Diagnosticos de SQL mientras se escribe.
//!
//! Dos pasadas por sentencia, sin tocar la base:
//! 1. Sintaxis: el error de sqlparser con su linea y columna, afinado con
//!    los tokens (una palabra clave mal escrita, una coma de mas).
//! 2. Catalogo: tablas y columnas que no existen en el catalogo cargado, con
//!    sugerencias por distancia de edicion.
//!
//! Es conservador: si no puede afirmar que algo esta mal (un schema que no
//! esta cargado, una subconsulta, un CTE), no dice nada. Un error que no lo
//! es molesta mas que uno que se escapa; el servidor lo dira al ejecutar.
//!
//! Posiciones: linea y columna 1-based, en caracteres, relativas a la
//! sentencia; el fin es exclusivo. El frontend las pasa a su offset.

use crate::catalog::CatalogTable;
use crate::lines::Line;
use crate::{Dialect, RoutineBodies};
use serde::Serialize;
use sqlparser::ast::{
    Expr, FunctionArg, FunctionArgExpr, FunctionArguments, GroupByExpr, Ident, JoinConstraint,
    JoinOperator, ObjectName, ObjectNamePart, OrderByKind, Query, Select, SelectItem, SetExpr,
    Statement, TableFactor, TableWithJoins,
};
use sqlparser::dialect::Dialect as SqlparserDialect;
use sqlparser::keywords::Keyword;
use sqlparser::parser::Parser;
use sqlparser::tokenizer::{Location, Token, TokenWithSpan, Tokenizer};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Position {
    pub line: u64,
    pub column: u64,
}

impl From<Location> for Position {
    fn from(location: Location) -> Self {
        Self {
            line: location.line,
            column: location.column,
        }
    }
}

/// Mismo formato en el cable que `Message` de driver-core (que el engine no
/// conoce): texto crudo o `{ key, params }`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(untagged)]
pub enum DiagnosticMessage {
    Raw(String),
    Key {
        key: String,
        #[serde(skip_serializing_if = "BTreeMap::is_empty")]
        params: BTreeMap<String, String>,
    },
}

impl DiagnosticMessage {
    pub fn key(key: &str) -> Self {
        DiagnosticMessage::Key {
            key: key.to_string(),
            params: BTreeMap::new(),
        }
    }

    pub fn with(mut self, name: &str, value: impl ToString) -> Self {
        if let DiagnosticMessage::Key { params, .. } = &mut self {
            params.insert(name.to_string(), value.to_string());
        }
        self
    }
}

/// Una correccion: reemplazar [start, end) por `replacement`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Suggestion {
    pub start: Position,
    pub end: Position,
    pub replacement: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Diagnostic {
    pub start: Position,
    pub end: Position,
    pub message: DiagnosticMessage,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub suggestions: Vec<Suggestion>,
}

/// Lo que se sabe de la base para la segunda pasada.
pub struct CatalogView<'a> {
    pub tables: &'a [CatalogTable],
    /// Schemas cargados en el explorador: fuera de ellos, un nombre
    /// desconocido no es un error (no se sabe).
    pub loaded_schemas: Vec<&'a str>,
    pub default_schema: &'a str,
    /// Tablas y vistas que crea el mismo documento (`CREATE [TEMPORARY]
    /// TABLE tmp ...`): existen aunque el catalogo no las tenga, y no se sabe
    /// que columnas tienen.
    pub created: Vec<&'a str>,
}

/// Cuantos arreglos se prueban para seguir buscando errores.
const MAX_REPAIRS: usize = 10;

/// Como `analyze_statement`, para una sesion de MySQL / MariaDB con
/// NO_BACKSLASH_ESCAPES: la barra invertida es un caracter mas dentro de una
/// cadena. Cada una pasa a `/`, que no escapa nada, para que el tokenizer
/// corte las cadenas donde las corta el servidor; las posiciones siguen
/// siendo las del texto original, porque la longitud no cambia.
///
/// Con la linea del servidor (`line`, de `dialect`), tambien la sintaxis que
/// esa linea o una anterior elimino (A9). Sin linea (sin conexion, o un
/// servidor de otro motor que el del perfil), nada de eso.
pub fn analyze_statement_with(
    sql: &str,
    dialect: Dialect,
    catalog: Option<&CatalogView>,
    no_backslash_escapes: bool,
    line: Option<&Line>,
) -> Vec<Diagnostic> {
    if let Some(found) = line.and_then(|line| removed_syntax(sql, dialect, line)) {
        return vec![found];
    }
    if !no_backslash_escapes || !dialect.backslash_escapes() || !sql.contains('\\') {
        return analyze_statement(sql, dialect, catalog);
    }
    let mut bytes = sql.as_bytes().to_vec();
    for index in crate::execution_guard::backslashes_in_strings(sql) {
        bytes[index] = b'/';
    }
    let read = String::from_utf8(bytes).expect("solo cambian bytes ASCII");
    analyze_statement(&read, dialect, catalog)
}

/// Todos los errores de la sentencia, no solo el primero: el parser se
/// detiene en uno, asi que cada error con un arreglo seguro (la coma que
/// falta, la que sobra, `WHER` por `WHERE`) se aplica a una copia y se vuelve
/// a leer. Cuando la copia ya se lee, se revisa contra el catalogo. Un error
/// sin arreglo seguro (un parentesis sin cerrar) corta ahi: lo que siga seria
/// consecuencia suya. Las posiciones son siempre las del texto original.
pub fn analyze_statement(
    sql: &str,
    dialect: Dialect,
    catalog: Option<&CatalogView>,
) -> Vec<Diagnostic> {
    if let Some(found) = mysql_routine_errors(sql, dialect) {
        return found;
    }
    // Lo que el parser rechaza o lee mal no es del usuario.
    if has_unparsed_syntax(sql, dialect) {
        return Vec::new();
    }
    // Cuerpos entre comillas: pueden ser cadenas con otro lenguaje.
    if quoted_routine_definition(sql, dialect) {
        return Vec::new();
    }
    if dialect.definition().select_into_variable_lists {
        if let Some(found) = mysql_select_into_errors(sql, dialect, catalog) {
            return found;
        }
    }
    let sqlparser_dialect = dialect.as_sqlparser_dialect();
    let mut copy = Repaired::new(sql);
    let mut found: Vec<Diagnostic> = Vec::new();
    for _ in 0..MAX_REPAIRS {
        match Parser::parse_sql(&*sqlparser_dialect, &copy.text) {
            Ok(statements) => {
                if let Some(catalog) = catalog {
                    let mut checker = Checker {
                        catalog,
                        dialect,
                        diagnostics: Vec::new(),
                        ctes: Vec::new(),
                    };
                    for statement in &statements {
                        checker.statement(statement);
                    }
                    found.extend(
                        checker
                            .diagnostics
                            .into_iter()
                            .map(|diagnostic| copy.to_original(diagnostic)),
                    );
                }
                break;
            }
            Err(error) => {
                let error = error.to_string();
                // Una sentencia que el parser no conoce (DO, VACUUM…): sin
                // diagnostico (ver STATEMENT_STARTERS).
                if unknown_statement(&error) {
                    break;
                }
                let errors = syntax_errors(&copy.text, &*sqlparser_dialect, &error);
                let fix =
                    errors
                        .iter()
                        .find_map(|diagnostic| match diagnostic.suggestions.as_slice() {
                            [only] => Some(only.clone()),
                            _ => None,
                        });
                for diagnostic in errors {
                    let diagnostic = copy.to_original(diagnostic);
                    let repeated = found.iter().any(|seen| {
                        seen.start == diagnostic.start && seen.message == diagnostic.message
                    });
                    if !repeated {
                        found.push(diagnostic);
                    }
                }
                match fix {
                    Some(fix) => copy.apply(&fix),
                    None => break,
                }
            }
        }
    }
    found.sort_by_key(|diagnostic| diagnostic.start);
    found
}

/// Lee una rutina con cuerpo en bloque (MySQL, MariaDB) completa. Cada
/// fragmento conserva su offset original.
fn mysql_routine_errors(sql: &str, dialect: Dialect) -> Option<Vec<Diagnostic>> {
    if dialect.definition().routine_bodies != RoutineBodies::Block {
        return None;
    }
    let all = Tokenizer::new(&*dialect.as_sqlparser_dialect(), sql)
        .tokenize_with_location()
        .ok()?;
    let tokens: Vec<&TokenWithSpan> = all
        .iter()
        .filter(|token| !matches!(token.token, Token::Whitespace(_) | Token::EOF))
        .collect();
    let create = tokens
        .iter()
        .position(|token| keyword_text(token) == "CREATE")?;
    if create > 3
        || tokens[..create]
            .iter()
            .any(|token| !matches!(token.token, Token::Whitespace(_)))
    {
        return None;
    }
    let kind = (create + 1..tokens.len().min(create + 20)).find(|&i| {
        matches!(
            keyword_text(tokens[i]).as_str(),
            "PROCEDURE"
                | "FUNCTION"
                | "TRIGGER"
                | "EVENT"
                | "TABLE"
                | "VIEW"
                | "INDEX"
                | "DATABASE"
                | "SCHEMA"
                | "USER"
        )
    })?;
    let name = keyword_text(tokens[kind]);
    if !matches!(
        name.as_str(),
        "PROCEDURE" | "FUNCTION" | "TRIGGER" | "EVENT"
    ) {
        return None;
    }
    let mut found = Vec::new();
    let body = if matches!(name.as_str(), "PROCEDURE" | "FUNCTION") {
        let open = (kind + 1..tokens.len()).find(|&i| tokens[i].token == Token::LParen)?;
        let mut depth = 0usize;
        let mut close = None;
        for (i, token) in tokens.iter().enumerate().skip(open) {
            match token.token {
                Token::LParen => depth += 1,
                Token::RParen => {
                    depth -= 1;
                    if depth == 0 {
                        close = Some(i);
                        break;
                    }
                }
                _ => {}
            }
        }
        let close = match close {
            Some(i) => i,
            None => {
                found.push(at_token(
                    tokens[open],
                    DiagnosticMessage::key("diagnostic.unclosedParen"),
                ));
                return Some(found);
            }
        };
        let mut start = open + 1;
        depth = 0;
        for i in open + 1..=close {
            match tokens[i].token {
                Token::LParen => depth += 1,
                Token::RParen if depth > 0 => depth -= 1,
                _ => {}
            }
            if (tokens[i].token == Token::Comma && depth == 0) || i == close {
                if start == i && (i != close || i > open + 1) {
                    let at = if i == close { tokens[i - 1] } else { tokens[i] };
                    found.push(at_token(
                        at,
                        DiagnosticMessage::key("diagnostic.extraComma"),
                    ));
                } else if start < i {
                    validate_mysql_parameter(&tokens[start..i], &mut found);
                }
                start = i + 1;
            }
        }
        (close + 1..tokens.len())
            .find(|&i| matches!(keyword_text(tokens[i]).as_str(), "BEGIN" | "RETURN"))
    } else if name == "TRIGGER" {
        (kind + 1..tokens.len()).find(|&i| {
            matches!(
                keyword_text(tokens[i]).as_str(),
                "BEGIN" | "SET" | "INSERT" | "UPDATE" | "DELETE" | "IF" | "REPLACE"
            ) && (keyword_text(tokens[i]) == "BEGIN"
                || (i > kind + 1 && keyword_text(tokens[i - 1]) == "ROW"))
        })
    } else {
        (kind + 1..tokens.len())
            .find(|&i| keyword_text(tokens[i]) == "DO")
            .map(|i| i + 1)
    };
    if let Some(body) = body.filter(|&body| body < tokens.len()) {
        let from = byte_offset(sql, tokens[body].span.start)?;
        for diagnostic in routine_body_errors(&sql[from..], dialect) {
            found.push(shifted(diagnostic, position_at(sql, from)));
        }
    }
    found.sort_by_key(|d| d.start);
    Some(found)
}

fn validate_mysql_parameter(tokens: &[&TokenWithSpan], found: &mut Vec<Diagnostic>) {
    let mut i = 0;
    if matches!(keyword_text(tokens[0]).as_str(), "IN" | "OUT" | "INOUT") {
        i += 1;
    }
    if i >= tokens.len() {
        return;
    }
    i += 1; // Nombre del parametro.
    validate_mysql_type(&tokens[i..], tokens.last().copied().unwrap(), found);
}

const MYSQL_TYPES: &[&str] = &[
    "BIT",
    "BOOL",
    "BOOLEAN",
    "TINYINT",
    "SMALLINT",
    "MEDIUMINT",
    "INT",
    "INTEGER",
    "INT1",
    "INT2",
    "INT3",
    "INT4",
    "INT8",
    "MIDDLEINT",
    "BIGINT",
    "DECIMAL",
    "DEC",
    "NUMERIC",
    "FIXED",
    "FLOAT",
    "DOUBLE",
    "REAL",
    "DATE",
    "TIME",
    "DATETIME",
    "TIMESTAMP",
    "YEAR",
    "CHAR",
    "CHARACTER",
    "NATIONAL",
    "LONG",
    "VARCHAR",
    "NCHAR",
    "NVARCHAR",
    "BINARY",
    "VARBINARY",
    "TINYTEXT",
    "TEXT",
    "MEDIUMTEXT",
    "LONGTEXT",
    "TINYBLOB",
    "BLOB",
    "MEDIUMBLOB",
    "LONGBLOB",
    "ENUM",
    "SET",
    "JSON",
    "GEOMETRY",
    "POINT",
    "LINESTRING",
    "POLYGON",
    "MULTIPOINT",
    "MULTILINESTRING",
    "MULTIPOLYGON",
    "GEOMETRYCOLLECTION",
    "SERIAL",
    "UUID",
    "INET4",
    "INET6",
];

fn validate_mysql_type(
    tokens: &[&TokenWithSpan],
    previous: &TokenWithSpan,
    found: &mut Vec<Diagnostic>,
) {
    let Some(first) = tokens.first() else {
        found.push(routine_incomplete(previous));
        return;
    };
    // MariaDB: `TYPE OF t.a` y `ROW TYPE OF t` toman el tipo de una columna.
    if matches!(keyword_text(first).as_str(), "TYPE" | "ROW") {
        return;
    }
    if !MYSQL_TYPES.contains(&keyword_text(first).as_str()) {
        let word = keyword_text(first);
        if let Some(suggestion) = closest_keyword(&word, MYSQL_TYPES) {
            let (start, end) = span_of(first);
            found.push(typo(start, end, &word, suggestion));
        } else {
            found.push(at_token(
                first,
                DiagnosticMessage::key("diagnostic.unexpected").with("found", word),
            ));
        }
        return;
    }
    if let Some(open) = tokens.iter().position(|t| t.token == Token::LParen) {
        let mut depth = 0usize;
        for (i, token) in tokens.iter().enumerate().skip(open) {
            match token.token {
                Token::LParen => depth += 1,
                Token::RParen => depth = depth.saturating_sub(1),
                Token::Comma
                    if depth == 1
                        && tokens
                            .get(i + 1)
                            .is_some_and(|next| next.token == Token::RParen) =>
                {
                    found.push(at_token(
                        token,
                        DiagnosticMessage::key("diagnostic.extraComma"),
                    ));
                }
                _ => {}
            }
        }
        if depth > 0 {
            found.push(at_token(
                tokens[open],
                DiagnosticMessage::key("diagnostic.unclosedParen"),
            ));
        }
    }
}

/// El punto y coma separa instrucciones tambien dentro de bloques anidados.
/// Los prefijos de control se retiran antes de entregar SQL ordinario al parser.
fn routine_body_errors(sql: &str, dialect: Dialect) -> Vec<Diagnostic> {
    let all = match Tokenizer::new(&*dialect.as_sqlparser_dialect(), sql).tokenize_with_location() {
        Ok(all) => all,
        Err(_) => return Vec::new(),
    };
    let tokens: Vec<&TokenWithSpan> = all
        .iter()
        .filter(|t| !matches!(t.token, Token::Whitespace(_) | Token::EOF))
        .collect();
    let mut found = Vec::new();
    let mut start = 0;
    for i in 0..=tokens.len() {
        if i == tokens.len() || tokens[i].token == Token::SemiColon {
            if start < i {
                inspect_routine_chunk(sql, &tokens[start..i], dialect, &mut found);
            }
            start = i + 1;
        }
    }
    routine_block_errors(&tokens, &mut found);
    found
}

#[derive(Clone, Copy, PartialEq)]
enum Open {
    Block,
    If,
    Case,
    CaseExpr,
    While,
    Loop,
    Repeat,
}

impl Open {
    fn closer(self) -> &'static str {
        match self {
            Open::Block => "END",
            Open::If => "END IF",
            Open::Case | Open::CaseExpr => "END CASE",
            Open::While => "END WHILE",
            Open::Loop => "END LOOP",
            Open::Repeat => "END REPEAT",
        }
    }
}

// Un END que no cierra lo que esta abierto (IF ... END; en vez de END IF).
// BEGIN y END solo cuentan al inicio de una sentencia: `begin` y `end` pueden
// ser alias o columnas, y un CASE de expresion tambien cierra con END. Ante
// cualquier duda no se marca nada.
fn routine_block_errors(tokens: &[&TokenWithSpan], found: &mut Vec<Diagnostic>) {
    let plain = |index: usize| -> String {
        match tokens.get(index).map(|token| &token.token) {
            Some(Token::Word(word)) if word.quote_style.is_none() => word.value.to_uppercase(),
            _ => String::new(),
        }
    };
    let mut stack: Vec<Open> = Vec::new();
    let mut start = true;
    let mut declaring = false;
    let mut index = 0;
    while index < tokens.len() {
        let dotted = index > 0 && tokens[index - 1].token == Token::Period;
        let word = if dotted { String::new() } else { plain(index) };
        if start
            && !word.is_empty()
            && tokens.get(index + 1).map(|t| &t.token) == Some(&Token::Colon)
        {
            index += 2;
            continue;
        }
        if tokens[index].token == Token::SemiColon {
            start = true;
            declaring = false;
            index += 1;
            continue;
        }
        let top = stack.last().copied();
        match word.as_str() {
            "BEGIN" if start => stack.push(Open::Block),
            "IF" if start => {
                stack.push(Open::If);
                start = false;
            }
            "CASE" => {
                stack.push(if start { Open::Case } else { Open::CaseExpr });
                start = false;
            }
            "WHILE" if start => {
                stack.push(Open::While);
                start = false;
            }
            "LOOP" if start => stack.push(Open::Loop),
            "REPEAT" if start => stack.push(Open::Repeat),
            "THEN" | "ELSE" => start = matches!(top, Some(Open::If | Open::Case)),
            "DO" if top == Some(Open::While) => start = true,
            "UNTIL" if top == Some(Open::Repeat) => start = false,
            "DECLARE" if start => {
                declaring = true;
                start = false;
            }
            "HANDLER"
                if declaring
                    && index > 0
                    && matches!(plain(index - 1).as_str(), "CONTINUE" | "EXIT" | "UNDO") =>
            {
                let mut at = index + 2;
                loop {
                    match plain(at).as_str() {
                        "SQLSTATE" => {
                            at += 1;
                            if plain(at) == "VALUE" {
                                at += 1;
                            }
                            at += 1;
                        }
                        "NOT" => at += 2,
                        _ => at += 1,
                    }
                    if tokens.get(at).map(|t| &t.token) == Some(&Token::Comma) {
                        at += 1;
                    } else {
                        break;
                    }
                }
                index = at;
                start = true;
                declaring = false;
                continue;
            }
            "END" => {
                let named = match plain(index + 1).as_str() {
                    "IF" => Some(Open::If),
                    "WHILE" => Some(Open::While),
                    "LOOP" => Some(Open::Loop),
                    "REPEAT" => Some(Open::Repeat),
                    "CASE" => Some(Open::Case),
                    _ => None,
                };
                if top == Some(Open::CaseExpr) {
                    stack.pop();
                } else if named.is_some() && named == top {
                    stack.pop();
                    index += 1;
                } else if start && top == Some(Open::Block) {
                    stack.pop();
                } else if let (Some(open), true) = (top, start || named.is_some()) {
                    let wrote = match plain(index + 1).as_str() {
                        "IF" | "WHILE" | "LOOP" | "REPEAT" | "CASE" => {
                            format!("END {}", plain(index + 1))
                        }
                        _ => "END".to_string(),
                    };
                    found.push(at_token(
                        tokens[index],
                        DiagnosticMessage::key("diagnostic.expected")
                            .with("expected", open.closer())
                            .with("found", wrote),
                    ));
                    stack.pop();
                    if named.is_some() {
                        index += 1;
                    }
                }
                start = false;
            }
            _ => start = false,
        }
        index += 1;
    }
}

fn inspect_routine_chunk(
    sql: &str,
    tokens: &[&TokenWithSpan],
    dialect: Dialect,
    found: &mut Vec<Diagnostic>,
) {
    let mut start = 0;
    while start < tokens.len() {
        if start + 1 < tokens.len() && tokens[start + 1].token == Token::Colon {
            start += 2;
            continue;
        }
        let word = keyword_text(tokens[start]);
        match word.as_str() {
            "BEGIN" | "LOOP" | "REPEAT" | "ELSE" => {
                start += 1;
                continue;
            }
            "END" | "UNTIL" => return,
            "IF" | "ELSEIF" | "WHILE" | "WHEN" => {
                let terminal = if word == "WHILE" { "DO" } else { "THEN" };
                let Some(end) =
                    (start + 1..tokens.len()).find(|&i| keyword_text(tokens[i]) == terminal)
                else {
                    // Solo IF/WHILE al inicio son sentencias de control seguras.
                    if matches!(word.as_str(), "IF" | "ELSEIF" | "WHILE") {
                        found.push(routine_incomplete(tokens[start]));
                    }
                    return;
                };
                if end == start + 1 {
                    found.push(routine_incomplete(tokens[start]));
                }
                validate_control_condition(&tokens[start + 1..end], found);
                start = end + 1;
            }
            "CASE" => {
                if let Some(end) =
                    (start + 1..tokens.len()).find(|&i| keyword_text(tokens[i]) == "THEN")
                {
                    start = end + 1;
                } else {
                    return;
                }
            }
            "DECLARE" => {
                validate_mysql_declare(sql, &tokens[start..], dialect, found);
                return;
            }
            "SIGNAL" | "RESIGNAL" | "GET" | "CALL" | "LEAVE" | "ITERATE" | "RETURN" | "OPEN"
            | "FETCH" | "CLOSE" | "PREPARE" | "EXECUTE" | "DEALLOCATE" => return,
            "SET"
                if tokens
                    .get(start + 1)
                    .is_some_and(|t| t.token == Token::AtSign) =>
            {
                return;
            }
            "SET" if tokens.iter().any(|t| t.token == Token::Assignment) => return,
            "SET" | "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "REPLACE" | "WITH" => {
                let from = byte_offset(sql, tokens[start].span.start).unwrap_or(0);
                let to = byte_offset(sql, tokens.last().unwrap().span.end).unwrap_or(sql.len());
                for diagnostic in analyze_statement(&sql[from..to], dialect, None) {
                    found.push(shifted(diagnostic, position_at(sql, from)));
                }
                return;
            }
            _ => {
                // Un verbo que no existe pero se parece a uno que si: `SELEC 1`.
                if let Token::Word(typed) = &tokens[start].token {
                    if typed.quote_style.is_none()
                        && typed.value.chars().all(|c| c.is_ascii_alphabetic())
                    {
                        if let Some(suggestion) =
                            closest_keyword(&typed.value, dialect.statement_starters())
                        {
                            let (from, to) = span_of(tokens[start]);
                            found.push(typo(from, to, &typed.value, suggestion));
                        }
                    }
                }
                return;
            }
        }
    }
}

fn validate_control_condition(tokens: &[&TokenWithSpan], found: &mut Vec<Diagnostic>) {
    let mut parens = Vec::new();
    for token in tokens {
        match token.token {
            Token::LParen => parens.push(*token),
            Token::RParen => {
                parens.pop();
            }
            _ => {}
        }
    }
    if let Some(open) = parens.last() {
        found.push(at_token(
            open,
            DiagnosticMessage::key("diagnostic.unclosedParen"),
        ));
    }
    if let Some(last) = tokens.last() {
        if matches!(
            last.token,
            Token::Eq | Token::Neq | Token::Lt | Token::Gt | Token::LtEq | Token::GtEq
        ) {
            found.push(at_token(
                last,
                DiagnosticMessage::key("diagnostic.missingValue")
                    .with("operator", token_text(&last.token)),
            ));
        }
    }
}

fn validate_mysql_declare(
    sql: &str,
    tokens: &[&TokenWithSpan],
    dialect: Dialect,
    found: &mut Vec<Diagnostic>,
) {
    let words: Vec<String> = tokens.iter().map(|t| keyword_text(t)).collect();
    if let Some(kind) = words
        .iter()
        .position(|word| matches!(word.as_str(), "CURSOR" | "HANDLER" | "CONDITION"))
    {
        let word = words[kind].as_str();
        let Some(for_at) = words.iter().position(|word| word == "FOR") else {
            found.push(routine_incomplete(tokens[kind]));
            return;
        };
        if for_at + 1 >= tokens.len() {
            found.push(routine_incomplete(tokens[for_at]));
            return;
        }
        if word == "CURSOR" {
            if !matches!(words[for_at + 1].as_str(), "SELECT" | "WITH") {
                found.push(routine_incomplete(tokens[for_at + 1]));
            } else {
                let from = byte_offset(sql, tokens[for_at + 1].span.start).unwrap_or(0);
                let to = byte_offset(sql, tokens.last().unwrap().span.end).unwrap_or(sql.len());
                for diagnostic in analyze_statement(&sql[from..to], dialect, None) {
                    found.push(shifted(diagnostic, position_at(sql, from)));
                }
            }
        } else if word == "CONDITION" {
            if (!matches!(words[for_at + 1].as_str(), "SQLSTATE")
                && !matches!(tokens[for_at + 1].token, Token::Number(..)))
                || (words[for_at + 1] == "SQLSTATE" && for_at + 2 >= tokens.len())
            {
                found.push(routine_incomplete(tokens[for_at + 1]));
            }
        } else {
            // Tras las condiciones, la accion es cualquier sentencia: un bloque,
            // un SET, un CLOSE, un LEAVE...
            let action = handler_action(tokens, for_at);
            if action < tokens.len() {
                inspect_routine_chunk(sql, &tokens[action..], dialect, found);
            } else {
                found.push(routine_incomplete(tokens.last().copied().unwrap()));
            }
        }
        return;
    }
    let mut i = 1;
    while i + 1 < tokens.len() && tokens[i + 1].token == Token::Comma {
        i += 2;
    }
    i += 1;
    let end = words
        .iter()
        .position(|word| word == "DEFAULT")
        .unwrap_or(tokens.len());
    // A medio escribir (`DECLARE`, `DECLARE a,`, `DECLARE DEFAULT`): aun no
    // hay nombre ni tipo que revisar.
    if i > end {
        found.push(routine_incomplete(tokens[tokens.len() - 1]));
        return;
    }
    validate_mysql_type(
        &tokens[i..end],
        tokens
            .get(i.saturating_sub(1))
            .copied()
            .unwrap_or(tokens[0]),
        found,
    );
    if end < tokens.len() {
        if end + 1 == tokens.len() {
            found.push(routine_incomplete(tokens[end]));
        } else {
            validate_control_condition(&tokens[end + 1..], found);
        }
    }
}

/// Donde empieza la accion de un `DECLARE ... HANDLER FOR condicion[, ...]`.
fn handler_action(tokens: &[&TokenWithSpan], for_at: usize) -> usize {
    let word = |index: usize| tokens.get(index).map(|token| keyword_text(token));
    let mut index = for_at + 1;
    loop {
        match word(index).as_deref() {
            Some("SQLSTATE") => {
                index += 1;
                if word(index).as_deref() == Some("VALUE") {
                    index += 1;
                }
                index += 1;
            }
            Some("NOT") => index += 2,
            _ => index += 1,
        }
        if tokens
            .get(index)
            .is_some_and(|token| token.token == Token::Comma)
        {
            index += 1;
        } else {
            return index.min(tokens.len());
        }
    }
}

fn routine_incomplete(token: &TokenWithSpan) -> Diagnostic {
    at_token(
        token,
        DiagnosticMessage::key("diagnostic.incomplete").with("after", token_text(&token.token)),
    )
}

/// Un CREATE de rutina, trigger o regla cuyo cuerpo es un texto en otro
/// lenguaje (Postgres): opaco para el analizador.
fn quoted_routine_definition(sql: &str, dialect: Dialect) -> bool {
    if dialect.definition().routine_bodies != RoutineBodies::Quoted {
        return false;
    }
    if !sql
        .trim_start()
        .get(..6)
        .is_some_and(|start| start.eq_ignore_ascii_case("CREATE"))
    {
        return false;
    }
    let tokens = match Tokenizer::new(&*dialect.as_sqlparser_dialect(), sql).tokenize() {
        Ok(tokens) => tokens,
        Err(_) => return false,
    };
    let words: Vec<String> = tokens
        .into_iter()
        .filter_map(|token| match token {
            Token::Word(word) if word.quote_style.is_none() => Some(word.value.to_uppercase()),
            Token::Whitespace(_) => None,
            _ => Some(String::new()),
        })
        .collect();
    if words.first().map(String::as_str) != Some("CREATE") {
        return false;
    }
    for word in words.iter().skip(1).take(32).map(String::as_str) {
        match word {
            "PROCEDURE" | "FUNCTION" | "TRIGGER" | "RULE" => return true,
            "EVENT" => return false,
            "TABLE" | "VIEW" | "INDEX" | "DATABASE" | "SCHEMA" | "TYPE" | "DOMAIN" | "SEQUENCE"
            | "EXTENSION" | "POLICY" => return false,
            _ => {}
        }
    }
    false
}

/// sqlparser solo admite un nombre en SELECT INTO; MySQL acepta variables
/// separadas por comas. Se quita esa lista sin mover las posiciones.
fn mysql_select_into_errors(
    sql: &str,
    dialect: Dialect,
    catalog: Option<&CatalogView>,
) -> Option<Vec<Diagnostic>> {
    let tokens = Tokenizer::new(&*dialect.as_sqlparser_dialect(), sql)
        .tokenize_with_location()
        .ok()?;
    let tokens: Vec<&TokenWithSpan> = tokens
        .iter()
        .filter(|token| !matches!(token.token, Token::Whitespace(_) | Token::EOF))
        .collect();
    if keyword_of(tokens.first()?) != Keyword::SELECT {
        return None;
    }
    let mut depth = 0usize;
    let mut into = None;
    for (index, token) in tokens.iter().enumerate() {
        match token.token {
            Token::LParen => depth += 1,
            Token::RParen => depth = depth.saturating_sub(1),
            _ if depth == 0 && keyword_of(token) == Keyword::INTO => {
                into = Some(index);
                break;
            }
            _ => {}
        }
    }
    // Lista de variables: `a`, `a, b` o `@x, @y`, antes del FROM o al final.
    let into = into?;
    let mut end = into + 1;
    loop {
        if !matches!(tokens.get(end)?.token, Token::Word(_)) {
            return None;
        }
        end += 1;
        if tokens
            .get(end)
            .is_some_and(|token| token.token == Token::Comma)
        {
            end += 1;
        } else {
            break;
        }
    }
    let start = byte_offset(sql, tokens[into].span.start)?;
    let stop = byte_offset(sql, tokens[end - 1].span.end)?;
    // Se borra la lista sin mover las posiciones: un espacio por caracter.
    let blank: String = sql[start..stop]
        .chars()
        .map(|c| if c == '\n' || c == '\r' { c } else { ' ' })
        .collect();
    let copy = format!("{}{}{}", &sql[..start], blank, &sql[stop..]);
    Some(analyze_statement(&copy, dialect, catalog))
}

/// La sentencia con los arreglos aplicados, y como volver de sus posiciones
/// a las del texto original.
struct Repaired<'a> {
    original: &'a str,
    text: String,
    /// (byte donde se cambio, bytes quitados, bytes puestos), en orden.
    edits: Vec<(usize, usize, usize)>,
}

impl<'a> Repaired<'a> {
    fn new(original: &'a str) -> Self {
        Self {
            original,
            text: original.to_string(),
            edits: Vec::new(),
        }
    }

    fn apply(&mut self, fix: &Suggestion) {
        let from = offset_at(&self.text, fix.start);
        let to = offset_at(&self.text, fix.end).max(from);
        self.text.replace_range(from..to, &fix.replacement);
        self.edits.push((from, to - from, fix.replacement.len()));
    }

    fn to_original(&self, mut diagnostic: Diagnostic) -> Diagnostic {
        if self.edits.is_empty() {
            return diagnostic;
        }
        let back = |position: Position| {
            let mut at = offset_at(&self.text, position);
            for &(from, removed, inserted) in self.edits.iter().rev() {
                at = if at >= from + inserted {
                    at - inserted + removed
                } else {
                    at.min(from)
                };
            }
            position_at(self.original, at)
        };
        diagnostic.start = back(diagnostic.start);
        diagnostic.end = back(diagnostic.end);
        for suggestion in &mut diagnostic.suggestions {
            suggestion.start = back(suggestion.start);
            suggestion.end = back(suggestion.end);
        }
        diagnostic
    }
}

fn offset_at(text: &str, position: Position) -> usize {
    byte_offset(
        text,
        Location {
            line: position.line,
            column: position.column,
        },
    )
    .unwrap_or(text.len())
}

fn position_at(text: &str, offset: usize) -> Position {
    let before = &text[..offset.min(text.len())];
    let line = before.matches('\n').count() as u64 + 1;
    let column = before.rsplit('\n').next().unwrap_or("").chars().count() as u64 + 1;
    Position { line, column }
}

/// La sentencia usa SQL valido en el motor que su parser rechaza o lee mal
/// (`Dialect::unparsed_syntax`): lo que diga el parser no es del usuario.
fn has_unparsed_syntax(sql: &str, dialect: Dialect) -> bool {
    let known = dialect.unparsed_syntax();
    if known.is_empty() {
        return false;
    }
    let words: Vec<String> = Tokenizer::new(&*dialect.as_sqlparser_dialect(), sql)
        .tokenize()
        .unwrap_or_default()
        .into_iter()
        .filter(|token| !matches!(token, Token::Whitespace(_)))
        .map(|token| match token {
            Token::Word(word) if word.quote_style.is_none() => word.value.to_uppercase(),
            other => other.to_string(),
        })
        .collect();
    known
        .iter()
        .any(|pattern| contains_pattern(&words, pattern))
}

/// La sintaxis que `line` o una linea anterior elimino, marcada donde esta,
/// con la linea que la elimino y lo que se usa en su lugar
/// (`support/<motor>.json`, `removedSyntax`).
fn removed_syntax(sql: &str, dialect: Dialect, line: &Line) -> Option<Diagnostic> {
    let mut removed = dialect.lines().removed_until(line).peekable();
    removed.peek()?;
    let mut tokens: Vec<TokenWithSpan> = Tokenizer::new(&*dialect.as_sqlparser_dialect(), sql)
        .tokenize_with_location()
        .ok()?
        .into_iter()
        .filter(|token| !matches!(token.token, Token::Whitespace(_) | Token::EOF))
        .collect();
    while matches!(
        tokens.last().map(|token| &token.token),
        Some(Token::SemiColon)
    ) {
        tokens.pop();
    }
    let words: Vec<String> = tokens
        .iter()
        .map(|token| match &token.token {
            Token::Word(word) if word.quote_style.is_none() => word.value.to_uppercase(),
            other => other.to_string(),
        })
        .collect();
    removed.find_map(|(removing, syntax)| {
        let at_start = syntax.words.first().is_some_and(|word| word == "^");
        let at_end = syntax.words.last().is_some_and(|word| word == "$");
        let pattern: Vec<&str> = syntax
            .words
            .iter()
            .map(String::as_str)
            .filter(|word| *word != "^" && *word != "$")
            .collect();
        let found = words
            .windows(pattern.len())
            .enumerate()
            .position(|(at, window)| {
                window
                    .iter()
                    .zip(&pattern)
                    .all(|(word, wanted)| word == wanted)
                    && (!at_start || at == 0)
                    && (!at_end || at + pattern.len() == words.len())
            })?;
        let message = match &syntax.instead {
            Some(instead) => DiagnosticMessage::key("diagnostic.removedInLineUse")
                .with("line", &removing.line)
                .with("instead", instead),
            None => DiagnosticMessage::key("diagnostic.removedInLine").with("line", &removing.line),
        };
        Some(Diagnostic {
            start: tokens[found].span.start.into(),
            end: tokens[found + pattern.len() - 1].span.end.into(),
            message,
            suggestions: Vec::new(),
        })
    })
}

/// Las palabras del patron, en orden; cada tramo entre `...` seguido.
fn contains_pattern(words: &[String], pattern: &[&str]) -> bool {
    let mut rest = words;
    for segment in pattern.split(|word| *word == "...") {
        if segment.is_empty() {
            continue;
        }
        let found = rest.windows(segment.len()).position(|window| {
            window
                .iter()
                .zip(segment)
                .all(|(word, wanted)| word == wanted)
        });
        match found {
            Some(index) => rest = &rest[index + segment.len()..],
            None => return false,
        }
    }
    true
}

/// Los errores de sintaxis, en este orden: los que la estructura de los
/// tokens dice sin lugar a dudas (`structural_errors`, todos, en su lugar
/// exacto); si no hay, el de una subconsulta, analizada sola; y si no, el que
/// da sqlparser, afinado.
fn syntax_errors(sql: &str, dialect: &dyn SqlparserDialect, error: &str) -> Vec<Diagnostic> {
    let tokens = Tokenizer::new(dialect, sql)
        .tokenize_with_location()
        .unwrap_or_default();
    let significant: Vec<&TokenWithSpan> = tokens
        .iter()
        .filter(|token| !matches!(token.token, Token::Whitespace(_) | Token::EOF))
        .collect();
    let structural = structural_errors(&significant);
    if !structural.is_empty() {
        return structural;
    }
    subquery_errors(sql, dialect, error, &tokens)
        .unwrap_or_else(|| vec![syntax_diagnostic(error, &tokens)])
}

// --- Errores de estructura ---------------------------------------------------
// Solo cuando el parser ya rechazo la sentencia: patrones de tokens que no son
// validos en ningun motor, marcados donde estan. sqlparser, al retroceder,
// suele reportar otro lugar (la primera columna de un SELECT anidado).

fn span_of(token: &TokenWithSpan) -> (Position, Position) {
    (
        Position::from(token.span.start),
        Position::from(token.span.end),
    )
}

fn at_token(token: &TokenWithSpan, message: DiagnosticMessage) -> Diagnostic {
    let (start, end) = span_of(token);
    Diagnostic {
        start,
        end,
        message,
        suggestions: Vec::new(),
    }
}

fn keyword_of(token: &TokenWithSpan) -> Keyword {
    match &token.token {
        Token::Word(word) if word.quote_style.is_none() => word.keyword,
        _ => Keyword::NoKeyword,
    }
}

fn is_value(token: &Token) -> bool {
    matches!(token, Token::Number(..) | Token::SingleQuotedString(_))
}

/// Tras un operador de comparacion, lo que dice que falta el valor.
const AFTER_MISSING_VALUE: [Keyword; 14] = [
    Keyword::AND,
    Keyword::OR,
    Keyword::WHERE,
    Keyword::FROM,
    Keyword::GROUP,
    Keyword::ORDER,
    Keyword::HAVING,
    Keyword::LIMIT,
    Keyword::THEN,
    Keyword::ELSE,
    Keyword::END,
    Keyword::WHEN,
    Keyword::UNION,
    Keyword::JOIN,
];

/// Tras FROM o JOIN, lo que dice que falta la tabla.
const AFTER_MISSING_TABLE: [Keyword; 8] = [
    Keyword::WHERE,
    Keyword::GROUP,
    Keyword::ORDER,
    Keyword::HAVING,
    Keyword::LIMIT,
    Keyword::JOIN,
    Keyword::ON,
    Keyword::USING,
];

/// Los errores de estructura, en el orden en que se leen.
fn structural_errors(tokens: &[&TokenWithSpan]) -> Vec<Diagnostic> {
    let mut found: Vec<Diagnostic> = Vec::new();
    // Una sentencia con cuerpo (CREATE FUNCTION/PROCEDURE/TRIGGER, DO,
    // BEGIN) usa END para otras cosas.
    let has_body = matches!(
        tokens.first().map(|token| keyword_of(token)),
        Some(Keyword::CREATE | Keyword::DO | Keyword::BEGIN | Keyword::DECLARE)
    );

    // Parentesis y CASE ... END, con su pila.
    let mut parens: Vec<&TokenWithSpan> = Vec::new();
    let mut cases: Vec<(&TokenWithSpan, usize)> = Vec::new();
    for token in tokens {
        match token.token {
            Token::LParen => parens.push(token),
            Token::RParen => {
                if parens.pop().is_none() {
                    found.push(at_token(
                        token,
                        DiagnosticMessage::key("diagnostic.unmatchedClose"),
                    ));
                    break;
                }
                // Un CASE abierto dentro del parentesis que se cierra.
                if let Some(&(case, depth)) = cases.last() {
                    if depth > parens.len() && !has_body {
                        found.push(at_token(
                            case,
                            DiagnosticMessage::key("diagnostic.unclosedCase"),
                        ));
                        cases.pop();
                    }
                }
            }
            _ => match keyword_of(token) {
                Keyword::CASE => cases.push((token, parens.len())),
                Keyword::END => {
                    cases.pop();
                }
                _ => {}
            },
        }
    }
    if let Some(open) = parens.last() {
        found.push(at_token(
            open,
            DiagnosticMessage::key("diagnostic.unclosedParen"),
        ));
    }
    if let (Some((case, _)), false) = (cases.last(), has_body) {
        found.push(at_token(
            case,
            DiagnosticMessage::key("diagnostic.unclosedCase"),
        ));
    }

    for (index, token) in tokens.iter().enumerate() {
        let previous = index.checked_sub(1).map(|at| tokens[at]);
        let next = tokens.get(index + 1).copied();

        // Coma de mas: `a,, b`, `(, a`, `a, )` o al final.
        if token.token == Token::Comma {
            let doubled =
                next.is_some_and(|next| matches!(next.token, Token::Comma | Token::RParen));
            let opening = previous.is_some_and(|previous| previous.token == Token::LParen);
            if doubled || opening || next.is_none() {
                let (start, end) = span_of(token);
                found.push(Diagnostic {
                    start,
                    end,
                    message: DiagnosticMessage::key("diagnostic.extraComma"),
                    suggestions: vec![Suggestion {
                        start,
                        end,
                        replacement: String::new(),
                    }],
                });
            }
        }

        // Dos valores seguidos: `IN (1, 2 3)`, `VALUES (1 'a')`. Dos cadenas
        // seguidas si valen (el motor las concatena).
        if let Some(previous) = previous {
            let both_strings = matches!(
                (&previous.token, &token.token),
                (Token::SingleQuotedString(_), Token::SingleQuotedString(_))
            );
            if is_value(&previous.token) && is_value(&token.token) && !both_strings {
                let (_, gap) = span_of(previous);
                let (start, end) = span_of(token);
                found.push(Diagnostic {
                    start,
                    end,
                    message: DiagnosticMessage::key("diagnostic.missingComma")
                        .with("before", previous.token.to_string())
                        .with("after", token.token.to_string()),
                    suggestions: vec![Suggestion {
                        start: gap,
                        end: gap,
                        replacement: ",".to_string(),
                    }],
                });
            }
        }

        // Un operador de comparacion sin valor: `a = AND ...`, `a = )`.
        if matches!(
            token.token,
            Token::Eq | Token::Neq | Token::Lt | Token::Gt | Token::LtEq | Token::GtEq
        ) {
            let missing = match next {
                None => true,
                Some(next) => {
                    matches!(next.token, Token::RParen | Token::Comma)
                        || AFTER_MISSING_VALUE.contains(&keyword_of(next))
                }
            };
            if missing {
                found.push(at_token(
                    token,
                    DiagnosticMessage::key("diagnostic.missingValue")
                        .with("operator", token.token.to_string()),
                ));
            }
        }

        // GROUP u ORDER sin BY (WITHIN GROUP (...) es otra cosa).
        let keyword = keyword_of(token);
        if matches!(keyword, Keyword::GROUP | Keyword::ORDER)
            && next.is_none_or(|next| keyword_of(next) != Keyword::BY)
            && previous.is_none_or(|previous| keyword_of(previous) != Keyword::WITHIN)
        {
            // `ORDER B` al final: se esta escribiendo el BY.
            let typing_by = index + 2 == tokens.len()
                && next.is_some_and(|next| {
                    matches!(&next.token, Token::Word(word) if word.quote_style.is_none()
                        && "BY".starts_with(&word.value.to_uppercase()))
                });
            let message = if typing_by {
                DiagnosticMessage::key("diagnostic.incomplete")
                    .with("after", token_text(&token.token))
            } else {
                DiagnosticMessage::key("diagnostic.missingBy").with("keyword", keyword_text(token))
            };
            found.push(at_token(token, message));
        }

        // FROM o JOIN sin tabla: `FROM WHERE ...`, `JOIN ON ...`.
        if matches!(keyword, Keyword::FROM | Keyword::JOIN)
            && next.is_none_or(|next| AFTER_MISSING_TABLE.contains(&keyword_of(next)))
        {
            found.push(at_token(
                token,
                DiagnosticMessage::key("diagnostic.missingTable")
                    .with("keyword", keyword_text(token)),
            ));
        }
    }

    found.sort_by_key(|diagnostic| diagnostic.start);
    found
}

/// Palabras que no terminan una expresion ni nombran una columna o funcion.
const STRUCTURAL: [Keyword; 26] = [
    Keyword::SELECT,
    Keyword::FROM,
    Keyword::WHERE,
    Keyword::AS,
    Keyword::AND,
    Keyword::OR,
    Keyword::NOT,
    Keyword::ON,
    Keyword::BY,
    Keyword::DISTINCT,
    Keyword::CASE,
    Keyword::WHEN,
    Keyword::THEN,
    Keyword::ELSE,
    Keyword::IN,
    Keyword::IS,
    Keyword::LIKE,
    Keyword::BETWEEN,
    Keyword::JOIN,
    Keyword::SET,
    Keyword::VALUES,
    Keyword::INTO,
    Keyword::HAVING,
    Keyword::GROUP,
    Keyword::ORDER,
    Keyword::EXISTS,
];

/// Un nombre sin comillas que puede ser una columna, tabla o funcion.
fn is_plain_name(token: &TokenWithSpan) -> bool {
    matches!(&token.token, Token::Word(word) if word.quote_style.is_none())
        && !STRUCTURAL.contains(&keyword_of(token))
}

/// Lo que puede cerrar una expresion: un nombre, un valor o un `)`.
fn ends_expression(token: &TokenWithSpan) -> bool {
    match &token.token {
        Token::Word(word) => word.quote_style.is_some() || !STRUCTURAL.contains(&word.keyword),
        Token::RParen => true,
        other => is_value(other),
    }
}

fn keyword_text(token: &TokenWithSpan) -> String {
    token_text(&token.token).to_uppercase()
}

/// Con un error dentro de `IN (SELECT ...)`, sqlparser retrocede, prueba la
/// lista de valores y reporta "falta )" en la primera columna del SELECT,
/// lejos del error real. En ese caso se analiza la subconsulta sola y su
/// error se lleva a su lugar en la sentencia.
fn subquery_errors(
    sql: &str,
    dialect: &dyn SqlparserDialect,
    error: &str,
    tokens: &[TokenWithSpan],
) -> Option<Vec<Diagnostic>> {
    let message = error.strip_prefix("sql parser error: ").unwrap_or(error);
    let at = split_location(message).1?;
    let significant: Vec<&TokenWithSpan> = tokens
        .iter()
        .filter(|token| !matches!(token.token, Token::Whitespace(_) | Token::EOF))
        .collect();
    let index = significant
        .iter()
        .position(|token| Position::from(token.span.start) >= at)?;
    let select = significant[index.checked_sub(1)?];
    let open = index.checked_sub(2)?;
    let is_select = matches!(&select.token, Token::Word(word) if word.keyword == Keyword::SELECT);
    if significant[open].token != Token::LParen || !is_select {
        return None;
    }
    let mut depth = 0usize;
    let close = significant[open..].iter().find(|token| {
        match token.token {
            Token::LParen => depth += 1,
            Token::RParen => depth -= 1,
            _ => {}
        }
        depth == 0
    });
    let start = byte_offset(sql, select.span.start)?;
    let end = match close {
        Some(close) => byte_offset(sql, close.span.start)?,
        None => sql.len(),
    };
    let inner = &sql[start..end];
    let inner_error = Parser::parse_sql(dialect, inner).err()?.to_string();
    let origin: Position = select.span.start.into();
    Some(
        syntax_errors(inner, dialect, &inner_error)
            .into_iter()
            .map(|diagnostic| shifted(diagnostic, origin))
            .collect(),
    )
}

/// Posiciones relativas a un trozo que empieza en `origin`, llevadas a la
/// sentencia entera.
fn shifted(mut diagnostic: Diagnostic, origin: Position) -> Diagnostic {
    let shift = |position: Position| Position {
        line: position.line + origin.line - 1,
        column: if position.line == 1 {
            position.column + origin.column - 1
        } else {
            position.column
        },
    };
    diagnostic.start = shift(diagnostic.start);
    diagnostic.end = shift(diagnostic.end);
    for suggestion in &mut diagnostic.suggestions {
        suggestion.start = shift(suggestion.start);
        suggestion.end = shift(suggestion.end);
    }
    diagnostic
}

/// Linea y columna (1-based, en caracteres, como las del tokenizer) a byte.
fn byte_offset(sql: &str, at: Location) -> Option<usize> {
    let (mut line, mut column) = (1, 1);
    for (offset, character) in sql.char_indices() {
        if line == at.line && column == at.column {
            return Some(offset);
        }
        if character == '\n' {
            line += 1;
            column = 1;
        } else {
            column += 1;
        }
    }
    (line == at.line && column == at.column).then_some(sql.len())
}

/// Las sentencias que el parser conoce, por su primera palabra: un error de
/// tipeo en ella (`SELEC`) se marca; cualquier otra palabra inicial que el
/// parser rechace es una sentencia que no conoce (`DO`, `VACUUM`,
/// `OPTIMIZE`… o la de un motor futuro) y no se marca: mejor no decir nada
/// que marcar algo valido. Si de verdad no existe, el servidor lo dira al
/// ejecutar.
const STATEMENT_STARTERS: [&str; 34] = [
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
    "WITH",
    "VALUES",
    "TABLE",
    "CREATE",
    "ALTER",
    "DROP",
    "TRUNCATE",
    "MERGE",
    "EXPLAIN",
    "DESCRIBE",
    "SHOW",
    "SET",
    "USE",
    "BEGIN",
    "START",
    "COMMIT",
    "ROLLBACK",
    "SAVEPOINT",
    "RELEASE",
    "GRANT",
    "REVOKE",
    "CALL",
    "COPY",
    "PREPARE",
    "EXECUTE",
    "DEALLOCATE",
    "DECLARE",
    "LOCK",
    "UNLOCK",
    "COMMENT",
];

/// El parser rechazo la sentencia en su primera palabra y esa palabra no es un
/// error de tipeo de una sentencia que conoce.
fn unknown_statement(error: &str) -> bool {
    // El mismo texto que interpreta syntax_diagnostic: sin prefijo ni posicion.
    let message = error.strip_prefix("sql parser error: ").unwrap_or(error);
    let (text, _) = split_location(message);
    let Some(("an SQL statement", found)) = expected_found(text) else {
        return false;
    };
    let word = found.trim_matches(|c: char| !c.is_ascii_alphanumeric() && c != '_');
    !word.is_empty()
        && word.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
        && closest_keyword(word, &STATEMENT_STARTERS).is_none()
}

// --- Sintaxis ------------------------------------------------------------

/// Palabras clave que se ofrecen cuando una palabra se les parece.
const KEYWORDS: [&str; 40] = [
    "SELECT", "INSERT", "UPDATE", "DELETE", "FROM", "WHERE", "GROUP", "ORDER", "BY", "HAVING",
    "LIMIT", "OFFSET", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "CROSS", "ON", "USING", "AND",
    "OR", "NOT", "INTO", "VALUES", "SET", "CREATE", "ALTER", "DROP", "TABLE", "WITH", "AS",
    "DISTINCT", "UNION", "BETWEEN", "LIKE", "CASE", "WHEN", "THEN", "ELSE",
];

/// Las que empiezan una clausula: una palabra desconocida justo antes del
/// error que se les parece es casi seguro una de ellas mal escrita (sqlparser
/// la tomo por un alias, como `FROM pedidos WHER ...`).
const CLAUSE_KEYWORDS: [&str; 12] = [
    "WHERE", "GROUP", "ORDER", "HAVING", "LIMIT", "OFFSET", "JOIN", "LEFT", "RIGHT", "INNER",
    "UNION", "ON",
];

/// Palabras tras las que una coma sobra.
const AFTER_LIST_KEYWORDS: [Keyword; 8] = [
    Keyword::FROM,
    Keyword::WHERE,
    Keyword::GROUP,
    Keyword::ORDER,
    Keyword::HAVING,
    Keyword::LIMIT,
    Keyword::UNION,
    Keyword::INTO,
];

fn syntax_diagnostic(message: &str, tokens: &[TokenWithSpan]) -> Diagnostic {
    let message = message
        .strip_prefix("sql parser error: ")
        .unwrap_or(message);
    let (text, location) = split_location(message);
    let significant: Vec<&TokenWithSpan> = tokens
        .iter()
        .filter(|token| !matches!(token.token, Token::Whitespace(_) | Token::EOF))
        .collect();

    // El token del error: el que empieza en esa posicion; sin posicion (se
    // acabo la sentencia), el ultimo.
    let index = match location {
        Some(at) => significant
            .iter()
            .position(|token| Position::from(token.span.start) == at)
            .or_else(|| {
                significant
                    .iter()
                    .position(|token| Position::from(token.span.start) > at)
            }),
        None => None,
    }
    .or_else(|| significant.len().checked_sub(1));
    // A veces la posicion cae en el token siguiente al que se nombra en
    // "found: X": se busca ese hacia atras.
    let index = match (index, expected_found(text)) {
        (Some(index), Some((_, found))) if found != "EOF" => (0..=index)
            .rev()
            .find(|&candidate| {
                token_text(&significant[candidate].token).eq_ignore_ascii_case(found)
            })
            .or(Some(index)),
        (index, _) => index,
    };

    let Some(index) = index else {
        let at = location.unwrap_or(Position { line: 1, column: 1 });
        return Diagnostic {
            start: at,
            end: Position {
                column: at.column + 1,
                ..at
            },
            message: friendly_syntax(text),
            suggestions: Vec::new(),
        };
    };
    let token = significant[index];
    let previous = index.checked_sub(1).map(|position| significant[position]);

    // Coma de mas: `SELECT a, b, FROM t`.
    if let (Token::Word(word), Some(previous)) = (&token.token, previous) {
        if previous.token == Token::Comma && AFTER_LIST_KEYWORDS.contains(&word.keyword) {
            let (start, end) = span_of(previous);
            return Diagnostic {
                start,
                end,
                message: DiagnosticMessage::key("diagnostic.trailingComma")
                    .with("keyword", word.value.to_uppercase()),
                suggestions: vec![Suggestion {
                    start,
                    end,
                    replacement: String::new(),
                }],
            };
        }
    }

    // Un punto al final (`CALL core.`) es un nombre a medio escribir, no una
    // coma que falta.
    if token.token == Token::Period && index + 1 == significant.len() {
        return at_token(
            token,
            DiagnosticMessage::key("diagnostic.incomplete").with("after", "."),
        );
    }

    // Falta una coma entre dos columnas que sqlparser tomo por columna y
    // alias: `SELECT a COUNT(*)` (error en el parentesis) o `a.x b.y` (en
    // el punto). Un alias nunca va seguido de `(` ni de `.`.
    if matches!(token.token, Token::LParen | Token::Period) && index >= 2 {
        let name = significant[index - 1];
        let before = significant[index - 2];
        if is_plain_name(name) && ends_expression(before) {
            let (start, end) = span_of(name);
            // `n.ntcr_esta`, no solo `n`.
            let member = match (
                &token.token,
                significant.get(index + 1).map(|next| &next.token),
            ) {
                (Token::Period, Some(Token::Word(member))) => Some(&member.value),
                _ => None,
            };
            let written = match member {
                Some(member) => format!("{}.{member}", token_text(&name.token)),
                None => token_text(&name.token),
            };
            return Diagnostic {
                start,
                end,
                message: DiagnosticMessage::key("diagnostic.missingCommaBefore")
                    .with("name", written),
                suggestions: vec![Suggestion {
                    start: span_of(before).1,
                    end: span_of(before).1,
                    replacement: ",".to_string(),
                }],
            };
        }
    }

    // Una palabra clave mal escrita: la del error (`SLECT id`) o la anterior,
    // si sqlparser la tomo por un alias (`FROM pedidos WHER estado = 1`).
    if let Token::Word(word) = &token.token {
        if word.quote_style.is_none() {
            if let Some(keyword) = closest_keyword(&word.value, &KEYWORDS) {
                let (start, end) = span_of(token);
                return typo(start, end, &word.value, keyword);
            }
        }
    }
    if let Some(Token::Word(word)) = previous.map(|previous| &previous.token) {
        if word.quote_style.is_none() && word.keyword == Keyword::NoKeyword {
            // Justo despues de `(`, lo que abre una subconsulta: `IN (SELCT`.
            let opens_subquery = index >= 2 && significant[index - 2].token == Token::LParen;
            let candidates: &[&'static str] = if opens_subquery {
                &["SELECT", "WITH"]
            } else {
                &CLAUSE_KEYWORDS
            };
            if let Some(keyword) = closest_keyword(&word.value, candidates) {
                let (start, end) = span_of(previous.expect("hay token anterior"));
                return typo(start, end, &word.value, keyword);
            }
        }
    }

    // Se acabo la sentencia sin terminar: se nombra lo ultimo que hay.
    if location.is_none() && expected_found(text).is_some_and(|(_, found)| found == "EOF") {
        return at_token(
            token,
            DiagnosticMessage::key("diagnostic.incomplete").with("after", token_text(&token.token)),
        );
    }

    let (start, end) = span_of(token);
    Diagnostic {
        start,
        end,
        message: friendly_syntax(text),
        suggestions: Vec::new(),
    }
}

fn typo(start: Position, end: Position, word: &str, keyword: &str) -> Diagnostic {
    Diagnostic {
        start,
        end,
        message: DiagnosticMessage::key("diagnostic.didYouMean")
            .with("word", word)
            .with("suggestion", keyword),
        suggestions: vec![Suggestion {
            start,
            end,
            replacement: keyword.to_string(),
        }],
    }
}

/// "Expected: end of statement, found: x at Line: 1, Column: 8" ->
/// ("Expected: end of statement, found: x", 1:8).
fn split_location(message: &str) -> (&str, Option<Position>) {
    let Some(index) = message.rfind(" at Line: ") else {
        return (message, None);
    };
    let rest = &message[index + " at Line: ".len()..];
    let parsed = rest.split_once(", Column: ").and_then(|(line, column)| {
        Some(Position {
            line: line.trim().parse().ok()?,
            column: column.trim().parse().ok()?,
        })
    });
    match parsed {
        Some(position) => (&message[..index], Some(position)),
        None => (message, None),
    }
}

/// "Expected: X, found: Y" (o "Expected X, found: Y") -> (X, Y).
fn expected_found(text: &str) -> Option<(&str, &str)> {
    let rest = text.strip_prefix("Expected")?;
    let rest = rest.strip_prefix(':').unwrap_or(rest);
    let (expected, found) = rest.rsplit_once(", found: ")?;
    Some((expected.trim(), found.trim()))
}

fn token_text(token: &Token) -> String {
    match token {
        Token::Word(word) => word.value.clone(),
        other => other.to_string(),
    }
}

/// Los mensajes mas comunes de sqlparser, en claves traducibles; el resto
/// queda tal cual.
fn friendly_syntax(text: &str) -> DiagnosticMessage {
    let Some((expected, found)) = expected_found(text) else {
        return unterminated(text).unwrap_or_else(|| DiagnosticMessage::Raw(text.to_string()));
    };
    let key = match expected {
        "an SQL statement" => "diagnostic.expectedStatement",
        "an expression" => "diagnostic.expectedExpression",
        "identifier" => "diagnostic.expectedIdentifier",
        ")" => "diagnostic.expectedClose",
        // Lo que se esperaba se nombra solo si es una palabra clave o un
        // signo (`THEN`, `=`): las frases de sqlparser son en ingles.
        _ if is_simple_token(expected) => {
            return DiagnosticMessage::key("diagnostic.expected")
                .with("expected", expected)
                .with("found", found);
        }
        _ => "diagnostic.unexpected",
    };
    DiagnosticMessage::key(key).with("found", found)
}

fn is_simple_token(text: &str) -> bool {
    let keyword = !text.is_empty() && text.chars().all(|c| c.is_ascii_uppercase() || c == '_');
    let sign =
        !text.is_empty() && text.len() <= 2 && text.chars().all(|c| c.is_ascii_punctuation());
    keyword || sign
}

/// Lo que el tokenizer no pudo cerrar: una cadena, un identificador citado,
/// un bloque $tag$ o un comentario. Mismo texto en todos los motores.
fn unterminated(text: &str) -> Option<DiagnosticMessage> {
    if text.starts_with("Unterminated dollar-quoted") {
        return Some(DiagnosticMessage::key("diagnostic.unterminatedDollarQuote"));
    }
    if text.starts_with("Unterminated") && text.contains("string literal") {
        return Some(DiagnosticMessage::key("diagnostic.unterminatedString"));
    }
    if let Some(rest) = text.strip_prefix("Expected close delimiter '") {
        let quote = rest.split('\'').next().unwrap_or_default();
        return Some(
            DiagnosticMessage::key("diagnostic.unterminatedIdentifier").with("quote", quote),
        );
    }
    if text.starts_with("Unexpected EOF while in a multi-line comment") {
        return Some(DiagnosticMessage::key("diagnostic.unterminatedComment"));
    }
    None
}

// --- Parecidos ------------------------------------------------------------

/// Distancia de edicion con trasposiciones (OSA), sin distinguir mayusculas.
fn distance(a: &str, b: &str) -> usize {
    let a: Vec<char> = a.to_lowercase().chars().collect();
    let b: Vec<char> = b.to_lowercase().chars().collect();
    let mut rows = vec![vec![0usize; b.len() + 1]; a.len() + 1];
    for (i, row) in rows.iter_mut().enumerate() {
        row[0] = i;
    }
    for (j, cell) in rows[0].iter_mut().enumerate() {
        *cell = j;
    }
    for i in 1..=a.len() {
        for j in 1..=b.len() {
            let cost = usize::from(a[i - 1] != b[j - 1]);
            let mut best = (rows[i - 1][j] + 1)
                .min(rows[i][j - 1] + 1)
                .min(rows[i - 1][j - 1] + cost);
            if i > 1 && j > 1 && a[i - 1] == b[j - 2] && a[i - 2] == b[j - 1] {
                best = best.min(rows[i - 2][j - 2] + 1);
            }
            rows[i][j] = best;
        }
    }
    rows[a.len()][b.len()]
}

/// Cuanto puede diferir un nombre para ofrecerlo: 1 en los cortos, 2 en el
/// resto.
fn max_distance(word: &str) -> usize {
    if word.chars().count() <= 4 { 1 } else { 2 }
}

fn closest_keyword(word: &str, keywords: &[&'static str]) -> Option<&'static str> {
    // Una o dos letras son casi siempre un alias o un nombre (`f(a b)`): a
    // esa distancia cualquiera "se parece" a BY, ON, OR o AS.
    if word.chars().count() < 3 {
        return None;
    }
    if keywords
        .iter()
        .any(|keyword| keyword.eq_ignore_ascii_case(word))
    {
        return None;
    }
    keywords
        .iter()
        .map(|keyword| (distance(word, keyword), *keyword))
        .filter(|(found, _)| *found > 0 && *found <= max_distance(word))
        .min_by_key(|(found, _)| *found)
        .map(|(_, keyword)| keyword)
}

/// Hasta tres nombres parecidos, el mas cercano primero.
/// `same_letters`: tambien lo que solo cambia en mayusculas (donde el motor las
/// distingue, `Users` sin comillas no es `"Users"` y esa es la correccion).
fn closest_names<'a>(
    word: &str,
    candidates: impl Iterator<Item = &'a str>,
    same_letters: bool,
) -> Vec<String> {
    let mut found: Vec<(usize, &str)> = candidates
        .map(|candidate| (distance(word, candidate), candidate))
        .filter(|(value, _)| (*value > 0 || same_letters) && *value <= max_distance(word))
        .collect();
    found.sort();
    found.dedup_by(|a, b| a.1.eq_ignore_ascii_case(b.1));
    found
        .into_iter()
        .take(3)
        .map(|(_, name)| name.to_string())
        .collect()
}

// --- Catalogo ------------------------------------------------------------

/// Nombres que parecen columnas pero no lo son (funciones sin parentesis,
/// columnas de sistema).
const PSEUDO_COLUMNS: [&str; 13] = [
    "current_date",
    "current_time",
    "current_timestamp",
    "current_user",
    "current_schema",
    "session_user",
    "localtime",
    "localtimestamp",
    "user",
    "oid",
    "ctid",
    "xmin",
    "rowid",
];

/// De donde salen las columnas de una tabla de la consulta.
#[derive(Clone)]
enum Source<'a> {
    /// Del catalogo.
    Table(&'a CatalogTable),
    /// Las que devuelve una subconsulta del FROM o un CTE (sin `*`).
    Derived(Vec<String>),
    /// Existe, pero no se sabe que columnas tiene: una subconsulta o un CTE
    /// con `*`, una tabla creada en el documento, de un schema no cargado o
    /// del sistema, una funcion (`generate_series`), o una que no existe (ya
    /// marcada). Con una asi en la consulta, una columna sin calificar puede
    /// ser suya: no se marca.
    Opaque,
}

/// Una tabla de la consulta, con el nombre (alias) con que se la nombra, en
/// minusculas. Vacio: una funcion del FROM sin alias.
#[derive(Clone)]
struct Scope<'a> {
    name: String,
    source: Source<'a>,
}

impl Scope<'_> {
    /// Sus columnas, si se saben.
    fn columns(&self) -> Option<Vec<&str>> {
        match &self.source {
            Source::Table(table) => Some(
                table
                    .columns
                    .iter()
                    .map(|column| column.name.as_str())
                    .collect(),
            ),
            Source::Derived(columns) => Some(columns.iter().map(String::as_str).collect()),
            Source::Opaque => None,
        }
    }

    /// Como se la nombra en un mensaje.
    fn display_name(&self) -> &str {
        match &self.source {
            Source::Table(table) => &table.name,
            _ => &self.name,
        }
    }
}

struct Checker<'a, 'b> {
    catalog: &'b CatalogView<'a>,
    dialect: Dialect,
    diagnostics: Vec<Diagnostic>,
    /// Los CTE visibles (`WITH x AS (...)`), con sus columnas si se saben.
    ctes: Vec<(String, Option<Vec<String>>)>,
}

// Cada consulta se revisa con sus tablas mas las de las consultas que la
// contienen (`visible`, las de afuera primero): una subconsulta correlacionada
// nombra columnas de afuera. Cada subconsulta (IN, EXISTS, escalar, del FROM,
// LATERAL, CTE) se revisa en su nivel.
impl<'a> Checker<'a, '_> {
    /// El nombre escrito es el del catalogo, como lo resuelve el motor: donde
    /// lo que no va entre comillas se lee en minusculas (Postgres), `Users`
    /// es `users` y `"Users"` es exacto; en MySQL da igual.
    fn same_name(&self, written: &Ident, catalog_name: &str) -> bool {
        if !self.dialect.folds_unquoted_to_lowercase() {
            return written.value.eq_ignore_ascii_case(catalog_name);
        }
        if written.quote_style.is_some() {
            written.value == catalog_name
        } else {
            written.value.to_lowercase() == catalog_name
        }
    }

    fn statement(&mut self, statement: &Statement) {
        match statement {
            Statement::Query(query) => self.query(query, &[]),
            Statement::Update {
                table,
                from,
                selection,
                ..
            } => {
                // `UPDATE a SET ... FROM c WHERE c.x = a.x` (Postgres): las
                // tablas del FROM tambien son de la consulta.
                let mut tables = vec![table.clone()];
                if let Some(
                    sqlparser::ast::UpdateTableFromKind::BeforeSet(from)
                    | sqlparser::ast::UpdateTableFromKind::AfterSet(from),
                ) = from
                {
                    tables.extend(from.iter().cloned());
                }
                let visible = self.scope_of(&tables, &[]);
                if let Some(selection) = selection {
                    self.expr(selection, &visible, &[]);
                }
            }
            Statement::Delete(delete) => {
                let mut tables = match &delete.from {
                    sqlparser::ast::FromTable::WithFromKeyword(tables)
                    | sqlparser::ast::FromTable::WithoutKeyword(tables) => tables.clone(),
                };
                // `DELETE FROM a USING c WHERE ...` (Postgres).
                tables.extend(delete.using.iter().flatten().cloned());
                let visible = self.scope_of(&tables, &[]);
                if let Some(selection) = &delete.selection {
                    self.expr(selection, &visible, &[]);
                }
            }
            _ => {}
        }
    }

    fn query(&mut self, query: &Query, outer: &[Scope<'a>]) {
        let visible_ctes = self.ctes.len();
        if let Some(with) = &query.with {
            // Los nombres primero: un CTE recursivo se nombra a si mismo, y
            // cada uno ve los anteriores.
            for cte in &with.cte_tables {
                let columns = if cte.alias.columns.is_empty() {
                    output_columns(&cte.query)
                } else {
                    Some(
                        cte.alias
                            .columns
                            .iter()
                            .map(|column| column.name.value.to_lowercase())
                            .collect(),
                    )
                };
                self.ctes
                    .push((cte.alias.name.value.to_lowercase(), columns));
            }
            for cte in &with.cte_tables {
                self.query(&cte.query, outer);
            }
        }
        self.set_expr(&query.body, outer, query.order_by.as_ref());
        self.ctes.truncate(visible_ctes);
    }

    fn set_expr(
        &mut self,
        body: &SetExpr,
        outer: &[Scope<'a>],
        order_by: Option<&sqlparser::ast::OrderBy>,
    ) {
        match body {
            SetExpr::Select(select) => {
                let visible = self.scope_of(&select.from, outer);
                let aliases = select_aliases(select);
                self.select(select, &visible, &aliases);
                if let Some(OrderByKind::Expressions(items)) =
                    order_by.map(|order_by| &order_by.kind)
                {
                    for item in items {
                        self.expr(&item.expr, &visible, &aliases);
                    }
                }
            }
            // El ORDER BY de un UNION nombra las columnas del resultado.
            SetExpr::SetOperation { left, right, .. } => {
                self.set_expr(left, outer, None);
                self.set_expr(right, outer, None);
            }
            SetExpr::Query(inner) => self.query(inner, outer),
            _ => {}
        }
    }

    fn select(&mut self, select: &Select, visible: &[Scope<'a>], aliases: &[String]) {
        for item in &select.projection {
            match item {
                SelectItem::UnnamedExpr(expr) | SelectItem::ExprWithAlias { expr, .. } => {
                    self.expr(expr, visible, &[]);
                }
                _ => {}
            }
        }
        for from in &select.from {
            for join in &from.joins {
                if let Some(JoinConstraint::On(on)) = join_constraint(&join.join_operator) {
                    self.expr(on, visible, &[]);
                }
            }
        }
        if let Some(selection) = &select.selection {
            self.expr(selection, visible, &[]);
        }
        if let GroupByExpr::Expressions(exprs, _) = &select.group_by {
            for expr in exprs {
                self.expr(expr, visible, aliases);
            }
        }
        if let Some(having) = &select.having {
            self.expr(having, visible, aliases);
        }
    }

    /// Las tablas de afuera mas las del FROM de esta consulta.
    fn scope_of(&mut self, from: &[TableWithJoins], outer: &[Scope<'a>]) -> Vec<Scope<'a>> {
        let mut visible = outer.to_vec();
        for item in from {
            self.factor(&item.relation, &mut visible, outer);
            for join in &item.joins {
                self.factor(&join.relation, &mut visible, outer);
            }
        }
        visible
    }

    fn factor(&mut self, factor: &TableFactor, visible: &mut Vec<Scope<'a>>, outer: &[Scope<'a>]) {
        let alias_name = |alias: &Option<sqlparser::ast::TableAlias>| {
            alias.as_ref().map(|alias| alias.name.value.to_lowercase())
        };
        match factor {
            TableFactor::Table {
                name, alias, args, ..
            } => {
                let written = name
                    .0
                    .last()
                    .map(|part| match part {
                        ObjectNamePart::Identifier(ident) => ident.value.to_lowercase(),
                    })
                    .unwrap_or_default();
                let source = if args.is_some() {
                    Source::Opaque
                } else {
                    self.table_source(name)
                };
                visible.push(Scope {
                    name: alias_name(alias).unwrap_or(written),
                    source,
                });
            }
            TableFactor::Derived {
                lateral,
                subquery,
                alias,
            } => {
                // LATERAL ve lo anterior del FROM; si no, solo lo de afuera.
                let sees: Vec<Scope<'a>> = if *lateral {
                    visible.clone()
                } else {
                    outer.to_vec()
                };
                self.query(subquery, &sees);
                let columns = match alias {
                    Some(alias) if !alias.columns.is_empty() => Some(
                        alias
                            .columns
                            .iter()
                            .map(|column| column.name.value.to_lowercase())
                            .collect(),
                    ),
                    _ => output_columns(subquery),
                };
                visible.push(Scope {
                    name: alias_name(alias).unwrap_or_default(),
                    source: columns.map(Source::Derived).unwrap_or(Source::Opaque),
                });
            }
            TableFactor::NestedJoin {
                table_with_joins, ..
            } => {
                self.factor(&table_with_joins.relation, visible, outer);
                for join in &table_with_joins.joins {
                    self.factor(&join.relation, visible, outer);
                }
            }
            // Funciones de tabla, UNNEST, JSON_TABLE...: sus columnas no se
            // saben.
            _ => visible.push(Scope {
                name: String::new(),
                source: Source::Opaque,
            }),
        }
    }

    /// De donde salen las columnas de la tabla nombrada. La que no existe
    /// queda marcada y se sigue como opaca.
    fn table_source(&mut self, name: &ObjectName) -> Source<'a> {
        let parts: Vec<&Ident> = name
            .0
            .iter()
            .map(|part| match part {
                ObjectNamePart::Identifier(ident) => ident,
            })
            .collect();
        let (schema, table) = match parts.as_slice() {
            [table] => (None, *table),
            [.., schema, table] => (Some(schema.value.clone()), *table),
            [] => return Source::Opaque,
        };
        if schema.is_none() {
            let wanted = table.value.to_lowercase();
            if let Some((_, columns)) = self.ctes.iter().rev().find(|(cte, _)| *cte == wanted) {
                return columns
                    .clone()
                    .map(Source::Derived)
                    .unwrap_or(Source::Opaque);
            }
            if self.dialect.is_system_table(&table.value) {
                return Source::Opaque;
            }
        }
        if self
            .catalog
            .created
            .iter()
            .any(|created| self.same_name(table, created))
        {
            return Source::Opaque;
        }
        let schema = schema.unwrap_or_else(|| self.catalog.default_schema.to_string());
        if !self
            .catalog
            .loaded_schemas
            .iter()
            .any(|loaded| loaded.eq_ignore_ascii_case(&schema))
        {
            return Source::Opaque;
        }
        let in_schema = || {
            self.catalog
                .tables
                .iter()
                .filter(|candidate| candidate.schema.eq_ignore_ascii_case(&schema))
        };
        if let Some(found) = in_schema().find(|candidate| self.same_name(table, &candidate.name)) {
            // Sin columnas en el catalogo (una vista que MySQL no pudo
            // describir, sin permisos): existe, pero no se sabe cuales tiene.
            if found.columns.is_empty() {
                return Source::Opaque;
            }
            return Source::Table(found);
        }
        let suggestions = closest_names(
            &table.value,
            in_schema().map(|candidate| candidate.name.as_str()),
            self.dialect.folds_unquoted_to_lowercase(),
        );
        self.push_ident(
            table,
            DiagnosticMessage::key("diagnostic.unknownTable").with("table", &table.value),
            suggestions,
        );
        Source::Opaque
    }

    fn expr(&mut self, expr: &Expr, visible: &[Scope<'a>], aliases: &[String]) {
        match expr {
            Expr::Identifier(ident) => self.column(ident, None, visible, aliases),
            Expr::CompoundIdentifier(parts) if parts.len() == 2 => {
                self.column(&parts[1], Some(&parts[0]), visible, aliases);
            }
            Expr::BinaryOp { left, right, .. }
            | Expr::AnyOp { left, right, .. }
            | Expr::AllOp { left, right, .. }
            | Expr::IsDistinctFrom(left, right)
            | Expr::IsNotDistinctFrom(left, right)
            | Expr::Position {
                expr: left,
                r#in: right,
            }
            | Expr::AtTimeZone {
                timestamp: left,
                time_zone: right,
            } => {
                self.expr(left, visible, aliases);
                self.expr(right, visible, aliases);
            }
            Expr::UnaryOp { expr, .. }
            | Expr::Nested(expr)
            | Expr::IsNull(expr)
            | Expr::IsNotNull(expr)
            | Expr::IsTrue(expr)
            | Expr::IsFalse(expr)
            | Expr::Cast { expr, .. }
            | Expr::Collate { expr, .. }
            | Expr::Extract { expr, .. }
            | Expr::Ceil { expr, .. }
            | Expr::Floor { expr, .. } => self.expr(expr, visible, aliases),
            // Subconsultas: cada una en su nivel, viendo las tablas de esta.
            Expr::Subquery(query)
            | Expr::Exists {
                subquery: query, ..
            } => self.query(query, visible),
            Expr::InSubquery { expr, subquery, .. } => {
                self.expr(expr, visible, aliases);
                self.set_expr(subquery, visible, None);
            }
            Expr::InList { expr, list, .. } => {
                self.expr(expr, visible, aliases);
                for item in list {
                    self.expr(item, visible, aliases);
                }
            }
            Expr::Tuple(items) => {
                for item in items {
                    self.expr(item, visible, aliases);
                }
            }
            Expr::Between {
                expr, low, high, ..
            } => {
                self.expr(expr, visible, aliases);
                self.expr(low, visible, aliases);
                self.expr(high, visible, aliases);
            }
            Expr::Like { expr, pattern, .. } | Expr::ILike { expr, pattern, .. } => {
                self.expr(expr, visible, aliases);
                self.expr(pattern, visible, aliases);
            }
            Expr::Substring {
                expr,
                substring_from,
                substring_for,
                ..
            } => {
                self.expr(expr, visible, aliases);
                for part in [substring_from, substring_for].into_iter().flatten() {
                    self.expr(part, visible, aliases);
                }
            }
            Expr::Trim {
                expr, trim_what, ..
            } => {
                self.expr(expr, visible, aliases);
                if let Some(what) = trim_what {
                    self.expr(what, visible, aliases);
                }
            }
            Expr::Case {
                operand,
                conditions,
                else_result,
            } => {
                if let Some(operand) = operand {
                    self.expr(operand, visible, aliases);
                }
                for when in conditions {
                    self.expr(&when.condition, visible, aliases);
                    self.expr(&when.result, visible, aliases);
                }
                if let Some(else_result) = else_result {
                    self.expr(else_result, visible, aliases);
                }
            }
            Expr::Function(function) => {
                if let FunctionArguments::List(list) = &function.args {
                    for arg in &list.args {
                        let (FunctionArg::Unnamed(FunctionArgExpr::Expr(inner))
                        | FunctionArg::Named {
                            arg: FunctionArgExpr::Expr(inner),
                            ..
                        }) = arg
                        else {
                            continue;
                        };
                        self.expr(inner, visible, aliases);
                    }
                }
                // `f((SELECT ...))`, `COALESCE((SELECT ...), 0)`.
                if let FunctionArguments::Subquery(query) = &function.args {
                    self.query(query, visible);
                }
            }
            // El resto no se revisa.
            _ => {}
        }
    }

    fn column(
        &mut self,
        column: &Ident,
        qualifier: Option<&Ident>,
        visible: &[Scope<'a>],
        aliases: &[String],
    ) {
        let name = column.value.to_lowercase();
        // Una variable (`@total`, `@@sql_mode` en MySQL), no una columna.
        if column.quote_style == Some('\'')
            || name.starts_with('@')
            || PSEUDO_COLUMNS.contains(&name.as_str())
        {
            return;
        }
        let candidates: Vec<&Scope> = match qualifier {
            Some(qualifier) => {
                let wanted = qualifier.value.to_lowercase();
                // La mas cercana: la de adentro tapa a la de afuera.
                let Some(scope) = visible.iter().rev().find(|item| item.name == wanted) else {
                    // Una funcion del FROM sin alias puede llamarse de
                    // cualquier forma: ahi no se sabe.
                    if visible.iter().any(|item| item.name.is_empty()) {
                        return;
                    }
                    let suggestions = closest_names(
                        &qualifier.value,
                        visible.iter().map(|item| item.name.as_str()),
                        false,
                    );
                    self.push_ident(
                        qualifier,
                        DiagnosticMessage::key("diagnostic.unknownQualifier")
                            .with("qualifier", &qualifier.value),
                        suggestions,
                    );
                    return;
                };
                vec![scope]
            }
            None => {
                if aliases.contains(&name) {
                    return;
                }
                visible.iter().collect()
            }
        };
        if candidates.is_empty()
            || candidates
                .iter()
                .any(|item| matches!(item.source, Source::Opaque))
        {
            return;
        }
        let exists = candidates.iter().any(|item| {
            item.columns().is_some_and(|columns| {
                columns
                    .iter()
                    .any(|candidate| self.same_name(column, candidate))
            })
        });
        if exists {
            return;
        }
        let suggestions = closest_names(
            &column.value,
            candidates
                .iter()
                .flat_map(|item| item.columns().unwrap_or_default()),
            self.dialect.folds_unquoted_to_lowercase(),
        );
        let message = match candidates.as_slice() {
            [single] => DiagnosticMessage::key("diagnostic.unknownColumn")
                .with("column", &column.value)
                .with("table", single.display_name()),
            _ => {
                DiagnosticMessage::key("diagnostic.unknownColumnAny").with("column", &column.value)
            }
        };
        self.push_ident(column, message, suggestions);
    }

    fn push_ident(&mut self, ident: &Ident, message: DiagnosticMessage, suggestions: Vec<String>) {
        let start = Position::from(ident.span.start);
        let end = Position::from(ident.span.end);
        if start.line == 0 {
            return;
        }
        // Citado, la correccion tambien va citada igual; sin citar, con
        // comillas solo si el motor las necesita (`"Users"` en Postgres).
        let dialect = self.dialect;
        let quote = |name: &str| match ident.quote_style {
            Some(open) => {
                let close = if open == '[' { ']' } else { open };
                format!("{open}{name}{close}")
            }
            None => crate::editing::quote_ident(dialect, name),
        };
        self.diagnostics.push(Diagnostic {
            start,
            end,
            message,
            suggestions: suggestions
                .iter()
                .map(|name| Suggestion {
                    start,
                    end,
                    replacement: quote(name),
                })
                .collect(),
        });
    }
}

/// Las columnas que devuelve una consulta, si se saben: todas con nombre
/// (alias o columna); con `*` o una expresion sin alias, no.
fn output_columns(query: &Query) -> Option<Vec<String>> {
    let mut body = query.body.as_ref();
    let select = loop {
        match body {
            SetExpr::Select(select) => break select,
            // Un UNION devuelve las columnas de su primer SELECT.
            SetExpr::SetOperation { left, .. } => body = left,
            SetExpr::Query(inner) => body = inner.body.as_ref(),
            _ => return None,
        }
    };
    select
        .projection
        .iter()
        .map(|item| match item {
            SelectItem::ExprWithAlias { alias, .. } => Some(alias.value.to_lowercase()),
            SelectItem::UnnamedExpr(Expr::Identifier(ident)) => Some(ident.value.to_lowercase()),
            SelectItem::UnnamedExpr(Expr::CompoundIdentifier(parts)) => {
                parts.last().map(|part| part.value.to_lowercase())
            }
            _ => None,
        })
        .collect()
}

fn select_aliases(select: &Select) -> Vec<String> {
    select
        .projection
        .iter()
        .filter_map(|item| match item {
            SelectItem::ExprWithAlias { alias, .. } => Some(alias.value.to_lowercase()),
            _ => None,
        })
        .collect()
}

fn join_constraint(operator: &JoinOperator) -> Option<&JoinConstraint> {
    match operator {
        JoinOperator::Join(constraint)
        | JoinOperator::Inner(constraint)
        | JoinOperator::Left(constraint)
        | JoinOperator::LeftOuter(constraint)
        | JoinOperator::Right(constraint)
        | JoinOperator::RightOuter(constraint)
        | JoinOperator::FullOuter(constraint) => Some(constraint),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::catalog::CatalogColumn;

    #[test]
    fn with_no_backslash_escapes_the_analysis_reads_strings_like_the_server() {
        // Con NO_BACKSLASH_ESCAPES, 'C:\' es una cadena completa; con la
        // regla de MySQL, la comilla queda escapada y la cadena sin cerrar.
        let sql = "SELECT 'C:\\' AS ruta";
        assert!(!analyze_statement(sql, Dialect::MySql, None).is_empty());
        assert!(analyze_statement_with(sql, Dialect::MySql, None, true, None).is_empty());
        assert_eq!(
            analyze_statement_with(sql, Dialect::MySql, None, false, None),
            analyze_statement(sql, Dialect::MySql, None)
        );
        // Lo que sigue a la cadena se sigue leyendo, en su sitio.
        let after = "SELECT 'C:\\' AS ruta FROM t WHER x = 1";
        assert_eq!(
            analyze_statement_with(after, Dialect::MySql, None, true, None),
            analyze_statement(
                "SELECT 'C:/' AS ruta FROM t WHER x = 1",
                Dialect::MySql,
                None
            )
        );
        assert!(!analyze_statement_with(after, Dialect::MySql, None, true, None).is_empty());
    }

    fn column(name: &str) -> CatalogColumn {
        CatalogColumn {
            name: name.to_string(),
            data_type: "int".to_string(),
            nullable: true,
            is_primary_key: false,
            comment: None,
        }
    }

    fn tables() -> Vec<CatalogTable> {
        vec![
            CatalogTable {
                schema: "ventas".to_string(),
                name: "usuarios".to_string(),
                columns: vec![column("id"), column("nombre"), column("fecha_nacimiento")],
                foreign_keys: vec![],
            },
            CatalogTable {
                schema: "ventas".to_string(),
                name: "pedidos".to_string(),
                columns: vec![column("id"), column("usuario_id"), column("total")],
                foreign_keys: vec![],
            },
        ]
    }

    fn analyze(sql: &str) -> Vec<Diagnostic> {
        let tables = tables();
        let catalog = CatalogView {
            tables: &tables,
            loaded_schemas: vec!["ventas"],
            default_schema: "ventas",
            created: vec![],
        };
        analyze_statement(sql, Dialect::MySql, Some(&catalog))
    }

    fn key(diagnostic: &Diagnostic) -> &str {
        match &diagnostic.message {
            DiagnosticMessage::Key { key, .. } => key,
            DiagnosticMessage::Raw(text) => text,
        }
    }

    fn at(line: u64, column: u64) -> Position {
        Position { line, column }
    }

    #[test]
    fn a_valid_query_has_nothing() {
        assert!(analyze("SELECT u.id, nombre AS n FROM usuarios u JOIN pedidos p ON p.usuario_id = u.id WHERE total > 1 ORDER BY n").is_empty());
    }

    #[test]
    fn a_misspelled_keyword_at_the_start() {
        let found = analyze("SLECT id FROM usuarios");
        assert_eq!(key(&found[0]), "diagnostic.didYouMean");
        assert_eq!((found[0].start, found[0].end), (at(1, 1), at(1, 6)));
        assert_eq!(found[0].suggestions[0].replacement, "SELECT");
    }

    #[test]
    fn a_misspelled_clause_taken_as_an_alias() {
        let found = analyze("SELECT * FROM pedidos WHER total = 1");
        assert_eq!(key(&found[0]), "diagnostic.didYouMean");
        assert_eq!(found[0].start, at(1, 23));
        assert_eq!(found[0].suggestions[0].replacement, "WHERE");
    }

    #[test]
    fn a_trailing_comma_points_at_the_comma() {
        let found = analyze("SELECT id, nombre, FROM usuarios");
        assert_eq!(key(&found[0]), "diagnostic.trailingComma");
        assert_eq!(found[0].start, at(1, 18));
        assert_eq!(found[0].suggestions[0].replacement, "");
    }

    #[test]
    fn a_missing_comma_between_values() {
        for (sql, start, before, after) in [
            ("SELECT * FROM t WHERE x IN (1, 2 3)", at(1, 34), "2", "3"),
            ("INSERT INTO t (a, b) VALUES (1 'x')", at(1, 32), "1", "'x'"),
            ("SELECT * FROM t WHERE x IN ('a' 2)", at(1, 33), "'a'", "2"),
        ] {
            for dialect in Dialect::ALL {
                let found = analyze_statement(sql, dialect, None);
                assert_eq!(key(&found[0]), "diagnostic.missingComma", "{sql}");
                assert_eq!(found[0].start, start, "{sql}");
                let DiagnosticMessage::Key { params, .. } = &found[0].message else {
                    panic!("{sql}");
                };
                assert_eq!(
                    (params["before"].as_str(), params["after"].as_str()),
                    (before, after)
                );
                // La correccion inserta la coma justo despues del primero.
                let fix = &found[0].suggestions[0];
                assert_eq!(
                    (fix.start, fix.end, fix.replacement.as_str()),
                    (fix.start, fix.start, ",")
                );
            }
        }
        // Dos cadenas seguidas son validas (se concatenan): no es esto.
        assert!(analyze_statement("SELECT 'a' 'b'", Dialect::MySql, None).is_empty());
    }

    #[test]
    fn an_error_inside_an_in_subquery_is_reported_where_it_is() {
        // El caso real: la coma que falta en la linea 4, no "falta )" en la
        // primera columna del SELECT de la linea 1.
        let sql = "SELECT * FROM core.com_clientes WHERE clie_codi IN (SELECT clie_codi FROM core.tec_abonados WHERE abon_codi IN (\n    201152,\n    201170\n    201171\n));";
        for dialect in Dialect::ALL {
            let found = analyze_statement(sql, dialect, None);
            assert_eq!(key(&found[0]), "diagnostic.missingComma");
            assert_eq!((found[0].start, found[0].end), (at(4, 5), at(4, 11)));
            assert_eq!(found[0].suggestions[0].start, at(3, 11));
        }
        // Otro error cualquiera adentro, en la primera linea: la columna se
        // lleva a la de la sentencia.
        let found =
            analyze("SELECT id FROM usuarios WHERE id IN (SELECT id FROM pedidos WHER total > 1)");
        assert_eq!(key(&found[0]), "diagnostic.didYouMean");
        assert_eq!(found[0].start, at(1, 61));
        assert_eq!(found[0].suggestions[0].replacement, "WHERE");
        // Anidada dos veces.
        let found = analyze_statement(
            "SELECT 1 FROM a WHERE x IN (SELECT y FROM b WHERE y IN (SELECT z FROM c WHERE z IN (1 2)))",
            Dialect::MySql,
            None,
        );
        assert_eq!(key(&found[0]), "diagnostic.missingComma");
        assert_eq!(found[0].start, at(1, 87));
    }

    #[test]
    fn one_or_two_letters_are_not_a_misspelled_keyword() {
        let found = analyze_statement("SELECT f(a b) FROM t", Dialect::MySql, None);
        assert_ne!(key(&found[0]), "diagnostic.didYouMean");
        let found = analyze_statement("SELECT * FROM t WHERE a = 1 b = 2", Dialect::MySql, None);
        assert_ne!(key(&found[0]), "diagnostic.didYouMean");
    }

    #[test]
    fn a_view_without_described_columns_flags_none() {
        let mut tables = tables();
        tables.push(CatalogTable {
            schema: "ventas".to_string(),
            name: "vista_rota".to_string(),
            columns: vec![],
            foreign_keys: vec![],
        });
        let catalog = CatalogView {
            tables: &tables,
            loaded_schemas: vec!["ventas"],
            default_schema: "ventas",
            created: vec![],
        };
        let found = analyze_statement(
            "SELECT fecha, usuaNombre FROM vista_rota WHERE fecha = '2026-09-27' ORDER BY usuaNombre",
            Dialect::MySql,
            Some(&catalog),
        );
        assert!(found.is_empty(), "{found:?}");
    }

    #[test]
    fn unknown_names_get_suggestions() {
        let found = analyze("SELECT id, fcha_nacimiento FROM usuarios");
        assert_eq!(key(&found[0]), "diagnostic.unknownColumn");
        assert_eq!(found[0].start, at(1, 12));
        assert_eq!(found[0].suggestions[0].replacement, "fecha_nacimiento");

        let found = analyze("SELECT * FROM usarios");
        assert_eq!(key(&found[0]), "diagnostic.unknownTable");
        assert_eq!(found[0].suggestions[0].replacement, "usuarios");
    }

    #[test]
    fn what_it_cant_know_it_doesnt_flag() {
        // Schema no cargado, CTE, subconsulta y alias en ORDER BY.
        assert!(analyze("SELECT nada FROM otro.tabla").is_empty());
        assert!(analyze("WITH x AS (SELECT 1 AS a) SELECT a FROM x").is_empty());
        assert!(analyze("SELECT z FROM (SELECT id AS z FROM usuarios) t").is_empty());
        assert!(
            analyze("SELECT id FROM usuarios WHERE id IN (SELECT usuario_id FROM pedidos)")
                .is_empty()
        );
        assert!(
            analyze("SELECT COUNT(*) AS n FROM pedidos GROUP BY usuario_id HAVING n > 1")
                .is_empty()
        );
    }

    #[test]
    fn an_unknown_qualifier() {
        let found = analyze("SELECT x.id FROM usuarios u");
        assert_eq!(key(&found[0]), "diagnostic.unknownQualifier");
    }

    #[test]
    fn syntax_without_catalog_still_works() {
        let found = analyze_statement("SELECT (1", Dialect::Postgres, None);
        assert_eq!(key(&found[0]), "diagnostic.unclosedParen");
        assert!(analyze_statement("SELECT nada FROM nadie", Dialect::Postgres, None).is_empty());
    }

    #[test]
    fn distance_counts_transpositions_as_one() {
        assert_eq!(distance("SLECT", "SELECT"), 1);
        assert_eq!(distance("fecha", "fcha"), 1);
        assert_eq!(distance("ab", "ba"), 1);
    }

    #[test]
    fn las_sentencias_propias_que_el_parser_no_entiende_no_se_marcan() {
        for sql in [
            "DO $$ BEGIN RAISE NOTICE 'hola'; END $$",
            "VACUUM ANALYZE users",
            "-- mantenimiento\nREINDEX TABLE users",
        ] {
            assert!(
                analyze_statement(sql, Dialect::Postgres, None).is_empty(),
                "{sql}"
            );
        }
        assert!(analyze_statement("OPTIMIZE TABLE users", Dialect::MySql, None).is_empty());
        // Sin lista que mantener: la sentencia de un motor futuro tampoco se
        // marca.
        assert!(
            analyze_statement("REFRESH MATERIALIZED VIEW ventas", Dialect::Postgres, None)
                .is_empty()
        );
        // Un error de tipeo en la palabra inicial se sigue marcando.
        for typo in [
            "SELEC 1",
            "SLECT 1",
            "UPDTE t SET a = 1",
            "DELET FROM t",
            "INSRT INTO t VALUES (1)",
        ] {
            assert!(
                !analyze_statement(typo, Dialect::Postgres, None).is_empty(),
                "{typo}"
            );
            assert!(
                !analyze_statement(typo, Dialect::MySql, None).is_empty(),
                "{typo}"
            );
        }
    }

    fn analyze_mixed_case(sql: &str, dialect: Dialect) -> Vec<Diagnostic> {
        let tables = vec![CatalogTable {
            schema: "public".to_string(),
            name: "Users".to_string(),
            columns: vec![column("Id"), column("nombre")],
            foreign_keys: vec![],
        }];
        let catalog = CatalogView {
            tables: &tables,
            loaded_schemas: vec!["public"],
            default_schema: "public",
            created: vec![],
        };
        analyze_statement(sql, dialect, Some(&catalog))
    }

    #[test]
    fn postgres_distingue_mayusculas_como_el_servidor() {
        let pg = |sql| analyze_mixed_case(sql, Dialect::Postgres);
        // Sin comillas, Users es users: no existe. La correccion lleva comillas.
        let found = pg("SELECT * FROM Users");
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].suggestions[0].replacement, "\"Users\"");
        assert!(pg("SELECT * FROM \"Users\"").is_empty());
        assert!(pg("SELECT \"Id\", nombre FROM \"Users\"").is_empty());
        let column = pg("SELECT Id FROM \"Users\"");
        assert_eq!(column.len(), 1);
        assert_eq!(column[0].suggestions[0].replacement, "\"Id\"");
    }

    #[test]
    fn mysql_no_distingue_mayusculas() {
        assert!(analyze_mixed_case("SELECT id FROM users", Dialect::MySql).is_empty());
        assert!(analyze_mixed_case("SELECT `Id` FROM `Users`", Dialect::MySql).is_empty());
    }

    #[test]
    fn valid_handlers_assignments_and_select_into_forms_have_no_diagnostics() {
        for dialect in [Dialect::MySql, Dialect::MariaDb] {
            for sql in [
                "CREATE PROCEDURE p() BEGIN DECLARE CONTINUE HANDLER FOR NOT FOUND CLOSE c; END",
                "CREATE PROCEDURE p() BEGIN DECLARE EXIT HANDLER FOR SQLEXCEPTION GET DIAGNOSTICS CONDITION 1 @m = MESSAGE_TEXT; END",
                "CREATE PROCEDURE p() BEGIN DECLARE CONTINUE HANDLER FOR SQLSTATE '23000', NOT FOUND LEAVE lbl; END",
                "CREATE PROCEDURE p() BEGIN DECLARE EXIT HANDLER FOR SQLWARNING SET x = 1; END",
                "CREATE PROCEDURE p() BEGIN DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END; END",
                "CREATE PROCEDURE p() BEGIN SET x := 1; SET @y := x + 1; END",
                "CREATE PROCEDURE p() BEGIN DECLARE x INT4 DEFAULT 0; DECLARE y MIDDLEINT; END",
                "SELECT COUNT(*) FROM inventory WHERE film_id = 1 AND store_id = 2 INTO v_count",
                "SELECT COUNT(*) INTO v_count FROM inventory",
                "SELECT inventory_in_stock(1) INTO @ok",
                "SELECT 1, 2 INTO a, b",
                "SELECT a, b FROM t LIMIT 1 INTO a, b",
                "SELECT a, b FROM t INTO @x, @y",
                "SELECT 1, 2 INTO @x, @y",
            ] {
                let found = analyze_statement(sql, dialect, None);
                assert!(found.is_empty(), "{dialect:?}: {sql}: {found:?}");
            }
        }
        let sql = "CREATE PROCEDURE p() BEGIN DECLARE v TYPE OF t.a; DECLARE r ROW TYPE OF t; END";
        let found = analyze_statement(sql, Dialect::MariaDb, None);
        assert!(found.is_empty(), "{sql}: {found:?}");
    }

    #[test]
    fn select_into_keeps_positions_with_multibyte_characters() {
        let found = analyze_statement(
            "SELECT a, b INTO vñ, w FROM t WHER a = 1",
            Dialect::MySql,
            None,
        );
        assert_eq!(found.first().map(|d| d.start), Some(at(1, 31)), "{found:?}");
        let found = analyze_statement(
            "SELECT '😀', b INTO v, w FROM t WHER a = 1",
            Dialect::MySql,
            None,
        );
        assert_eq!(found.first().map(|d| d.start), Some(at(1, 32)), "{found:?}");
    }

    #[test]
    fn handlers_and_select_into_still_report_real_errors() {
        for (sql, expected) in [
            (
                "CREATE PROCEDURE p() BEGIN DECLARE EXIT HANDLER FOR SQLEXCEPTION; END",
                "diagnostic.incomplete",
            ),
            (
                "SELECT a, b INTO x, y FROM t WHER a = 1",
                "diagnostic.didYouMean",
            ),
            (
                "SELECT a, b FROM t WHERE c = AND d = 1 INTO x, y",
                "diagnostic.missingValue",
            ),
        ] {
            let found = analyze_statement(sql, Dialect::MySql, None);
            assert!(!found.is_empty(), "debia detectar: {sql}");
            assert_eq!(key(&found[0]), expected, "{sql}: {found:?}");
        }
    }

    // A medio escribir, cualquier prefijo: con panic = "abort" en release, un
    // panico del analizador cierra la app.
    #[test]
    fn no_prefix_of_a_routine_panics() {
        let routine = "CREATE PROCEDURE p(IN a INT, OUT b INT)\nBEGIN\n  DECLARE done, other INT DEFAULT FALSE;\n  DECLARE v VARCHAR(10);\n  DECLARE c CONDITION FOR SQLSTATE '45000';\n  DECLARE cur CURSOR FOR SELECT id FROM t WHERE x = a;\n  DECLARE CONTINUE HANDLER FOR NOT FOUND, SQLSTATE VALUE '23000' SET done = TRUE;\n  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; END;\n  OPEN cur;\n  lp: LOOP\n    FETCH cur INTO v;\n    IF done THEN LEAVE lp; ELSEIF v = 'x' THEN ITERATE lp; END IF;\n    WHILE a > 0 DO SET a = a - 1; END WHILE;\n    REPEAT SET a = a + 1; UNTIL a > 3 END REPEAT;\n    CASE v WHEN 'a' THEN SET b = 1; ELSE SET b = 2; END CASE;\n    SELECT COUNT(*) INTO b FROM t;\n  END LOOP lp;\n  CLOSE cur;\nEND";
        let chars: Vec<char> = routine.chars().collect();
        for dialect in [Dialect::MySql, Dialect::MariaDb] {
            for end in 1..=chars.len() {
                let prefix: String = chars[..end].iter().collect();
                let _ = analyze_statement(&prefix, dialect, None);
            }
        }
    }

    #[test]
    fn a_misspelled_verb_or_a_wrong_end_inside_a_routine_is_reported_where_it_is() {
        for dialect in [Dialect::MySql, Dialect::MariaDb] {
            let at_start = |sql: &str, dialect| analyze_statement(sql, dialect, None);
            let found = at_start("CREATE PROCEDURE p() BEGIN\n  SELEC 1;\nEND", dialect);
            assert_eq!(
                found.first().map(|d| (d.start, key(d))),
                Some((at(2, 3), "diagnostic.didYouMean")),
                "{found:?}"
            );
            let found = at_start("CREATE PROCEDURE p() BEGIN\n  SETT @a = 1;\nEND", dialect);
            assert_eq!(
                found.first().map(|d| (d.start, key(d))),
                Some((at(2, 3), "diagnostic.didYouMean")),
                "{found:?}"
            );
            let found = at_start(
                "CREATE PROCEDURE p() BEGIN\n  INSRT INTO t VALUES (1);\nEND",
                dialect,
            );
            assert_eq!(
                found.first().map(key),
                Some("diagnostic.didYouMean"),
                "{found:?}"
            );
            // END donde iba END IF / END WHILE / END LOOP / END REPEAT / END CASE.
            for (body, line) in [
                ("IF 1 THEN\n    SET @a = 1;\n  END;", 4),
                ("WHILE 1 DO\n    SET @a = 1;\n  END;", 4),
                ("lp: LOOP\n    LEAVE lp;\n  END;", 4),
                ("REPEAT\n    SET @a = 1;\n  UNTIL 1 END;", 5),
                ("CASE 1 WHEN 1 THEN\n    SET @a = 1;\n  END;", 4),
                ("IF 1 THEN\n    SET @a = 1;\n  END WHILE;", 4),
            ] {
                let sql = format!("CREATE PROCEDURE p() BEGIN\n  {body}\nEND");
                let found = at_start(&sql, dialect);
                let hit = found.iter().find(|d| key(d) == "diagnostic.expected");
                assert!(
                    hit.is_some_and(|d| d.start.line == line),
                    "{dialect:?}: {sql}\n{found:?}"
                );
            }
        }
    }

    #[test]
    fn valid_routine_structures_are_not_objected_to() {
        for sql in [
            "CREATE PROCEDURE p() BEGIN IF 1 THEN SET @a = 1; ELSEIF 2 THEN SET @a = 2; ELSE SET @a = 3; END IF; END",
            "CREATE PROCEDURE p() BEGIN lp: LOOP LEAVE lp; END LOOP lp; WHILE 0 DO SET @a = 1; END WHILE; REPEAT SET @a = 1; UNTIL @a > 1 END REPEAT; END",
            "CREATE PROCEDURE p() BEGIN CASE @a WHEN 1 THEN SELECT 1; ELSE SELECT 2; END CASE; SELECT CASE WHEN @a THEN 1 END, c.end, c.begin FROM t c; END",
            "CREATE PROCEDURE p() BEGIN DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; END; DECLARE CONTINUE HANDLER FOR NOT FOUND SET @d = 1; SELECT 1 AS begin, 2 AS end; END",
            "CREATE PROCEDURE p() outer_b: BEGIN BEGIN SELECT 1; END; LEAVE outer_b; END outer_b",
        ] {
            for dialect in [Dialect::MySql, Dialect::MariaDb] {
                let found = analyze_statement(sql, dialect, None);
                assert!(found.is_empty(), "{dialect:?}: {sql}\n{found:?}");
            }
        }
    }
}

/// El contrato de los diagnosticos
/// (SQL_ENGINE.es.md): cada caso corre en todos los
/// motores de `Dialect::ALL`. Lo comun se
/// escribe una vez (`Same`) y un motor nuevo ya lo cumple o falla aca; donde
/// un motor difiere, el caso lo dice con un `match` exhaustivo (`PerEngine`):
/// un motor nuevo no compila hasta decidir cada diferencia.
#[cfg(test)]
mod contract {
    use super::*;
    use crate::catalog::CatalogColumn;

    #[derive(Debug, Clone, Copy)]
    enum Expect {
        /// Sin diagnosticos.
        Clean,
        /// El primero, con esta clave y este inicio.
        Error(&'static str, Position),
        /// Algun error de sintaxis (el motor no acepta esto; el mensaje exacto
        /// lo prueba el caso comun que lo produce).
        Rejected,
        /// Todos estos, en orden: una sentencia con varios errores.
        All(&'static [(&'static str, Position)]),
    }
    use Expect::*;

    enum Rule {
        Same(Expect),
        PerEngine(fn(Dialect) -> Expect),
    }
    use Rule::*;

    const fn at(line: u64, column: u64) -> Position {
        Position { line, column }
    }

    fn check(sql: &str, rule: &Rule, analyze: impl Fn(&str, Dialect) -> Vec<Diagnostic>) {
        for dialect in Dialect::ALL {
            let expect = match rule {
                Same(expect) => *expect,
                PerEngine(decide) => decide(dialect),
            };
            let found = analyze(sql, dialect);
            let first = found.first().map(|diagnostic| {
                let key = match &diagnostic.message {
                    DiagnosticMessage::Key { key, .. } => key.as_str(),
                    DiagnosticMessage::Raw(text) => text.as_str(),
                };
                (key, diagnostic.start)
            });
            let all: Vec<(&str, Position)> = found
                .iter()
                .map(|diagnostic| match &diagnostic.message {
                    DiagnosticMessage::Key { key, .. } => (key.as_str(), diagnostic.start),
                    DiagnosticMessage::Raw(text) => (text.as_str(), diagnostic.start),
                })
                .collect();
            let ok = match expect {
                All(expected) => all == expected,
                Clean => first.is_none(),
                Error(key, start) => first == Some((key, start)),
                Rejected => first.is_some_and(|(key, _)| key.starts_with("diagnostic.")),
            };
            assert!(
                ok,
                "{dialect:?}: {sql}\n  esperado {expect:?}\n  obtenido {all:?}"
            );
        }
    }

    /// Sintaxis, sin catalogo.
    fn syntax_cases() -> Vec<(&'static str, Rule)> {
        vec![
            // Lo valido en todos.
            ("SELECT 1", Same(Clean)),
            (
                "SELECT a, b FROM t WHERE x IN (1, 2) ORDER BY a",
                Same(Clean),
            ),
            ("WITH c AS (SELECT 1 AS a) SELECT a FROM c", Same(Clean)),
            ("UPDATE t SET a = 1 WHERE b = 2", Same(Clean)),
            ("DELETE FROM t WHERE id IN (SELECT id FROM u)", Same(Clean)),
            ("INSERT INTO t (a) VALUES (1) RETURNING a", Same(Clean)),
            ("SELECT \"a\" FROM t", Same(Clean)),
            // Dos cadenas seguidas se concatenan: no falta una coma.
            ("SELECT 'a' 'b'", Same(Clean)),
            // Sentencias que el parser no conoce: no se marcan.
            ("VACUUM t", Same(Clean)),
            ("OPTIMIZE TABLE t", Same(Clean)),
            // Los errores comunes, con el mismo mensaje y lugar en todos.
            (
                "SELECT * FROM t WHERE x IN (1, 2 3)",
                Same(Error("diagnostic.missingComma", at(1, 34))),
            ),
            (
                "SELECT * FROM a WHERE x IN (SELECT y FROM b WHERE y IN (\n  1,\n  2\n  3\n))",
                Same(Error("diagnostic.missingComma", at(4, 3))),
            ),
            (
                "SELECT id, nombre, FROM t",
                Same(Error("diagnostic.trailingComma", at(1, 18))),
            ),
            ("SLECT 1", Same(Error("diagnostic.didYouMean", at(1, 1)))),
            (
                "SELECT * FROM t WHER a = 1",
                Same(Error("diagnostic.didYouMean", at(1, 17))),
            ),
            (
                "SELECT (1",
                Same(Error("diagnostic.unclosedParen", at(1, 8))),
            ),
            (
                "SELECT f(a b) FROM t",
                Same(Error("diagnostic.expectedClose", at(1, 12))),
            ),
            (
                "SELECT 'abc",
                Same(Error("diagnostic.unterminatedString", at(1, 8))),
            ),
            // Cada error en su lugar, aunque sqlparser, al retroceder, diga
            // otro.
            (
                "SELECT * FROM t WHERE (a = 1))",
                Same(Error("diagnostic.unmatchedClose", at(1, 30))),
            ),
            (
                "SELECT * FROM a WHERE x IN (\n  SELECT y FROM b WHERE y IN (\n    SELECT z FROM c\n",
                Same(Error("diagnostic.unclosedParen", at(2, 30))),
            ),
            (
                "SELECT COALESCE(a, 'x' FROM t",
                Same(Error("diagnostic.unclosedParen", at(1, 16))),
            ),
            (
                "SELECT * FROM t WHERE x IN (SELCT y FROM u)",
                Same(Error("diagnostic.didYouMean", at(1, 29))),
            ),
            (
                "SELECT * FROM t WHERE a = 1 AND",
                Same(Error("diagnostic.incomplete", at(1, 29))),
            ),
            (
                "SELECT * FROM t WHERE a = AND b = 1",
                Same(Error("diagnostic.missingValue", at(1, 25))),
            ),
            (
                "SELECT a,, b FROM t",
                Same(Error("diagnostic.extraComma", at(1, 9))),
            ),
            (
                "SELECT * FROM t ORDER BY a,",
                Same(Error("diagnostic.extraComma", at(1, 27))),
            ),
            (
                "SELECT CASE WHEN a = 1 THEN 'x' ELSE 'y' FROM t",
                Same(Error("diagnostic.unclosedCase", at(1, 8))),
            ),
            (
                "SELECT a, count(*) FROM t GROUP a",
                Same(Error("diagnostic.missingBy", at(1, 27))),
            ),
            (
                "SELECT * FROM t ORDER a",
                Same(Error("diagnostic.missingBy", at(1, 17))),
            ),
            (
                "SELECT * FROM t ORDER B",
                Same(Error("diagnostic.incomplete", at(1, 17))),
            ),
            (
                "SELECT a COUNT(*) FROM t",
                Same(Error("diagnostic.missingCommaBefore", at(1, 10))),
            ),
            (
                "SELECT x.a x.b FROM t x",
                Same(Error("diagnostic.missingCommaBefore", at(1, 12))),
            ),
            (
                "CALL core.",
                Same(Error("diagnostic.incomplete", at(1, 10))),
            ),
            (
                "SELECT a, core.",
                Same(Error("diagnostic.incomplete", at(1, 15))),
            ),
            (
                "SELECT * FROM t JOIN ON t.a = 1",
                Same(Error("diagnostic.missingTable", at(1, 17))),
            ),
            // Todos los errores, no solo el primero.
            (
                "SELECT * FROM t WHER a IN (SELECT b FROM u WHERE c IN (\n  1,\n  2\n  3,\n  4\n  5\n))",
                Same(All(&[
                    (
                        "diagnostic.didYouMean",
                        Position {
                            line: 1,
                            column: 17,
                        },
                    ),
                    ("diagnostic.missingComma", Position { line: 4, column: 3 }),
                    ("diagnostic.missingComma", Position { line: 6, column: 3 }),
                ])),
            ),
            (
                "SELECT a,, b FROM t WHERE c IN (1 2) ORDER BY a,",
                Same(All(&[
                    ("diagnostic.extraComma", Position { line: 1, column: 9 }),
                    (
                        "diagnostic.missingComma",
                        Position {
                            line: 1,
                            column: 35,
                        },
                    ),
                    (
                        "diagnostic.extraComma",
                        Position {
                            line: 1,
                            column: 48,
                        },
                    ),
                ])),
            ),
            (
                // Un error sin arreglo seguro corta: lo que sigue podria ser
                // consecuencia suya.
                "SELECT * FROM t WHERE (a = 1 AND b IN (1 2)",
                Same(All(&[
                    (
                        "diagnostic.unclosedParen",
                        Position {
                            line: 1,
                            column: 23,
                        },
                    ),
                    (
                        "diagnostic.missingComma",
                        Position {
                            line: 1,
                            column: 42,
                        },
                    ),
                ])),
            ),
            (
                "SELECT 1 /* nota",
                Same(Error("diagnostic.unterminatedComment", at(1, 17))),
            ),
            // Lo que cambia de un motor a otro.
            (
                "SELECT `a` FROM t",
                PerEngine(|dialect| match dialect {
                    Dialect::MySql | Dialect::MariaDb => Clean,
                    Dialect::Postgres => Rejected,
                }),
            ),
            (
                // La barra invertida escapa la comilla en MySQL y MariaDB; en
                // Postgres es un caracter mas y la cadena queda abierta.
                "SELECT 'a\\'b'",
                PerEngine(|dialect| match dialect {
                    Dialect::MySql | Dialect::MariaDb => Clean,
                    Dialect::Postgres => Error("diagnostic.unterminatedString", at(1, 13)),
                }),
            ),
            (
                "SELECT * FROM t LIMIT 1, 2",
                PerEngine(|dialect| match dialect {
                    Dialect::MySql | Dialect::MariaDb => Clean,
                    Dialect::Postgres => Rejected,
                }),
            ),
            (
                "INSERT INTO t () VALUES ()",
                PerEngine(|dialect| match dialect {
                    Dialect::MySql | Dialect::MariaDb => Clean,
                    Dialect::Postgres => Rejected,
                }),
            ),
            (
                "SELECT NEXT VALUE FOR s",
                PerEngine(|dialect| match dialect {
                    Dialect::MariaDb => Clean,
                    Dialect::MySql | Dialect::Postgres => Rejected,
                }),
            ),
            (
                "SELECT * FROM t FOR SYSTEM_TIME AS OF TIMESTAMP '2024-01-01'",
                PerEngine(|dialect| match dialect {
                    Dialect::MariaDb => Clean,
                    Dialect::MySql | Dialect::Postgres => Rejected,
                }),
            ),
            (
                // MySQL 8 no tiene IF NOT EXISTS en ADD COLUMN; MariaDB y
                // Postgres si.
                "ALTER TABLE t ADD COLUMN IF NOT EXISTS b INT",
                PerEngine(|dialect| match dialect {
                    Dialect::MariaDb | Dialect::Postgres => Clean,
                    Dialect::MySql => Rejected,
                }),
            ),
        ]
    }

    #[test]
    fn la_sintaxis_en_cada_motor() {
        for (sql, rule) in syntax_cases() {
            check(sql, &rule, |sql, dialect| {
                analyze_statement(sql, dialect, None)
            });
        }
    }

    fn column(name: &str) -> CatalogColumn {
        CatalogColumn {
            name: name.to_string(),
            data_type: "int".to_string(),
            nullable: true,
            is_primary_key: false,
            comment: None,
        }
    }

    /// Contra un catalogo: `app.usuarios (id, nombre)`, como lo guarda el
    /// motor (en minusculas).
    fn with_catalog(sql: &str, dialect: Dialect) -> Vec<Diagnostic> {
        let tables = vec![CatalogTable {
            schema: "app".to_string(),
            name: "usuarios".to_string(),
            columns: vec![column("id"), column("nombre")],
            foreign_keys: vec![],
        }];
        let catalog = CatalogView {
            tables: &tables,
            loaded_schemas: vec!["app"],
            default_schema: "app",
            created: vec![],
        };
        analyze_statement(sql, dialect, Some(&catalog))
    }

    fn catalog_cases() -> Vec<(&'static str, Rule)> {
        vec![
            ("SELECT id, nombre FROM usuarios", Same(Clean)),
            (
                "SELECT nombr FROM usuarios",
                Same(Error("diagnostic.unknownColumn", at(1, 8))),
            ),
            (
                "SELECT id FROM usuario",
                Same(Error("diagnostic.unknownTable", at(1, 16))),
            ),
            // Sin comillas, las mayusculas dan igual en todos (Postgres las
            // pasa a minusculas, MySQL y MariaDB no distinguen).
            ("SELECT ID FROM USUARIOS", Same(Clean)),
            // En cada nivel: subconsultas, correlaciones, derivadas y CTE.
            (
                "SELECT * FROM usuarios u WHERE u.id IN (SELECT x.id FROM usuarios x WHERE x.nombr = 'a')",
                Same(Error("diagnostic.unknownColumn", at(1, 77))),
            ),
            (
                "SELECT * FROM usuarios u WHERE EXISTS (SELECT 1 FROM usuarios x WHERE x.id = uu.id)",
                Same(Error("diagnostic.unknownQualifier", at(1, 78))),
            ),
            (
                "SELECT * FROM usuarios u WHERE EXISTS (SELECT 1 FROM usuarios x WHERE x.id = u.id AND nombre = 'a')",
                Same(Clean),
            ),
            (
                "SELECT m.nombr FROM (SELECT id, nombre FROM usuarios) m",
                Same(Error("diagnostic.unknownColumn", at(1, 10))),
            ),
            (
                "SELECT m.lo_que_sea FROM (SELECT * FROM usuarios) m",
                Same(Clean),
            ),
            (
                "WITH r (codigo) AS (SELECT id FROM usuarios) SELECT r.codig FROM r",
                Same(Error("diagnostic.unknownColumn", at(1, 55))),
            ),
            (
                "WITH r AS (SELECT * FROM usuarios) SELECT r.x FROM r",
                Same(Clean),
            ),
            (
                // Citado: en Postgres "Id" no es id; en MySQL y MariaDB "Id"
                // es una cadena, no una columna.
                "SELECT \"Id\" FROM usuarios",
                PerEngine(|dialect| match dialect {
                    Dialect::MySql | Dialect::MariaDb => Clean,
                    Dialect::Postgres => Error("diagnostic.unknownColumn", at(1, 8)),
                }),
            ),
        ]
    }

    #[test]
    fn el_catalogo_en_cada_motor() {
        for (sql, rule) in catalog_cases() {
            check(sql, &rule, with_catalog);
        }
    }
}
