//! Clasifica una sentencia SQL para pedir confirmacion antes de ejecutarla.
//! En produccion, cada escritura tambien necesita confirmacion. Usa el AST
//! general y valida las definiciones de rutinas con tokens del motor.

use crate::Dialect;
use crate::pagination::query_is_read_only;
use serde::{Deserialize, Serialize};
use sqlparser::ast::{AlterTableOperation, ObjectType, Query, SetExpr, Statement};
use sqlparser::parser::{Parser, ParserError};
use sqlparser::tokenizer::{Token, Tokenizer};

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

fn routine_error(message: &str) -> ParserError {
    ParserError::ParserError(message.to_string())
}

fn token_word(token: &Token) -> String {
    match token {
        Token::Word(value) if value.quote_style.is_none() => value.value.to_ascii_uppercase(),
        _ => String::new(),
    }
}

fn validate_routine(
    tokens: &[Token],
    kind_at: usize,
    kind: &str,
    dialect: Dialect,
) -> Result<(), ParserError> {
    let invalid = || routine_error("invalid routine definition");
    let multiple = || routine_error("expected exactly one SQL statement");
    if !matches!(tokens.get(kind_at + 1), Some(Token::Word(_)))
        || matches!(
            token_word(&tokens[kind_at + 1]).as_str(),
            "BEGIN" | "END" | "SELECT"
        )
        || tokens.iter().any(|token| token_word(token) == "DELIMITER")
    {
        return Err(invalid());
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
            "BEGIN" | "RETURN" | "SET" | "INSERT" | "UPDATE" | "DELETE" | "SELECT"
        ) || (word == "AS" && matches!(dialect, Dialect::Postgres))
        {
            body = Some(index);
            break;
        }
    }
    if parens != 0 {
        return Err(invalid());
    }
    let Some(body) = body else {
        return Err(invalid());
    };
    if tokens[kind_at + 1..body].contains(&Token::SemiColon) {
        return Err(multiple());
    }
    let body_word = token_word(&tokens[body]);
    if body_word == "BEGIN" {
        let label = if body >= 2 && tokens[body - 1] == Token::Colon {
            Some(token_word(&tokens[body - 2]))
        } else {
            None
        };
        let mut blocks = 0usize;
        let mut cases = 0usize;
        let mut close = None;
        let mut index = body;
        while index < tokens.len() {
            let word = token_word(&tokens[index]);
            match word.as_str() {
                "BEGIN" => blocks += 1,
                "CASE" => {
                    if index == 0 || token_word(&tokens[index - 1]) != "END" {
                        cases += 1;
                    }
                }
                "END" => {
                    let suffix = tokens.get(index + 1).map(token_word).unwrap_or_default();
                    if matches!(suffix.as_str(), "IF" | "WHILE" | "LOOP" | "REPEAT") {
                        index += 1;
                    } else if suffix == "CASE" {
                        if cases == 0 {
                            return Err(invalid());
                        }
                        cases -= 1;
                        index += 1;
                    } else if cases > 0 {
                        cases -= 1;
                    } else if blocks > 0 {
                        blocks -= 1;
                        if blocks == 0 {
                            close = Some(index + 1);
                            break;
                        }
                    } else {
                        return Err(invalid());
                    }
                }
                _ => {}
            }
            index += 1;
        }
        let Some(close) = close else {
            return Err(invalid());
        };
        if cases != 0 {
            return Err(invalid());
        }
        let after = if let Some(label) = label {
            if tokens
                .get(close)
                .is_some_and(|token| token_word(token) == label)
            {
                close + 1
            } else {
                close
            }
        } else {
            close
        };
        return trailing_terminator(&tokens[after..]);
    }
    if body_word == "AS" {
        if !matches!(
            tokens.get(body + 1),
            Some(Token::DollarQuotedString(_) | Token::SingleQuotedString(_))
        ) {
            return Err(invalid());
        }
        let mut index = body + 2;
        while index < tokens.len() && tokens[index] != Token::SemiColon {
            if !matches!(
                token_word(&tokens[index]).as_str(),
                "LANGUAGE"
                    | "SQL"
                    | "PLPGSQL"
                    | "IMMUTABLE"
                    | "STABLE"
                    | "VOLATILE"
                    | "STRICT"
                    | "SECURITY"
                    | "DEFINER"
                    | "INVOKER"
            ) {
                return Err(multiple());
            }
            index += 1;
        }
        return trailing_terminator(&tokens[index..]);
    }
    if tokens[body..]
        .iter()
        .any(|token| token_word(token) == "END")
    {
        return Err(invalid());
    }
    let semicolon = tokens[body..]
        .iter()
        .position(|token| *token == Token::SemiColon);
    if let Some(index) = semicolon {
        trailing_terminator(&tokens[body + index..])
    } else {
        Ok(())
    }
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
}
