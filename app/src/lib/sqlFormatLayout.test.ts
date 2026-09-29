import { describe, expect, it } from "vitest";
import { ENGINES } from "./engines";
import { formatSqlBlock } from "./sqlFormatter";
import { maskQuoted, refineLayout } from "./sqlFormatLayout";

const format = (sql: string, alignAliases = true, width = 60) => formatSqlBlock(sql, ENGINES.mysql, width, alignAliases);

describe("refineLayout (con sql-formatter)", () => {
  it("WITH y su CTE en una linea, sin sangria extra y con aire antes de la consulta", async () => {
    const out = await format("with d as (select a, b, c, d, e, f, g, h from t where x = 1 and y = 2) select * from d where a = 1 and b = 2 and c = 3");
    const lines = out.split("\n");
    expect(lines[0]).toBe("WITH d AS (");
    expect(lines[1]).toBe("  SELECT");
    expect(out).toContain("\n)\n\nSELECT");
  });

  it("el AND extra de un JOIN va bajo el ON", async () => {
    const out = await format(
      "select * from facturas f left join clientes c on c.id = f.cliente_id and c.activo = 1 where f.estado = 1 and f.total > 0",
    );
    const join = out.split("\n").find((line) => line.includes("LEFT JOIN"))!;
    const and = out.split("\n").find((line) => line.trim() === "AND c.activo = 1")!;
    expect(and.indexOf("AND")).toBe(join.indexOf(" ON ") + 1);
  });

  it("GROUP BY y ORDER BY en una linea si caben", async () => {
    const out = await format("select a, b, count(*) as total from t where x = 1 group by a, b order by a, b");
    expect(out).toContain("GROUP BY a, b");
    expect(out).toContain("ORDER BY a, b");
  });

  it("un parentesis corto en una linea; una subconsulta no", async () => {
    const out = await format(
      "select * from t where x = 1 and (:a is null or t.b = :a) and not exists (select 1 from u where u.id = t.id and u.z = 2)",
    );
    expect(out).toContain("AND (:a IS NULL OR t.b = :a)");
    expect(out).toContain("NOT EXISTS (\n");
    expect(out).toContain("SELECT 1");
  });

  it("alinea los AS de un SELECT y deja sin alinear la expresion que sobresale", async () => {
    const out = await format(
      "select sum(f.total - f.pagado) as saldo, count(*) as facturas, min(date_add(f.fecha, interval f.plazo day)) as fecha_limite, f.id from f",
    );
    const lines = out.split("\n");
    const saldo = lines.find((line) => line.includes("AS saldo"))!;
    const facturas = lines.find((line) => line.includes("AS facturas"))!;
    expect(saldo.indexOf(" AS ")).toBe(facturas.indexOf(" AS "));
    expect(lines.find((line) => line.includes("AS fecha_limite"))).toMatch(/\) AS fecha_limite/);
  });

  it("sin alinear, los AS quedan pegados", async () => {
    const out = await format("select sum(f.total - f.pagado) as saldo, count(*) as facturas, f.id, f.b, f.c from f", false);
    expect(out).toContain("COUNT(*) AS facturas");
  });

  it("formatea con parametros :nombre", async () => {
    const out = await format("select * from t where a = :a and b between :desde and :hasta and c in (:x, :y) order by a");
    expect(out).toContain("BETWEEN :desde AND :hasta");
    expect(out).toContain(":a");
  });

  it("no toca el texto de strings", async () => {
    const out = await format("select 'a   (b' as x, 'c  AS  d' as y, e, f, g, h, i, j, k, l from t where z = 'q  q'");
    expect(out).toContain("'a   (b'");
    expect(out).toContain("'c  AS  d'");
    expect(out).toContain("'q  q'");
  });

  it("no junta nada con comentarios", async () => {
    const out = await format("select a, -- el a\n b from t group by a, -- g\n b");
    expect(out).toContain("-- el a");
    expect(out).toContain("-- g");
  });
});

describe("refineLayout (texto directo)", () => {
  it("los AS dentro de parentesis (CAST) no cuentan", () => {
    const out = refineLayout("SELECT\n  CAST(x AS INT) AS a,\n  y AS bb\nFROM t", { width: 80, alignAliases: true });
    expect(out).toBe("SELECT\n  CAST(x AS INT) AS a,\n  y              AS bb\nFROM t");
  });

  it("una sola columna con AS no se alinea", () => {
    const text = "SELECT\n  x AS a,\n  y\nFROM t";
    expect(refineLayout(text, { width: 80, alignAliases: true })).toBe(text);
  });

  it("no pasa del ancho al alinear", () => {
    const text = "SELECT\n  corto AS a,\n  una_expresion_bastante_larga_aqui AS un_alias_largo\nFROM t";
    expect(refineLayout(text, { width: 40, alignAliases: true })).toBe(text);
  });
});

