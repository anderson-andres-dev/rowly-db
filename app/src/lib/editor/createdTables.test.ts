import { describe, expect, it } from "vitest";
import { Text } from "@codemirror/state";
import { createdTables } from "$lib/editor/createdTables";

const created = (sql: string) => createdTables(Text.of(sql.split("\n")));

describe("tablas que crea el documento", () => {
  it("CREATE TABLE, TEMPORARY, TEMP, IF NOT EXISTS, OR REPLACE y vistas", () => {
    expect(
      created(
        [
          "CREATE TEMPORARY TABLE tmp_mora AS SELECT 1;",
          "create temp table tmp_pg (id int);",
          "CREATE TABLE IF NOT EXISTS bitacora (id INT);",
          "CREATE OR REPLACE VIEW v_saldos AS SELECT 1;",
          "CREATE MATERIALIZED VIEW mv AS SELECT 1;",
        ].join("\n"),
      ),
    ).toEqual(["bitacora", "mv", "tmp_mora", "tmp_pg", "v_saldos"]);
  });

  it("con schema o comillas, el nombre sin ellos", () => {
    expect(created("CREATE TABLE `app`.`reporte` (id INT);\nCREATE TABLE \"Resumen\" (id int);")).toEqual([
      "Resumen",
      "reporte",
    ]);
  });

  it("el nombre en la linea siguiente", () => {
    expect(created("CREATE TEMPORARY TABLE\n  tmp_x AS SELECT 1;")).toEqual(["tmp_x"]);
  });

  it("sin CREATE, nada", () => {
    expect(created("SELECT * FROM clientes;\nDROP TABLE tmp;")).toEqual([]);
  });
});
