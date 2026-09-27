//! Diagnosticos de SQL mientras se escribe (docs/specs/v0.2-diagnosticos.md).
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

use crate::Dialect;
use crate::catalog::CatalogTable;
use serde::Serialize;
use sqlparser::ast::{
    Expr, FunctionArg, FunctionArgExpr, FunctionArguments, GroupByExpr, Ident, JoinConstraint,
    JoinOperator, ObjectName, ObjectNamePart, OrderByKind, Query, Select, SelectItem, SetExpr,
    Statement, TableFactor, TableWithJoins,
};
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
}

pub fn analyze_statement(
    sql: &str,
    dialect: Dialect,
    catalog: Option<&CatalogView>,
) -> Vec<Diagnostic> {
    let sqlparser_dialect = dialect.as_sqlparser_dialect();
    match Parser::parse_sql(&*sqlparser_dialect, sql) {
        Ok(statements) => match catalog {
            Some(catalog) => {
                let mut checker = Checker {
                    catalog,
                    diagnostics: Vec::new(),
                };
                for statement in &statements {
                    checker.statement(statement);
                }
                checker.diagnostics
            }
            None => Vec::new(),
        },
        Err(error) => {
            let tokens = Tokenizer::new(&*sqlparser_dialect, sql)
                .tokenize_with_location()
                .unwrap_or_default();
            vec![syntax_diagnostic(&error.to_string(), &tokens)]
        }
    }
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
            message: DiagnosticMessage::Raw(text.to_string()),
            suggestions: Vec::new(),
        };
    };
    let token = significant[index];
    let previous = index.checked_sub(1).map(|position| significant[position]);
    let span_of = |token: &TokenWithSpan| {
        (
            Position::from(token.span.start),
            Position::from(token.span.end),
        )
    };

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
            if let Some(keyword) = closest_keyword(&word.value, &CLAUSE_KEYWORDS) {
                let (start, end) = span_of(previous.expect("hay token anterior"));
                return typo(start, end, &word.value, keyword);
            }
        }
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
        return DiagnosticMessage::Raw(text.to_string());
    };
    if found == "EOF" {
        return DiagnosticMessage::key("diagnostic.unexpectedEnd").with("expected", expected);
    }
    let key = match expected {
        "end of statement" => "diagnostic.expectedEnd",
        "an SQL statement" => "diagnostic.expectedStatement",
        "an expression" => "diagnostic.expectedExpression",
        "identifier" => "diagnostic.expectedIdentifier",
        ")" => "diagnostic.expectedClose",
        _ => {
            return DiagnosticMessage::key("diagnostic.expected")
                .with("expected", expected)
                .with("found", found);
        }
    };
    DiagnosticMessage::key(key).with("found", found)
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
fn closest_names<'a>(word: &str, candidates: impl Iterator<Item = &'a str>) -> Vec<String> {
    let mut found: Vec<(usize, &str)> = candidates
        .map(|candidate| (distance(word, candidate), candidate))
        .filter(|(value, _)| *value > 0 && *value <= max_distance(word))
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

struct Scope<'a> {
    /// Alias (o nombre) con que se nombra en la consulta, en minusculas.
    name: String,
    table: &'a CatalogTable,
}

struct Checker<'a, 'b> {
    catalog: &'b CatalogView<'a>,
    diagnostics: Vec<Diagnostic>,
}

