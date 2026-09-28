//! Paginacion de resultados reescribiendo la consulta, no leyendo y
//! descartando filas: cada pagina le pide al servidor solo sus filas
//! (`LIMIT`/`OFFSET`), asi pasar a la pagina 20 cuesta lo mismo que la 1 del
//! lado de la app. Tambien arma el `SELECT COUNT(*)` para conocer el total.
//!
//! Solo se reescriben consultas que se pueden paginar con seguridad (un
//! `SELECT`/`UNION`/`VALUES` sin `FETCH`, `FOR UPDATE` ni `INTO`); para el
//! resto ambas funciones devuelven `None` y la app muestra solo la primera
//! pagina, como hasta ahora.

use crate::Dialect;
use serde::Deserialize;
use sqlparser::ast::{
    Expr, GroupByExpr, LimitClause, Offset, OffsetRows, OrderBy, OrderByExpr, OrderByKind,
    OrderByOptions, Query, SelectItem, SetExpr, Statement, Value,
};
use sqlparser::parser::Parser;

/// Una columna por la que ordenar desde el grid: su posicion en el resultado
/// (base 0) y el sentido.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SortKey {
    pub column: usize,
    pub descending: bool,
}

/// Ordena el resultado de `sql` en la BASE (no en la pagina visible: con
/// paginacion, ordenar solo las filas cargadas seria engañoso). Se ordena
/// por posicion (`ORDER BY 3 DESC`), que sirve igual en MySQL y Postgres
/// aunque la columna venga de `*` o tenga alias. Reemplaza el ORDER BY de
/// la consulta; si ella tiene su propio LIMIT (el orden decide QUE filas
/// entran), se envuelve en una subconsulta para no cambiar cuales son.
pub fn sort_sql(sql: &str, dialect: Dialect, keys: &[SortKey]) -> Option<String> {
    if keys.is_empty() {
        return None;
    }
    let mut query = parse_pageable_query(sql, dialect)?;
    let order = OrderBy {
        kind: OrderByKind::Expressions(
            keys.iter()
                .map(|key| OrderByExpr {
                    expr: number(key.column as u64 + 1),
                    options: OrderByOptions {
                        asc: Some(!key.descending),
                        nulls_first: None,
                    },
                    with_fill: None,
                })
                .collect(),
        ),
        interpolate: None,
    };
    if query.limit_clause.is_none() {
        query.order_by = Some(order);
        Some(query.to_string())
    } else {
        Some(format!("SELECT * FROM ({query}) AS khipu_sorted {order}"))
    }
}

/// Pagina `sql` para traer `fetch` filas a partir de la fila `offset`.
///
/// Si la consulta ya tiene su propio `LIMIT`/`OFFSET` literal, la pagina se
/// calcula DENTRO de ese rango (una consulta con `LIMIT 50` nunca devuelve
/// mas de 50 filas en total, pagine como pagine).
pub fn paginate_sql(sql: &str, dialect: Dialect, offset: u64, fetch: u64) -> Option<String> {
    let mut query = parse_pageable_query(sql, dialect)?;
    let (base_offset, base_limit) = literal_limit(&query)?;

    let page_offset = base_offset.checked_add(offset)?;
    let page_limit = match base_limit {
        Some(limit) => fetch.min(limit.saturating_sub(offset)),
        None => fetch,
    };

    query.limit_clause = Some(LimitClause::LimitOffset {
        limit: Some(number(page_limit)),
        offset: (page_offset > 0).then(|| Offset {
            value: number(page_offset),
            rows: OffsetRows::None,
        }),
        limit_by: Vec::new(),
    });
    Some(query.to_string())
}

/// `SELECT COUNT(*)` sobre las filas que devolveria `sql` completa.
pub fn count_sql(sql: &str, dialect: Dialect) -> Option<String> {
    let mut query = parse_pageable_query(sql, dialect)?;
    let (_, limit) = literal_limit(&query)?;

    // Sin LIMIT el orden no cambia cuantas filas hay, y ordenar es lo mas
    // caro de muchas consultas. Con LIMIT si importa (decide CUALES entran).
    if limit.is_none() && query.limit_clause.is_none() {
        query.order_by = None;
    }

    // En una subconsulta derivada MySQL exige nombres de columna unicos: un
    // `SELECT * FROM a JOIN b` con dos columnas `id` fallaria. Si la
    // proyeccion no afecta cuantas filas salen (sin DISTINCT/GROUP BY/HAVING,
    // que podrian depender de ella o de sus alias), se reemplaza por `1`.
    if let SetExpr::Select(select) = query.body.as_mut() {
        let projection_is_irrelevant = select.distinct.is_none()
            && select.having.is_none()
            && matches!(&select.group_by, GroupByExpr::Expressions(exprs, modifiers) if exprs.is_empty() && modifiers.is_empty());
        if projection_is_irrelevant && query.limit_clause.is_none() {
            select.projection = vec![SelectItem::UnnamedExpr(number(1))];
        }
    }

    Some(format!("SELECT COUNT(*) FROM ({query}) AS khipu_count"))
}

