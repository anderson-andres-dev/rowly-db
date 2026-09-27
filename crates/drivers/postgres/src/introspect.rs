//! Reads everything the database explorer shows for one schema from
//! `pg_catalog` rather than `information_schema`: the latter doesn't see
//! materialized views, only lists objects the current role owns or has
//! privileges on, and can't express multi-column foreign keys without an
//! ambiguous join. Where versions differ (see `version.rs`) the query is
//! picked from `Capabilities` up front instead of reacting to an error.
//!
//! Portability rule every query here follows: identifiers (`name`) and
//! `"char"` columns are cast to `text`, so decoding never depends on sqlx
//! mapping Postgres-internal types.

use crate::version::Capabilities;
use khipu_driver_core::assembly::{IndexColumnRow, KeyColumnRow, TableSet, TriggerEventRow};
use khipu_driver_core::{
    CheckInfo, ColumnInfo, DriverError, ForeignKeyInfo, Message, ParameterMode, RelationKind,
    RoutineInfo, RoutineKind, RoutineParameter, SchemaObjects, SequenceInfo,
};
use sqlx::postgres::PgRow;
use sqlx::{PgPool, Row};

fn query_error(error: sqlx::Error) -> DriverError {
    DriverError::Query(error.to_string())
}

fn get<'r, T>(row: &'r PgRow, index: usize) -> Result<T, DriverError>
where
    T: sqlx::Decode<'r, sqlx::Postgres> + sqlx::Type<sqlx::Postgres>,
{
    row.try_get(index).map_err(query_error)
}

