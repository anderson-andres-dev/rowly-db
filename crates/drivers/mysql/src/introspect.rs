//! Reads everything the database explorer shows for one schema from
//! `information_schema`, which MySQL 5.7+, 8.x and MariaDB 10.3+ all share
//! for the parts used here. Where they differ (see `version.rs`) the query
//! is picked from `Capabilities` up front instead of reacting to an error.
//!
//! Two portability rules every query here follows:
//! - Every selected value is text: numbers go through `CAST(.. AS CHAR)`.
//!   Prepared statements return binary-encoded integers, and some
//!   `information_schema` columns are VARBINARY or LONGTEXT depending on the
//!   server, so everything is read as raw bytes and decoded leniently
//!   (`text`/`opt_text`) instead of trusting one declared SQL type.
//! - Values are read by position with explicit aliases, because MySQL 8
//!   returns `information_schema` column names in upper case and 5.7 doesn't.

use crate::version::{Capabilities, CheckConstraints};
use khipu_driver_core::assembly::{IndexColumnRow, KeyColumnRow, TableSet, TriggerEventRow};
use khipu_driver_core::{
    CheckInfo, ColumnInfo, DriverError, EventInfo, ForeignKeyInfo, Message, RelationKind,
    RoutineInfo, RoutineKind, SchemaObjects, SequenceInfo,
};
use sqlx::mysql::MySqlRow;
use sqlx::{MySqlPool, Row};
use std::collections::HashMap;

fn query_error(error: sqlx::Error) -> DriverError {
    DriverError::Query(error.to_string())
}

fn opt_text(row: &MySqlRow, index: usize) -> Result<Option<String>, DriverError> {
    let raw: Option<Vec<u8>> = row.try_get_unchecked(index).map_err(query_error)?;
    Ok(raw.map(|bytes| String::from_utf8_lossy(&bytes).into_owned()))
}

fn text(row: &MySqlRow, index: usize) -> Result<String, DriverError> {
    Ok(opt_text(row, index)?.unwrap_or_default())
}

async fn fetch(pool: &MySqlPool, sql: &str, schema: &str) -> Result<Vec<MySqlRow>, DriverError> {
    sqlx::query(sql)
        .bind(schema)
        .fetch_all(pool)
        .await
        .map_err(query_error)
}

/// Runs a secondary category: on failure the category stays empty and a
/// note goes to `warnings` (see `SchemaObjects`).
/// `what` is the category ("keys", "indexes"...): the frontend translates
/// `introspect.<what>`.
fn soft<T: Default>(result: Result<T, DriverError>, what: &str, warnings: &mut Vec<Message>) -> T {
    result.unwrap_or_else(|error| {
        warnings.push(Message::key(format!("introspect.{what}")).with("error", error));
        T::default()
    })
}

