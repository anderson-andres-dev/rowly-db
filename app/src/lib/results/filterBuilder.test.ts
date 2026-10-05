import { describe, expect, it } from "vitest";
import { ENGINES, engineForContext } from "$lib/engines";
import type { ConnectionDriver } from "$lib/connections";
import type { ConnectionEngineContext } from "$lib/types";
import { buildWhere, newCondition, quoteIdentifier, sqlLiteral, type FilterCondition } from "./filterBuilder";

const context = (engineId: ConnectionDriver, noBackslashEscapes: boolean): ConnectionEngineContext => ({
  generation: 1,
  engineId,
  server: { engine: engineId, version: [8, 4, 11], label: "MySQL 8.4.11" },
  sessionMode: { noBackslashEscapes },
  line: { id: "8.4", revision: 1, origin: "included" },
  reservedWords: [],
  schemaEpoch: 0,
  support: null,
  verification: "verified",
});

function condition(partial: Partial<FilterCondition>): FilterCondition {
  return { ...newCondition(), ...partial };
}

const types: Record<string, string> = { id: "int", estado: "varchar", activo: "boolean", monto: "decimal(10,2)" };
const typeOf = (column: string) => types[column] ?? "";

describe("sqlLiteral", () => {
  it("numeros y booleanos sin comillas solo si la columna es de ese tipo", () => {
    expect(sqlLiteral("42", "int", ENGINES.postgres)).toBe("42");
    expect(sqlLiteral("-3.5", "decimal", ENGINES.postgres)).toBe("-3.5");
    expect(sqlLiteral("42", "varchar", ENGINES.postgres)).toBe("'42'");
    expect(sqlLiteral("true", "boolean", ENGINES.postgres)).toBe("TRUE");
    expect(sqlLiteral("abc", "int", ENGINES.postgres)).toBe("'abc'");
  });

  it("escapa las comillas simples", () => {
    expect(sqlLiteral("O'Brien", "varchar", ENGINES.postgres)).toBe("'O''Brien'");
  });

  it("en MySQL tambien la barra invertida; en Postgres es un caracter mas", () => {
    expect(sqlLiteral("C:\\", "varchar", ENGINES.mysql)).toBe("'C:\\\\'");
    expect(sqlLiteral("C:\\", "varchar", ENGINES.postgres)).toBe("'C:\\'");
  });

  // El modo lo dice el backend al conectar (ConnectionEngineContext): con
  // NO_BACKSLASH_ESCAPES, duplicar la barra guardaria dos.
  it("con NO_BACKSLASH_ESCAPES en la sesion, la barra es un caracter mas tambien en MySQL", () => {
    const engine = engineForContext(context("mysql", true));
    expect(sqlLiteral("C:\\", "varchar", engine)).toBe("'C:\\'");
    expect(sqlLiteral("O'Brien", "varchar", engine)).toBe("'O''Brien'");
    expect(engine.lexical.backslashEscapes).toBe(false);
    // Un perfil por motor y modo: su identidad sirve de clave.
    expect(engineForContext(context("mysql", true))).toBe(engine);
    expect(engineForContext(context("mysql", false))).toBe(ENGINES.mysql);
    expect(engineForContext(context("postgres", true))).toBe(ENGINES.postgres);
  });
});

describe("quoteIdentifier", () => {
  // Comprobado contra MySQL 8.4.11 y PostgreSQL 18.6: sin comillas,
  // `WHERE order = 1` es error de sintaxis en los dos y `WHERE Name` en
  // Postgres busca la columna `name`.
  it("quotes reserved words in every engine and mixed case in Postgres", () => {
    expect(quoteIdentifier("order", ENGINES.mysql)).toBe("`order`");
    expect(quoteIdentifier("order", ENGINES.mariadb)).toBe("`order`");
    expect(quoteIdentifier("order", ENGINES.postgres)).toBe('"order"');
    expect(quoteIdentifier("Name", ENGINES.postgres)).toBe('"Name"');
    expect(quoteIdentifier("Name", ENGINES.mysql)).toBe("Name");
  });

  it("deja los nombres simples y escapa los demas segun el motor", () => {
    expect(quoteIdentifier("created_at", ENGINES.mysql)).toBe("created_at");
    expect(quoteIdentifier("fecha alta", ENGINES.mysql)).toBe("`fecha alta`");
    expect(quoteIdentifier("fecha alta", ENGINES.postgres)).toBe('"fecha alta"');
  });
});

describe("buildWhere", () => {
  it("una condicion por operador", () => {
    expect(buildWhere([condition({ column: "id", operator: "=", value: "7" })], ENGINES.mysql, typeOf)).toBe("id = 7");
    expect(buildWhere([condition({ column: "estado", operator: "LIKE", value: "%act%" })], ENGINES.mysql, typeOf)).toBe(
      "estado LIKE '%act%'",
    );
    expect(buildWhere([condition({ column: "estado", operator: "IS NULL" })], ENGINES.mysql, typeOf)).toBe("estado IS NULL");
    expect(buildWhere([condition({ column: "estado", operator: "IN", value: "a, b ,c" })], ENGINES.mysql, typeOf)).toBe(
      "estado IN ('a', 'b', 'c')",
    );
    expect(
      buildWhere([condition({ column: "monto", operator: "BETWEEN", value: "10", value2: "20" })], ENGINES.mysql, typeOf),
    ).toBe("monto BETWEEN 10 AND 20");
  });

  it("ignora las condiciones incompletas", () => {
    expect(
      buildWhere(
        [
          condition({ column: "id", operator: "=", value: "" }),
          condition({ column: "", operator: "=", value: "x" }),
          condition({ column: "monto", operator: "BETWEEN", value: "1", value2: "" }),
          condition({ column: "estado", operator: "IN", value: " , " }),
        ],
        ENGINES.mysql,
        typeOf,
      ),
    ).toBe("");
  });

  it("une con Y u O sin parentesis si no se mezclan", () => {
    expect(
      buildWhere(
        [
          condition({ column: "id", operator: ">", value: "1" }),
          condition({ join: "and", column: "estado", operator: "=", value: "activo" }),
        ],
        ENGINES.mysql,
        typeOf,
      ),
    ).toBe("id > 1 AND estado = 'activo'");
  });

  it("al mezclar Y y O agrupa de izquierda a derecha, como se lee", () => {
    expect(
      buildWhere(
        [
          condition({ column: "id", operator: ">", value: "1" }),
          condition({ join: "and", column: "estado", operator: "=", value: "activo" }),
          condition({ join: "or", column: "activo", operator: "=", value: "true" }),
        ],
        ENGINES.postgres,
        typeOf,
      ),
    ).toBe("((id > 1 AND estado = 'activo') OR activo = TRUE)");
  });
});
