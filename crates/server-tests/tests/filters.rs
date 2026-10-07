//! Los filtros del embudo de las columnas contra servidores reales
//! (pagination::filter_sql y column_values_sql): lo que se desmarca es
//! exactamente lo que el grid muestra, byte a byte, y nada mas.
//!   cargo test -p rowly-server-tests --test filters -- --ignored --test-threads=1
use khipu_driver_core::QueryExecutionResult;
use khipu_engine::execution_guard::GuardOptions;
use khipu_engine::pagination::{
    ColumnFilter, SortKey, column_values_sql, count_sql, filter_sql, paginate_sql, sort_sql,
};
use rowly_server_tests::*;
use std::collections::BTreeMap;

const TABLE: &str = "rowly_test.filters";
const VICTIM: &str = "rowly_test.filters_victim";
const HOSTILE: &str = "x'); DROP TABLE rowly_test.filters_victim; -- \\";

/// Columnas con lo que una comparacion directa haria mal: mayusculas y
/// espacios al final (la intercalacion de MySQL los junta), texto vacio y
/// NULL, otro juego de caracteres, numeros, fechas, JSON y un valor que
/// intenta salir de su cadena.
fn setup(engine: Engine) -> Vec<String> {
    let texts = [
        "'abc'",
        "'ABC'",
        "'abc '",
        "''",
        "NULL",
        "'ñandú'",
        "'it''s'",
    ];
    let (columns, hostile) = if engine.is_mysql_family() {
        (
            "id INT, txt VARCHAR(80), lat VARCHAR(10) CHARACTER SET latin1, num DECIMAL(6,2), \
             flo FLOAT, dt DATETIME, js JSON",
            format!("'{}'", HOSTILE.replace('\\', "\\\\").replace('\'', "''")),
        )
    } else {
        (
            "id INT, txt TEXT, lat VARCHAR(10), num NUMERIC(6,2), flo REAL, dt TIMESTAMP, \
             js JSON, flag BOOLEAN, arr INT[]",
            format!("'{}'", HOSTILE.replace('\'', "''")),
        )
    };
    let mut statements = vec![
        format!("DROP TABLE IF EXISTS {TABLE}"),
        format!("DROP TABLE IF EXISTS {VICTIM}"),
        format!("CREATE TABLE {VICTIM} (id INT)"),
        format!("CREATE TABLE {TABLE} ({columns})"),
    ];
    for id in 0..14 {
        let text = if id == 13 {
            hostile.clone()
        } else {
            texts[id % texts.len()].to_string()
        };
        let lat = ["'ñu'", "'Ñu'", "NULL", "'a'"][id % 4];
        let num = ["1.50", "2.00", "NULL"][id % 3];
        let flo = ["0.1", "1e10", "NULL", "-2.5"][id % 4];
        let dt = ["'2026-10-07 13:21:36'", "NULL"][id % 2];
        let js = ["'{\"a\": 1}'", "'[1, 2]'", "NULL"][id % 3];
        let mut values = format!("{id}, {text}, {lat}, {num}, {flo}, {dt}, {js}");
        if !engine.is_mysql_family() {
            let flag = ["true", "false", "NULL"][id % 3];
            let arr = ["'{1,2}'", "NULL"][id % 2];
            values.push_str(&format!(", {flag}, {arr}"));
        }
        statements.push(format!("INSERT INTO {TABLE} VALUES ({values})"));
    }
    statements
}

struct Grid {
    names: Vec<String>,
    types: Vec<String>,
    rows: Vec<Vec<Option<String>>>,
}

async fn grid(conn: &Conn, sql: &str) -> Result<Grid, String> {
    match conn.raw(sql).await {
        QueryExecutionResult::ResultSet { columns, rows, .. } => Ok(Grid {
            names: columns.iter().map(|column| column.name.clone()).collect(),
            types: columns
                .iter()
                .map(|column| column.data_type.clone())
                .collect(),
            rows,
        }),
        other => Err(error_text(&other)),
    }
}

fn ids(rows: &[Vec<Option<String>>]) -> Vec<String> {
    let mut ids: Vec<String> = rows.iter().map(|row| row[0].clone().unwrap()).collect();
    ids.sort_by_key(|id| id.parse::<u32>().unwrap());
    ids
}

