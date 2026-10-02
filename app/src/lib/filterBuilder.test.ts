import { describe, expect, it } from "vitest";
import { buildWhere, newCondition, quoteIdentifier, sqlLiteral, type FilterCondition } from "./filterBuilder";

function condition(partial: Partial<FilterCondition>): FilterCondition {
  return { ...newCondition(), ...partial };
}

const types: Record<string, string> = { id: "int", estado: "varchar", activo: "boolean", monto: "decimal(10,2)" };
const typeOf = (column: string) => types[column] ?? "";

describe("sqlLiteral", () => {
  it("numeros y booleanos sin comillas solo si la columna es de ese tipo", () => {
    expect(sqlLiteral("42", "int", "postgres")).toBe("42");
    expect(sqlLiteral("-3.5", "decimal", "postgres")).toBe("-3.5");
    expect(sqlLiteral("42", "varchar", "postgres")).toBe("'42'");
    expect(sqlLiteral("true", "boolean", "postgres")).toBe("TRUE");
    expect(sqlLiteral("abc", "int", "postgres")).toBe("'abc'");
  });

  it("escapa las comillas simples", () => {
    expect(sqlLiteral("O'Brien", "varchar", "postgres")).toBe("'O''Brien'");
  });

  it("en MySQL tambien la barra invertida; en Postgres es un caracter mas", () => {
    expect(sqlLiteral("C:\\", "varchar", "mysql")).toBe("'C:\\\\'");
    expect(sqlLiteral("C:\\", "varchar", "postgres")).toBe("'C:\\'");
  });
});

describe("quoteIdentifier", () => {
  // Comprobado contra MySQL 8.4.11 y PostgreSQL 18.6: sin comillas,
  // `WHERE order = 1` es error de sintaxis en los dos y `WHERE Name` en
  // Postgres busca la columna `name`.
  it("quotes reserved words in every engine and mixed case in Postgres", () => {
    expect(quoteIdentifier("order", "mysql")).toBe("`order`");
    expect(quoteIdentifier("order", "mariadb")).toBe("`order`");
    expect(quoteIdentifier("order", "postgres")).toBe('"order"');
    expect(quoteIdentifier("Name", "postgres")).toBe('"Name"');
    expect(quoteIdentifier("Name", "mysql")).toBe("Name");
  });

  it("deja los nombres simples y escapa los demas segun el motor", () => {
    expect(quoteIdentifier("created_at", "mysql")).toBe("created_at");
    expect(quoteIdentifier("fecha alta", "mysql")).toBe("`fecha alta`");
    expect(quoteIdentifier("fecha alta", "postgres")).toBe('"fecha alta"');
  });
});

describe("buildWhere", () => {
  it("una condicion por operador", () => {
    expect(buildWhere([condition({ column: "id", operator: "=", value: "7" })], "mysql", typeOf)).toBe("id = 7");
    expect(buildWhere([condition({ column: "estado", operator: "LIKE", value: "%act%" })], "mysql", typeOf)).toBe(
      "estado LIKE '%act%'",
    );
    expect(buildWhere([condition({ column: "estado", operator: "IS NULL" })], "mysql", typeOf)).toBe("estado IS NULL");
    expect(buildWhere([condition({ column: "estado", operator: "IN", value: "a, b ,c" })], "mysql", typeOf)).toBe(
      "estado IN ('a', 'b', 'c')",
    );
    expect(
      buildWhere([condition({ column: "monto", operator: "BETWEEN", value: "10", value2: "20" })], "mysql", typeOf),
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
        "mysql",
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
        "mysql",
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
        "postgres",
        typeOf,
      ),
    ).toBe("((id > 1 AND estado = 'activo') OR activo = TRUE)");
  });
});