pub async fn introspect_schema(
    pool: &MySqlPool,
    schema: &str,
    capabilities: Capabilities,
) -> Result<SchemaObjects, DriverError> {
    // Categories are independent reads, so they run concurrently; the pool
    // hands each one its own connection.
    let (relations, columns, keys, foreign_keys, indexes, checks, triggers, routines, events) = futures_util::join!(
        fetch(pool, RELATIONS_SQL, schema),
        fetch(pool, COLUMNS_SQL, schema),
        fetch(pool, KEYS_SQL, schema),
        fetch(pool, FOREIGN_KEYS_SQL, schema),
        fetch(pool, INDEXES_SQL, schema),
        read_checks(pool, schema, capabilities),
        fetch(pool, TRIGGERS_SQL, schema),
        read_routines(pool, schema),
        fetch(pool, EVENTS_SQL, schema),
    );

    let mut objects = SchemaObjects::new(schema);
    let mut set = TableSet::new(schema);

    for row in relations? {
        let name = text(&row, 0)?;
        let table_type = text(&row, 1)?;
        let comment = opt_text(&row, 2)?.filter(|comment| !comment.is_empty());
        match table_type.as_str() {
            "SEQUENCE" if capabilities.sequences => objects.sequences.push(SequenceInfo {
                name,
                data_type: None,
            }),
            // MySQL fills TABLE_COMMENT of every view with the literal "VIEW".
            "VIEW" | "SYSTEM VIEW" => set.add_relation(
                name,
                RelationKind::View,
                comment.filter(|comment| comment != "VIEW"),
            ),
            _ => set.add_relation(name, RelationKind::Table, comment),
        }
    }

    for row in columns? {
        let table = text(&row, 0)?;
        set.add_column(
            &table,
            ColumnInfo {
                name: text(&row, 1)?,
                data_type: text(&row, 2)?,
                nullable: text(&row, 3)? == "YES",
                is_primary_key: text(&row, 4)? == "PRI",
                // MySQL never returns NULL here, "" means no comment.
                comment: opt_text(&row, 5)?.filter(|comment| !comment.is_empty()),
                default_value: opt_text(&row, 6)?,
                // EXTRA: "auto_increment", "VIRTUAL GENERATED", "STORED
                // GENERATED"... ("DEFAULT_GENERATED" es solo un DEFAULT con
                // expresion: esa columna si se puede escribir).
                generated: opt_text(&row, 7)?.is_some_and(|extra| {
                    let extra = extra.to_ascii_lowercase();
                    extra.contains("auto_increment")
                        || extra.contains("virtual generated")
                        || extra.contains("stored generated")
                }),
            },
        );
    }

    let warnings = &mut objects.warnings;

    let key_rows: Vec<KeyColumnRow> = soft(
        keys.and_then(|rows| rows.iter().map(key_row).collect()),
        "keys",
        warnings,
    );
    set.add_key_columns(key_rows);

    let foreign_key_rows: Vec<(String, ForeignKeyInfo)> = soft(
        foreign_keys.and_then(|rows| rows.iter().map(foreign_key_row).collect()),
        "foreignKeys",
        warnings,
    );
    for (table, foreign_key) in foreign_key_rows {
        set.add_foreign_key(&table, foreign_key);
    }

    let index_rows: Vec<IndexColumnRow> = soft(
        indexes.and_then(|rows| rows.iter().map(index_row).collect()),
        "indexes",
        warnings,
    );
    set.add_index_columns(index_rows);

    for (table, check) in soft(checks, "checks", warnings) {
        set.add_check(&table, check);
    }

    let trigger_rows: Vec<TriggerEventRow> = soft(
        triggers.and_then(|rows| rows.iter().map(trigger_row).collect()),
        "triggers",
        warnings,
    );
    set.add_trigger_events(trigger_rows);

    objects.routines = soft(routines, "routines", warnings);
    objects.events = soft(
        events.and_then(|rows| rows.iter().map(event_row).collect()),
        "events",
        warnings,
    );

    objects.tables = set.into_tables();
    Ok(objects)
}

const RELATIONS_SQL: &str = "\
    SELECT table_name AS name, table_type AS kind, table_comment AS comment \
    FROM information_schema.tables \
    WHERE table_schema = ? \
    ORDER BY table_name";

// COLUMN_TYPE ("int unsigned", "varchar(255)", "enum('a','b')") instead of
// DATA_TYPE ("int", "varchar"): it's what DataGrip shows and what a person
// needs to know about a column.
const COLUMNS_SQL: &str = "\
    SELECT table_name AS tbl, column_name AS name, column_type AS type, \
           is_nullable AS nullable, column_key AS col_key, column_comment AS comment, \
           column_default AS dflt, extra AS extra \
    FROM information_schema.columns \
    WHERE table_schema = ? \
    ORDER BY table_name, ordinal_position";

const KEYS_SQL: &str = "\
    SELECT tc.table_name AS tbl, tc.constraint_name AS name, tc.constraint_type AS kind, \
           kcu.column_name AS col \
    FROM information_schema.table_constraints tc \
    JOIN information_schema.key_column_usage kcu \
      ON kcu.constraint_schema = tc.constraint_schema \
     AND kcu.constraint_name = tc.constraint_name \
     AND kcu.table_name = tc.table_name \
    WHERE tc.table_schema = ? AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE') \
    ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position";

fn key_row(row: &MySqlRow) -> Result<KeyColumnRow, DriverError> {
    Ok(KeyColumnRow {
        table: text(row, 0)?,
        name: text(row, 1)?,
        primary: text(row, 2)? == "PRIMARY KEY",
        column: text(row, 3)?,
    })
}

