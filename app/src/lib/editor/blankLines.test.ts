import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { SCAN_OVERLAP, initialScanState, scanChunk, splitStatements, type ScannedStatement, type SqlLexical } from "../sqlStatements";
import {
  sqlLexical,
  statementContaining,
  statementIndexComplete,
  statementIndexField,
  statementIndexStep,
  statementNear,
  statementsIn,
  statementTextAt,
} from "./statementIndex";
import { ENGINES, standardSql } from "../engines";

// La linea en blanco como separador de sentencias (sqlStatements.ts), a
// prueba de como escribe la gente consultas largas.
//
// El reporte que lo origino: una consulta con lineas en blanco en medio
// (antes del WHERE, entre JOINs, entre CTEs) se ejecutaba con Ctrl+Enter
// solo hasta la primera linea en blanco, y el recuadro verde se cortaba
// ahi. La regla: una linea en blanco separa consultas distintas, pero nunca
// parte una consulta. Todo lo que el editor hace con la sentencia del
// cursor sale de aca: Ctrl+Enter, el recuadro, los diagnosticos y las
// sugerencias.

const LEXICALS: [string, SqlLexical][] = [
  ...Object.entries(ENGINES).map(([name, engine]) => [name, engine.lexical] as [string, SqlLexical]),
  ["standard", standardSql.lexical],
];
const mysql = ENGINES.mysql.lexical;

const texts = (text: string, lexical: SqlLexical = mysql) =>
  splitStatements(text, lexical).map(({ from, to }) => text.slice(from, to));

