//! Paginacion de resultados reescribiendo la consulta, no leyendo y
//! descartando filas: cada pagina le pide al servidor solo sus filas
//! (`LIMIT`/`OFFSET`), asi pasar a la pagina 20 cuesta lo mismo que la 1 del
//! lado de la app. Tambien arma el `SELECT COUNT(*)` para conocer el total.
//!
//! Solo se reescriben consultas que se pueden paginar con seguridad (un
//! `SELECT`/`UNION`/`VALUES` sin `FETCH`, `FOR UPDATE` ni `INTO`); para el
//! resto ambas funciones devuelven `None` y la app muestra solo la primera
//! pagina, como hasta ahora.
//!
//! Lo que se ejecuta es el texto reescrito, no el que reviso el guard: por
//! eso cada reescritura se entrega solo si (1) se lee de vuelta como la
//! misma consulta, sin que ninguna cadena cambie al escribirla, y (2) el
//! guard, con las opciones de la sesion y las reglas de produccion, la lee
//! como una sola lectura. Si no, `None`: se ejecuta el texto original.

use crate::Dialect;
use crate::execution_guard::{DestructiveClassification, GuardOptions, classify_sql_with};
use serde::Deserialize;
use sqlparser::ast::{
    Expr, GroupByExpr, LimitClause, Offset, OffsetRows, OrderBy, OrderByExpr, OrderByKind,
    OrderByOptions, Query, SelectItem, SetExpr, Statement, Value,
};
use sqlparser::parser::{Parser, ParserOptions};

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
pub fn sort_sql(
    sql: &str,
    dialect: Dialect,
    options: GuardOptions,
    keys: &[SortKey],
) -> Option<String> {
    if keys.is_empty() {
        return None;
    }
    let mut query = parse_pageable_query(sql, dialect, options)?;
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
    let text = if query.limit_clause.is_none() {
        query.order_by = Some(order);
        written(&query, dialect)?
    } else {
        let query = written(&query, dialect)?;
        format!("SELECT * FROM ({query}) AS khipu_sorted {order}")
    };
    guarded(text, dialect, options)
}

/// Pagina `sql` para traer `fetch` filas a partir de la fila `offset`.
///
/// Si la consulta ya tiene su propio `LIMIT`/`OFFSET` literal, la pagina se
/// calcula DENTRO de ese rango (una consulta con `LIMIT 50` nunca devuelve
/// mas de 50 filas en total, pagine como pagine).
pub fn paginate_sql(
    sql: &str,
    dialect: Dialect,
    options: GuardOptions,
    offset: u64,
    fetch: u64,
) -> Option<String> {
    let mut query = parse_pageable_query(sql, dialect, options)?;
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
    guarded(written(&query, dialect)?, dialect, options)
}

/// `SELECT COUNT(*)` sobre las filas que devolveria `sql` completa.
pub fn count_sql(sql: &str, dialect: Dialect, options: GuardOptions) -> Option<String> {
    let mut query = parse_pageable_query(sql, dialect, options)?;
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

    let query = written(&query, dialect)?;
    guarded(
        format!("SELECT COUNT(*) FROM ({query}) AS khipu_count"),
        dialect,
        options,
    )
}

/// El texto de `query`, solo si se lee de vuelta como la misma consulta. Se
/// parsea sin desescapar (`parse`), asi cada cadena se escribe como vino;
/// si aun asi algo cambia al escribirlo, no hay reescritura.
fn written(query: &Query, dialect: Dialect) -> Option<String> {
    let text = query.to_string();
    match parse(&text, dialect)?.as_slice() {
        [Statement::Query(again)] if **again == *query => Some(text),
        _ => None,
    }
}

/// `text` solo si el guard lo lee como una sola lectura, con las opciones de
/// la sesion y las reglas de produccion (igual o mas estricto que lo que
/// paso el original): es el texto que llega al servidor.
fn guarded(text: String, dialect: Dialect, options: GuardOptions) -> Option<String> {
    matches!(
        classify_sql_with(&text, dialect, true, options),
        Ok(DestructiveClassification::NotDestructive)
    )
    .then_some(text)
}