const FOREIGN_KEYS_SQL: &str = "\
    SELECT table_name AS tbl, constraint_name AS name, column_name AS col, \
           referenced_table_name AS ref_tbl, referenced_column_name AS ref_col \
    FROM information_schema.key_column_usage \
    WHERE table_schema = ? AND referenced_table_name IS NOT NULL \
    ORDER BY table_name, constraint_name, ordinal_position";

fn foreign_key_row(row: &MySqlRow) -> Result<(String, ForeignKeyInfo), DriverError> {
    Ok((
        text(row, 0)?,
        ForeignKeyInfo {
            name: text(row, 1)?,
            column: text(row, 2)?,
            referenced_table: text(row, 3)?,
            referenced_column: text(row, 4)?,
        },
    ))
}

// COLUMN_NAME is NULL for functional key parts (MySQL 8.0.13+); the
// expression itself lives in a column 5.7 doesn't have, so it's shown as a
// placeholder rather than picking a different query per version.
const INDEXES_SQL: &str = "\
    SELECT table_name AS tbl, index_name AS name, CAST(non_unique AS CHAR) AS non_unique, \
           index_type AS method, column_name AS col \
    FROM information_schema.statistics \
    WHERE table_schema = ? \
    ORDER BY table_name, index_name, seq_in_index";

fn index_row(row: &MySqlRow) -> Result<IndexColumnRow, DriverError> {
    let name = text(row, 1)?;
    Ok(IndexColumnRow {
        table: text(row, 0)?,
        primary: name == "PRIMARY",
        name,
        unique: text(row, 2)? == "0",
        method: opt_text(row, 3)?,
        column: opt_text(row, 4)?.unwrap_or_else(|| "(expresión)".to_string()),
    })
}

async fn read_checks(
    pool: &MySqlPool,
    schema: &str,
    capabilities: Capabilities,
) -> Result<Vec<(String, CheckInfo)>, DriverError> {
    let sql = match capabilities.check_constraints {
        CheckConstraints::Unsupported => return Ok(Vec::new()),
        CheckConstraints::JoinTableConstraints => {
            "SELECT tc.table_name AS tbl, cc.constraint_name AS name, cc.check_clause AS expr \
             FROM information_schema.check_constraints cc \
             JOIN information_schema.table_constraints tc \
               ON tc.constraint_schema = cc.constraint_schema \
              AND tc.constraint_name = cc.constraint_name \
              AND tc.constraint_type = 'CHECK' \
             WHERE cc.constraint_schema = ? \
             ORDER BY tc.table_name, cc.constraint_name"
        }
        CheckConstraints::WithTableName => {
            "SELECT table_name AS tbl, constraint_name AS name, check_clause AS expr \
             FROM information_schema.check_constraints \
             WHERE constraint_schema = ? \
             ORDER BY table_name, constraint_name"
        }
    };

    fetch(pool, sql, schema)
        .await?
        .iter()
        .map(|row| {
            Ok((
                text(row, 0)?,
                CheckInfo {
                    name: text(row, 1)?,
                    expression: text(row, 2)?,
                },
            ))
        })
        .collect()
}

// One row per trigger: MySQL triggers fire on exactly one event.
const TRIGGERS_SQL: &str = "\
    SELECT event_object_table AS tbl, trigger_name AS name, action_timing AS timing, \
           event_manipulation AS event \
    FROM information_schema.triggers \
    WHERE trigger_schema = ? \
    ORDER BY event_object_table, trigger_name";

fn trigger_row(row: &MySqlRow) -> Result<TriggerEventRow, DriverError> {
    Ok(TriggerEventRow {
        table: text(row, 0)?,
        name: text(row, 1)?,
        timing: text(row, 2)?,
        event: text(row, 3)?,
    })
}

