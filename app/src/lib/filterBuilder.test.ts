import { describe, expect, it } from "vitest";
import { buildWhere, newCondition, quoteIdentifier, sqlLiteral, type FilterCondition } from "./filterBuilder";

function condition(partial: Partial<FilterCondition>): FilterCondition {
  return { ...newCondition(), ...partial };
}

const types: Record<string, string> = { id: "int", estado: "varchar", activo: "boolean", monto: "decimal(10,2)" };
const typeOf = (column: string) => types[column] ?? "";

describe("sqlLiteral", () => {
  it("numeros y booleanos sin comillas solo si la columna es de ese tipo", () => {
    expect(sqlLiteral("42", "int")).toBe("42");
    expect(sqlLiteral("-3.5", "decimal")).toBe("-3.5");
    expect(sqlLiteral("42", "varchar")).toBe("'42'");
    expect(sqlLiteral("true", "boolean")).toBe("TRUE");
    expect(sqlLiteral("abc", "int")).toBe("'abc'");
  });

  it("escapa las comillas simples", () => {
    expect(sqlLiteral("O'Brien", "varchar")).toBe("'O''Brien'");
  });
});

describe("quoteIdentifier", () => {
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
