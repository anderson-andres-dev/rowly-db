//! Edicion de resultados desde el grid: decide si una consulta produce filas
//! que se pueden editar (y de que tabla/columnas salen), y genera el SQL de
//! los cambios pendientes (`DELETE`/`UPDATE`/`INSERT`).
//!
//! No sabe nada del catalogo ni de la ejecucion: la app cruza lo que devuelve
//! `analyze_editable_query` con las columnas y la clave primaria que conoce, y
//! le pasa a `build_change_statements` cambios ya validados. Los valores
//! nunca se concatenan tal cual: se escapan como literales del dialecto, y
//! los identificadores se citan cuando hace falta.

use crate::Dialect;
use serde::{Deserialize, Serialize};
use sqlparser::ast::{
    Expr, GroupByExpr, Ident, ObjectName, ObjectNamePart, SelectItem,
    SelectItemQualifiedWildcardKind, SetExpr, Statement, TableFactor,
};
use sqlparser::parser::Parser;

/// De donde salen las filas de una consulta editable.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EditableQuery {
    pub schema: Option<String>,
    pub table: String,
    /// La proyeccion incluye `*` (o `alias.*`): toda columna de la tabla que
    /// aparezca en el resultado con su nombre es editable.
    pub wildcard: bool,
    /// Columnas nombradas en la proyeccion, por el nombre con que salen en
    /// el resultado: `Some(columna)` si es una columna de la tabla (con o sin
    /// alias), `None` si es una expresion (solo lectura).
    pub columns: Vec<(String, Option<String>)>,
}

/// Por que las filas de una consulta no se pueden editar una a una. La app
/// lo muestra traducido (`backend.notEditable.<motivo>` en el frontend).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum NotEditable {
    Unparseable,
    NotSelect,
    UsesWith,
    SetOperation,
    UsesDistinct,
    GroupsRows,
    NoTable,
    SeveralTables,
    UsesJoin,
    NotPlainTable,
}

impl NotEditable {
    /// El nombre del motivo en camelCase, igual que al serializar.
    pub fn as_key(self) -> &'static str {
        match self {
            NotEditable::Unparseable => "unparseable",
            NotEditable::NotSelect => "notSelect",
            NotEditable::UsesWith => "usesWith",
            NotEditable::SetOperation => "setOperation",
            NotEditable::UsesDistinct => "usesDistinct",
            NotEditable::GroupsRows => "groupsRows",
            NotEditable::NoTable => "noTable",
            NotEditable::SeveralTables => "severalTables",
            NotEditable::UsesJoin => "usesJoin",
            NotEditable::NotPlainTable => "notPlainTable",
        }
    }
}