// --- Consultas que son UNA sola, con lineas en blanco en medio -------------
// Cada una como la escribiria alguien: bloques separados para leerlas mejor.
const ONE_QUERY: Record<string, string> = {
  "WHERE en su bloque": `SELECT a, b
FROM t

WHERE x = 1`,
  "FROM en su bloque": `SELECT
  a,
  b

FROM t`,
  "SELECT * y FROM abajo": `SELECT *

FROM users`,
  "JOIN en su bloque": `SELECT *
FROM facturas f

JOIN clientes c ON c.id = f.cliente_id
WHERE f.total > 0`,
  "varios JOIN, cada uno en su bloque": `SELECT f.id, c.nombre, p.nombre
FROM facturas f

INNER JOIN clientes c ON c.id = f.cliente_id

LEFT JOIN productos p ON p.id = f.producto_id

LEFT OUTER JOIN notas n ON n.factura_id = f.id

CROSS JOIN parametros

WHERE f.total > 0`,
  "ON en su propia linea": `SELECT *
FROM a
JOIN b

ON b.a_id = a.id`,
  "GROUP BY, HAVING, ORDER BY y LIMIT en bloques": `SELECT cliente_id, count(*) AS total
FROM pedidos

GROUP BY cliente_id

HAVING count(*) > 1

ORDER BY total DESC

LIMIT 10

OFFSET 20`,
  "condiciones con AND y OR en bloques": `SELECT *
FROM t
WHERE a = 1

  AND b = 2

  OR c = 3`,
  "AND al final de la linea de arriba": `SELECT *
FROM t
WHERE a = 1 AND

b = 2`,
  "operador al final de la linea de arriba": `SELECT total *

1.12 AS con_iva, precio +

envio AS final
FROM pedidos`,
  "coma al final de la linea de arriba": `SELECT
  a,

  b,

  c
FROM t`,
  "coma al principio de la linea de abajo": `SELECT
  a

  , b

  , c
FROM t`,
  "UNION ALL con bloques": `SELECT id FROM clientes

UNION ALL

SELECT id FROM proveedores`,
  "UNION, INTERSECT y EXCEPT": `SELECT 1

UNION

SELECT 2

INTERSECT

SELECT 3

EXCEPT

SELECT 4`,
  "subconsulta con lineas en blanco adentro": `SELECT *
FROM (

  SELECT id, total

  FROM pedidos

) p
WHERE p.total > 10`,
  "IN con lista larga": `SELECT *
FROM t
WHERE id IN (
  1,

  2,

  3
)`,
  "una CTE": `WITH candidatos AS (
  SELECT a.abon_codi
  FROM abonados a
)

SELECT * FROM candidatos`,
  "varias CTE separadas por lineas en blanco": `WITH candidatos AS (
  SELECT 1 AS id
),

pagos AS (
  SELECT 2 AS id
)

,

resultado AS (
  SELECT * FROM candidatos
)

SELECT *
FROM resultado r

ORDER BY r.id`,
  "WITH RECURSIVE": `WITH RECURSIVE arbol (id, padre) AS (
  SELECT id, padre FROM nodos WHERE padre IS NULL

  UNION ALL

  SELECT n.id, n.padre FROM nodos n JOIN arbol a ON n.padre = a.id
)

SELECT * FROM arbol`,
  "CASE con WHEN, ELSE y END en bloques": `SELECT
  CASE

    WHEN total > 100 THEN 'alto'

    WHEN total > 10 THEN 'medio'

    ELSE 'bajo'

  END AS nivel
FROM pedidos`,
  "INSERT con VALUES abajo": `INSERT INTO clientes (id, nombre)

VALUES (1, 'Ana'), (2, 'Luis')`,
  "INSERT con SELECT abajo": `INSERT INTO historico (id, total)

SELECT id, total FROM pedidos

WHERE fecha < '2020-01-01'`,
  "INSERT ... ON DUPLICATE KEY UPDATE": `INSERT INTO t (id, n) VALUES (1, 1)

ON DUPLICATE KEY UPDATE n = n + 1`,
  "UPDATE con SET y WHERE abajo": `UPDATE pedidos

SET estado = 'pagado'

WHERE id = 10`,
  "DELETE con WHERE abajo": `DELETE FROM pedidos

WHERE fecha < '2020-01-01'`,
  "RETURNING abajo": `UPDATE t SET a = 1

RETURNING id`,
  "FOR UPDATE abajo": `SELECT * FROM t WHERE id = 1

FOR UPDATE`,
  "CREATE VIEW ... AS abajo": `CREATE VIEW resumen AS

SELECT cliente_id, sum(total) FROM pedidos GROUP BY cliente_id`,
  "CREATE TABLE con columnas separadas": `CREATE TABLE t (
  id INT PRIMARY KEY,

  nombre VARCHAR(100),

  creado TIMESTAMP
)`,
  "funcion de ventana": `SELECT id,
  row_number() OVER (

    PARTITION BY cliente_id

    ORDER BY fecha
  ) AS n
FROM pedidos`,
  "minusculas": `select *
from t

where a = 1

order by a`,
  "palabras con sangria": `SELECT *
FROM t

    WHERE a = 1

        AND b = 2`,
  "varias lineas en blanco seguidas": `SELECT *
FROM t



WHERE a = 1`,
  "lineas en blanco con espacios y tabs": `SELECT *
FROM t
   \t
WHERE a = 1`,
  "saltos de linea de Windows": "SELECT *\r\nFROM t\r\n\r\nWHERE a = 1\r\n\r\nORDER BY a",
  "comentario de linea antes del bloque": `SELECT *
FROM t

-- solo los activos
WHERE activo = 1`,
  "comentario de bloque antes del bloque": `SELECT *
FROM t

/* filtro
   por fecha */
WHERE fecha > '2024-01-01'`,
  "comentario al final de la linea de arriba": `SELECT id FROM a UNION ALL -- los dos

SELECT id FROM b`,
  "la consulta del reporte": `SELECT
    a.abon_codi,
    CONCAT_WS(' ', cl.clie_nomb, cl.clie_apel) AS cliente,
    TRIM(CONCAT_WS(' ', cl.clie_dire, cl.clie_dir2)) AS direccion,
    CASE
        WHEN r.meses_requeridos > 0
        THEN ROUND(174.54 / r.meses_requeridos * GREATEST(r.meses, 1), 2)
        ELSE 174.54
    END AS valor_instalacion
FROM resultado r

JOIN abonados a ON a.abon_codi = r.codigo_abonado

LEFT JOIN clientes cl ON cl.clie_codi = a.clie_codi

WHERE r.meses_requeridos IS NOT NULL

ORDER BY r.codigo_abonado`,
};

