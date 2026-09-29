import { describe, expect, it } from "vitest";
import { findParameters, parameterValue, substituteParameters } from "./sqlParameters";
import { parameterColumns } from "./sqlParameterTypes";
import type { SqlLexical } from "./sqlStatements";
import type { CatalogTable } from "./types";

const MYSQL: SqlLexical = {
  identifierQuotes: ["`"],
  backslashEscapes: true,
  hashComments: true,
  dollarQuotes: false,
  escapeStringPrefix: false,
};
const POSTGRES: SqlLexical = {
  identifierQuotes: ['"'],
  backslashEscapes: false,
  hashComments: false,
  dollarQuotes: true,
  escapeStringPrefix: true,
};
const names = (sql: string, lexical = MYSQL) => findParameters(sql, lexical).map((p) => p.name);

describe("findParameters: bordes", () => {
  it("al principio y al final del texto, pegado a parentesis y comas", () => {
    expect(names(":a")).toEqual(["a"]);
    expect(names("SELECT (:a),:b,(:c)")).toEqual(["a", "b", "c"]);
    expect(names("WHERE x=:a")).toEqual(["a"]);
  });

  it("nombres con digitos y guion bajo; un digito despues de : no es parametro", () => {
    expect(names("SELECT :p1, :_x, :a_b_2")).toEqual(["p1", "_x", "a_b_2"]);
    expect(names("SELECT :1, :2x")).toEqual([]);
  });

  it("comentarios y strings sin cerrar no rompen ni cuentan", () => {
    expect(names("SELECT :a /* :b sin cerrar")).toEqual(["a"]);
    expect(names("SELECT :a, ':b sin cerrar")).toEqual(["a"]);
    expect(names("SELECT :a -- :b")).toEqual(["a"]);
  });

  it("MySQL: comillas dobles son texto; backticks, identificador", () => {
    expect(names('SELECT ":no", `:tampoco`, :si')).toEqual(["si"]);
    expect(names("SELECT 'a\\\\', :si")).toEqual(["si"]);
  });

  it("Postgres: la barra no escapa fuera de E'...'", () => {
    // 'a\' es un string completo en Postgres: :si queda fuera.
    expect(names("SELECT 'a\\', :si", POSTGRES)).toEqual(["si"]);
  });

  it("Postgres: $1 no es un bloque y los $tag$ anidados se respetan", () => {
    expect(names("SELECT $1, :p", POSTGRES)).toEqual(["p"]);
    expect(names("SELECT $a$ :no $b$ :no $b$ :no $a$, :si", POSTGRES)).toEqual(["si"]);
  });

  it("en MySQL $ no abre nada", () => {
    expect(names("SELECT $$ :si $$")).toEqual(["si"]);
  });

  it("varias sentencias", () => {
    expect(names("SELECT :a; UPDATE t SET x = :b WHERE id = :a;")).toEqual(["a", "b", "a"]);
  });

  it("texto grande sin ':' ni parametros", () => {
    const big = "INSERT INTO t VALUES " + Array.from({ length: 20000 }, (_, i) => `(${i}, 'x')`).join(",");
    expect(names(big)).toEqual([]);
    expect(names(big + " , (:ultimo, 'y')")).toEqual(["ultimo"]);
  });
});

describe("substituteParameters: bordes", () => {
  it("valores con ':' y comillas no se vuelven a interpretar", () => {
    const sql = "SELECT :a, :b";
    const out = substituteParameters(sql, findParameters(sql, MYSQL), new Map([["a", "':b'"], ["b", "'x'"]]));
    expect(out).toBe("SELECT ':b', 'x'");
  });

  it("sin parametros deja el texto igual", () => {
    expect(substituteParameters("SELECT 1", [], new Map())).toBe("SELECT 1");
  });
});