async fn fetch(pool: &PgPool, sql: &str, schema: &str) -> Result<Vec<PgRow>, DriverError> {
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

fn map_rows<T>(
    rows: Result<Vec<PgRow>, DriverError>,
    map: impl Fn(&PgRow) -> Result<T, DriverError>,
) -> Result<Vec<T>, DriverError> {
    rows?.iter().map(map).collect()
}

pub async fn introspect_schema(
    pool: &PgPool,
    schema: &str,
    capabilities: Capabilities,
) -> Result<SchemaObjects, DriverError> {
    let partitions = if capabilities.catalog_v10 {
        "AND NOT c.relispartition"
    } else {
        ""
    };
    let relations_sql = RELATIONS_SQL.replace("{partitions}", partitions);
    let columns_sql = COLUMNS_SQL.replace("{partitions}", partitions);
    let indexes_sql = indexes_sql(capabilities);
    let routines_sql = routines_sql(capabilities);
    let sequences_sql = if capabilities.catalog_v10 {
        SEQUENCES_SQL
    } else {
        SEQUENCES_LEGACY_SQL
    };

    // Categories are independent reads, so they run concurrently; the pool
    // hands each one its own connection.
    let (relations, columns, constraints, foreign_keys, indexes, triggers, routines, sequences) = futures_util::join!(
        fetch(pool, &relations_sql, schema),
        fetch(pool, &columns_sql, schema),
        fetch(pool, CONSTRAINT_COLUMNS_SQL, schema),
        fetch(pool, FOREIGN_KEYS_SQL, schema),
        fetch(pool, &indexes_sql, schema),
        fetch(pool, TRIGGERS_SQL, schema),
        fetch(pool, &routines_sql, schema),
        fetch(pool, sequences_sql, schema),
    );

    let mut objects = SchemaObjects::new(schema);
    let mut set = TableSet::new(schema);

    for row in relations? {
        let kind = match get::<String>(&row, 1)?.as_str() {
            "v" => RelationKind::View,
            "m" => RelationKind::MaterializedView,
            // r (table), p (partitioned table), f (foreign table)
            _ => RelationKind::Table,
        };
        set.add_relation(get(&row, 0)?, kind, get(&row, 2)?);
    }

    for row in columns? {
        let table: String = get(&row, 0)?;
        set.add_column(
            &table,
            ColumnInfo {
                name: get(&row, 1)?,
                data_type: get(&row, 2)?,
                nullable: get(&row, 3)?,
                is_primary_key: get(&row, 4)?,
                comment: get(&row, 5)?,
                default_value: get(&row, 6)?,
                generated: get(&row, 7)?,
            },
        );
    }

    let warnings = &mut objects.warnings;

    let constraint_rows: Vec<ConstraintColumnRow> = soft(
        map_rows(constraints, constraint_column_row),
        "keysAndChecks",
        warnings,
    );
    let (key_rows, checks) = split_constraints(constraint_rows);
    set.add_key_columns(key_rows);
    for (table, check) in checks {
        set.add_check(&table, check);
    }

    let foreign_key_rows = soft(
        map_rows(foreign_keys, foreign_key_row),
        "foreignKeys",
        warnings,
    );
    for (table, foreign_key) in foreign_key_rows {
        set.add_foreign_key(&table, foreign_key);
    }

    let index_rows = soft(map_rows(indexes, index_rows), "indexes", warnings);
    set.add_index_columns(index_rows.into_iter().flatten());

    let trigger_rows = soft(map_rows(triggers, trigger_rows), "triggers", warnings);
    set.add_trigger_events(trigger_rows.into_iter().flatten());

    objects.routines = soft(map_rows(routines, routine_row), "routines", warnings);
    objects.sequences = soft(map_rows(sequences, sequence_row), "sequences", warnings);

    objects.tables = set.into_tables();
    Ok(objects)
}

// r table, p partitioned table, v view, m materialized view, f foreign table.
// Partitions are hidden (their parent stands for them), like DataGrip does.
const RELATIONS_SQL: &str = "\
    SELECT c.relname::text, c.relkind::text, obj_description(c.oid, 'pg_class') \
    FROM pg_class c \
    JOIN pg_namespace n ON n.oid = c.relnamespace \
    WHERE n.nspname = $1 AND c.relkind IN ('r', 'p', 'v', 'm', 'f') {partitions} \
    ORDER BY c.relname";

// format_type gives the declared type with its modifiers ("character
// varying(255)", "numeric(10,2)"), which information_schema.data_type drops.
const COLUMNS_SQL: &str = "\
    SELECT c.relname::text, a.attname::text, format_type(a.atttypid, a.atttypmod), \
           NOT a.attnotnull, \
           EXISTS (SELECT 1 FROM pg_index i \
                   WHERE i.indrelid = c.oid AND i.indisprimary AND a.attnum = ANY (i.indkey)), \
           col_description(c.oid, a.attnum), \
           pg_get_expr(d.adbin, d.adrelid), \
           coalesce(to_jsonb(a) ->> 'attidentity', '') <> '' \
             OR coalesce(to_jsonb(a) ->> 'attgenerated', '') <> '' \
             OR coalesce(pg_get_expr(d.adbin, d.adrelid), '') LIKE 'nextval(%' \
    FROM pg_attribute a \
    JOIN pg_class c ON c.oid = a.attrelid \
    JOIN pg_namespace n ON n.oid = c.relnamespace \
    LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum \
    WHERE n.nspname = $1 AND c.relkind IN ('r', 'p', 'v', 'm', 'f') {partitions} \
      AND a.attnum > 0 AND NOT a.attisdropped \
    ORDER BY c.relname, a.attnum";

// Primary keys, unique constraints and checks in one pass over
// pg_constraint. A check yields a single row (its columns don't matter for
// display), keys one row per column in constraint order.
const CONSTRAINT_COLUMNS_SQL: &str = "\
    SELECT c.relname::text, con.conname::text, con.contype::text, \
           a.attname::text, pg_get_constraintdef(con.oid, true) \
    FROM pg_constraint con \
    JOIN pg_class c ON c.oid = con.conrelid \
    JOIN pg_namespace n ON n.oid = c.relnamespace \
    LEFT JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord) \
           ON con.contype IN ('p', 'u') \
    LEFT JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum \
    WHERE n.nspname = $1 AND con.contype IN ('p', 'u', 'c') \
    ORDER BY c.relname, con.conname, k.ord";

struct ConstraintColumnRow {
    table: String,
    name: String,
    kind: String,
    column: Option<String>,
    definition: String,
}

fn constraint_column_row(row: &PgRow) -> Result<ConstraintColumnRow, DriverError> {
    Ok(ConstraintColumnRow {
        table: get(row, 0)?,
        name: get(row, 1)?,
        kind: get(row, 2)?,
        column: get(row, 3)?,
        definition: get(row, 4)?,
    })
}

fn split_constraints(
    rows: Vec<ConstraintColumnRow>,
) -> (Vec<KeyColumnRow>, Vec<(String, CheckInfo)>) {
    let mut keys = Vec::new();
    let mut checks = Vec::new();
    for row in rows {
        match (row.kind.as_str(), row.column) {
            ("c", _) => checks.push((
                row.table,
                CheckInfo {
                    name: row.name,
                    expression: check_expression(&row.definition),
                },
            )),
            (kind, Some(column)) => keys.push(KeyColumnRow {
                table: row.table,
                name: row.name,
                primary: kind == "p",
                column,
            }),
            _ => {}
        }
    }
    (keys, checks)
}

/// `pg_get_constraintdef` returns `"CHECK ((price > 0))"`, optionally
/// followed by `NOT VALID`; the explorer shows just the condition.
fn check_expression(definition: &str) -> String {
    let body = definition
        .strip_prefix("CHECK ")
        .unwrap_or(definition)
        .trim();
    let body = body.strip_suffix(" NOT VALID").unwrap_or(body);
    match body
        .strip_prefix('(')
        .and_then(|inner| inner.strip_suffix(')'))
    {
        Some(inner) if balanced(inner) => inner.to_string(),
        _ => body.to_string(),
    }
}

/// Whether stripping one outer pair of parentheses left them balanced, i.e.
/// they really wrapped the whole expression (`(a) OR (b)` must stay intact).
fn balanced(text: &str) -> bool {
    let mut depth = 0i32;
    for c in text.chars() {
        match c {
            '(' => depth += 1,
            ')' => {
                depth -= 1;
                if depth < 0 {
                    return false;
                }
            }
            _ => {}
        }
    }
    depth == 0
}

// unnest over both key arrays pairs each local column with the one it
// references, in constraint order — the information_schema equivalent
// (constraint_column_usage) can't, and cross-joins multi-column keys.
const FOREIGN_KEYS_SQL: &str = "\
    SELECT c.relname::text, con.conname::text, a.attname::text, \
           rc.relname::text, ra.attname::text \
    FROM pg_constraint con \
    JOIN pg_class c ON c.oid = con.conrelid \
    JOIN pg_namespace n ON n.oid = c.relnamespace \
    JOIN pg_class rc ON rc.oid = con.confrelid \
    CROSS JOIN LATERAL unnest(con.conkey, con.confkey) WITH ORDINALITY AS k(attnum, refattnum, ord) \
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum \
    JOIN pg_attribute ra ON ra.attrelid = con.confrelid AND ra.attnum = k.refattnum \
    WHERE n.nspname = $1 AND con.contype = 'f' \
    ORDER BY c.relname, con.conname, k.ord";

fn foreign_key_row(row: &PgRow) -> Result<(String, ForeignKeyInfo), DriverError> {
    Ok((
        get(row, 0)?,
        ForeignKeyInfo {
            name: get(row, 1)?,
            column: get(row, 2)?,
            referenced_table: get(row, 3)?,
            referenced_column: get(row, 4)?,
        },
    ))
}

// pg_get_indexdef(oid, k, true) renders key k as written: a column name or
// the expression of an expression index.
fn indexes_sql(capabilities: Capabilities) -> String {
    let key_count = if capabilities.index_key_attributes {
        "i.indnkeyatts"
    } else {
        "i.indnatts"
    };
    format!(
        "SELECT t.relname::text, ic.relname::text, i.indisunique, i.indisprimary, am.amname::text, \
                ARRAY(SELECT pg_get_indexdef(i.indexrelid, k, true) \
                      FROM generate_series(1, {key_count}) AS k ORDER BY k) \
         FROM pg_index i \
         JOIN pg_class t ON t.oid = i.indrelid \
         JOIN pg_class ic ON ic.oid = i.indexrelid \
         JOIN pg_am am ON am.oid = ic.relam \
         JOIN pg_namespace n ON n.oid = t.relnamespace \
         WHERE n.nspname = $1 \
         ORDER BY t.relname, ic.relname"
    )
}

fn index_rows(row: &PgRow) -> Result<Vec<IndexColumnRow>, DriverError> {
    let table: String = get(row, 0)?;
    let name: String = get(row, 1)?;
    let unique: bool = get(row, 2)?;
    let primary: bool = get(row, 3)?;
    let method: String = get(row, 4)?;
    let columns: Vec<String> = get(row, 5)?;
    Ok(columns
        .into_iter()
        .map(|column| IndexColumnRow {
            table: table.clone(),
            name: name.clone(),
            unique,
            primary,
            method: Some(method.clone()),
            column,
        })
        .collect())
}

const TRIGGERS_SQL: &str = "\
    SELECT c.relname::text, t.tgname::text, t.tgtype::int4 \
    FROM pg_trigger t \
    JOIN pg_class c ON c.oid = t.tgrelid \
    JOIN pg_namespace n ON n.oid = c.relnamespace \
    WHERE n.nspname = $1 AND NOT t.tgisinternal \
    ORDER BY c.relname, t.tgname";

fn trigger_rows(row: &PgRow) -> Result<Vec<TriggerEventRow>, DriverError> {
    let table: String = get(row, 0)?;
    let name: String = get(row, 1)?;
    let (timing, events) = decode_trigger_type(get(row, 2)?);
    Ok(events
        .into_iter()
        .map(|event| TriggerEventRow {
            table: table.clone(),
            name: name.clone(),
            timing: timing.to_string(),
            event: event.to_string(),
        })
        .collect())
}

/// Decodes `pg_trigger.tgtype`, a bitmask defined in
/// `src/include/catalog/pg_trigger.h` (stable since 8.4):
/// ROW 1<<0, BEFORE 1<<1, INSERT 1<<2, DELETE 1<<3, UPDATE 1<<4,
/// TRUNCATE 1<<5, INSTEAD 1<<6. Neither BEFORE nor INSTEAD means AFTER.
fn decode_trigger_type(tgtype: i32) -> (&'static str, Vec<&'static str>) {
    let timing = if tgtype & (1 << 6) != 0 {
        "INSTEAD OF"
    } else if tgtype & (1 << 1) != 0 {
        "BEFORE"
    } else {
        "AFTER"
    };
    let events = [
        (1 << 2, "INSERT"),
        (1 << 4, "UPDATE"),
        (1 << 3, "DELETE"),
        (1 << 5, "TRUNCATE"),
    ]
    .into_iter()
    .filter(|(bit, _)| tgtype & bit != 0)
    .map(|(_, event)| event)
    .collect();
    (timing, events)
}

// Functions that belong to an extension (pg_depend deptype 'e') are left
// out: installing e.g. pgcrypto or PostGIS in public would otherwise bury
// the user's own routines under hundreds of entries.
fn routines_sql(capabilities: Capabilities) -> String {
    let (kind, filter) = if capabilities.prokind {
        ("p.prokind::text", "p.prokind IN ('f', 'p')")
    } else {
        ("'f'::text", "NOT p.proisagg AND NOT p.proiswindow")
    };
    format!(
        "SELECT p.proname::text, {kind}, pg_get_function_arguments(p.oid), \
                pg_get_function_result(p.oid), \
                p.proargnames::text[], p.proargmodes::text[], \
                ARRAY(SELECT format_type(t, NULL) \
                      FROM unnest(COALESCE(p.proallargtypes, p.proargtypes::oid[])) \
                           WITH ORDINALITY AS a(t, n) ORDER BY n)::text[], \
                p.pronargdefaults::int4 \
         FROM pg_proc p \
         JOIN pg_namespace n ON n.oid = p.pronamespace \
         WHERE n.nspname = $1 AND {filter} \
           AND NOT EXISTS (SELECT 1 FROM pg_depend d \
                           WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid \
                             AND d.deptype = 'e') \
         ORDER BY p.proname, pg_get_function_arguments(p.oid)"
    )
}

fn routine_row(row: &PgRow) -> Result<RoutineInfo, DriverError> {
    let kind = if get::<String>(row, 1)? == "p" {
        RoutineKind::Procedure
    } else {
        RoutineKind::Function
    };
    Ok(RoutineInfo {
        name: get(row, 0)?,
        kind,
        arguments: get::<Option<String>>(row, 2)?.unwrap_or_default(),
        return_type: match kind {
            RoutineKind::Function => get(row, 3)?,
            RoutineKind::Procedure => None,
        },
        parameters: build_parameters(
            get::<Option<Vec<String>>>(row, 4)?,
            get::<Option<Vec<String>>>(row, 5)?,
            get::<Option<Vec<String>>>(row, 6)?.unwrap_or_default(),
            get::<Option<i32>>(row, 7)?.unwrap_or(0),
        ),
    })
}

/// The parameters of a `pg_proc` row: `proargnames` and `proargmodes` are
/// NULL when every parameter is an unnamed IN; `TABLE` ones (`RETURNS
/// TABLE`) are result columns, not parameters; the defaults
/// (`pronargdefaults`) are the last N input parameters.
fn build_parameters(
    names: Option<Vec<String>>,
    modes: Option<Vec<String>>,
    types: Vec<String>,
    defaults: i32,
) -> Vec<RoutineParameter> {
    let mut parameters: Vec<RoutineParameter> = types
        .into_iter()
        .enumerate()
        .filter_map(|(index, data_type)| {
            let mode = match modes
                .as_ref()
                .and_then(|modes| modes.get(index))
                .map(String::as_str)
            {
                Some("o") => ParameterMode::Out,
                Some("b") => ParameterMode::InOut,
                Some("v") => ParameterMode::Variadic,
                Some("t") => return None,
                _ => ParameterMode::In,
            };
            let name = names
                .as_ref()
                .and_then(|names| names.get(index))
                .filter(|name| !name.is_empty())
                .cloned();
            Some(RoutineParameter {
                name,
                mode,
                data_type,
                has_default: false,
            })
        })
        .collect();
    let mut left = usize::try_from(defaults).unwrap_or(0);
    for parameter in parameters.iter_mut().rev() {
        if left == 0 {
            break;
        }
        if parameter.mode != ParameterMode::Out {
            parameter.has_default = true;
            left -= 1;
        }
    }
    parameters
}

const SEQUENCES_SQL: &str = "\
    SELECT c.relname::text, format_type(s.seqtypid, NULL) \
    FROM pg_class c \
    JOIN pg_namespace n ON n.oid = c.relnamespace \
    LEFT JOIN pg_sequence s ON s.seqrelid = c.oid \
    WHERE n.nspname = $1 AND c.relkind = 'S' \
    ORDER BY c.relname";

// Before 10 there's no pg_sequence (sequences were always bigint).
const SEQUENCES_LEGACY_SQL: &str = "\
    SELECT c.relname::text, 'bigint'::text \
    FROM pg_class c \
    JOIN pg_namespace n ON n.oid = c.relnamespace \
    WHERE n.nspname = $1 AND c.relkind = 'S' \
    ORDER BY c.relname";

fn sequence_row(row: &PgRow) -> Result<SequenceInfo, DriverError> {
    Ok(SequenceInfo {
        name: get(row, 0)?,
        data_type: get(row, 1)?,
    })
}

#[cfg(test)]
mod tests {

    mod parameters {
        use super::super::build_parameters;
        use khipu_driver_core::ParameterMode;

        fn texts(items: &[&str]) -> Option<Vec<String>> {
            Some(items.iter().map(|item| item.to_string()).collect())
        }

        #[test]
        fn todos_in_sin_nombres_ni_modos() {
            let found = build_parameters(None, None, vec!["integer".into(), "text".into()], 0);
            assert_eq!(found.len(), 2);
            assert!(
                found
                    .iter()
                    .all(|p| p.mode == ParameterMode::In && p.name.is_none())
            );
        }

        #[test]
        fn modos_nombres_defaults_y_table() {
            let found = build_parameters(
                texts(&["p_id", "", "p_total", "p_tags", "col"]),
                texts(&["i", "i", "o", "v", "t"]),
                vec![
                    "integer".into(),
                    "text".into(),
                    "numeric".into(),
                    "text[]".into(),
                    "int".into(),
                ],
                1,
            );
            // La columna de RETURNS TABLE no es un parametro.
            assert_eq!(found.len(), 4);
            assert_eq!(found[0].name.as_deref(), Some("p_id"));
            assert_eq!(found[1].name, None);
            assert_eq!(found[2].mode, ParameterMode::Out);
            assert_eq!(found[3].mode, ParameterMode::Variadic);
            // El default es el del ultimo de entrada (el VARIADIC), no el OUT.
            assert!(found[3].has_default);
            assert!(!found[2].has_default && !found[1].has_default);
        }
    }

    use super::*;

    #[test]
    fn decodes_trigger_timing_and_events() {
        // AFTER INSERT OR UPDATE FOR EACH ROW
        assert_eq!(
            decode_trigger_type(1 | 4 | 16),
            ("AFTER", vec!["INSERT", "UPDATE"])
        );
        // BEFORE DELETE FOR EACH ROW
        assert_eq!(decode_trigger_type(1 | 2 | 8), ("BEFORE", vec!["DELETE"]));
        // INSTEAD OF INSERT (views), AFTER TRUNCATE (statement level)
        assert_eq!(
            decode_trigger_type(1 | 64 | 4),
            ("INSTEAD OF", vec!["INSERT"])
        );
        assert_eq!(decode_trigger_type(32), ("AFTER", vec!["TRUNCATE"]));
    }

    #[test]
    fn check_expression_strips_wrapper_but_keeps_inner_parentheses() {
        assert_eq!(check_expression("CHECK ((price > 0))"), "(price > 0)");
        assert_eq!(check_expression("CHECK (price > 0)"), "price > 0");
        assert_eq!(check_expression("CHECK ((a > 0)) NOT VALID"), "(a > 0)");
        assert_eq!(
            check_expression("CHECK ((a > 0) OR (b > 0))"),
            "(a > 0) OR (b > 0)"
        );
    }

    #[test]
    fn balanced_rejects_split_parentheses() {
        assert!(balanced("a > 0"));
        assert!(balanced("(a) OR (b)"));
        assert!(!balanced("a) OR (b"));
    }

    #[test]
    fn splits_keys_and_checks() {
        let row = |kind: &str, column: Option<&str>| ConstraintColumnRow {
            table: "orders".to_string(),
            name: format!("c_{kind}"),
            kind: kind.to_string(),
            column: column.map(str::to_string),
            definition: "CHECK ((total >= 0))".to_string(),
        };
        let (keys, checks) = split_constraints(vec![
            row("p", Some("id")),
            row("u", Some("number")),
            row("c", None),
        ]);

        assert_eq!(keys.len(), 2);
        assert!(keys[0].primary);
        assert!(!keys[1].primary);
        assert_eq!(checks.len(), 1);
        assert_eq!(checks[0].1.expression, "(total >= 0)");
    }
}
