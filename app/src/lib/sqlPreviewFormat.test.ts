import { describe, expect, it } from "vitest";
import { formatPreviewSql } from "./sqlPreviewFormat";

describe("formatPreviewSql", () => {
  it("corta antes de VALUES y ajusta la lista larga con sangria colgante", () => {
    const sql =
      "INSERT INTO core.api_core_smoke_test (run_token, nombre, estado, nota, created_at, updated_at) " +
      "VALUES ('sdd-mysql-procedure-1', 'sdd-test', 'activo', 'actualizada-por-call', " +
      "'2026-08-12 16:18:09.045686', '2026-08-12 16:18:09.642017');";
    expect(formatPreviewSql(sql, 80)).toBe(
      [
        "INSERT INTO core.api_core_smoke_test (run_token, nombre, estado, nota,",
        "                                      created_at, updated_at)",
        "VALUES ('sdd-mysql-procedure-1', 'sdd-test', 'activo', 'actualizada-por-call',",
        "        '2026-08-12 16:18:09.045686', '2026-08-12 16:18:09.642017');",
      ].join("\n"),
    );
  });

  it("deja en una linea por clausula lo que entra en el ancho", () => {
    expect(formatPreviewSql("UPDATE users SET name = 'ana', age = 3 WHERE id = 1;")).toBe(
      ["UPDATE users", "SET name = 'ana', age = 3", "WHERE id = 1;"].join("\n"),
    );
    expect(formatPreviewSql("DELETE FROM users WHERE id = 1;")).toBe(
      ["DELETE FROM users", "WHERE id = 1;"].join("\n"),
    );
  });

  it("no corta palabras clave ni comas dentro de literales", () => {
    const sql = "UPDATE t SET nota = 'valores, set y where' WHERE id = 1;";
    expect(formatPreviewSql(sql)).toBe(
      ["UPDATE t", "SET nota = 'valores, set y where'", "WHERE id = 1;"].join("\n"),
    );
  });

  it("junta los saltos de linea que ya traia la sentencia", () => {
    expect(formatPreviewSql("DELETE\nFROM core.t\nWHERE id = 4;")).toBe(
      ["DELETE FROM core.t", "WHERE id = 4;"].join("\n"),
    );
  });

  it("no confunde columnas que contienen la palabra clave", () => {
    expect(formatPreviewSql("UPDATE t SET offset_values = 1 WHERE id = 2;")).toBe(
      ["UPDATE t", "SET offset_values = 1", "WHERE id = 2;"].join("\n"),
    );
  });
});
