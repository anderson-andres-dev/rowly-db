pub mod catalog;
pub mod editing;
pub mod error_position;
pub mod execution_guard;
pub mod pagination;
pub mod parser;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Dialect {
    MySql,
    Postgres,
}

impl Dialect {
    pub fn as_sqlparser_dialect(&self) -> Box<dyn sqlparser::dialect::Dialect> {
        match self {
            Dialect::MySql => Box::new(sqlparser::dialect::MySqlDialect {}),
            Dialect::Postgres => Box::new(sqlparser::dialect::PostgreSqlDialect {}),
        }
    }
}
