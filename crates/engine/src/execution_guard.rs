//! Clasifica una sentencia SQL para pedir confirmacion antes de ejecutarla.
//! En produccion, cada escritura tambien necesita confirmacion. Usa el AST
//! general y valida las definiciones de rutinas con tokens del motor.

use crate::Dialect;
use crate::pagination::query_is_read_only;
use serde::{Deserialize, Serialize};
use sqlparser::ast::{AlterTableOperation, ObjectType, Query, SetExpr, Statement};
use sqlparser::parser::{Parser, ParserError};
use sqlparser::tokenizer::{Token, Tokenizer};
use std::borrow::Cow;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DestructiveStatement {
    DeleteWithoutWhere,
    UpdateWithoutWhere,
    Truncate,
    DropTable,
    DropSchema,
    DropDatabase,
    DropColumn,
    /// Any statement that isn't read-only, on a connection marked as
    /// production. Only produced by `classify_sql` with `production: true`.
    WriteInProduction,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DestructiveClassification {
    NotDestructive,
    RequiresConfirmation(DestructiveStatement),
}

/// Valida y clasifica una sola sentencia. Un error impide ejecutarla.
pub fn classify_destructive_sql(
    sql: &str,
    dialect: Dialect,
) -> Result<DestructiveClassification, ParserError> {
    classify_sql(sql, dialect, false)
}

/// Like `classify_destructive_sql`, but with `production: true` a statement
/// that is not destructive still requires confirmation as
/// `WriteInProduction` unless it only reads. Destructive statements keep
/// their own, more specific classification.
pub fn classify_sql(
    sql: &str,
    dialect: Dialect,
    production: bool,
) -> Result<DestructiveClassification, ParserError> {
    let expanded = expand_executable_comments(sql, dialect)?;
    match classify_text(&expanded, dialect, production) {
        // sqlparser no conoce todo lo que MySQL acepta dentro de un comentario
        // ejecutable (/*!40001 SQL_NO_CACHE */): se vuelve al texto original si
        // es la misma clase de sentencia y no hay otro `;` que separe una nueva.
        Err(_)
            if matches!(expanded, Cow::Owned(_))
                && same_single_statement(sql, &expanded, dialect) =>
        {
            classify_text(sql, dialect, production)
        }
        result => result,
    }
}

fn same_single_statement(original: &str, expanded: &str, dialect: Dialect) -> bool {
    let words = |sql: &str| {
        Tokenizer::new(&*dialect.as_sqlparser_dialect(), sql)
            .tokenize()
            .ok()
            .map(|tokens| {
                tokens
                    .into_iter()
                    .filter(|token| !matches!(token, Token::Whitespace(_) | Token::EOF))
                    .collect::<Vec<Token>>()
            })
    };
    let (Some(original), Some(expanded)) = (words(original), words(expanded)) else {
        return false;
    };
    let single = !expanded
        .iter()
        .take(expanded.len().saturating_sub(1))
        .any(|token| *token == Token::SemiColon);
    single && original.first().map(token_word) == expanded.first().map(token_word)
}

fn classify_text(
    sql: &str,
    dialect: Dialect,
    production: bool,
) -> Result<DestructiveClassification, ParserError> {
    if let Some(result) = classify_routine(sql, dialect, production) {
        return result;
    }
    let statements = Parser::parse_sql(&*dialect.as_sqlparser_dialect(), sql)?;
    let [statement] = statements.as_slice() else {
        return Err(ParserError::ParserError(
            "expected exactly one SQL statement".to_string(),
        ));
    };
    Ok(match classify_statement(statement) {
        DestructiveClassification::NotDestructive
            if production && !statement_is_read_only(statement) =>
        {
            DestructiveClassification::RequiresConfirmation(DestructiveStatement::WriteInProduction)
        }
        classification => classification,
    })
}

// El parser general no entiende todos los cuerpos de rutina de los motores.
// Solo esta ruta valida el texto completo antes de entregarlo al driver.
fn classify_routine(
    sql: &str,
    dialect: Dialect,
    production: bool,
) -> Option<Result<DestructiveClassification, ParserError>> {
    let tokens = Tokenizer::new(&*dialect.as_sqlparser_dialect(), sql)
        .tokenize()
        .ok()?;
    let tokens: Vec<Token> = tokens
        .into_iter()
        .filter(|token| !matches!(token, Token::Whitespace(_) | Token::EOF))
        .collect();
    let word = |index: usize| -> String {
        match tokens.get(index) {
            Some(Token::Word(value)) if value.quote_style.is_none() => {
                value.value.to_ascii_uppercase()
            }
            _ => String::new(),
        }
    };
    if word(0) != "CREATE" {
        return None;
    }
    let mut at = 1;
    if word(at) == "OR" && word(at + 1) == "REPLACE" {
        at += 2;
    }
    if word(at) == "DEFINER" {
        at += 1;
        if tokens.get(at) == Some(&Token::Eq) {
            at += 1;
        }
        while at < tokens.len()
            && !matches!(
                word(at).as_str(),
                "PROCEDURE" | "FUNCTION" | "TRIGGER" | "EVENT"
            )
        {
            if matches!(tokens[at], Token::SemiColon) || at > 12 {
                return Some(Err(routine_error("invalid routine definition")));
            }
            at += 1;
        }
    }
    let kind = word(at);
    let allowed = match dialect {
        Dialect::Postgres => matches!(kind.as_str(), "PROCEDURE" | "FUNCTION" | "TRIGGER" | "RULE"),
        Dialect::MySql | Dialect::MariaDb => matches!(
            kind.as_str(),
            "PROCEDURE" | "FUNCTION" | "TRIGGER" | "EVENT"
        ),
    };
    if !allowed {
        return None;
    }
    if matches!(dialect, Dialect::Postgres) && matches!(kind.as_str(), "TRIGGER" | "RULE") {
        let result =
            Parser::parse_sql(&*dialect.as_sqlparser_dialect(), sql).and_then(|statements| {
                if statements.len() == 1 {
                    Ok(())
                } else {
                    Err(routine_error("expected exactly one SQL statement"))
                }
            });
        return Some(result.map(|()| {
            if production {
                DestructiveClassification::RequiresConfirmation(
                    DestructiveStatement::WriteInProduction,
                )
            } else {
                DestructiveClassification::NotDestructive
            }
        }));
    }
    Some(validate_routine(&tokens, at, &kind, dialect).map(|()| {
        if production {
            DestructiveClassification::RequiresConfirmation(DestructiveStatement::WriteInProduction)
        } else {
            DestructiveClassification::NotDestructive
        }
    }))
}

// MySQL y MariaDB ejecutan el contenido de /*! ... */ (y /*M! ... */ en
// MariaDB) como SQL; el tokenizer lo toma por un comentario. Se clasifica el
// texto con ese contenido a la vista; al servidor se envia el original. La
// version se ignora: no se conoce la del servidor, asi que cuenta como
// ejecutable.
fn expand_executable_comments(sql: &str, dialect: Dialect) -> Result<Cow<'_, str>, ParserError> {
    if dialect == Dialect::Postgres || !sql.contains("/*") {
        return Ok(Cow::Borrowed(sql));
    }
    let bytes = sql.as_bytes();
    let mut out = String::with_capacity(sql.len());
    let mut copied = 0;
    let mut index = 0;
    let mut expanded = false;
    while index < bytes.len() {
        match bytes[index] {
            quote @ (b'\'' | b'"' | b'`') => {
                index += 1;
                while index < bytes.len() {
                    if bytes[index] == b'\\' && quote != b'`' {
                        index += 2;
                    } else if bytes[index] == quote {
                        index += 1;
                        if bytes.get(index) != Some(&quote) {
                            break;
                        }
                        index += 1;
                    } else {
                        index += 1;
                    }
                }
            }
            b'#' => index = line_end(bytes, index),
            b'-' if bytes.get(index + 1) == Some(&b'-')
                && bytes.get(index + 2).is_none_or(|b| b.is_ascii_whitespace()) =>
            {
                index = line_end(bytes, index);
            }
            b'/' if bytes.get(index + 1) == Some(&b'*') => {
                let marker = match (bytes.get(index + 2), bytes.get(index + 3)) {
                    (Some(b'!'), _) => Some(3),
                    (Some(b'M'), Some(b'!')) if dialect == Dialect::MariaDb => Some(4),
                    _ => None,
                };
                let close = sql[index + 2..].find("*/").map(|at| at + index + 2);
                match (marker, close) {
                    (Some(skip), Some(close)) => {
                        let mut from = index + skip;
                        while bytes.get(from).is_some_and(u8::is_ascii_digit) {
                            from += 1;
                        }
                        out.push_str(&sql[copied..index]);
                        out.push(' ');
                        out.push_str(&sql[from.min(close)..close]);
                        out.push(' ');
                        copied = close + 2;
                        index = close + 2;
                        expanded = true;
                    }
                    (Some(_), None) => {
                        return Err(routine_error("unterminated executable comment"));
                    }
                    (None, Some(close)) => index = close + 2,
                    (None, None) => index = bytes.len(),
                }
            }
            _ => index += 1,
        }
    }
    if !expanded {
        return Ok(Cow::Borrowed(sql));
    }
    out.push_str(&sql[copied.min(sql.len())..]);
    Ok(Cow::Owned(out))
}

