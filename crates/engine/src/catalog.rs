//! In-memory schema catalog that completion resolves against. Populated by a
//! khipu-driver-* crate via `DbConnector::list_tables`, kept independent of any
//! single database's introspection format.

use serde::Serialize;

#[derive(Debug, Clone, Default, Serialize)]
pub struct SchemaCatalog {
    pub tables: Vec<CatalogTable>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogTable {
    pub schema: String,
    pub name: String,
    pub columns: Vec<CatalogColumn>,
    pub foreign_keys: Vec<CatalogForeignKey>,
}

/// A single column's shape as reported by the driver's introspection, kept as
/// the engine's own type so `khipu-engine` never has to depend on
/// `khipu-driver-core` just to hold this data.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogColumn {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
    pub is_primary_key: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub comment: Option<String>,
}

/// A foreign key owned by a `CatalogTable`: `column` on this table references
/// `referenced_column` on `referenced_table`. Used by the frontend to suggest
/// JOIN targets and auto-complete their ON condition (see editor/completionSource.ts).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogForeignKey {
    pub column: String,
    pub referenced_table: String,
    pub referenced_column: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catalog_table_serializes_foreign_keys_to_camel_case() {
        let table = CatalogTable {
            schema: "public".to_string(),
            name: "orders".to_string(),
            columns: vec![],
            foreign_keys: vec![CatalogForeignKey {
                column: "user_id".to_string(),
                referenced_table: "users".to_string(),
                referenced_column: "id".to_string(),
            }],
        };

        let json = serde_json::to_value(&table).expect("CatalogTable should serialize");

        assert_eq!(
            json["foreignKeys"][0],
            serde_json::json!({
                "column": "user_id",
                "referencedTable": "users",
                "referencedColumn": "id",
            })
        );
    }
}