/// Analiza `sql` y devuelve la tabla de origen si sus filas se pueden
/// editar una a una, o el motivo si no.
pub fn analyze_editable_query(sql: &str, dialect: Dialect) -> Result<EditableQuery, NotEditable> {
    let statements = Parser::parse_sql(&*dialect.as_sqlparser_dialect(), sql)
        .map_err(|_| NotEditable::Unparseable)?;
    let [Statement::Query(query)] = statements.as_slice() else {
        return Err(NotEditable::NotSelect);
    };
    if query.with.is_some() {
        return Err(NotEditable::UsesWith);
    }
    let SetExpr::Select(select) = query.body.as_ref() else {
        return Err(NotEditable::SetOperation);
    };
    if select.distinct.is_some() {
        return Err(NotEditable::UsesDistinct);
    }
    let groups =
        !matches!(&select.group_by, GroupByExpr::Expressions(exprs, _) if exprs.is_empty());
    if groups || select.having.is_some() {
        return Err(NotEditable::GroupsRows);
    }
    let [from] = select.from.as_slice() else {
        return Err(if select.from.is_empty() {
            NotEditable::NoTable
        } else {
            NotEditable::SeveralTables
        });
    };
    if !from.joins.is_empty() {
        return Err(NotEditable::UsesJoin);
    }
    let TableFactor::Table {
        name,
        alias,
        args: None,
        ..
    } = &from.relation
    else {
        return Err(NotEditable::NotPlainTable);
    };

    let parts = name_parts(name, dialect);
    let (schema, table) = match parts.as_slice() {
        [table] => (None, table.clone()),
        [.., schema, table] => (Some(schema.clone()), table.clone()),
        [] => return Err(NotEditable::NoTable),
    };
    // Calificadores validos para `x.columna` / `x.*`: el alias, o el nombre
    // de la tabla (con o sin schema) si no tiene alias.
    let qualifiers: Vec<String> = match alias {
        Some(alias) => vec![ident_name(&alias.name, dialect)],
        None => vec![table.clone()],
    };
    let is_own = |qualifier: &[String]| {
        qualifier
            .last()
            .is_some_and(|last| qualifiers.iter().any(|q| q.eq_ignore_ascii_case(last)))
    };

    let mut wildcard = false;
    let mut columns = Vec::new();
    for item in &select.projection {
        match item {
            SelectItem::Wildcard(_) => wildcard = true,
            SelectItem::QualifiedWildcard(SelectItemQualifiedWildcardKind::ObjectName(name), _) => {
                if is_own(&name_parts(name, dialect)) {
                    wildcard = true;
                }
            }
            SelectItem::QualifiedWildcard(..) => {}
            SelectItem::UnnamedExpr(expr) => {
                if let Some(column) = own_column(expr, dialect, &is_own) {
                    columns.push((column.clone(), Some(column)));
                }
            }
            SelectItem::ExprWithAlias { expr, alias } => {
                columns.push((
                    ident_name(alias, dialect),
                    own_column(expr, dialect, &is_own),
                ));
            }
        }
    }

    Ok(EditableQuery {
        schema,
        table,
        wildcard,
        columns,
    })
}

/// Nombre efectivo de un identificador: Postgres pasa a minusculas los que
/// no van entre comillas (`FROM Users` es la tabla `users`); MySQL los deja
/// como estan.
fn ident_name(ident: &Ident, dialect: Dialect) -> String {
    if dialect == Dialect::Postgres && ident.quote_style.is_none() {
        ident.value.to_lowercase()
    } else {
        ident.value.clone()
    }
}

fn name_parts(name: &ObjectName, dialect: Dialect) -> Vec<String> {
    name.0
        .iter()
        .map(|part| match part {
            ObjectNamePart::Identifier(ident) => ident_name(ident, dialect),
        })
        .collect()
}

/// `columna` o `alias.columna` de la propia tabla.
fn own_column(
    expr: &Expr,
    dialect: Dialect,
    is_own: &impl Fn(&[String]) -> bool,
) -> Option<String> {
    match expr {
        Expr::Identifier(ident) => Some(ident_name(ident, dialect)),
        Expr::CompoundIdentifier(idents) => {
            let (column, qualifier) = idents.split_last()?;
            let qualifier: Vec<String> = qualifier
                .iter()
                .map(|ident| ident_name(ident, dialect))
                .collect();
            is_own(&qualifier).then(|| ident_name(column, dialect))
        }
        _ => None,
    }
}

// --- Generacion de SQL ---------------------------------------------------

/// Valor de una celda en un cambio pendiente.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", content = "value", rename_all = "camelCase")]
pub enum CellValue {
    Null,
    Default,
    Text(String),
}