describe("maskQuoted", () => {
  it("tapa el contenido de strings e identificadores", () => {
    expect(maskQuoted("a 'x(y' `b c` \"d\"")).toBe("a 'xxx' `xxx` \"x\"");
    expect(maskQuoted("'it''s' + 'a\\'b'")).toBe("'xxxxx' + 'xxxx'");
  });
});

describe("palabras de operador en mayusculas (MySQL)", () => {
  it("IS NULL, NOT, LIKE y REGEXP, tambien en una sola linea", async () => {
    await expect(format("select * from t where a is not null")).resolves.toBe("SELECT * FROM t WHERE a IS NOT NULL");
    const out = await format("select a from t where a is null and b like 'x%' and c regexp 'is null' and d = 1 and e = 2");
    expect(out).toContain("a IS NULL");
    expect(out).toContain("b LIKE 'x%'");
    expect(out).toContain("c REGEXP 'is null'");
  });

  it("no toca nombres calificados, funciones ni comentarios", () => {
    const out = refineLayout("SELECT t.like, mod(a, 2), x -- is null\nFROM t", { width: 80, alignAliases: false });
    expect(out).toBe("SELECT t.like, mod(a, 2), x -- is null\nFROM t");
  });
});

describe("tryFormatSqlBlock", () => {
  it("dice donde se trabo el parser en vez de fallar callado", async () => {
    const { tryFormatSqlBlock } = await import("./sqlFormatter");
    const result = await tryFormatSqlBlock("SELECT a\nFROM t\nHAVING x BETWEEN :di\nORDER BY a", ENGINES.mysql, 60);
    expect(result).toEqual({ ok: false, token: "ORDER BY", line: 4 });
  });

  it("alinear o no, en ida y vuelta, sobre el mismo texto", async () => {
    const sql = "select sum(f.total - f.pagado) as saldo, count(*) as facturas, f.id, f.cliente from facturas f";
    const aligned = await format(sql, true);
    expect(aligned).toMatch(/COUNT\(\*\) {2,}AS facturas/);
    expect(await format(aligned, false)).toContain("COUNT(*) AS facturas");
    expect(await format(await format(aligned, false), true)).toBe(aligned);
  });
});

describe("alineacion en columnas: JOIN y condiciones", () => {
  const SQL =
    "select a.x as uno, b.y as dos from tec_abonados ta join com_clientes cl on cl.id = ta.cliente left join com_empresas e on e.id = ta.empresa where ta.estado = :estado and ta.fecha >= :desde and ta.direccion like :dir and ta.plan in (1, 2) and (ta.x - ta.y) > 0";

  it("los ON de JOIN seguidos en una columna", async () => {
    const lines = (await format(SQL)).split("\n");
    const joins = lines.filter((line) => /JOIN/.test(line));
    expect(joins).toHaveLength(2);
    expect(joins[0].indexOf(" ON ")).toBe(joins[1].indexOf(" ON "));
  });

  it("los operadores de las condiciones en una columna; lo que sobresale queda igual", async () => {
    const lines = (await format(SQL)).split("\n");
    const column = (text: string) => {
      const line = lines.find((item) => item.includes(text))!;
      return line.indexOf(text);
    };
    expect(column("= :estado")).toBe(column(">= :desde"));
    expect(column(">= :desde")).toBe(column("LIKE :dir"));
    expect(column("LIKE :dir")).toBe(column("IN (1, 2)"));
    expect(lines.find((line) => line.includes("(ta.x - ta.y)"))).toMatch(/\(ta\.x - ta\.y\) > 0/);
  });

  it("sin la opcion, nada de eso", async () => {
    const out = await format(SQL, false);
    expect(out).toContain("JOIN com_clientes cl ON cl.id");
    expect(out).toContain("ta.estado = :estado");
    expect(out).not.toMatch(/\S {2,}(?:ON|=|>=|LIKE|IN) /);
  });

  it("no alinea dentro de strings", () => {
    const text = "SELECT *\nFROM t\nWHERE a = 'x  =  y'\n  AND bb = 2";
    expect(refineLayout(text, { width: 80, alignAliases: true })).toBe("SELECT *\nFROM t\nWHERE a  = 'x  =  y'\n  AND bb = 2");
  });
});