// --- Documentos con VARIAS consultas: cuantas y cuales -----------------------
const SEVERAL: [string, string, string[]][] = [
  ["dos consultas sin ;", "SELECT 1\n\nSELECT 2", ["SELECT 1", "SELECT 2"]],
  ["tres consultas sin ;", "SELECT * FROM a\n\nSELECT * FROM b\n\nSELECT * FROM c", ["SELECT * FROM a", "SELECT * FROM b", "SELECT * FROM c"]],
  ["un SET suelto es otra consulta", "SELECT 1\n\nSET @a = 1", ["SELECT 1", "SET @a = 1"]],
  ["un UPDATE despues de un UPDATE", "UPDATE t SET a = 1\n\nUPDATE t SET b = 2", ["UPDATE t SET a = 1", "UPDATE t SET b = 2"]],
  ["un DELETE despues de un UPDATE", "UPDATE t SET a = 1\n\nDELETE FROM t", ["UPDATE t SET a = 1", "DELETE FROM t"]],
  ["un SELECT despues de un INSERT con VALUES", "INSERT INTO t VALUES (1)\n\nSELECT * FROM t", ["INSERT INTO t VALUES (1)", "SELECT * FROM t"]],
  ["un INSERT despues de otro", "INSERT INTO t VALUES (1)\n\nINSERT INTO t VALUES (2)", ["INSERT INTO t VALUES (1)", "INSERT INTO t VALUES (2)"]],
  ["un SELECT despues de un WITH completo", "WITH x AS (SELECT 1) SELECT * FROM x\n\nSELECT 2", ["WITH x AS (SELECT 1) SELECT * FROM x", "SELECT 2"]],
  ["un SELECT despues de un WITH que termina en )", "WITH x AS (SELECT 1) SELECT count(*) FROM (SELECT * FROM x)\n\nSELECT 2", ["WITH x AS (SELECT 1) SELECT count(*) FROM (SELECT * FROM x)", "SELECT 2"]],
  ["un ) al final sin WITH no une nada", "SELECT (1)\n\nSELECT 2", ["SELECT (1)", "SELECT 2"]],
  ["una palabra que solo empieza como FROM", "SELECT 1\n\nfromage()", ["SELECT 1", "fromage()"]],
  ["un comentario entre dos consultas no es una consulta", "SELECT 1\n\n-- la siguiente\nSELECT 2", ["SELECT 1", "SELECT 2"]],
  ["el ; sigue separando como siempre", "SELECT 1; SELECT 2;\n\nSELECT 3", ["SELECT 1;", "SELECT 2;", "SELECT 3"]],
  ["con ; y lineas en blanco adentro", "SELECT *\nFROM a\n\nWHERE x = 1;\n\nSELECT *\n\nFROM b;", ["SELECT *\nFROM a\n\nWHERE x = 1;", "SELECT *\n\nFROM b;"]],
];

// Un documento de consola real: todas las consultas de ONE_QUERY una tras
// otra, separadas por lineas en blanco (a veces con ;, a veces sin).
// Con `editor`, los saltos de linea como los deja CodeMirror (convierte los
// \r\n en \n al cargar el texto).
function consoleDocument(editor = false): { doc: string; queries: { from: number; to: number }[] } {
  let doc = "";
  const queries: { from: number; to: number }[] = [];
  Object.values(ONE_QUERY).forEach((original, index) => {
    const query = editor ? original.replace(/\r\n/g, "\n") : original;
    if (doc) doc += index % 3 === 0 ? "\n\n\n" : "\n\n";
    const text = index % 2 === 0 ? `${query};` : query;
    queries.push({ from: doc.length, to: doc.length + text.length });
    doc += text;
  });
  return { doc, queries };
}