fn line_end(bytes: &[u8], from: usize) -> usize {
    bytes[from..]
        .iter()
        .position(|byte| *byte == b'\n')
        .map_or(bytes.len(), |at| from + at)
}

fn routine_error(message: &str) -> ParserError {
    ParserError::ParserError(message.to_string())
}

fn token_word(token: &Token) -> String {
    match token {
        Token::Word(value) if value.quote_style.is_none() => value.value.to_ascii_uppercase(),
        _ => String::new(),
    }
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

fn validate_routine(
    tokens: &[Token],
    kind_at: usize,
    kind: &str,
    dialect: Dialect,
) -> Result<(), ParserError> {
    let invalid = || routine_error("invalid routine definition");
    if !matches!(tokens.get(kind_at + 1), Some(Token::Word(_)))
        || matches!(
            token_word(&tokens[kind_at + 1]).as_str(),
            "BEGIN" | "END" | "SELECT"
        )
        || tokens.iter().any(|token| token_word(token) == "DELIMITER")
    {
        return Err(invalid());
    }
    if dialect == Dialect::Postgres {
        return validate_postgres_body(tokens, kind_at + 1);
    }
    let mut parens = 0usize;
    let mut body = None;
    for (index, token) in tokens.iter().enumerate().skip(kind_at + 1) {
        match token {
            Token::LParen => parens += 1,
            Token::RParen => {
                if parens == 0 {
                    return Err(invalid());
                }
                parens -= 1;
            }
            _ => {}
        }
        if parens != 0 {
            continue;
        }
        let word = token_word(token);
        if kind == "TRIGGER"
            && !tokens[kind_at + 1..index]
                .iter()
                .any(|token| token_word(token) == "ROW")
        {
            continue;
        }
        if word == "DO" && kind == "EVENT" {
            body = Some(index + 1);
            break;
        }
        if matches!(
            word.as_str(),
            "BEGIN" | "RETURN" | "SET" | "INSERT" | "UPDATE" | "DELETE" | "SELECT" | "CALL"
        ) {
            body = Some(index);
            break;
        }
    }
    let Some(body) = body.filter(|_| parens == 0) else {
        return Err(invalid());
    };
    if tokens[kind_at + 1..body].contains(&Token::SemiColon) {
        return Err(routine_error("expected exactly one SQL statement"));
    }
    let labeled =
        body >= 2 && tokens[body - 1] == Token::Colon && matches!(tokens[body - 2], Token::Word(_));
    validate_mysql_body(tokens, if labeled { body - 2 } else { body })
}

// BEGIN y END solo abren y cierran un bloque al inicio de una sentencia: en
// MySQL `begin` y `end` pueden ser alias o columnas, y un CASE de expresion
// tambien cierra con END. Cualquier duda rechaza la definicion.
fn validate_mysql_body(tokens: &[Token], first: usize) -> Result<(), ParserError> {
    let invalid = || routine_error("invalid routine definition");
    let mut stack: Vec<(Open, Option<String>)> = Vec::new();
    let mut start = true;
    let mut label: Option<String> = None;
    let mut declaring = false;
    let mut index = first;
    while index < tokens.len() {
        let token = &tokens[index];
        let word = token_word(token);
        if start && !word.is_empty() && tokens.get(index + 1) == Some(&Token::Colon) {
            label = Some(word);
            index += 2;
            continue;
        }
        if *token == Token::SemiColon {
            if stack.is_empty() {
                return trailing_terminator(&tokens[index..]);
            }
            start = true;
            declaring = false;
            index += 1;
            continue;
        }
        let top = stack.last().map(|entry| entry.0);
        match word.as_str() {
            "BEGIN" if start => {
                stack.push((Open::Block, label.take()));
            }
            "IF" if start => {
                stack.push((Open::If, label.take()));
                start = false;
            }
            "CASE" => {
                let open = if start { Open::Case } else { Open::CaseExpr };
                stack.push((open, label.take()));
                start = false;
            }
            "WHILE" if start => {
                stack.push((Open::While, label.take()));
                start = false;
            }
            "LOOP" if start => stack.push((Open::Loop, label.take())),
            "REPEAT" if start => stack.push((Open::Repeat, label.take())),
            "THEN" | "ELSE" => start = matches!(top, Some(Open::If | Open::Case)),
            "DO" if top == Some(Open::While) => start = true,
            "UNTIL" if top == Some(Open::Repeat) => start = false,
            "DECLARE" if start => {
                declaring = true;
                start = false;
            }
            "HANDLER" if declaring => {
                index = after_handler_conditions(tokens, index + 1).ok_or_else(invalid)?;
                start = true;
                declaring = false;
                continue;
            }
            "END" => {
                let closes = match tokens.get(index + 1).map(token_word).as_deref() {
                    Some("IF") => Some(Open::If),
                    Some("WHILE") => Some(Open::While),
                    Some("LOOP") => Some(Open::Loop),
                    Some("REPEAT") => Some(Open::Repeat),
                    Some("CASE") => Some(Open::Case),
                    _ => None,
                };
                let entry = if top == Some(Open::CaseExpr) {
                    stack.pop()
                } else if closes.is_some() && closes == top {
                    index += 1;
                    stack.pop()
                } else if start && top == Some(Open::Block) {
                    stack.pop()
                } else if start || stack.is_empty() {
                    return Err(invalid());
                } else {
                    None
                };
                if let Some((open, name)) = entry {
                    if stack.is_empty() && open != Open::CaseExpr {
                        let mut rest = &tokens[index + 1..];
                        if name.is_some() && rest.first().map(token_word) == name {
                            rest = &rest[1..];
                        }
                        return trailing_terminator(rest);
                    }
                }
                start = false;
            }
            _ => start = false,
        }
        index += 1;
    }
    if stack.is_empty() {
        Ok(())
    } else {
        Err(invalid())
    }
}

// Despues de `HANDLER FOR condicion[, condicion]...` empieza la accion, que
// es una sentencia (puede ser un BEGIN).
fn after_handler_conditions(tokens: &[Token], from: usize) -> Option<usize> {
    let mut index = from;
    if token_word(tokens.get(index)?) != "FOR" {
        return None;
    }
    index += 1;
    loop {
        match token_word(tokens.get(index)?).as_str() {
            "SQLSTATE" => {
                index += 1;
                if token_word(tokens.get(index)?) == "VALUE" {
                    index += 1;
                }
                index += 1;
            }
            "NOT" => index += 2,
            _ => index += 1,
        }
        if tokens.get(index) == Some(&Token::Comma) {
            index += 1;
        } else {
            return (index <= tokens.len()).then_some(index);
        }
    }
}

// Sin BEGIN ATOMIC la definicion es una sola sentencia si no hay mas `;` de
// nivel superior que el final: los cuerpos entre comillas o $$ son un solo
// token. Con BEGIN ATOMIC los `;` del cuerpo cuentan hasta su END.
fn validate_postgres_body(tokens: &[Token], from: usize) -> Result<(), ParserError> {
    let mut parens = 0usize;
    for index in from..tokens.len() {
        match &tokens[index] {
            Token::LParen => parens += 1,
            Token::RParen => parens = parens.saturating_sub(1),
            Token::SemiColon if parens == 0 => return trailing_terminator(&tokens[index..]),
            _ if parens == 0
                && token_word(&tokens[index]) == "BEGIN"
                && tokens.get(index + 1).map(token_word).as_deref() == Some("ATOMIC") =>
            {
                return validate_atomic_body(tokens, index + 2);
            }
            _ => {}
        }
    }
    Ok(())
}

fn validate_atomic_body(tokens: &[Token], from: usize) -> Result<(), ParserError> {
    let mut start = true;
    let mut cases = 0usize;
    for index in from..tokens.len() {
        let word = token_word(&tokens[index]);
        if tokens[index] == Token::SemiColon {
            start = true;
        } else if word == "END" && start {
            return trailing_terminator(&tokens[index + 1..]);
        } else if word == "END" && cases > 0 {
            cases -= 1;
        } else if word == "CASE" {
            cases += 1;
            start = false;
        } else if word == "BEGIN" && start {
            break;
        } else {
            start = false;
        }
    }
    Err(routine_error("invalid routine definition"))
}

fn trailing_terminator(tokens: &[Token]) -> Result<(), ParserError> {
    match tokens {
        [] | [Token::SemiColon] => Ok(()),
        _ => Err(routine_error("expected exactly one SQL statement")),
    }
}

/// Statements that never change data or schema. `EXPLAIN` counts only when
/// the explained statement does: `EXPLAIN ANALYZE` actually runs it.
fn statement_is_read_only(statement: &Statement) -> bool {
    match statement {
        Statement::Query(query) => query_is_read_only(query),
        Statement::Explain { statement, .. } => statement_is_read_only(statement),
        Statement::ExplainTable { .. }
        | Statement::ShowFunctions { .. }
        | Statement::ShowVariable { .. }
        | Statement::ShowStatus { .. }
        | Statement::ShowVariables { .. }
        | Statement::ShowCreate { .. }
        | Statement::ShowColumns { .. }
        | Statement::ShowDatabases { .. }
        | Statement::ShowSchemas { .. }
        | Statement::ShowObjects(_)
        | Statement::ShowTables { .. }
        | Statement::ShowViews { .. }
        | Statement::ShowCollation { .. }
        | Statement::Use(_) => true,
        _ => false,
    }
}

fn classify_statement(statement: &Statement) -> DestructiveClassification {
    match statement {
        Statement::Delete(delete) => classify_selection(
            delete.selection.is_some(),
            DestructiveStatement::DeleteWithoutWhere,
        ),
        Statement::Update { selection, .. } => classify_selection(
            selection.is_some(),
            DestructiveStatement::UpdateWithoutWhere,
        ),
        Statement::Truncate { .. } => {
            DestructiveClassification::RequiresConfirmation(DestructiveStatement::Truncate)
        }
        Statement::Drop { object_type, .. } => classify_drop(*object_type),
        Statement::AlterTable { operations, .. } => classify_alter_table(operations),
        Statement::Query(query) => classify_query(query),
        _ => DestructiveClassification::NotDestructive,
    }
}

fn classify_selection(
    has_condition: bool,
    without_condition: DestructiveStatement,
) -> DestructiveClassification {
    if has_condition {
        DestructiveClassification::NotDestructive
    } else {
        DestructiveClassification::RequiresConfirmation(without_condition)
    }
}

fn classify_drop(object_type: ObjectType) -> DestructiveClassification {
    match object_type {
        ObjectType::Table => {
            DestructiveClassification::RequiresConfirmation(DestructiveStatement::DropTable)
        }
        ObjectType::Schema => {
            DestructiveClassification::RequiresConfirmation(DestructiveStatement::DropSchema)
        }
        ObjectType::Database => {
            DestructiveClassification::RequiresConfirmation(DestructiveStatement::DropDatabase)
        }
        _ => DestructiveClassification::NotDestructive,
    }
}

fn classify_alter_table(operations: &[AlterTableOperation]) -> DestructiveClassification {
    let drops_column = operations
        .iter()
        .any(|operation| matches!(operation, AlterTableOperation::DropColumn { .. }));
    if drops_column {
        DestructiveClassification::RequiresConfirmation(DestructiveStatement::DropColumn)
    } else {
        DestructiveClassification::NotDestructive
    }
}

/// `WITH ... UPDATE`/`WITH ... DELETE` surface as a `Query` whose body is
/// `SetExpr::Update`/`SetExpr::Delete` wrapping the same statement, so a CTE
/// around a destructive statement is classified the same as one without it.
fn classify_query(query: &Query) -> DestructiveClassification {
    classify_set_expr(&query.body)
}

fn classify_set_expr(expr: &SetExpr) -> DestructiveClassification {
    match expr {
        SetExpr::Update(statement) | SetExpr::Delete(statement) => classify_statement(statement),
        SetExpr::Query(query) => classify_query(query),
        _ => DestructiveClassification::NotDestructive,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn classify(sql: &str, dialect: Dialect) -> DestructiveClassification {
        classify_destructive_sql(sql, dialect).expect("sql should parse as a single statement")
    }

    fn requires(sql: &str, dialect: Dialect, expected: DestructiveStatement) {
        assert_eq!(
            classify(sql, dialect),
            DestructiveClassification::RequiresConfirmation(expected),
            "expected {sql:?} to require confirmation as {expected:?}"
        );
    }

    fn not_destructive(sql: &str, dialect: Dialect) {
        assert_eq!(
            classify(sql, dialect),
            DestructiveClassification::NotDestructive,
            "expected {sql:?} to not require confirmation"
        );
    }

    #[test]
    fn routine_definitions_reach_the_driver_as_one_statement() {
        let mysql = [
            "CREATE PROCEDURE p() BEGIN SELECT 1; BEGIN IF 1 THEN SELECT 2; END IF; SELECT CASE WHEN 1 THEN 2 ELSE 3 END; END; END",
            "CREATE FUNCTION f() RETURNS INT RETURN 1",
            "CREATE TRIGGER tr BEFORE INSERT ON t FOR EACH ROW SET NEW.x = 1",
            "CREATE TRIGGER tr BEFORE INSERT ON t FOR EACH ROW BEGIN SET NEW.x = 1; END",
            "CREATE EVENT e ON SCHEDULE EVERY 1 DAY DO BEGIN SET @x = 1; END",
            "CREATE OR REPLACE DEFINER=`u`@`%` PROCEDURE p() BEGIN SELECT 1; END;",
            "CREATE PROCEDURE p() outer_label: BEGIN WHILE 1 DO SELECT CASE WHEN 1 THEN 2 ELSE 3 END; END WHILE; END outer_label;",
            "CREATE PROCEDURE p() BEGIN SELECT `END` FROM t; SELECT 'END' FROM t; END",
        ];
        for dialect in [Dialect::MySql, Dialect::MariaDb] {
            for sql in mysql {
                assert!(classify_destructive_sql(sql, dialect).is_ok(), "{sql}");
            }
        }
        let postgres = [
            "CREATE PROCEDURE p() LANGUAGE SQL AS $$BEGIN SELECT 1; END$$",
            "CREATE PROCEDURE p() LANGUAGE SQL AS $tag$BEGIN SELECT 1; END$tag$;",
            "CREATE FUNCTION f() RETURNS INT AS 'SELECT 1; SELECT 2' LANGUAGE SQL",
            "CREATE FUNCTION f() RETURNS INT LANGUAGE SQL BEGIN ATOMIC SELECT 1; END",
            "CREATE TRIGGER trg BEFORE INSERT ON t FOR EACH ROW EXECUTE FUNCTION f()",
        ];
        for sql in postgres {
            assert!(
                classify_destructive_sql(sql, Dialect::Postgres).is_ok(),
                "{sql}"
            );
        }
        assert_eq!(
            classify_sql(mysql[1], Dialect::MySql, true).unwrap(),
            DestructiveClassification::RequiresConfirmation(
                DestructiveStatement::WriteInProduction
            )
        );
    }

    #[test]
    fn routine_guard_rejects_extra_text_and_unbalanced_blocks() {
        let invalid = [
            "CREATE PROCEDURE p() BEGIN SELECT 1; END; DROP TABLE t",
            "CREATE PROCEDURE p() BEGIN SELECT 1; END;;",
            "CREATE PROCEDURE p() BEGIN SELECT 1; END /* cierre */ DROP TABLE t",
            "CREATE PROCEDURE p() BEGIN SELECT 'END; DROP TABLE t'; END; DROP TABLE t",
            "CREATE PROCEDURE p() BEGIN SELECT 1;",
            "CREATE PROCEDURE p() END",
            "CREATE FUNCTION f() RETURNS INT RETURN 1; DROP TABLE t",
            "CREATE FUNCTION f() RETURNS INT RETURN 1;;",
            "CREATE PROCEDURE p() DELIMITER $$ BEGIN SELECT 1; END",
            "CREATE PROCEDURE p() BEGIN SELECT 'END'; /* END */ SELECT 2;",
            "CREATE PROCEDURE p() BEGIN SELECT 1; END wrong_label",
            "CREATE FUNCTION f(); RETURN 1",
        ];
        for dialect in [Dialect::MySql, Dialect::MariaDb] {
            for sql in invalid {
                assert!(classify_destructive_sql(sql, dialect).is_err(), "{sql}");
            }
        }
        for sql in [
            "CREATE PROCEDURE p() LANGUAGE SQL AS $$SELECT 1$$; DROP TABLE t",
            "CREATE PROCEDURE p() LANGUAGE SQL AS $tag$SELECT 1$tag$;;",
        ] {
            assert!(
                classify_destructive_sql(sql, Dialect::Postgres).is_err(),
                "{sql}"
            );
        }
    }

    #[test]
    fn delete_without_where_requires_confirmation() {
        requires(
            "DELETE FROM users",
            Dialect::Postgres,
            DestructiveStatement::DeleteWithoutWhere,
        );
    }

    #[test]
    fn delete_with_leading_comment_without_where_requires_confirmation() {
        requires(
            "/* comentario */ DELETE FROM users",
            Dialect::Postgres,
            DestructiveStatement::DeleteWithoutWhere,
        );
        requires(
            "-- comentario\nDELETE FROM users",
            Dialect::Postgres,
            DestructiveStatement::DeleteWithoutWhere,
        );
    }

    #[test]
    fn delete_returning_without_where_requires_confirmation() {
        requires(
            "DELETE FROM users RETURNING id",
            Dialect::Postgres,
            DestructiveStatement::DeleteWithoutWhere,
        );
    }

    #[test]
    fn mysql_delete_with_limit_without_where_requires_confirmation() {
        requires(
            "DELETE FROM users ORDER BY id LIMIT 1",
            Dialect::MySql,
            DestructiveStatement::DeleteWithoutWhere,
        );
    }

    #[test]
    fn delete_using_without_where_requires_confirmation() {
        requires(
            "DELETE FROM users USING stale_users",
            Dialect::Postgres,
            DestructiveStatement::DeleteWithoutWhere,
        );
    }

    #[test]
    fn update_without_where_requires_confirmation() {
        requires(
            "UPDATE users SET active = false",
            Dialect::Postgres,
            DestructiveStatement::UpdateWithoutWhere,
        );
    }

    #[test]
    fn update_from_without_where_requires_confirmation() {
        requires(
            "UPDATE users SET active = false FROM stale_users",
            Dialect::Postgres,
            DestructiveStatement::UpdateWithoutWhere,
        );
    }

    #[test]
    fn truncate_requires_confirmation() {
        requires(
            "TRUNCATE users",
            Dialect::Postgres,
            DestructiveStatement::Truncate,
        );
        requires(
            "TRUNCATE TABLE users",
            Dialect::Postgres,
            DestructiveStatement::Truncate,
        );
        requires(
            "TRUNCATE TABLE a, b CASCADE",
            Dialect::Postgres,
            DestructiveStatement::Truncate,
        );
    }

    #[test]
    fn drop_table_requires_confirmation() {
        requires(
            "DROP TABLE users",
            Dialect::Postgres,
            DestructiveStatement::DropTable,
        );
        requires(
            "DROP TABLE IF EXISTS a, b",
            Dialect::Postgres,
            DestructiveStatement::DropTable,
        );
    }

    #[test]
    fn drop_schema_and_database_require_confirmation() {
        requires(
            "DROP SCHEMA public",
            Dialect::Postgres,
            DestructiveStatement::DropSchema,
        );
        requires(
            "DROP SCHEMA public CASCADE",
            Dialect::Postgres,
            DestructiveStatement::DropSchema,
        );
        requires(
            "DROP DATABASE app",
            Dialect::Postgres,
            DestructiveStatement::DropDatabase,
        );
    }

    #[test]
    fn drop_column_requires_confirmation() {
        requires(
            "ALTER TABLE users DROP COLUMN email",
            Dialect::Postgres,
            DestructiveStatement::DropColumn,
        );
        requires(
            "ALTER TABLE users DROP email",
            Dialect::Postgres,
            DestructiveStatement::DropColumn,
        );
        requires(
            "ALTER TABLE users DROP COLUMN a, DROP COLUMN b",
            Dialect::Postgres,
            DestructiveStatement::DropColumn,
        );
    }

    #[test]
    fn cte_around_update_without_where_requires_confirmation() {
        requires(
            "WITH candidates AS (SELECT id FROM users) UPDATE users SET active = false",
            Dialect::Postgres,
            DestructiveStatement::UpdateWithoutWhere,
        );
    }

    #[test]
    fn postgres_cte_around_delete_without_where_requires_confirmation() {
        requires(
            "WITH candidates AS (SELECT id FROM users) DELETE FROM users",
            Dialect::Postgres,
            DestructiveStatement::DeleteWithoutWhere,
        );
    }

    #[test]
    fn delete_with_where_is_not_destructive() {
        not_destructive("DELETE FROM users WHERE id = 1", Dialect::Postgres);
    }

    #[test]
    fn delete_with_where_true_is_not_destructive() {
        not_destructive("DELETE FROM users WHERE TRUE", Dialect::Postgres);
    }

    #[test]
    fn update_with_where_is_not_destructive() {
        not_destructive(
            "UPDATE users SET active = false WHERE id = 1",
            Dialect::Postgres,
        );
    }

    #[test]
    fn update_with_where_true_is_not_destructive() {
        not_destructive(
            "UPDATE users SET active = false WHERE TRUE",
            Dialect::Postgres,
        );
    }

    #[test]
    fn cte_with_where_is_not_destructive() {
        not_destructive(
            "WITH candidates AS (SELECT id FROM users) UPDATE users SET active = false WHERE id = 1",
            Dialect::Postgres,
        );
        not_destructive(
            "WITH candidates AS (SELECT id FROM users) DELETE FROM users WHERE id = 1",
            Dialect::Postgres,
        );
    }

    #[test]
    fn read_only_cte_is_not_destructive() {
        not_destructive(
            "WITH recent AS (SELECT id FROM users) SELECT * FROM recent",
            Dialect::Postgres,
        );
    }

    #[test]
    fn destructive_keyword_inside_string_or_comment_is_not_destructive() {
        not_destructive("SELECT 'DROP TABLE users'", Dialect::Postgres);
        not_destructive("SELECT 1 /* DELETE FROM users */", Dialect::Postgres);
    }

    #[test]
    fn drop_view_index_and_constraint_are_not_classified() {
        not_destructive("DROP VIEW active_users", Dialect::Postgres);
        not_destructive("DROP INDEX users_email_idx", Dialect::Postgres);
        not_destructive(
            "ALTER TABLE users DROP CONSTRAINT users_email_key",
            Dialect::Postgres,
        );
    }

    #[test]
    fn add_column_insert_create_select_are_not_destructive() {
        not_destructive(
            "ALTER TABLE users ADD COLUMN enabled boolean",
            Dialect::Postgres,
        );
        not_destructive("INSERT INTO users (id) VALUES (1)", Dialect::Postgres);
        not_destructive("CREATE TABLE users (id INT)", Dialect::Postgres);
        not_destructive("SELECT 1", Dialect::Postgres);
        not_destructive("EXPLAIN SELECT 1", Dialect::Postgres);
    }

    fn classify_production(sql: &str, dialect: Dialect) -> DestructiveClassification {
        classify_sql(sql, dialect, true).expect("sql should parse as a single statement")
    }

    #[test]
    fn production_reads_run_without_confirmation() {
        for sql in [
            "SELECT * FROM users",
            "WITH recent AS (SELECT * FROM orders) SELECT count(*) FROM recent",
            "SHOW TABLES",
            "SHOW CREATE TABLE users",
            "DESCRIBE users",
            "EXPLAIN SELECT * FROM users",
            "USE shop",
        ] {
            assert_eq!(
                classify_production(sql, Dialect::MySql),
                DestructiveClassification::NotDestructive,
                "expected {sql:?} to run without confirmation in production"
            );
        }
    }

    #[test]
    fn production_writes_require_confirmation() {
        for sql in [
            "INSERT INTO users (name) VALUES ('ana')",
            "UPDATE users SET name = 'ana' WHERE id = 1",
            "DELETE FROM users WHERE id = 1",
            "CREATE TABLE t (id INT)",
            "ALTER TABLE users ADD COLUMN age INT",
            "SELECT * INTO backup FROM users",
            "SELECT * FROM users FOR UPDATE",
            "EXPLAIN ANALYZE DELETE FROM users WHERE id = 1",
        ] {
            assert_eq!(
                classify_production(sql, Dialect::Postgres),
                DestructiveClassification::RequiresConfirmation(
                    DestructiveStatement::WriteInProduction
                ),
                "expected {sql:?} to require confirmation in production"
            );
        }
    }

    #[test]
    fn production_keeps_the_specific_destructive_classification() {
        assert_eq!(
            classify_production("DELETE FROM users", Dialect::MySql),
            DestructiveClassification::RequiresConfirmation(
                DestructiveStatement::DeleteWithoutWhere
            )
        );
    }

    #[test]
    fn writes_outside_production_are_not_classified() {
        not_destructive("INSERT INTO users (name) VALUES ('ana')", Dialect::MySql);
    }

    #[test]
    fn empty_sql_is_an_error() {
        assert!(classify_destructive_sql("", Dialect::Postgres).is_err());
        assert!(classify_destructive_sql("   ", Dialect::Postgres).is_err());
    }

    #[test]
    fn invalid_sql_is_an_error() {
        assert!(classify_destructive_sql("SELEKT 1 FRUM x", Dialect::Postgres).is_err());
    }

    #[test]
    fn multiple_statements_are_an_error() {
        assert!(
            classify_destructive_sql("DELETE FROM users; DELETE FROM orders", Dialect::Postgres)
                .is_err()
        );
        assert!(
            classify_destructive_sql(
                "DELETE FROM users; /* comentario */ DELETE FROM orders",
                Dialect::Postgres
            )
            .is_err()
        );
    }

    const MYSQL: [Dialect; 2] = [Dialect::MySql, Dialect::MariaDb];

    fn accepted(sql: &str, dialects: &[Dialect]) {
        for dialect in dialects {
            assert!(
                classify_destructive_sql(sql, *dialect).is_ok(),
                "{dialect:?} should accept {sql:?}"
            );
        }
    }

    fn rejected(sql: &str, dialects: &[Dialect]) {
        for dialect in dialects {
            assert!(
                classify_destructive_sql(sql, *dialect).is_err(),
                "{dialect:?} should reject {sql:?}"
            );
        }
    }

    #[test]
    fn begin_and_end_as_names_do_not_open_or_close_blocks() {
        rejected(
            "CREATE PROCEDURE p() BEGIN SELECT 1 AS begin; END; DROP TABLE t; END",
            &MYSQL,
        );
        rejected(
            "CREATE PROCEDURE p() BEGIN SELECT begin FROM t; END; DROP TABLE t; END",
            &MYSQL,
        );
        rejected(
            "CREATE PROCEDURE p() BEGIN SELECT CASE WHEN a THEN begin ELSE 0 END; END; DROP TABLE t; END",
            &MYSQL,
        );
        rejected(
            "CREATE FUNCTION f() RETURNS int LANGUAGE sql BEGIN ATOMIC SELECT 1 AS begin; END; DROP TABLE t; END",
            &[Dialect::Postgres],
        );
        accepted(
            "CREATE PROCEDURE p() BEGIN SELECT start, end FROM t; END",
            &MYSQL,
        );
        accepted(
            "CREATE PROCEDURE p() BEGIN SELECT 1 AS begin; SELECT begin FROM t; END",
            &MYSQL,
        );
    }

    #[test]
    fn single_statement_routines_with_case_expressions_are_accepted() {
        accepted(
            "CREATE TRIGGER tr BEFORE INSERT ON t FOR EACH ROW SET NEW.x = CASE WHEN NEW.y > 0 THEN 1 ELSE 0 END",
            &MYSQL,
        );
        accepted(
            "CREATE FUNCTION f() RETURNS INT RETURN (SELECT CASE WHEN a THEN 1 ELSE 0 END)",
            &MYSQL,
        );
        rejected(
            "CREATE TRIGGER tr BEFORE INSERT ON t FOR EACH ROW SET NEW.x = CASE WHEN a THEN 1 END; DROP TABLE t",
            &MYSQL,
        );
    }

    #[test]
    fn mysql_control_blocks_balance_and_handlers_may_open_blocks() {
        accepted(
            "CREATE PROCEDURE p() BEGIN DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END; DECLARE CONTINUE HANDLER FOR NOT FOUND, SQLSTATE '42S02' SET x = 1; lbl: LOOP LEAVE lbl; END LOOP lbl; WHILE x < 3 DO SET x = x + 1; END WHILE; REPEAT SET x = x - 1; UNTIL x < 1 END REPEAT; CASE x WHEN 1 THEN SELECT 1; ELSE SELECT 2; END CASE; IF x THEN SELECT 1; ELSEIF y THEN SELECT 2; ELSE SELECT 3; END IF; END",
            &MYSQL,
        );
        rejected(
            "CREATE PROCEDURE p() BEGIN SELECT 1; END IF; DROP TABLE t",
            &MYSQL,
        );
        rejected(
            "CREATE PROCEDURE p() BEGIN IF a THEN SELECT 1; END; DROP TABLE t; END",
            &MYSQL,
        );
        rejected(
            "CREATE PROCEDURE p() BEGIN SELECT 1; END x; DROP TABLE t",
            &MYSQL,
        );
        rejected("CREATE PROCEDURE p() BEGIN SELECT 1;", &MYSQL);
    }

    #[test]
    fn postgres_function_attributes_after_the_body_are_accepted() {
        for tail in [
            "LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE",
            "LANGUAGE \"plpgsql\" CALLED ON NULL INPUT",
            "LANGUAGE plpython3u RETURNS NULL ON NULL INPUT",
            "LANGUAGE sql COST 10 ROWS 5 SECURITY DEFINER SET search_path = public",
        ] {
            accepted(
                &format!("CREATE FUNCTION f() RETURNS int AS $$ select 1 $$ {tail}"),
                &[Dialect::Postgres],
            );
        }
        rejected(
            "CREATE FUNCTION f() RETURNS int AS $$ select 1 $$ LANGUAGE sql; DROP TABLE t",
            &[Dialect::Postgres],
        );
        accepted(
            "CREATE FUNCTION f() RETURNS int LANGUAGE sql BEGIN ATOMIC SELECT CASE WHEN a THEN 1 ELSE 0 END; SELECT 2; END",
            &[Dialect::Postgres],
        );
    }

    #[test]
    fn executable_comments_are_classified_as_code() {
        for sql in [
            "SELECT 1 /*!; DROP TABLE t; */",
            "SELECT 1 /*!50000; DROP TABLE t */",
            "SELECT 1 /*!500001; DROP TABLE t */",
            "CREATE PROCEDURE p() BEGIN SELECT 1; END /*!; DROP TABLE t; */",
            "SELECT 1 /*!50000 ",
        ] {
            rejected(sql, &MYSQL);
        }
        requires(
            "/*!50000 DROP TABLE t */",
            Dialect::MySql,
            DestructiveStatement::DropTable,
        );
        rejected("SELECT 1 /*M!100100; DROP TABLE t; */", &[Dialect::MariaDb]);
        accepted("SELECT 1 /*M!100100; DROP TABLE t; */", &[Dialect::MySql]);
        accepted("SELECT /*!40001 SQL_NO_CACHE */ 1", &MYSQL);
        accepted("/*!40101 SET NAMES utf8 */", &MYSQL);
        accepted("SELECT '/*!; DROP TABLE t */'", &MYSQL);
        accepted("SELECT 1 -- /*!; DROP TABLE t */", &MYSQL);
        accepted("SELECT 1 # /*!; DROP TABLE t */", &MYSQL);
        accepted("SELECT 1 /* ; DROP TABLE t */", &MYSQL);
        accepted("SELECT 1 /*!; DROP TABLE t; */", &[Dialect::Postgres]);
    }
}
