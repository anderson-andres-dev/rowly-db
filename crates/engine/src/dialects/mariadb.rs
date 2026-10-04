//! MariaDB: el SQL de MySQL mas lo propio. Comparte driver con MySQL, pero
//! es un motor con su identidad: donde difiere, lo dice aca.

use super::mysql;
use super::{DoBlocks, EngineDefinition, InsertDefaults, RoutineBodies};

pub const DEFINITION: EngineDefinition = EngineDefinition {
    id: "mariadb",
    parser: || Box::new(sqlparser::dialect::MySqlDialect {}),
    statement_starters: mysql::STARTERS,
    unparsed_syntax: &[mysql::UNPARSED, UNPARSED],
    unparsed_writes: mysql::UNPARSED_WRITES,
    system_tables: &["DUAL"],
    system_table_prefixes: &[],
    folds_unquoted_to_lowercase: false,
    backslash_escapes: true,
    identifier_quote: '`',
    insert_defaults: InsertDefaults::EmptyValues,
    // /*M! ... */ ejecuta solo en MariaDB.
    executable_comments: &["/*!", "/*M!"],
    routine_kinds: mysql::ROUTINE_KINDS,
    routine_bodies: RoutineBodies::Block,
    do_blocks: DoBlocks::Expression,
    select_into_variable_lists: true,
    sql_mode_query: Some(mysql::SQL_MODE_QUERY),
    lines: include_str!("../../../../support/mariadb.json"),
};

const UNPARSED: &[&[&str]] = &[
    // ANALYZE SELECT ...: el plan con ejecucion de MariaDB (en MySQL es
    // EXPLAIN ANALYZE).
    &["ANALYZE", "SELECT"],
    &["ANALYZE", "FORMAT"],
    // Secuencias: SELECT NEXT VALUE FOR s (PREVIOUS VALUE igual).
    &["NEXT", "VALUE", "FOR"],
    &["PREVIOUS", "VALUE", "FOR"],
    // Tablas versionadas: FROM t FOR SYSTEM_TIME AS OF ...
    &["FOR", "SYSTEM_TIME"],
    // ALTER TABLE ... ADD/DROP COLUMN IF [NOT] EXISTS.
    &["COLUMN", "IF", "NOT", "EXISTS"],
    &["COLUMN", "IF", "EXISTS"],
];