/// La sentencia solo lee: un SELECT/UNION/VALUES (con sus CTE) sin
/// `INTO`, sin `FOR UPDATE` y sin CTE que modifiquen datos (`WITH x AS
/// (DELETE ... RETURNING *) SELECT ...` en Postgres). Es lo unico que se
/// puede volver a ejecutar sin efectos, p.ej. para exportarlo entero.
pub fn is_read_only_query(sql: &str, dialect: Dialect) -> bool {
    let Ok(statements) = Parser::parse_sql(&*dialect.as_sqlparser_dialect(), sql) else {
        return false;
    };
    match statements.as_slice() {
        [Statement::Query(query)] => query_is_read_only(query),
        _ => false,
    }
}

pub(crate) fn query_is_read_only(query: &Query) -> bool {
    let ctes_read_only = query.with.as_ref().is_none_or(|with| {
        with.cte_tables
            .iter()
            .all(|cte| query_is_read_only(&cte.query))
    });
    ctes_read_only && query.locks.is_empty() && set_expr_is_read_only(&query.body)
}

fn set_expr_is_read_only(body: &SetExpr) -> bool {
    match body {
        SetExpr::Select(select) => select.into.is_none(),
        SetExpr::Query(query) => query_is_read_only(query),
        SetExpr::SetOperation { left, right, .. } => {
            set_expr_is_read_only(left) && set_expr_is_read_only(right)
        }
        SetExpr::Values(_) => true,
        _ => false,
    }
}

fn parse_pageable_query(sql: &str, dialect: Dialect) -> Option<Query> {
    let mut statements = Parser::parse_sql(&*dialect.as_sqlparser_dialect(), sql).ok()?;
    if statements.len() != 1 {
        return None;
    }
    let Statement::Query(query) = statements.pop()? else {
        return None;
    };
    let pageable_body = match query.body.as_ref() {
        SetExpr::Select(select) => select.into.is_none(),
        SetExpr::SetOperation { .. } | SetExpr::Query(_) | SetExpr::Values(_) => true,
        _ => false,
    };
    let pageable = pageable_body
        && query.fetch.is_none()
        && query.locks.is_empty()
        && query.for_clause.is_none()
        && query.settings.is_none()
        && query.format_clause.is_none();
    pageable.then_some(*query)
}

/// `(offset, limit)` del `LIMIT`/`OFFSET` que ya trae la consulta, si son
/// numeros literales. `None` si son expresiones (un parametro, `LIMIT BY`,
/// etc.): ahi no se puede combinar con la pagina.
fn literal_limit(query: &Query) -> Option<(u64, Option<u64>)> {
    match &query.limit_clause {
        None => Some((0, None)),
        Some(LimitClause::LimitOffset {
            limit,
            offset,
            limit_by,
        }) => {
            if !limit_by.is_empty() {
                return None;
            }
            let limit = match limit {
                None => None,
                Some(expr) => Some(literal_u64(expr)?),
            };
            let offset = match offset {
                None => 0,
                Some(offset) => literal_u64(&offset.value)?,
            };
            Some((offset, limit))
        }
        Some(LimitClause::OffsetCommaLimit { offset, limit }) => {
            Some((literal_u64(offset)?, Some(literal_u64(limit)?)))
        }
    }
}

fn literal_u64(expr: &Expr) -> Option<u64> {
    match expr {
        Expr::Value(value) => match &value.value {
            Value::Number(number, _) => number.parse().ok(),
            _ => None,
        },
        _ => None,
    }
}

fn number(value: u64) -> Expr {
    Expr::value(Value::Number(value.to_string(), false))
}

#[cfg(test)]
mod tests {
    use super::*;

    const MYSQL: Dialect = Dialect::MySql;

    #[test]
    fn pagina_un_select_simple() {
        assert_eq!(
            paginate_sql("SELECT * FROM t", MYSQL, 0, 501).unwrap(),
            "SELECT * FROM t LIMIT 501"
        );
        assert_eq!(
            paginate_sql("SELECT * FROM t ORDER BY id", MYSQL, 500, 501).unwrap(),
            "SELECT * FROM t ORDER BY id LIMIT 501 OFFSET 500"
        );
    }