describe("parameterValue: bordes", () => {
  const sql = (raw: string, type: Parameters<typeof parameterValue>[1] = null) => {
    const result = parameterValue(raw, type, false, MYSQL);
    return result.ok ? result.sql : `error:${result.error}`;
  };

  it("el texto conserva los espacios de lo escrito", () => {
    expect(sql("  hola  ", "text")).toBe("'  hola  '");
  });

  it("un texto que parece palabra reservada, sin tipo, va con comillas", () => {
    expect(sql("select")).toBe("'select'");
    expect(sql("Juan (padre)")).toBe("'Juan (padre)'");
  });

  it("fechas: bisiesto, mes 13 y formatos a medias", () => {
    expect(sql("29/02/2024", "date")).toBe("'2024-02-29'");
    expect(sql("29/02/2025", "date")).toBe("error:date");
    expect(sql("2025-13-01", "date")).toBe("error:date");
    expect(sql("2025-1-5", "date")).toBe("'2025-01-05'");
    expect(sql("hoy", "date")).toBe("error:date");
    expect(sql("2025-01-05T10:15", "datetime")).toBe("'2025-01-05 10:15:00'");
    expect(sql("2025-01-05 10:15:30.250", "datetime")).toBe("'2025-01-05 10:15:30.250'");
    expect(sql("2025-01-05 24:00", "datetime")).toBe("error:datetime");
  });

  it("numeros: negativos, exponentes, miles con punto y coma", () => {
    expect(sql("-7", "integer")).toBe("-7");
    expect(sql("1e3", "decimal")).toBe("1e3");
    expect(sql("1.234,5", "decimal")).toBe("error:decimal");
    expect(sql(".5", "decimal")).toBe(".5");
  });
});

describe("parameterColumns: bordes", () => {
  const column = (name: string, dataType: string) => ({ name, dataType, nullable: true, isPrimaryKey: false });
  const CATALOG: CatalogTable[] = [
    { schema: "core", name: "tec_abonados", columns: [column("abon_esta", "int"), column("abon_fcre", "datetime")], foreignKeys: [] },
    { schema: "otro", name: "tec_abonados", columns: [column("abon_esta", "varchar(10)")], foreignKeys: [] },
    { schema: "core", name: "ventas", columns: [column("total", "decimal(12,2)"), column("abon_esta", "varchar(5)")], foreignKeys: [] },
  ];
  const types = (sql: string, lexical = MYSQL) =>
    Object.fromEntries(
      [...parameterColumns(sql, findParameters(sql, lexical), lexical, CATALOG)].map(([name, info]) => [name, info.type]),
    );

  it("schema.tabla elige la tabla de ese schema", () => {
    expect(types("SELECT * FROM otro.tec_abonados WHERE abon_esta = :e")).toEqual({ e: "text" });
    expect(types("SELECT * FROM core.tec_abonados WHERE abon_esta = :e")).toEqual({ e: "integer" });
  });

  it("identificadores entre comillas", () => {
    expect(types("SELECT * FROM `tec_abonados` t WHERE t.`abon_fcre` >= :d")).toEqual({ d: "datetime" });
  });

  it("NOT IN, NOT LIKE, <> y operadores sin espacios", () => {
    expect(types("SELECT * FROM ventas WHERE total NOT IN (1,:a) AND total<>:b AND total>=:c")).toEqual({
      a: "decimal",
      b: "decimal",
      c: "decimal",
    });
  });

  it("la tabla de la consulta gana sobre otra del catalogo con la misma columna", () => {
    expect(types("SELECT * FROM ventas WHERE abon_esta = :e")).toEqual({ e: "text" });
  });

  it("un alias que no existe en la consulta no inventa tipo", () => {
    expect(types("SELECT * FROM ventas v WHERE zz.total = :a")).toEqual({});
  });

  it("sin catalogo no hay tipos", () => {
    const sql = "SELECT * FROM ventas WHERE total = :a";
    expect(parameterColumns(sql, findParameters(sql, MYSQL), MYSQL, []).size).toBe(0);
  });
});