async fn read_routines(pool: &MySqlPool, schema: &str) -> Result<Vec<RoutineInfo>, DriverError> {
    // MariaDB in Oracle mode also lists PACKAGE / PACKAGE BODY here; only
    // procedures and functions are routines in the explorer's sense.
    let routine_rows = fetch(
        pool,
        "SELECT specific_name AS id, routine_name AS name, routine_type AS kind, \
                dtd_identifier AS returns \
         FROM information_schema.routines \
         WHERE routine_schema = ? AND routine_type IN ('PROCEDURE', 'FUNCTION') \
         ORDER BY routine_name",
        schema,
    )
    .await?;

    // Ordinal 0 is a function's return value, not an argument.
    let parameter_rows = fetch(
        pool,
        "SELECT specific_name AS id, parameter_mode AS mode, parameter_name AS name, \
                dtd_identifier AS type \
         FROM information_schema.parameters \
         WHERE specific_schema = ? AND ordinal_position > 0 \
         ORDER BY specific_name, ordinal_position",
        schema,
    )
    .await?;

    let mut arguments: HashMap<String, Vec<String>> = HashMap::new();
    for row in &parameter_rows {
        arguments
            .entry(text(row, 0)?)
            .or_default()
            .push(format_parameter(
                opt_text(row, 1)?.as_deref(),
                &text(row, 2)?,
                &text(row, 3)?,
            ));
    }

    routine_rows
        .iter()
        .map(|row| {
            let id = text(row, 0)?;
            let kind = if text(row, 2)? == "FUNCTION" {
                RoutineKind::Function
            } else {
                RoutineKind::Procedure
            };
            Ok(RoutineInfo {
                name: text(row, 1)?,
                kind,
                arguments: arguments.remove(&id).unwrap_or_default().join(", "),
                return_type: match kind {
                    RoutineKind::Function => opt_text(row, 3)?,
                    RoutineKind::Procedure => None,
                },
            })
        })
        .collect()
}

/// `"p_id int"`, or `"OUT p_total decimal(10,2)"` — IN is the default mode
/// (and the only one a function argument can have), so it isn't repeated.
fn format_parameter(mode: Option<&str>, name: &str, data_type: &str) -> String {
    match mode {
        Some(mode) if mode != "IN" => format!("{mode} {name} {data_type}"),
        _ => format!("{name} {data_type}"),
    }
}

const EVENTS_SQL: &str = "\
    SELECT event_name AS name, status, event_type AS kind, \
           CAST(interval_value AS CHAR) AS every_value, interval_field AS every_field, \
           CAST(execute_at AS CHAR) AS at_time \
    FROM information_schema.events \
    WHERE event_schema = ? \
    ORDER BY event_name";

fn event_row(row: &MySqlRow) -> Result<EventInfo, DriverError> {
    Ok(EventInfo {
        name: text(row, 0)?,
        status: text(row, 1)?,
        schedule: format_schedule(
            &text(row, 2)?,
            opt_text(row, 3)?.as_deref(),
            opt_text(row, 4)?.as_deref(),
            opt_text(row, 5)?.as_deref(),
        ),
    })
}

/// `"EVERY 1 DAY"` for recurring events, `"AT 2026-01-01 00:00:00"` for
/// one-time ones. MySQL stores quoted composite intervals (`'1:30'
/// HOUR_MINUTE`) with the quotes included; they're kept as-is.
fn format_schedule(
    kind: &str,
    every_value: Option<&str>,
    every_field: Option<&str>,
    at_time: Option<&str>,
) -> String {
    match (kind, every_value, every_field, at_time) {
        ("RECURRING", Some(value), Some(field), _) => format!("EVERY {value} {field}"),
        (_, _, _, Some(at)) => format!("AT {at}"),
        _ => kind.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parameter_omits_default_in_mode() {
        assert_eq!(format_parameter(Some("IN"), "p_id", "int"), "p_id int");
        assert_eq!(format_parameter(None, "p_id", "int"), "p_id int");
        assert_eq!(
            format_parameter(Some("INOUT"), "p_total", "decimal(10,2)"),
            "INOUT p_total decimal(10,2)"
        );
    }

    #[test]
    fn schedule_for_recurring_and_one_time_events() {
        assert_eq!(
            format_schedule("RECURRING", Some("1"), Some("DAY"), None),
            "EVERY 1 DAY"
        );
        assert_eq!(
            format_schedule("ONE TIME", None, None, Some("2026-01-01 00:00:00")),
            "AT 2026-01-01 00:00:00"
        );
        assert_eq!(format_schedule("ONE TIME", None, None, None), "ONE TIME");
    }
}
