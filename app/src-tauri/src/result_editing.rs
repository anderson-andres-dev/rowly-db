//! Edicion del resultado desde el grid: cruza el analisis de la consulta
//! (khipu_engine::editing) con el catalogo cargado para decidir que se puede
//! editar, y valida los cambios que manda el frontend antes de generar SQL.
//!
//! El frontend nunca manda SQL: manda tabla + cambios estructurados, y todo
//! (existencia de la tabla y columnas, clave primaria, tipos) se vuelve a
//! comprobar aca contra el catalogo.

use khipu_driver_core::{Message, RelationKind, SchemaObjects, TableInfo, TransactionStatement};
use khipu_engine::Dialect;
use khipu_engine::editing::{
    CellValue, ColumnValue, ResultChanges, RowUpdate, analyze_editable_query,
    build_change_statements,
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EditTarget {
    pub schema: String,
    pub table: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EditableColumn {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
    pub is_primary_key: bool,
    pub default_value: Option<String>,
    pub generated: bool,
}

/// Que se puede editar de un resultado: una entrada por columna del
/// resultado (`None` = solo lectura) y las columnas de la clave primaria.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResultEditInfo {
    pub target: EditTarget,
    pub columns: Vec<Option<EditableColumn>>,
    pub key_columns: Vec<String>,
}

fn find_table<'a>(
    schemas: &'a BTreeMap<String, SchemaObjects>,
    schema: &str,
    table: &str,
) -> Option<&'a TableInfo> {
    let objects = schemas.get(schema).or_else(|| {
        schemas
            .values()
            .find(|objects| objects.schema.eq_ignore_ascii_case(schema))
    })?;
    objects
        .tables
        .iter()
        .find(|candidate| candidate.name == table)
        .or_else(|| {
            objects
                .tables
                .iter()
                .find(|candidate| candidate.name.eq_ignore_ascii_case(table))
        })
}

pub fn edit_info(
    sql: &str,
    dialect: Dialect,
    default_schema: &str,
    schemas: &BTreeMap<String, SchemaObjects>,
    result_columns: &[String],
) -> Result<ResultEditInfo, Message> {
    let query = analyze_editable_query(sql, dialect)
        .map_err(|reason| Message::key(format!("notEditable.{}", reason.as_key())))?;
    let schema = query
        .schema
        .clone()
        .unwrap_or_else(|| default_schema.to_string());
    let table = find_table(schemas, &schema, &query.table).ok_or_else(|| {
        if schemas.contains_key(&schema) {
            Message::key("edit.tableNotInCatalog").with("table", &query.table)
        } else {
            Message::key("edit.schemaNotLoaded").with("schema", &schema)
        }
    })?;
    if table.kind != RelationKind::Table {
        return Err(Message::key("edit.isView"));
    }
    let key_columns: Vec<String> = table
        .columns
        .iter()
        .filter(|column| column.is_primary_key)
        .map(|column| column.name.clone())
        .collect();
    if key_columns.is_empty() {
        return Err(Message::key("edit.noPrimaryKey").with("table", &table.name));
    }

    let table_column = |name: &str| {
        table
            .columns
            .iter()
            .find(|column| column.name.eq_ignore_ascii_case(name))
    };
    let columns: Vec<Option<EditableColumn>> = result_columns
        .iter()
        .map(|result_name| {
            // Un nombre repetido en el resultado (dos "id") es ambiguo: no se
            // sabe cual celda corresponde a cual columna.
            if result_columns
                .iter()
                .filter(|other| other.eq_ignore_ascii_case(result_name))
                .count()
                > 1
            {
                return None;
            }
            let source = match query
                .columns
                .iter()
                .find(|(name, _)| name.eq_ignore_ascii_case(result_name))
            {
                Some((_, source)) => source.clone(),
                None if query.wildcard => Some(result_name.clone()),
                None => None,
            }?;
            let column = table_column(&source)?;
            Some(EditableColumn {
                name: column.name.clone(),
                data_type: column.data_type.clone(),
                nullable: column.nullable,
                is_primary_key: column.is_primary_key,
                default_value: column.default_value.clone(),
                generated: column.generated,
            })
        })
        .collect();

    let missing: Vec<&String> = key_columns
        .iter()
        .filter(|key| {
            !columns
                .iter()
                .flatten()
                .any(|column| column.name.eq_ignore_ascii_case(key))
        })
        .collect();
    if !missing.is_empty() {
        return Err(Message::key("edit.keyMissing").with(
            "columns",
            missing
                .iter()
                .map(|key| key.as_str())
                .collect::<Vec<_>>()
                .join(", "),
        ));
    }

    Ok(ResultEditInfo {
        target: EditTarget {
            schema: table.schema.clone(),
            table: table.name.clone(),
        },
        columns,
        key_columns,
    })
}

