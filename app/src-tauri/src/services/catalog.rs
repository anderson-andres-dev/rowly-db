use khipu_driver_core::TableInfo;
use khipu_engine::catalog::{CatalogColumn, CatalogForeignKey, CatalogTable, SchemaCatalog};

/// Converts driver introspection results into the engine's own catalog types,
/// preserving column metadata so completion can use it (primary keys, types,
/// nullability, foreign keys). Views are included: they're queryable too.
pub fn tables_to_catalog(tables: impl IntoIterator<Item = TableInfo>) -> SchemaCatalog {
    let tables = tables
        .into_iter()
        .map(|table| CatalogTable {
            schema: table.schema,
            name: table.name,
            columns: table
                .columns
                .into_iter()
                .map(|column| CatalogColumn {
                    name: column.name,
                    data_type: column.data_type,
                    nullable: column.nullable,
                    is_primary_key: column.is_primary_key,
                    comment: column.comment,
                })
                .collect(),
            foreign_keys: table
                .foreign_keys
                .into_iter()
                .map(|fk| CatalogForeignKey {
                    column: fk.column,
                    referenced_table: fk.referenced_table,
                    referenced_column: fk.referenced_column,
                })
                .collect(),
        })
        .collect();

    SchemaCatalog { tables }
}

#[cfg(test)]
mod tests {
    use super::*;
    use khipu_driver_core::{ColumnInfo, ForeignKeyInfo, RelationKind};

    #[test]
    fn preserves_column_metadata() {
        let mut table = TableInfo::new("public", "users".to_string(), RelationKind::Table, None);
        table.columns.push(ColumnInfo {
            name: "id".to_string(),
            data_type: "integer".to_string(),
            nullable: false,
            is_primary_key: true,
            comment: Some("Identificador unico".to_string()),
            default_value: None,
            generated: false,
        });
        let tables = vec![table];

        let catalog = tables_to_catalog(tables);

        assert_eq!(catalog.tables.len(), 1);
        let column = &catalog.tables[0].columns[0];
        assert_eq!(column.name, "id");
        assert_eq!(column.data_type, "integer");
        assert!(!column.nullable);
        assert!(column.is_primary_key);
        assert_eq!(column.comment.as_deref(), Some("Identificador unico"));
    }

    #[test]
    fn preserves_foreign_keys() {
        let mut table = TableInfo::new("public", "orders".to_string(), RelationKind::Table, None);
        table.foreign_keys.push(ForeignKeyInfo {
            name: "fk_orders_user".to_string(),
            column: "user_id".to_string(),
            referenced_table: "users".to_string(),
            referenced_column: "id".to_string(),
        });
        let tables = vec![table];

        let catalog = tables_to_catalog(tables);

        let fk = &catalog.tables[0].foreign_keys[0];
        assert_eq!(fk.column, "user_id");
        assert_eq!(fk.referenced_table, "users");
        assert_eq!(fk.referenced_column, "id");
    }
}