    #[test]
    fn pagina_dentro_del_limit_existente() {
        // LIMIT 50: la segunda pagina de 20 son las filas 20..40.
        assert_eq!(
            paginate_sql("SELECT * FROM t LIMIT 50", MYSQL, 20, 21).unwrap(),
            "SELECT * FROM t LIMIT 21 OFFSET 20"
        );
        // Ultima pagina: quedan 10 filas del LIMIT, no 21.
        assert_eq!(
            paginate_sql("SELECT * FROM t LIMIT 50", MYSQL, 40, 21).unwrap(),
            "SELECT * FROM t LIMIT 10 OFFSET 40"
        );
        // Sintaxis MySQL `LIMIT offset, limit`.
        assert_eq!(
            paginate_sql("SELECT * FROM t LIMIT 100, 30", MYSQL, 0, 21).unwrap(),
            "SELECT * FROM t LIMIT 21 OFFSET 100"
        );
    }

    #[test]
    fn no_pagina_lo_que_no_es_seguro() {
        assert!(paginate_sql("SHOW TABLES", MYSQL, 0, 501).is_none());
        assert!(paginate_sql("SELECT * FROM t FOR UPDATE", MYSQL, 0, 501).is_none());
        assert!(paginate_sql("UPDATE t SET a = 1", MYSQL, 0, 501).is_none());
        assert!(paginate_sql("SELECT 1; SELECT 2", MYSQL, 0, 501).is_none());
        assert!(paginate_sql("SELECT * FROM t LIMIT ?", MYSQL, 0, 501).is_none());
    }

    #[test]
    fn ordena_por_posicion_reemplazando_el_order_by() {
        let keys = [
            SortKey {
                column: 2,
                descending: true,
            },
            SortKey {
                column: 0,
                descending: false,
            },
        ];
        assert_eq!(
            sort_sql("SELECT * FROM t ORDER BY id", MYSQL, &keys).unwrap(),
            "SELECT * FROM t ORDER BY 3 DESC, 1 ASC"
        );
        // Con LIMIT propio se envuelve: no cambian las filas que entran.
        assert_eq!(
            sort_sql("SELECT * FROM t ORDER BY id LIMIT 10", MYSQL, &keys[..1]).unwrap(),
            "SELECT * FROM (SELECT * FROM t ORDER BY id LIMIT 10) AS khipu_sorted ORDER BY 3 DESC"
        );
        // Y se puede paginar encima.
        let sorted = sort_sql("SELECT * FROM t", MYSQL, &keys[..1]).unwrap();
        assert_eq!(
            paginate_sql(&sorted, MYSQL, 500, 501).unwrap(),
            "SELECT * FROM t ORDER BY 3 DESC LIMIT 501 OFFSET 500"
        );
        assert!(sort_sql("SHOW TABLES", MYSQL, &keys).is_none());
        assert!(sort_sql("SELECT * FROM t", MYSQL, &[]).is_none());
    }

    #[test]
    fn solo_lectura_para_reejecutar() {
        assert!(is_read_only_query("SELECT * FROM t", MYSQL));
        assert!(is_read_only_query(
            "WITH a AS (SELECT 1) SELECT * FROM a",
            MYSQL
        ));
        assert!(!is_read_only_query("UPDATE t SET a = 1", MYSQL));
        assert!(!is_read_only_query("SELECT * FROM t FOR UPDATE", MYSQL));
        assert!(!is_read_only_query(
            "SELECT * INTO copia FROM t",
            Dialect::Postgres
        ));
        assert!(!is_read_only_query(
            "WITH x AS (DELETE FROM t RETURNING *) SELECT * FROM x",
            Dialect::Postgres
        ));
    }

    #[test]
    fn cuenta_sin_orden_y_sin_proyeccion() {
        assert_eq!(
            count_sql(
                "SELECT a.*, b.* FROM a JOIN b ON a.id = b.a_id ORDER BY a.id",
                MYSQL
            )
            .unwrap(),
            "SELECT COUNT(*) FROM (SELECT 1 FROM a JOIN b ON a.id = b.a_id) AS khipu_count"
        );
    }

    #[test]
    fn cuenta_conserva_lo_que_cambia_el_numero_de_filas() {
        assert_eq!(
            count_sql("SELECT DISTINCT pais FROM clientes", MYSQL).unwrap(),
            "SELECT COUNT(*) FROM (SELECT DISTINCT pais FROM clientes) AS khipu_count"
        );
        assert_eq!(
            count_sql(
                "SELECT pais, COUNT(*) AS n FROM clientes GROUP BY pais",
                MYSQL
            )
            .unwrap(),
            "SELECT COUNT(*) FROM (SELECT pais, COUNT(*) AS n FROM clientes GROUP BY pais) AS khipu_count"
        );
        assert_eq!(
            count_sql("SELECT * FROM t ORDER BY id LIMIT 10", MYSQL).unwrap(),
            "SELECT COUNT(*) FROM (SELECT * FROM t ORDER BY id LIMIT 10) AS khipu_count"
        );
    }
}