// El escaner por trozos, como editor/statementIndex: el primero termina en
// `cut`, y cada trozo trae SCAN_OVERLAP de margen mas alla de su limite.
function scanInChunks(text: string, lexical: SqlLexical, cuts: number[]): ScannedStatement[] {
  const state = initialScanState();
  const out: ScannedStatement[] = [];
  let pos = 0;
  for (const cut of [...cuts, text.length]) {
    if (cut <= pos && cut !== text.length) continue;
    const end = Math.min(text.length, cut + SCAN_OVERLAP);
    const chunk = text.slice(pos, end);
    const final = end === text.length && cut === text.length;
    const stop = scanChunk(chunk, pos, final ? chunk.length : cut - pos, final, state, out, lexical);
    if (final) break;
    pos += stop;
  }
  return out;
}

const ranges = (list: readonly { from: number; to: number }[]) => list.map(({ from, to }) => ({ from, to }));

function createState(doc: string, lexical: SqlLexical, cursor = 0) {
  return EditorState.create({ doc, selection: { anchor: cursor }, extensions: [statementIndexField, sqlLexical.of(lexical)] });
}

// Generador determinista para que un fallo se pueda repetir.
function random(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

describe.each(LEXICALS)("lineas en blanco (%s)", (_name, lexical) => {
  describe("una consulta con lineas en blanco en medio es UNA sola", () => {
    it.each(Object.entries(ONE_QUERY))("%s", (_label, query) => {
      expect(texts(query, lexical)).toEqual([query]);
      // Con ; al final, igual.
      expect(texts(`${query};`, lexical)).toEqual([`${query};`]);
    });
  });

  describe("varias consultas se separan donde corresponde", () => {
    it.each(SEVERAL)("%s", (_label, doc, expected) => {
      expect(texts(doc, lexical)).toEqual(expected);
    });
  });

  it("un documento de consola con todas: cada una entera, en su lugar", () => {
    const { doc, queries } = consoleDocument();
    expect(ranges(splitStatements(doc, lexical))).toEqual(queries);
  });
});

describe("en el editor: Ctrl+Enter, el recuadro y las sugerencias", () => {
  const { doc, queries } = consoleDocument(true);

  it.each(LEXICALS)("con el cursor en cualquier punto de una consulta se toma entera (%s)", (_name, lexical) => {
    const state = createState(doc, lexical);
    for (const query of queries) {
      // Todas las posiciones, incluidas las lineas en blanco de adentro.
      for (let pos = query.from; pos <= query.to; pos++) {
        // Ctrl+Enter (SqlEditor.currentSqlRange).
        expect(ranges([statementNear(state, pos)!])).toEqual([query]);
        // El recuadro verde (editor/behavior, statementDecorations).
        expect(ranges([statementContaining(state, pos)!])).toEqual([query]);
      }
    }
  });

  it("las sugerencias y los diagnosticos ven la consulta entera", () => {
    const state = createState(doc, mysql);
    for (const query of queries) {
      const middle = Math.floor((query.from + query.to) / 2);
      expect(statementTextAt(state, middle).text).toBe(doc.slice(query.from, query.to));
    }
  });

  it("con el cursor en la linea en blanco ENTRE dos consultas se toma una de ellas, no un pedazo", () => {
    const state = createState(doc, mysql);
    for (let index = 1; index < queries.length; index++) {
      const gap = queries[index - 1].to + 1;
      const chosen = ranges([statementNear(state, gap)!])[0];
      expect([queries[index - 1], queries[index]]).toContainEqual(chosen);
    }
  });
});

describe("por trozos: el escaner decide lo mismo aunque el texto llegue partido", () => {
  const { doc } = consoleDocument();

  it.each(LEXICALS)("partido en cada posicion posible (%s)", (_name, lexical) => {
    const expected = ranges(splitStatements(doc, lexical));
    for (let cut = 1; cut < doc.length; cut++) {
      expect(ranges(scanInChunks(doc, lexical, [cut]))).toEqual(expected);
    }
  });

  it("partido en muchos trozos chicos al azar", () => {
    const next = random(7);
    const expected = ranges(splitStatements(doc, mysql));
    for (let round = 0; round < 200; round++) {
      const cuts: number[] = [];
      for (let pos = 1 + Math.floor(next() * 40); pos < doc.length; pos += 1 + Math.floor(next() * 120)) cuts.push(pos);
      expect(ranges(scanInChunks(doc, mysql, cuts))).toEqual(expected);
    }
  });
});

describe("mientras se escribe: el indice incremental coincide con el escaneo completo", () => {
  const { doc } = consoleDocument(true);

  it.each(LEXICALS)("escribiendo el documento de a un caracter (%s)", (_name, lexical) => {
    let state = createState("", lexical);
    for (let index = 0; index < doc.length; index++) {
      state = state.update({ changes: { from: index, insert: doc[index] } }).state;
      if (index % 13 === 0 || doc[index] === "\n") {
        const text = state.doc.toString();
        expect(ranges(statementsIn(state, 0, text.length))).toEqual(ranges(splitStatements(text, lexical)));
      }
    }
  });

  it("agregando y borrando lineas en blanco en cualquier lugar", () => {
    const next = random(11);
    let state = createState(doc, mysql);
    for (let round = 0; round < 400; round++) {
      const text = state.doc.toString();
      const pos = Math.floor(next() * (text.length + 1));
      const roll = next();
      if (roll < 0.45) {
        state = state.update({ changes: { from: pos, insert: roll < 0.2 ? "\n\n" : "\n" } }).state;
      } else if (roll < 0.9) {
        const newline = text.indexOf("\n", pos);
        if (newline !== -1) state = state.update({ changes: { from: newline, to: newline + 1 } }).state;
      } else {
        // Escribir una palabra que continua o que empieza una consulta.
        const word = ["WHERE ", "SELECT ", "AND ", "-- nota\n", ") ", ", "][Math.floor(next() * 6)];
        state = state.update({ changes: { from: pos, insert: word } }).state;
      }
      const current = state.doc.toString();
      expect(ranges(statementsIn(state, 0, current.length))).toEqual(ranges(splitStatements(current, mysql)));
    }
  });

  it("en un documento grande que se indexa de fondo", () => {
    // Mas de lo que alcanza a indexar una tecla (256 KB): el resto va por
    // pasos de fondo, por trozos.
    const { doc: one } = consoleDocument(true);
    const big = Array.from({ length: Math.ceil((600 * 1024) / one.length) }, () => one).join(";\n\n");
    let state = createState(big, mysql);
    while (!statementIndexComplete(state)) state = state.update({ effects: statementIndexStep() }).state;
    expect(ranges(statementsIn(state, 0, big.length))).toEqual(ranges(splitStatements(big, mysql)));
  });
});

describe("consultas generadas al azar", () => {
  // Clausulas que siguen una consulta y como puede empezar cada consulta;
  // entre clausula y clausula, a veces lineas en blanco (con espacios, \r\n
  // o un comentario).
  const STARTS = ["SELECT a, b", "SELECT *", "select count(*)", "SELECT\n  a,\n  b"];
  const CLAUSES = [
    "FROM t",
    "JOIN u ON u.id = t.u_id",
    "LEFT JOIN v ON v.id = t.v_id",
    "WHERE a = 1",
    "AND b = 2",
    "OR c IN (1, 2, 3)",
    "GROUP BY a",
    "HAVING count(*) > 1",
    "ORDER BY a DESC",
    "LIMIT 10",
    "UNION ALL\nSELECT a, b FROM w",
  ];
  const GAPS = ["\n", "\n\n", "\n\n\n", "\n  \t\n", "\r\n\r\n", "\n\n-- nota\n", "\n\n/* nota */\n"];

  function query(next: () => number): string {
    let text = STARTS[Math.floor(next() * STARTS.length)];
    const count = 1 + Math.floor(next() * 6);
    for (let index = 0; index < count; index++) {
      const clause = index === 0 ? "FROM t" : CLAUSES[1 + Math.floor(next() * (CLAUSES.length - 1))];
      text += GAPS[Math.floor(next() * GAPS.length)] + clause;
    }
    return text;
  }

  it.each(LEXICALS)("cada consulta queda entera y separada de las demas (%s)", (_name, lexical) => {
    const next = random(lexical === mysql ? 3 : 5);
    for (let round = 0; round < 300; round++) {
      const list = Array.from({ length: 1 + Math.floor(next() * 4) }, () => query(next));
      // Separadas por lineas en blanco, a veces con ; al final.
      const withSemicolon = list.map((text) => (next() < 0.5 ? `${text};` : text));
      const doc = withSemicolon.join(next() < 0.5 ? "\n\n" : "\n\n\n");
      expect(texts(doc, lexical)).toEqual(withSemicolon);
    }
  });
});

// --- Lo propio de cada motor ---------------------------------------------
// Cada motor escribe distinto las comillas, los comentarios y algunas
// clausulas (engines/*.ts, `lexical`). Una linea en blanco o un ";" dentro
// de un texto, un comentario o un cuerpo $$ nunca corta; y las clausulas
// propias del motor siguen la consulta aunque vayan en su bloque.

describe.each([
  ["mysql", ENGINES.mysql.lexical],
  ["mariadb", ENGINES.mariadb.lexical],
])("lo propio de MySQL (%s)", (_name, lexical) => {
  const one: Record<string, string> = {
    "comentario con # antes del bloque": `SELECT *
FROM t

# solo los activos; sin borrar
WHERE activo = 1`,
    "comentario con # al final de la linea de arriba": `SELECT id FROM a UNION ALL # los dos

SELECT id FROM b`,
    "texto con \\' y una linea en blanco adentro": `SELECT 'it\\'s

ok; seguro'
FROM t

WHERE x = 1`,
    "texto entre comillas dobles con linea en blanco adentro": `SELECT "hola

mundo; si"
FROM t`,
    "identificador con acento grave": `SELECT \`total; neto\`
FROM \`pedidos del mes\`

WHERE \`total; neto\` > 0`,
    "INSERT ... SET": `INSERT INTO clientes

SET id = 1, nombre = 'Ana'`,
    "REPLACE con VALUES abajo": `REPLACE INTO clientes (id, nombre)

VALUES (1, 'Ana')`,
    "INSERT ... ON DUPLICATE KEY UPDATE en bloques": `INSERT INTO t (id, n)

VALUES (1, 1)

ON DUPLICATE KEY UPDATE n = n + 1`,
    "UPDATE con JOIN y SET abajo": `UPDATE pedidos p
JOIN clientes c ON c.id = p.cliente_id

SET p.estado = 'pagado'

WHERE c.activo = 1`,
    "STRAIGHT_JOIN en su bloque": `SELECT *
FROM a

STRAIGHT_JOIN b ON b.a_id = a.id`,
    "LIMIT con offset en su bloque": `SELECT *
FROM t

LIMIT 10, 20`,
  };

  it.each(Object.entries(one))("%s", (_label, query) => {
    expect(texts(query, lexical)).toEqual([query]);
  });

  it("dos consultas: el # de la primera no se come la segunda", () => {
    expect(texts("SELECT 1 # uno\n\nSELECT 2", lexical)).toEqual(["SELECT 1 # uno", "SELECT 2"]);
    expect(texts("SELECT '#no es comentario'\n\nSELECT 2", lexical)).toEqual(["SELECT '#no es comentario'", "SELECT 2"]);
  });

  it("un INSERT ... SET completo no se une con lo que sigue", () => {
    expect(texts("INSERT INTO t SET a = 1\n\nSET @b = 2", lexical)).toEqual(["INSERT INTO t SET a = 1", "SET @b = 2"]);
  });
});

describe("lo propio de PostgreSQL", () => {
  const lexical = ENGINES.postgres.lexical;
  const one: Record<string, string> = {
    "funcion con cuerpo $$ con ; y lineas en blanco adentro": `CREATE FUNCTION total(id int) RETURNS numeric AS $$
BEGIN

  RETURN (SELECT sum(total) FROM pedidos WHERE cliente_id = id);

END;
$$ LANGUAGE plpgsql`,
    "cuerpo con $tag$": `CREATE FUNCTION f() RETURNS void AS $fn$

  UPDATE t SET a = 1;

$fn$ LANGUAGE sql`,
    "DO con cuerpo $$": `DO $$
BEGIN

  PERFORM 1;

END
$$`,
    "texto E'' con \\' y una linea en blanco adentro": `SELECT E'it\\'s

ok; seguro'
FROM t

WHERE x = 1`,
    "identificador entre comillas dobles": `SELECT "Total; Neto"
FROM "Pedidos"

WHERE "Total; Neto" > 0`,
    "casts con :: y FROM abajo": `SELECT a::text, b::numeric(10, 2)

FROM t`,
    "INSERT ... ON CONFLICT ... DO UPDATE en bloques": `INSERT INTO t (id, n)

VALUES (1, 1)

ON CONFLICT (id)

DO UPDATE SET n = excluded.n

RETURNING id`,
    "INSERT ... ON CONFLICT DO NOTHING": `INSERT INTO t (id) VALUES (1)

ON CONFLICT (id)

DO NOTHING`,
    "UPDATE ... FROM ... RETURNING": `UPDATE pedidos p

SET estado = 'pagado'

FROM clientes c

WHERE c.id = p.cliente_id

RETURNING p.id`,
    "LATERAL en su bloque": `SELECT *
FROM clientes c

LEFT JOIN LATERAL (
  SELECT * FROM pedidos p WHERE p.cliente_id = c.id LIMIT 1
) ultimo ON true`,
    "FETCH FIRST en su bloque": `SELECT *
FROM t

ORDER BY id

FETCH FIRST 10 ROWS ONLY`,
    "WINDOW en su bloque": `SELECT id, sum(total) OVER w
FROM pedidos

WINDOW w AS (PARTITION BY cliente_id)`,
    "CTE con MATERIALIZED": `WITH x AS MATERIALIZED (
  SELECT 1
)

SELECT * FROM x`,
  };

  it.each(Object.entries(one))("%s", (_label, query) => {
    expect(texts(query, lexical)).toEqual([query]);
  });

  it("un DO suelto despues de otra consulta es otra consulta", () => {
    expect(texts("SELECT 1\n\nDO $$ BEGIN PERFORM 1; END $$", lexical)).toEqual(["SELECT 1", "DO $$ BEGIN PERFORM 1; END $$"]);
  });

  it("dos funciones seguidas quedan separadas", () => {
    const first = "CREATE FUNCTION a() RETURNS int AS $$ SELECT 1; $$ LANGUAGE sql";
    const second = "CREATE FUNCTION b() RETURNS int AS $$\n\nSELECT 2;\n\n$$ LANGUAGE sql";
    expect(texts(`${first}\n\n${second}`, lexical)).toEqual([first, second]);
  });
});

describe("en el editor, con cada motor conectado", () => {
  // Lo mismo que Ctrl+Enter: el cursor en cualquier punto de una consulta
  // propia del motor la toma entera, con otras consultas alrededor.
  const cases: [string, SqlLexical, string][] = [
    ["mysql", ENGINES.mysql.lexical, "SELECT *\nFROM t\n\n# activos; ojo\nWHERE activo = 1\n\nORDER BY id"],
    ["mariadb", ENGINES.mariadb.lexical, "INSERT INTO t (id, n)\n\nVALUES (1, 1)\n\nON DUPLICATE KEY UPDATE n = n + 1"],
    ["postgres", ENGINES.postgres.lexical, "INSERT INTO t (id, n)\n\nVALUES (1, 1)\n\nON CONFLICT (id)\n\nDO UPDATE SET n = excluded.n\n\nRETURNING id"],
    ["postgres", ENGINES.postgres.lexical, "CREATE FUNCTION f() RETURNS int AS $$\nBEGIN\n\n  RETURN 1;\n\nEND;\n$$ LANGUAGE plpgsql"],
    ["standard", standardSql.lexical, "SELECT *\nFROM t\n\nWHERE a = 1\n\nORDER BY a"],
  ];

  it.each(cases)("%s: %s", (_name, lexical, query) => {
    const before = "SELECT 1;\n\n";
    const doc = `${before}${query}\n\nSELECT 2`;
    const from = before.length;
    const to = from + query.length;
    const state = createState(doc, lexical);
    for (let pos = from; pos <= to; pos++) {
      expect(ranges([statementNear(state, pos)!])).toEqual([{ from, to }]);
    }
  });
});
