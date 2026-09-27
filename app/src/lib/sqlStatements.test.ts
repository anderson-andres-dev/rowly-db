import { describe, expect, it } from "vitest";
import { splitStatements, statementAt } from "./sqlStatements";

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
  const range = statementAt(text, offset);
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
    expect(statementAt("   \n  -- solo un comentario\n", 3)).toBeNull();
  });

  it("una sentencia sin punto y coma final", () => {
    expect(textAt("SELECT 1;\nSELECT 2\n", 12)).toBe("SELECT 2");
  });
});

describe("splitStatements", () => {
  it("no corta en ; dentro de comillas, comentarios ni bloques $$", () => {
    const text = [
      "SELECT 'a;b', \"c;d\", `e;f`; -- nota; aqui",
      "/* bloque; */ SELECT 2;",
      "CREATE FUNCTION f() RETURNS int AS $$ BEGIN RETURN 1; END; $$ LANGUAGE plpgsql;",
    ].join("\n");
    const parts = splitStatements(text).map((range) => text.slice(range.from, range.to));
    expect(parts).toEqual([
      "SELECT 'a;b', \"c;d\", `e;f`;",
      "SELECT 2;",
      "CREATE FUNCTION f() RETURNS int AS $$ BEGIN RETURN 1; END; $$ LANGUAGE plpgsql;",
    ]);
  });

  it("respeta comillas escapadas", () => {
    const text = "SELECT 'it''s; ok';\nSELECT 'a\\';b';";
    const parts = splitStatements(text).map((range) => text.slice(range.from, range.to));
    expect(parts).toEqual(["SELECT 'it''s; ok';", "SELECT 'a\\';b';"]);
  });
});