#[tokio::test]
#[ignore = "requiere tools/test-dbs/up.sh"]
async fn the_funnel_filters_exactly_what_the_grid_shows() {
    let options = GuardOptions::default();
    let mut failures = Vec::new();
    for engine in selected(Engine::ALL) {
        let conn = Conn::open(engine).await;
        let dialect = engine.dialect();
        for sql in setup(engine) {
            let result = conn.raw(&sql).await;
            assert!(
                !is_error(&result),
                "{engine:?}: {sql}: {}",
                error_text(&result)
            );
        }
        let base = format!("SELECT * FROM {TABLE} ORDER BY id");
        let all = grid(&conn, &base).await.unwrap();

        for column in 1..all.names.len() {
            let name = &all.names[column];
            let filter = |excluded: Vec<Option<String>>| ColumnFilter {
                name: name.clone(),
                data_type: all.types[column].clone(),
                excluded,
            };
            let mut shown: BTreeMap<Option<String>, u64> = BTreeMap::new();
            for row in &all.rows {
                *shown.entry(row[column].clone()).or_default() += 1;
            }

            // Los valores del embudo son los del grid, con sus filas.
            let values_sql =
                column_values_sql(&base, dialect, options, &[], &filter(vec![]), 1000).unwrap();
            match grid(&conn, &values_sql).await {
                Ok(values) => {
                    let got: BTreeMap<Option<String>, u64> = values
                        .rows
                        .iter()
                        .map(|row| {
                            (
                                row[0].clone(),
                                row[2].as_deref().unwrap().parse::<u64>().unwrap(),
                            )
                        })
                        .collect();
                    if got != shown {
                        failures.push(format!(
                            "{engine:?} {name}: el embudo muestra {got:?}, el grid {shown:?}"
                        ));
                    }
                }
                Err(error) => failures.push(format!("{engine:?} {name}: {error}\n{values_sql}")),
            }

            // Desmarcar cada valor quita exactamente sus filas.
            for value in shown.keys() {
                let filters = [filter(vec![value.clone()])];
                let filtered = filter_sql(&base, dialect, options, &filters).unwrap();
                let expected: Vec<Vec<Option<String>>> = all
                    .rows
                    .iter()
                    .filter(|row| &row[column] != value)
                    .cloned()
                    .collect();
                match grid(&conn, &filtered).await {
                    Ok(got) if ids(&got.rows) == ids(&expected) => {}
                    Ok(got) => failures.push(format!(
                        "{engine:?} {name} sin {value:?}: quedan {:?}, no {:?}\n{filtered}",
                        ids(&got.rows),
                        ids(&expected)
                    )),
                    Err(error) => failures.push(format!(
                        "{engine:?} {name} sin {value:?}: {error}\n{filtered}"
                    )),
                }
                let count = count_sql(&filtered, dialect, options).unwrap();
                let total = conn.scalar(&count).await;
                if total != Some(expected.len().to_string()) {
                    failures.push(format!(
                        "{engine:?} {name} sin {value:?}: cuenta {total:?}, no {}\n{count}",
                        expected.len()
                    ));
                }
            }
        }

        // Con varios filtros: se ordena y pagina sobre las filas que pasan, y
        // el embudo de una columna cuenta lo que dejan las otras.
        let filters = [
            ColumnFilter {
                name: "txt".into(),
                data_type: String::new(),
                excluded: vec![Some("abc".into()), None],
            },
            ColumnFilter {
                name: "lat".into(),
                data_type: String::new(),
                excluded: vec![Some("ñu".into())],
            },
        ];
        let passes = |row: &Vec<Option<String>>| {
            row[1].as_deref() != Some("abc") && row[1].is_some() && row[2].as_deref() != Some("ñu")
        };
        let expected: Vec<Vec<Option<String>>> =
            all.rows.iter().filter(|row| passes(row)).cloned().collect();
        let filtered = filter_sql(&base, dialect, options, &filters).unwrap();
        let sorted = sort_sql(
            &filtered,
            dialect,
            options,
            &[SortKey {
                column: 0,
                descending: true,
            }],
        )
        .unwrap();
        let page = paginate_sql(&sorted, dialect, options, 1, 2).unwrap();
        let mut descending = ids(&expected);
        descending.reverse();
        match grid(&conn, &page).await {
            Ok(got) => {
                let got: Vec<String> = got.rows.iter().map(|row| row[0].clone().unwrap()).collect();
                if got != descending[1..3] {
                    failures.push(format!(
                        "{engine:?}: la pagina 2 es {got:?}, no {:?}\n{page}",
                        &descending[1..3]
                    ));
                }
            }
            Err(error) => failures.push(format!("{engine:?}: {error}\n{page}")),
        }
        let lat_values = column_values_sql(
            &base,
            dialect,
            options,
            &filters,
            &ColumnFilter {
                name: "lat".into(),
                data_type: String::new(),
                excluded: vec![],
            },
            1000,
        )
        .unwrap();
        let after_txt = all
            .rows
            .iter()
            .filter(|row| row[1].as_deref() != Some("abc") && row[1].is_some());
        let mut remaining: BTreeMap<Option<String>, u64> = BTreeMap::new();
        for row in all.rows.iter() {
            remaining.entry(row[2].clone()).or_default();
        }
        for row in after_txt {
            *remaining.entry(row[2].clone()).or_default() += 1;
        }
        match grid(&conn, &lat_values).await {
            Ok(values) => {
                let got: BTreeMap<Option<String>, u64> = values
                    .rows
                    .iter()
                    .map(|row| (row[0].clone(), row[1].as_deref().unwrap().parse().unwrap()))
                    .collect();
                if got != remaining {
                    failures.push(format!(
                        "{engine:?}: lat con el filtro de txt cuenta {got:?}, no {remaining:?}"
                    ));
                }
            }
            Err(error) => failures.push(format!("{engine:?}: {error}\n{lat_values}")),
        }

        // El valor que intenta salir de su cadena: ni sin la barrera del
        // driver (varias sentencias) ejecuta su carga.
        let hostile = filter_sql(
            &base,
            dialect,
            options,
            &[ColumnFilter {
                name: "txt".into(),
                data_type: String::new(),
                excluded: vec![Some(HOSTILE.into())],
            }],
        )
        .unwrap();
        Conn::multi_statement(engine, &hostile).await;
        if is_error(&conn.raw(&format!("SELECT COUNT(*) FROM {VICTIM}")).await) {
            failures.push(format!(
                "{engine:?}: el filtro ejecuto la carga:\n{hostile}"
            ));
        }

        for sql in [
            format!("DROP TABLE IF EXISTS {TABLE}"),
            format!("DROP TABLE IF EXISTS {VICTIM}"),
        ] {
            conn.raw(&sql).await;
        }
    }
    assert!(failures.is_empty(), "\n{}\n", failures.join("\n---\n"));
}