describe("formatSqlText: varias consultas", () => {
  it("formatea las validas y deja igual la que tiene error, diciendo su linea", async () => {
    const { formatSqlText } = await import("./sqlFormatter");
    const sql = "select a from t where x=1;\nselect b from u where between;\nselect c from v where y=2;";
    const result = await formatSqlText(sql, ENGINES.mysql, 60);
    expect(result.formatted).toBe(2);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].line).toBe(2);
    expect(result.text).toContain("SELECT a FROM t WHERE x = 1;");
    expect(result.text).toContain("select b from u where between;");
    expect(result.text).toContain("SELECT c FROM v WHERE y = 2;");
    expect(result.text.split("\n\n")).toHaveLength(3);
  });

  it("la linea del error cuenta desde el principio del texto pedido", async () => {
    const { formatSqlText } = await import("./sqlFormatter");
    const sql = "select 1;\n\nselect a\nfrom t\nhaving x between :a\norder by a;";
    const result = await formatSqlText(sql, ENGINES.mysql, 60);
    expect(result.failures).toEqual([{ line: 6, token: "ORDER BY" }]);
  });

  it("conserva un comentario entre consultas", async () => {
    const { formatSqlText } = await import("./sqlFormatter");
    const result = await formatSqlText("select 1;\n-- sigue la otra\nselect 2;", ENGINES.mysql, 60);
    expect(result.text).toContain("-- sigue la otra");
    expect(result.failures).toEqual([]);
  });

  it("todas con error: nada cambia", async () => {
    const { formatSqlText } = await import("./sqlFormatter");
    const sql = "select b from u where between;\nselect a from t having x between :a order by a;";
    const result = await formatSqlText(sql, ENGINES.mysql, 60);
    expect(result.formatted).toBe(0);
    expect(result.text).toBe(sql);
  });
});

describe("alignColumnDefinitions", () => {
  it("nombre, tipo y restricciones en columnas; claves sin tocar", async () => {
    const { alignColumnDefinitions } = await import("./sqlFormatLayout");
    const ddl = [
      "CREATE TABLE tec_abonados (",
      "  abon_ipv6 int NOT NULL DEFAULT '1',",
      "  naps_num int DEFAULT NULL,",
      "  abon_desc decimal(10,4) NOT NULL DEFAULT '0.0000',",
      "  abon_sect int NOT NULL DEFAULT '0' COMMENT '1 Urbano / 2 Rural',",
      "  ontd_snum varchar(45),",
      "  PRIMARY KEY (abon_codi),",
      "  KEY idx_x (naps_num)",
      ") ENGINE=InnoDB",
    ].join("\n");
    expect(alignColumnDefinitions(ddl).split("\n")).toEqual([
      "CREATE TABLE tec_abonados (",
      "  abon_ipv6 int           NOT NULL DEFAULT '1',",
      "  naps_num  int           DEFAULT NULL,",
      "  abon_desc decimal(10,4) NOT NULL DEFAULT '0.0000',",
      "  abon_sect int           NOT NULL DEFAULT '0' COMMENT '1 Urbano / 2 Rural',",
      "  ontd_snum varchar(45),",
      "  PRIMARY KEY (abon_codi),",
      "  KEY idx_x (naps_num)",
      ") ENGINE=InnoDB",
    ]);
  });

  it("tipos de varias palabras (Postgres) y nombres entre comillas", async () => {
    const { alignColumnDefinitions } = await import("./sqlFormatLayout");
    const ddl = 'CREATE TABLE public.t (\n  id integer NOT NULL,\n  "Creado en" timestamp without time zone DEFAULT now(),\n  nota character varying(20)\n);';
    expect(alignColumnDefinitions(ddl).split("\n")).toEqual([
      "CREATE TABLE public.t (",
      "  id          integer                     NOT NULL,",
      '  "Creado en" timestamp without time zone DEFAULT now(),',
      "  nota        character varying(20)",
      ");",
    ]);
  });

  it("un DEFAULT dentro de un COMMENT no corta el tipo; sin CREATE TABLE no cambia nada", async () => {
    const { alignColumnDefinitions } = await import("./sqlFormatLayout");
    const ddl = "CREATE TABLE t (\n  a int COMMENT 'DEFAULT x',\n  bb text NOT NULL\n)";
    expect(alignColumnDefinitions(ddl)).toBe("CREATE TABLE t (\n  a  int  COMMENT 'DEFAULT x',\n  bb text NOT NULL\n)");
    expect(alignColumnDefinitions("SELECT 1")).toBe("SELECT 1");
  });
});