/// Columna con su tipo declarado (decide si un valor va como numero o como
/// string) y el valor a escribir.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnValue {
    pub column: String,
    #[serde(default)]
    pub data_type: String,
    pub value: CellValue,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RowUpdate {
    /// Valores ORIGINALES de la clave primaria: identifican la fila.
    pub key: Vec<ColumnValue>,
    pub set: Vec<ColumnValue>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResultChanges {
    #[serde(default)]
    pub deletes: Vec<Vec<ColumnValue>>,
    #[serde(default)]
    pub updates: Vec<RowUpdate>,
    #[serde(default)]
    pub inserts: Vec<Vec<ColumnValue>>,
}

impl ResultChanges {
    pub fn is_empty(&self) -> bool {
        self.deletes.is_empty() && self.updates.is_empty() && self.inserts.is_empty()
    }
}

/// Una sentencia por cambio, en el orden en que se ejecutan: primero los
/// `DELETE` (liberan claves unicas), despues los `UPDATE` y al final los
/// `INSERT`, como DataGrip. Cada una termina en `;` y ocupa varias lineas
/// para leerse bien en la vista previa.
pub fn build_change_statements(
    dialect: Dialect,
    schema: Option<&str>,
    table: &str,
    changes: &ResultChanges,
) -> Vec<String> {
    let target = match schema {
        Some(schema) => format!(
            "{}.{}",
            quote_ident(dialect, schema),
            quote_ident(dialect, table)
        ),
        None => quote_ident(dialect, table),
    };
    let mut statements = Vec::new();

    for key in &changes.deletes {
        statements.push(format!(
            "DELETE\nFROM {target}\nWHERE {};",
            where_clause(dialect, key)
        ));
    }

    for update in &changes.updates {
        if update.set.is_empty() {
            continue;
        }
        let set = update
            .set
            .iter()
            .map(|item| {
                format!(
                    "{} = {}",
                    quote_ident(dialect, &item.column),
                    literal(dialect, item)
                )
            })
            .collect::<Vec<_>>()
            .join(", ");
        statements.push(format!(
            "UPDATE {target}\nSET {set}\nWHERE {};",
            where_clause(dialect, &update.key)
        ));
    }

    for values in &changes.inserts {
        // Las columnas que quedan en DEFAULT no se nombran: el INSERT queda
        // mas corto y el servidor aplica su valor por defecto igual.
        let explicit: Vec<&ColumnValue> = values
            .iter()
            .filter(|item| item.value != CellValue::Default)
            .collect();
        if explicit.is_empty() {
            statements.push(match dialect {
                Dialect::MySql => format!("INSERT INTO {target} () VALUES ();"),
                Dialect::Postgres => format!("INSERT INTO {target} DEFAULT VALUES;"),
            });
            continue;
        }
        let names = explicit
            .iter()
            .map(|item| quote_ident(dialect, &item.column))
            .collect::<Vec<_>>()
            .join(", ");
        let literals = explicit
            .iter()
            .map(|item| literal(dialect, item))
            .collect::<Vec<_>>()
            .join(", ");
        statements.push(format!(
            "INSERT INTO {target} ({names})\nVALUES ({literals});"
        ));
    }

    statements
}

fn where_clause(dialect: Dialect, key: &[ColumnValue]) -> String {
    key.iter()
        .map(|item| match item.value {
            CellValue::Null => format!("{} IS NULL", quote_ident(dialect, &item.column)),
            _ => format!(
                "{} = {}",
                quote_ident(dialect, &item.column),
                literal(dialect, item)
            ),
        })
        .collect::<Vec<_>>()
        .join(" AND ")
}

fn literal(dialect: Dialect, item: &ColumnValue) -> String {
    match &item.value {
        CellValue::Null => "NULL".to_string(),
        CellValue::Default => "DEFAULT".to_string(),
        CellValue::Text(text) if is_numeric_type(&item.data_type) && is_plain_number(text) => {
            text.clone()
        }
        CellValue::Text(text) => string_literal(dialect, text),
    }
}

fn string_literal(dialect: Dialect, text: &str) -> String {
    let mut out = String::with_capacity(text.len() + 2);
    out.push('\'');
    for character in text.chars() {
        match character {
            '\'' => out.push_str("''"),
            // MySQL interpreta la barra invertida como escape dentro de
            // strings (salvo NO_BACKSLASH_ESCAPES); Postgres, con
            // standard_conforming_strings (el default), no.
            '\\' if dialect == Dialect::MySql => out.push_str("\\\\"),
            '\0' if dialect == Dialect::MySql => out.push_str("\\0"),
            _ => out.push(character),
        }
    }
    out.push('\'');
    out
}

fn is_numeric_type(data_type: &str) -> bool {
    let data_type = data_type.to_ascii_lowercase();
    [
        "int", "decimal", "numeric", "float", "double", "real", "serial", "bit", "money",
    ]
    .iter()
    .any(|numeric| data_type.contains(numeric))
        && !data_type.contains("interval")
        && !data_type.contains("point")
}

fn is_plain_number(text: &str) -> bool {
    let digits = text.strip_prefix('-').unwrap_or(text);
    let mut parts = digits.splitn(2, '.');
    let integer = parts.next().unwrap_or("");
    let fraction = parts.next();
    !integer.is_empty()
        && integer.bytes().all(|byte| byte.is_ascii_digit())
        && fraction.is_none_or(|fraction| {
            !fraction.is_empty() && fraction.bytes().all(|byte| byte.is_ascii_digit())
        })
}

// Palabras reservadas que obligan a citar un identificador en MySQL o
// Postgres. No es la lista completa de keywords de sqlparser a proposito:
// esa incluye cientos no reservadas (name, type, status...) y citar todas
// llenaria la vista previa de comillas sin necesidad.
const RESERVED: &[&str] = &[
    "all",
    "alter",
    "and",
    "any",
    "as",
    "asc",
    "between",
    "by",
    "case",
    "change",
    "check",
    "column",
    "condition",
    "constraint",
    "create",
    "cross",
    "current_date",
    "current_time",
    "current_timestamp",
    "current_user",
    "database",
    "default",
    "delete",
    "desc",
    "distinct",
    "drop",
    "else",
    "end",
    "exists",
    "false",
    "fetch",
    "for",
    "foreign",
    "from",
    "full",
    "function",
    "grant",
    "group",
    "having",
    "in",
    "index",
    "inner",
    "insert",
    "interval",
    "into",
    "is",
    "join",
    "key",
    "left",
    "like",
    "limit",
    "lock",
    "match",
    "natural",
    "not",
    "null",
    "offset",
    "on",
    "option",
    "or",
    "order",
    "outer",
    "primary",
    "range",
    "rank",
    "read",
    "references",
    "release",
    "rename",
    "right",
    "row",
    "rows",
    "schema",
    "select",
    "set",
    "show",
    "table",
    "then",
    "to",
    "trigger",
    "true",
    "union",
    "unique",
    "update",
    "usage",
    "user",
    "using",
    "values",
    "when",
    "where",
    "window",
    "with",
    "write",
];

/// Cita el identificador solo si hace falta (mayusculas en Postgres,
/// caracteres raros, palabra reservada).
pub fn quote_ident(dialect: Dialect, ident: &str) -> String {
    let simple = ident
        .chars()
        .next()
        .is_some_and(|first| first.is_ascii_alphabetic() || first == '_')
        && ident
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '_')
        && !(dialect == Dialect::Postgres
            && ident
                .chars()
                .any(|character| character.is_ascii_uppercase()))
        && !RESERVED.contains(&ident.to_ascii_lowercase().as_str());
    if simple {
        return ident.to_string();
    }
    match dialect {
        Dialect::MySql => format!("`{}`", ident.replace('`', "``")),
        Dialect::Postgres => format!("\"{}\"", ident.replace('"', "\"\"")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const MYSQL: Dialect = Dialect::MySql;

    fn value(column: &str, data_type: &str, value: CellValue) -> ColumnValue {
        ColumnValue {
            column: column.to_string(),
            data_type: data_type.to_string(),
            value,
        }
    }

    #[test]
    fn select_simple_es_editable() {
        let query = analyze_editable_query(
            "SELECT * FROM core.incidents WHERE id > 3 ORDER BY id",
            MYSQL,
        )
        .unwrap();
        assert_eq!(query.schema.as_deref(), Some("core"));
        assert_eq!(query.table, "incidents");
        assert!(query.wildcard);
    }

    #[test]
    fn distingue_columnas_alias_y_expresiones() {
        let query = analyze_editable_query(
            "SELECT t.id, t.name AS nombre, UPPER(t.name) AS n2 FROM users t",
            MYSQL,
        )
        .unwrap();
        assert!(!query.wildcard);
        assert_eq!(
            query.columns,
            vec![
                ("id".to_string(), Some("id".to_string())),
                ("nombre".to_string(), Some("name".to_string())),
                ("n2".to_string(), None),
            ]
        );
    }

    #[test]
    fn postgres_pasa_a_minusculas_lo_que_no_va_entre_comillas() {
        let query = analyze_editable_query(
            r#"SELECT U.Id, "Name" FROM Core.Users U"#,
            Dialect::Postgres,
        )
        .unwrap();
        assert_eq!(query.schema.as_deref(), Some("core"));
        assert_eq!(query.table, "users");
        assert_eq!(
            query.columns,
            vec![
                ("id".to_string(), Some("id".to_string())),
                ("Name".to_string(), Some("Name".to_string())),
            ]
        );
    }

    #[test]
    fn rechaza_lo_que_no_se_puede_editar() {
        for sql in [
            "SELECT * FROM a JOIN b ON a.id = b.a_id",
            "SELECT DISTINCT a FROM t",
            "SELECT a, COUNT(*) FROM t GROUP BY a",
            "SELECT * FROM a UNION SELECT * FROM b",
            "SELECT * FROM (SELECT * FROM t) x",
            "SELECT * FROM a, b",
            "SHOW TABLES",
            "UPDATE t SET a = 1",
        ] {
            assert!(analyze_editable_query(sql, MYSQL).is_err(), "{sql}");
        }
    }

    #[test]
    fn genera_delete_update_insert_en_orden() {
        let changes = ResultChanges {
            deletes: vec![vec![value("pinc_codi", "int", CellValue::Text("7".into()))]],
            updates: vec![RowUpdate {
                key: vec![value("pinc_codi", "int", CellValue::Text("24".into()))],
                set: vec![value(
                    "pinc_seve",
                    "varchar(20)",
                    CellValue::Text("error".into()),
                )],
            }],
            inserts: vec![vec![
                value("pinc_codi", "int", CellValue::Default),
                value("pinc_orig", "varchar(10)", CellValue::Null),
                value("pinc_seve", "varchar(20)", CellValue::Text("o'hara".into())),
            ]],
        };
        assert_eq!(
            build_change_statements(MYSQL, Some("core"), "incidents", &changes),
            vec![
                "DELETE\nFROM core.incidents\nWHERE pinc_codi = 7;".to_string(),
                "UPDATE core.incidents\nSET pinc_seve = 'error'\nWHERE pinc_codi = 24;".to_string(),
                "INSERT INTO core.incidents (pinc_orig, pinc_seve)\nVALUES (NULL, 'o''hara');"
                    .to_string(),
            ]
        );
    }

    #[test]
    fn escapa_valores_e_identificadores_por_dialecto() {
        let item = value("a", "text", CellValue::Text("c:\\tmp".into()));
        assert_eq!(literal(MYSQL, &item), "'c:\\\\tmp'");
        assert_eq!(literal(Dialect::Postgres, &item), "'c:\\tmp'");
        assert_eq!(quote_ident(MYSQL, "order"), "`order`");
        assert_eq!(quote_ident(Dialect::Postgres, "UserId"), "\"UserId\"");
        assert_eq!(quote_ident(MYSQL, "pinc_codi"), "pinc_codi");
        // Un "numero" que no es solo digitos va como string.
        let tricky = value("n", "int", CellValue::Text("1 OR 1=1".into()));
        assert_eq!(literal(MYSQL, &tricky), "'1 OR 1=1'");
    }

    #[test]
    fn insert_solo_con_defaults() {
        let changes = ResultChanges {
            inserts: vec![vec![value("id", "int", CellValue::Default)]],
            ..Default::default()
        };
        assert_eq!(
            build_change_statements(Dialect::Postgres, None, "t", &changes),
            vec!["INSERT INTO t DEFAULT VALUES;".to_string()]
        );
    }
}
