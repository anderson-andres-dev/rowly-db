import { describe, expect, it } from "vitest";
import { splitStatements, statementAt } from "./sqlStatements";
import { ENGINES } from "./engines";

const mysql = ENGINES.mysql.lexical;
const postgres = ENGINES.postgres.lexical;

const doc = [
  "SELECT * FROM portal_payment_incidents;", // linea 0
  "",
  "",
  "SELECT * FROM tec_abonados;", // linea 3
  "",
  "SELECT * FROM com_facturas_ventas;", // linea 5
  "",
  "SELECT * FROM api_core_smoke_test;", // linea 7
  "",
  "",
].join("\n");

function textAt(text: string, offset: number): string | null {
  const range = statementAt(text, offset, mysql);
  return range ? text.slice(range.from, range.to) : null;
}

function lineStart(text: string, line: number): number {
  return text.split("\n").slice(0, line).join("\n").length + (line > 0 ? 1 : 0);
}

describe("statementAt", () => {
  it("con el cursor al inicio de la linea elige la sentencia de esa linea, nunca todo el documento", () => {
    expect(textAt(doc, lineStart(doc, 7))).toBe("SELECT * FROM api_core_smoke_test;");
    expect(textAt(doc, lineStart(doc, 0))).toBe("SELECT * FROM portal_payment_incidents;");
    expect(textAt(doc, lineStart(doc, 3))).toBe("SELECT * FROM tec_abonados;");
  });

  it("dentro de la sentencia y justo despues de su punto y coma", () => {
    const line5 = lineStart(doc, 5);
    expect(textAt(doc, line5 + 10)).toBe("SELECT * FROM com_facturas_ventas;");
    expect(textAt(doc, line5 + "SELECT * FROM com_facturas_ventas;".length)).toBe(
      "SELECT * FROM com_facturas_ventas;",
    );
  });

  it("en una linea vacia elige la mas cercana; a igual distancia, la anterior", () => {
    expect(textAt(doc, lineStart(doc, 1))).toBe("SELECT * FROM portal_payment_incidents;");
    expect(textAt(doc, lineStart(doc, 2))).toBe("SELECT * FROM tec_abonados;");
    expect(textAt(doc, lineStart(doc, 4))).toBe("SELECT * FROM tec_abonados;");
    expect(textAt(doc, lineStart(doc, 9))).toBe("SELECT * FROM api_core_smoke_test;");
  });

  it("sin sentencias no devuelve nada", () => {
    expect(statementAt("   \n  -- solo un comentario\n", 3, mysql)).toBeNull();
  });

  it("una sentencia sin punto y coma final", () => {
    expect(textAt("SELECT 1;\nSELECT 2\n", 12)).toBe("SELECT 2");
  });
});

describe("splitStatements", () => {
  const parts = (text: string, lexical = mysql) => splitStatements(text, lexical).map((range) => text.slice(range.from, range.to));

  it("MySQL: no corta en ; dentro de comillas, backticks ni comentarios (tambien #)", () => {
    const text = ["SELECT 'a;b', \"c;d\", `e;f`; -- nota; aqui", "/* bloque; */ SELECT 2; # otra; nota", "SELECT 3;"].join("\n");
    expect(parts(text)).toEqual(["SELECT 'a;b', \"c;d\", `e;f`;", "SELECT 2;", "SELECT 3;"]);
  });

  it("MySQL: respeta las comillas escapadas, con '' y con barra invertida", () => {
    expect(parts("SELECT 'it''s; ok';\nSELECT 'a\\';b';")).toEqual(["SELECT 'it''s; ok';", "SELECT 'a\\';b';"]);
  });

  it("Postgres: bloques $$ y la barra invertida es un caracter mas", () => {
    const text = "CREATE FUNCTION f() RETURNS int AS $$ BEGIN RETURN 1; END; $$ LANGUAGE plpgsql;\nSELECT 'C:\\';SELECT 2;";
    expect(parts(text, postgres)).toEqual([
      "CREATE FUNCTION f() RETURNS int AS $$ BEGIN RETURN 1; END; $$ LANGUAGE plpgsql;",
      "SELECT 'C:\\';",
      "SELECT 2;",
    ]);
  });

  it("Postgres: # no es un comentario (es un operador)", () => {
    expect(parts("SELECT 1 # 2; SELECT 3;", postgres)).toEqual(["SELECT 1 # 2;", "SELECT 3;"]);
  });
});

describe("splitStatements - linea en blanco", () => {
  const texts = (text: string) => splitStatements(text, mysql).map(({ from, to }) => text.slice(from, to));

  it("separa dos consultas sin ;", () => {
    expect(texts("SELECT * FROM users\n\nSELECT * FROM orders")).toEqual(["SELECT * FROM users", "SELECT * FROM orders"]);
  });

  it("con espacios en la linea vacia y con \\r\\n", () => {
    expect(texts("SELECT 1\n   \t\nSELECT 2")).toEqual(["SELECT 1", "SELECT 2"]);
    expect(texts("SELECT 1\r\n\r\nSELECT 2")).toEqual(["SELECT 1", "SELECT 2"]);
  });

  it("un solo salto de linea no separa", () => {
    expect(texts("SELECT *\nFROM users")).toEqual(["SELECT *\nFROM users"]);
  });

  it("dentro de parentesis no separa", () => {
    const text = "SELECT * FROM (\n  SELECT id FROM users\n\n) u";
    expect(texts(text)).toEqual([text]);
  });

  it("tras una coma o un operador no separa", () => {
    const cte = "WITH a AS (SELECT 1),\n\nb AS (SELECT 2)\nSELECT * FROM a, b";
    expect(texts(cte)).toEqual([cte]);
    expect(texts("SELECT 1 +\n\n2")).toEqual(["SELECT 1 +\n\n2"]);
  });

  it("dentro de comillas o de un comentario de bloque no separa", () => {
    const quoted = "SELECT 'a\n\nb'";
    expect(texts(quoted)).toEqual([quoted]);
    const comment = "SELECT 1 /* nota\n\nlarga */ + 2";
    expect(texts(comment)).toEqual([comment]);
  });

  it("el ; sigue separando como siempre", () => {
    expect(texts("SELECT 1; SELECT 2;\n\nSELECT 3")).toEqual(["SELECT 1;", "SELECT 2;", "SELECT 3"]);
  });

  it("un comentario entre sentencias no forma una sentencia", () => {
    expect(texts("SELECT 1\n\n-- siguiente\nSELECT 2")).toEqual(["SELECT 1", "SELECT 2"]);
  });

  it("SELECT * seguido de una linea en blanco tambien separa", () => {
    expect(texts("SELECT *\n\nFROM users")).toEqual(["SELECT *", "FROM users"]);
  });
});
