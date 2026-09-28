//! Classifies a single SQL statement as destructive or not, so the app can
//! ask for an explicit confirmation before running it. On a production
//! connection every statement that writes needs confirmation too. This
//! module knows nothing about execution, Tauri or SQLx: it only looks at the
//! parsed AST.

use crate::Dialect;
use crate::pagination::query_is_read_only;
use serde::{Deserialize, Serialize};
use sqlparser::ast::{AlterTableOperation, ObjectType, Query, SetExpr, Statement};
use sqlparser::parser::{Parser, ParserError};

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

/// Parses `sql` under `dialect` and classifies the single resulting
/// statement. Returns an error if `sql` is not exactly one statement, or if
/// it cannot be parsed at all — the caller must not fall back to executing
/// the statement in either case, since that would bypass the guard.
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