/// Valida los cambios contra el catalogo y devuelve las sentencias a
/// ejecutar (las mismas que muestra la vista previa).
pub fn statements(
    dialect: Dialect,
    schemas: &BTreeMap<String, SchemaObjects>,
    target: &EditTarget,
    changes: &ResultChanges,
) -> Result<Vec<TransactionStatement>, Message> {
    let table = find_table(schemas, &target.schema, &target.table)
        .filter(|table| table.kind == RelationKind::Table)
        .ok_or_else(|| {
            Message::key("edit.tableNotFound")
                .with("table", format!("{}.{}", target.schema, target.table))
        })?;

    let typed = |item: &ColumnValue, writing: bool| -> Result<ColumnValue, Message> {
        let column = table
            .columns
            .iter()
            .find(|column| column.name.eq_ignore_ascii_case(&item.column))
            .ok_or_else(|| {
                Message::key("edit.columnNotFound")
                    .with("column", &item.column)
                    .with("table", &table.name)
            })?;
        if writing && column.generated && item.value != CellValue::Default {
            return Err(Message::key("edit.generatedColumn").with("column", &column.name));
        }
        Ok(ColumnValue {
            column: column.name.clone(),
            data_type: column.data_type.clone(),
            value: item.value.clone(),
        })
    };
    let primary_key: Vec<&str> = table
        .columns
        .iter()
        .filter(|column| column.is_primary_key)
        .map(|column| column.name.as_str())
        .collect();
    let key = |values: &[ColumnValue]| -> Result<Vec<ColumnValue>, Message> {
        let typed_key = values
            .iter()
            .map(|item| typed(item, false))
            .collect::<Result<Vec<_>, _>>()?;
        let complete = primary_key.len() == typed_key.len()
            && primary_key
                .iter()
                .all(|name| typed_key.iter().any(|item| item.column == *name));
        if !complete
            || typed_key
                .iter()
                .any(|item| !matches!(item.value, CellValue::Text(_)))
        {
            return Err(Message::key("edit.incompleteKey"));
        }
        Ok(typed_key)
    };

    let validated = ResultChanges {
        deletes: changes
            .deletes
            .iter()
            .map(|values| key(values))
            .collect::<Result<_, _>>()?,
        updates: changes
            .updates
            .iter()
            .map(|update| {
                Ok(RowUpdate {
                    key: key(&update.key)?,
                    set: update
                        .set
                        .iter()
                        .map(|item| typed(item, true))
                        .collect::<Result<_, Message>>()?,
                })
            })
            .collect::<Result<_, Message>>()?,
        inserts: changes
            .inserts
            .iter()
            .map(|values| {
                values
                    .iter()
                    .map(|item| typed(item, true))
                    .collect::<Result<Vec<_>, _>>()
            })
            .collect::<Result<_, _>>()?,
    };

    let sql = build_change_statements(dialect, Some(&table.schema), &table.name, &validated);
    // build_change_statements emite DELETE, UPDATE (salteando los vacios) e
    // INSERT en ese orden: los primeros deletes + updates no vacios tocan
    // una fila exacta cada uno.
    let exact = validated.deletes.len()
        + validated
            .updates
            .iter()
            .filter(|update| !update.set.is_empty())
            .count();
    Ok(sql
        .into_iter()
        .enumerate()
        .map(|(index, sql)| TransactionStatement {
            sql,
            expect_one_row: index < exact,
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use khipu_driver_core::ColumnInfo;

    fn schemas() -> BTreeMap<String, SchemaObjects> {
        let mut table = TableInfo::new("core", "incidents".to_string(), RelationKind::Table, None);
        for (name, data_type, pk, generated) in [
            ("id", "int", true, true),
            ("seve", "varchar(20)", false, false),
            ("total", "decimal(10,2)", false, false),
        ] {
            table.columns.push(ColumnInfo {
                name: name.to_string(),
                data_type: data_type.to_string(),
                nullable: !pk,
                is_primary_key: pk,
                comment: None,
                default_value: None,
                generated,
            });
        }
        let mut objects = SchemaObjects::new("core");
        objects.tables.push(table);
        BTreeMap::from([("core".to_string(), objects)])
    }

    fn names(names: &[&str]) -> Vec<String> {
        names.iter().map(|name| name.to_string()).collect()
    }

    #[test]
    fn select_con_clave_es_editable() {
        let info = edit_info(
            "SELECT *, UPPER(seve) AS s FROM incidents",
            Dialect::MySql,
            "core",
            &schemas(),
            &names(&["id", "seve", "total", "s"]),
        )
        .unwrap();
        assert_eq!(info.key_columns, vec!["id"]);
        assert!(info.columns[1].is_some());
        assert!(info.columns[3].is_none());
    }

    #[test]
    fn sin_clave_en_el_resultado_no_es_editable() {
        let error = edit_info(
            "SELECT seve FROM incidents",
            Dialect::MySql,
            "core",
            &schemas(),
            &names(&["seve"]),
        )
        .unwrap_err();
        assert_eq!(error.key_name(), Some("edit.keyMissing"), "{error}");
    }

    #[test]
    fn valida_columnas_y_marca_las_sentencias_exactas() {
        let target = EditTarget {
            schema: "core".to_string(),
            table: "incidents".to_string(),
        };
        let text = |column: &str, value: &str| ColumnValue {
            column: column.to_string(),
            data_type: String::new(),
            value: CellValue::Text(value.to_string()),
        };
        let changes = ResultChanges {
            updates: vec![RowUpdate {
                key: vec![text("id", "24")],
                set: vec![text("total", "10.50")],
            }],
            inserts: vec![vec![text("seve", "error")]],
            ..Default::default()
        };
        let statements = statements(Dialect::MySql, &schemas(), &target, &changes).unwrap();
        assert_eq!(
            statements[0].sql,
            "UPDATE core.incidents\nSET total = 10.50\nWHERE id = 24;"
        );
        assert!(statements[0].expect_one_row);
        assert!(!statements[1].expect_one_row);

        // Escribir una columna generada o una que no existe se rechaza.
        let bad = ResultChanges {
            inserts: vec![vec![text("id", "5")]],
            ..Default::default()
        };
        assert!(super::statements(Dialect::MySql, &schemas(), &target, &bad).is_err());
        let unknown = ResultChanges {
            inserts: vec![vec![text("nope", "5")]],
            ..Default::default()
        };
        assert!(super::statements(Dialect::MySql, &schemas(), &target, &unknown).is_err());
    }
}