impl<'a> Checker<'a, '_> {
    fn statement(&mut self, statement: &Statement) {
        match statement {
            Statement::Query(query) => self.query(query),
            Statement::Update {
                table, selection, ..
            } => {
                if let Some(scope) = self.scope_of(std::slice::from_ref(table)) {
                    if let Some(selection) = selection {
                        self.expr(selection, &scope, &[]);
                    }
                }
            }
            Statement::Delete(delete) => {
                let tables = match &delete.from {
                    sqlparser::ast::FromTable::WithFromKeyword(tables)
                    | sqlparser::ast::FromTable::WithoutKeyword(tables) => tables,
                };
                if let Some(scope) = self.scope_of(tables) {
                    if let Some(selection) = &delete.selection {
                        self.expr(selection, &scope, &[]);
                    }
                }
            }
            _ => {}
        }
    }

    fn query(&mut self, query: &Query) {
        // Con CTE, los nombres de la consulta pueden ser del WITH: no se
        // revisa nada (no se sabe que columnas tienen).
        if query.with.is_some() {
            return;
        }
        match query.body.as_ref() {
            SetExpr::Select(select) => {
                let Some(scope) = self.scope_of(&select.from) else {
                    return;
                };
                let aliases = select_aliases(select);
                self.select(select, &scope, &aliases);
                if let Some(OrderByKind::Expressions(items)) =
                    query.order_by.as_ref().map(|order_by| &order_by.kind)
                {
                    for item in items {
                        self.expr(&item.expr, &scope, &aliases);
                    }
                }
            }
            SetExpr::SetOperation { left, right, .. } => {
                for side in [left, right] {
                    if let SetExpr::Select(select) = side.as_ref() {
                        if let Some(scope) = self.scope_of(&select.from) {
                            let aliases = select_aliases(select);
                            self.select(select, &scope, &aliases);
                        }
                    }
                }
            }
            SetExpr::Query(inner) => self.query(inner),
            _ => {}
        }
    }

    fn select(&mut self, select: &Select, scope: &[Scope<'a>], aliases: &[String]) {
        for item in &select.projection {
            match item {
                SelectItem::UnnamedExpr(expr) | SelectItem::ExprWithAlias { expr, .. } => {
                    self.expr(expr, scope, &[]);
                }
                _ => {}
            }
        }
        for from in &select.from {
            for join in &from.joins {
                if let Some(JoinConstraint::On(on)) = join_constraint(&join.join_operator) {
                    self.expr(on, scope, &[]);
                }
            }
        }
        if let Some(selection) = &select.selection {
            self.expr(selection, scope, &[]);
        }
        if let GroupByExpr::Expressions(exprs, _) = &select.group_by {
            for expr in exprs {
                self.expr(expr, scope, aliases);
            }
        }
        if let Some(having) = &select.having {
            self.expr(having, scope, aliases);
        }
    }

    /// Las tablas del FROM. None si alguna no se puede resolver con
    /// seguridad: entonces no se revisan columnas (pero si se avisa de las
    /// tablas que no existen).
    fn scope_of(&mut self, from: &[TableWithJoins]) -> Option<Vec<Scope<'a>>> {
        let mut scope = Vec::new();
        let mut complete = true;
        let factors = from.iter().flat_map(|item| {
            std::iter::once(&item.relation).chain(item.joins.iter().map(|join| &join.relation))
        });
        for factor in factors {
            match factor {
                TableFactor::Table {
                    name,
                    alias,
                    args: None,
                    ..
                } => match self.table(name) {
                    Some(table) => {
                        let name = alias
                            .as_ref()
                            .map(|alias| alias.name.value.to_lowercase())
                            .unwrap_or_else(|| table.name.to_lowercase());
                        scope.push(Scope { name, table });
                    }
                    None => complete = false,
                },
                TableFactor::Derived {
                    lateral: false,
                    subquery,
                    ..
                } => {
                    // Su propio alcance; sus columnas no se conocen aca.
                    self.query(subquery);
                    complete = false;
                }
                _ => complete = false,
            }
        }
        complete.then_some(scope)
    }

    /// La tabla del catalogo, o None si no se sabe (schema no cargado) o no
    /// existe (y entonces queda el diagnostico).
    fn table(&mut self, name: &ObjectName) -> Option<&'a CatalogTable> {
        let parts: Vec<&Ident> = name
            .0
            .iter()
            .map(|part| match part {
                ObjectNamePart::Identifier(ident) => ident,
            })
            .collect();
        let (schema, table) = match parts.as_slice() {
            [table] => (self.catalog.default_schema.to_string(), *table),
            [.., schema, table] => (schema.value.clone(), *table),
            [] => return None,
        };
        if !self
            .catalog
            .loaded_schemas
            .iter()
            .any(|loaded| loaded.eq_ignore_ascii_case(&schema))
        {
            return None;
        }
        let in_schema = || {
            self.catalog
                .tables
                .iter()
                .filter(|candidate| candidate.schema.eq_ignore_ascii_case(&schema))
        };
        if let Some(found) =
            in_schema().find(|candidate| candidate.name.eq_ignore_ascii_case(&table.value))
        {
            return Some(found);
        }
        let suggestions = closest_names(
            &table.value,
            in_schema().map(|candidate| candidate.name.as_str()),
        );
        self.push_ident(
            table,
            DiagnosticMessage::key("diagnostic.unknownTable").with("table", &table.value),
            suggestions,
        );
        None
    }

    fn expr(&mut self, expr: &Expr, scope: &[Scope<'a>], aliases: &[String]) {
        match expr {
            Expr::Identifier(ident) => self.column(ident, None, scope, aliases),
            Expr::CompoundIdentifier(parts) if parts.len() == 2 => {
                self.column(&parts[1], Some(&parts[0]), scope, aliases);
            }
            Expr::BinaryOp { left, right, .. } => {
                self.expr(left, scope, aliases);
                self.expr(right, scope, aliases);
            }
            Expr::UnaryOp { expr, .. }
            | Expr::Nested(expr)
            | Expr::IsNull(expr)
            | Expr::IsNotNull(expr)
            | Expr::IsTrue(expr)
            | Expr::IsFalse(expr)
            | Expr::Cast { expr, .. } => self.expr(expr, scope, aliases),
            Expr::InList { expr, list, .. } => {
                self.expr(expr, scope, aliases);
                for item in list {
                    self.expr(item, scope, aliases);
                }
            }
            Expr::Between {
                expr, low, high, ..
            } => {
                self.expr(expr, scope, aliases);
                self.expr(low, scope, aliases);
                self.expr(high, scope, aliases);
            }
            Expr::Like { expr, pattern, .. } | Expr::ILike { expr, pattern, .. } => {
                self.expr(expr, scope, aliases);
                self.expr(pattern, scope, aliases);
            }
            Expr::Case {
                operand,
                conditions,
                else_result,
            } => {
                if let Some(operand) = operand {
                    self.expr(operand, scope, aliases);
                }
                for when in conditions {
                    self.expr(&when.condition, scope, aliases);
                    self.expr(&when.result, scope, aliases);
                }
                if let Some(else_result) = else_result {
                    self.expr(else_result, scope, aliases);
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
                        self.expr(inner, scope, aliases);
                    }
                }
            }
            // Subconsultas y el resto: no se revisan (pueden nombrar
            // columnas de otro alcance).
            _ => {}
        }
    }

    fn column(
        &mut self,
        column: &Ident,
        qualifier: Option<&Ident>,
        scope: &[Scope<'a>],
        aliases: &[String],
    ) {
        let name = column.value.to_lowercase();
        if column.quote_style == Some('\'') || PSEUDO_COLUMNS.contains(&name.as_str()) {
            return;
        }
        let tables: Vec<&Scope> = match qualifier {
            Some(qualifier) => {
                let wanted = qualifier.value.to_lowercase();
                let matching: Vec<&Scope> =
                    scope.iter().filter(|item| item.name == wanted).collect();
                if matching.is_empty() {
                    // `x.col` con un x que no es tabla ni alias de la consulta.
                    let suggestions = closest_names(
                        &qualifier.value,
                        scope.iter().map(|item| item.name.as_str()),
                    );
                    self.push_ident(
                        qualifier,
                        DiagnosticMessage::key("diagnostic.unknownQualifier")
                            .with("qualifier", &qualifier.value),
                        suggestions,
                    );
                    return;
                }
                matching
            }
            None => {
                if aliases.contains(&name) {
                    return;
                }
                scope.iter().collect()
            }
        };
        if tables.is_empty() {
            return;
        }
        let exists = tables.iter().any(|item| {
            item.table
                .columns
                .iter()
                .any(|candidate| candidate.name.eq_ignore_ascii_case(&column.value))
        });
        if exists {
            return;
        }
        let suggestions = closest_names(
            &column.value,
            tables.iter().flat_map(|item| {
                item.table
                    .columns
                    .iter()
                    .map(|candidate| candidate.name.as_str())
            }),
        );
        let message = match tables.as_slice() {
            [single] => DiagnosticMessage::key("diagnostic.unknownColumn")
                .with("column", &column.value)
                .with("table", &single.table.name),
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
        // Citado, la correccion tambien va citada igual.
        let quote = |name: &str| match ident.quote_style {
            Some(open) => {
                let close = if open == '[' { ']' } else { open };
                format!("{open}{name}{close}")
            }
            None => name.to_string(),
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
        assert_eq!(key(&found[0]), "diagnostic.unexpectedEnd");
        assert!(analyze_statement("SELECT nada FROM nadie", Dialect::Postgres, None).is_empty());
    }

    #[test]
    fn distance_counts_transpositions_as_one() {
        assert_eq!(distance("SLECT", "SELECT"), 1);
        assert_eq!(distance("fecha", "fcha"), 1);
        assert_eq!(distance("ab", "ba"), 1);
    }
}