/// Sin desescapar las cadenas: el AST guarda su texto tal cual y al
/// escribirlo sale igual (con desescape, `'\\'` volvia como `'\'`).
fn parse(sql: &str, dialect: Dialect) -> Option<Vec<Statement>> {
    Parser::new(&*dialect.as_sqlparser_dialect())
        .with_options(ParserOptions::new().with_unescape(false))
        .try_with_sql(sql)
        .ok()?
        .parse_statements()
        .ok()
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

fn parse_pageable_query(sql: &str, dialect: Dialect, options: GuardOptions) -> Option<Query> {
    // Con NO_BACKSLASH_ESCAPES la barra no escapa, pero el tokenizer de
    // sqlparser siempre la toma por escape: con barras, leeria otras cadenas
    // que el servidor. No se reescribe.
    if options.no_backslash_escapes && dialect.backslash_escapes() && sql.contains('\\') {
        return None;
    }
    let mut statements = parse(sql, dialect)?;
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
    const PLAIN: GuardOptions = GuardOptions {
        no_backslash_escapes: false,
    };

    #[test]
    fn pagina_un_select_simple() {
        assert_eq!(
            paginate_sql("SELECT * FROM t", MYSQL, PLAIN, 0, 501).unwrap(),
            "SELECT * FROM t LIMIT 501"
        );
        assert_eq!(
            paginate_sql("SELECT * FROM t ORDER BY id", MYSQL, PLAIN, 500, 501).unwrap(),
            "SELECT * FROM t ORDER BY id LIMIT 501 OFFSET 500"
        );
    }

    #[test]
    fn pagina_dentro_del_limit_existente() {
        // LIMIT 50: la segunda pagina de 20 son las filas 20..40.
        assert_eq!(
            paginate_sql("SELECT * FROM t LIMIT 50", MYSQL, PLAIN, 20, 21).unwrap(),
            "SELECT * FROM t LIMIT 21 OFFSET 20"
        );
        // Ultima pagina: quedan 10 filas del LIMIT, no 21.
        assert_eq!(
            paginate_sql("SELECT * FROM t LIMIT 50", MYSQL, PLAIN, 40, 21).unwrap(),
            "SELECT * FROM t LIMIT 10 OFFSET 40"
        );
        // Sintaxis MySQL `LIMIT offset, limit`.
        assert_eq!(
            paginate_sql("SELECT * FROM t LIMIT 100, 30", MYSQL, PLAIN, 0, 21).unwrap(),
            "SELECT * FROM t LIMIT 21 OFFSET 100"
        );
    }

    #[test]
    fn no_pagina_lo_que_no_es_seguro() {
        assert!(paginate_sql("SHOW TABLES", MYSQL, PLAIN, 0, 501).is_none());
        assert!(paginate_sql("SELECT * FROM t FOR UPDATE", MYSQL, PLAIN, 0, 501).is_none());
        assert!(paginate_sql("UPDATE t SET a = 1", MYSQL, PLAIN, 0, 501).is_none());
        assert!(paginate_sql("SELECT 1; SELECT 2", MYSQL, PLAIN, 0, 501).is_none());
        assert!(paginate_sql("SELECT * FROM t LIMIT ?", MYSQL, PLAIN, 0, 501).is_none());
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
            sort_sql("SELECT * FROM t ORDER BY id", MYSQL, PLAIN, &keys).unwrap(),
            "SELECT * FROM t ORDER BY 3 DESC, 1 ASC"
        );
        // Con LIMIT propio se envuelve: no cambian las filas que entran.
        assert_eq!(
            sort_sql(
                "SELECT * FROM t ORDER BY id LIMIT 10",
                MYSQL,
                PLAIN,
                &keys[..1]
            )
            .unwrap(),
            "SELECT * FROM (SELECT * FROM t ORDER BY id LIMIT 10) AS khipu_sorted ORDER BY 3 DESC"
        );
        // Y se puede paginar encima.
        let sorted = sort_sql("SELECT * FROM t", MYSQL, PLAIN, &keys[..1]).unwrap();
        assert_eq!(
            paginate_sql(&sorted, MYSQL, PLAIN, 500, 501).unwrap(),
            "SELECT * FROM t ORDER BY 3 DESC LIMIT 501 OFFSET 500"
        );
        assert!(sort_sql("SHOW TABLES", MYSQL, PLAIN, &keys).is_none());
        assert!(sort_sql("SELECT * FROM t", MYSQL, PLAIN, &[]).is_none());
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
                MYSQL,
                PLAIN
            )
            .unwrap(),
            "SELECT COUNT(*) FROM (SELECT 1 FROM a JOIN b ON a.id = b.a_id) AS khipu_count"
        );
    }

    #[test]
    fn cuenta_conserva_lo_que_cambia_el_numero_de_filas() {
        assert_eq!(
            count_sql("SELECT DISTINCT pais FROM clientes", MYSQL, PLAIN).unwrap(),
            "SELECT COUNT(*) FROM (SELECT DISTINCT pais FROM clientes) AS khipu_count"
        );
        assert_eq!(
            count_sql(
                "SELECT pais, COUNT(*) AS n FROM clientes GROUP BY pais",
                MYSQL,
                PLAIN
            )
            .unwrap(),
            "SELECT COUNT(*) FROM (SELECT pais, COUNT(*) AS n FROM clientes GROUP BY pais) AS khipu_count"
        );
        assert_eq!(
            count_sql("SELECT * FROM t ORDER BY id LIMIT 10", MYSQL, PLAIN).unwrap(),
            "SELECT COUNT(*) FROM (SELECT * FROM t ORDER BY id LIMIT 10) AS khipu_count"
        );
    }

    /// Las cadenas de `sql` como las ve el tokenizer, sin desescapar: si una
    /// reescritura las cambia, el servidor leeria otra cosa.
    fn strings(sql: &str, dialect: Dialect) -> Vec<String> {
        use sqlparser::tokenizer::{Token, Tokenizer};
        Tokenizer::new(&*dialect.as_sqlparser_dialect(), sql)
            .with_unescape(false)
            .tokenize()
            .unwrap()
            .into_iter()
            .filter_map(|token| match token {
                Token::SingleQuotedString(text)
                | Token::DoubleQuotedString(text)
                | Token::EscapedStringLiteral(text) => Some(text),
                _ => None,
            })
            .collect()
    }

    fn rewrites(sql: &str, dialect: Dialect, options: GuardOptions) -> [Option<String>; 3] {
        let keys = [SortKey {
            column: 0,
            descending: true,
        }];
        [
            sort_sql(sql, dialect, options, &keys),
            paginate_sql(sql, dialect, options, 20, 101),
            count_sql(sql, dialect, options),
        ]
    }

    #[test]
    fn una_cadena_con_barras_se_escribe_como_vino() {
        // Antes `'\\'` se escribia `'\'`: la consulta paginada ya no cerraba
        // la cadena y MySQL respondia 1064.
        for dialect in [MYSQL, Dialect::MariaDb] {
            assert_eq!(
                paginate_sql(r"SELECT '\\' AS a", dialect, PLAIN, 0, 101).unwrap(),
                r"SELECT '\\' AS a LIMIT 101"
            );
        }
        assert_eq!(
            paginate_sql(r"SELECT E'\\' AS a", Dialect::Postgres, PLAIN, 0, 101).unwrap(),
            r"SELECT E'\\' AS a LIMIT 101"
        );
    }

    #[test]
    fn lo_que_se_ejecuta_es_una_lectura_con_las_mismas_cadenas() {
        // Fragmentos que el escape de cada motor lee distinto; combinados,
        // con una carga escondida en una cadena que una reescritura infiel
        // dejaria fuera de ella.
        let fragments: [(Dialect, &[&str]); 3] = [
            (
                MYSQL,
                &[
                    r"'\\'",
                    r"'it\'s'",
                    r"'x''y'",
                    r"'a\\nb'",
                    r"'\\\''",
                    r#""\\""#,
                    r#""q\"q""#,
                    r"'%\_'",
                ],
            ),
            (
                Dialect::MariaDb,
                &[r"'\\'", r"'it\'s'", r"'\\\''", r#""\\""#, r"'a\\nb'"],
            ),
            (
                Dialect::Postgres,
                &[r"E'\\'", r"E'it\'s'", r"'C:\'", r"'x''y'", r"E'a\\nb'"],
            ),
        ];
        let mut checked = 0;
        for (dialect, fragments) in fragments {
            for first in fragments {
                for second in fragments {
                    // En el WHERE: contar reemplaza la proyeccion, no el filtro.
                    let sql = format!(
                        "SELECT a FROM t WHERE a <> {first} AND b <> '; DELETE FROM t; -- ' AND c <> {second}"
                    );
                    assert!(
                        classify_sql_with(&sql, dialect, false, PLAIN).is_ok(),
                        "{dialect:?}: {sql}"
                    );
                    for text in rewrites(&sql, dialect, PLAIN) {
                        let text =
                            text.unwrap_or_else(|| panic!("{dialect:?}: sin reescritura: {sql}"));
                        assert_eq!(
                            classify_sql_with(&text, dialect, true, PLAIN),
                            Ok(DestructiveClassification::NotDestructive),
                            "{dialect:?}: {text}"
                        );
                        assert_eq!(
                            strings(&text, dialect),
                            strings(&sql, dialect),
                            "{dialect:?}: la reescritura cambio una cadena:\n{sql}\n{text}"
                        );
                        checked += 1;
                    }
                }
            }
        }
        assert!(checked > 200, "solo {checked} reescrituras");
    }

    #[test]
    fn con_no_backslash_escapes_y_barras_no_se_reescribe() {
        // El tokenizer de sqlparser toma la barra por escape; el servidor en
        // ese modo no. Con barras leerian cadenas distintas.
        let mode = GuardOptions {
            no_backslash_escapes: true,
        };
        for dialect in [MYSQL, Dialect::MariaDb] {
            for text in rewrites(r"SELECT '\\' AS a", dialect, mode) {
                assert_eq!(text, None);
            }
            for text in rewrites("SELECT 'a' AS a", dialect, mode) {
                assert!(text.is_some());
            }
        }
        // PostgreSQL no tiene ese modo: la opcion no le cambia nada.
        assert!(paginate_sql(r"SELECT E'\\' AS a", Dialect::Postgres, mode, 0, 101).is_some());
    }
}
