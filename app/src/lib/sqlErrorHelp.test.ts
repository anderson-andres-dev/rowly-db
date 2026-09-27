import { describe, expect, it } from "vitest";
import { errorHelp, groupByFixes } from "./sqlErrorHelp";
import { lineColumnToOffset } from "./sqlDiagnostics";

describe("errorHelp", () => {
  it("reconoce el mismo problema en Postgres y en MySQL", () => {
    expect(errorHelp("42P01")).toBe("tableMissing");
    expect(errorHelp("1146")).toBe("tableMissing");
    expect(errorHelp("99999")).toBeNull();
    expect(errorHelp(undefined)).toBeNull();
  });
});

describe("groupByFixes", () => {
  it("ofrece sumar la columna o agregarla al final del GROUP BY", () => {
    const sql = "SELECT cliente_id, total\nFROM pedidos\nGROUP BY cliente_id\nORDER BY 1;";
    const from = sql.indexOf("total");
    const fixes = groupByFixes(sql, { from, to: from + 5 });
    expect(fixes.map((fix) => fix.insert)).toEqual(["SUM(total)", ", total"]);
    const applied = sql.slice(0, fixes[1].from) + fixes[1].insert + sql.slice(fixes[1].to);
    expect(applied).toContain("GROUP BY cliente_id, total\nORDER BY 1;");
  });

  it("sin GROUP BY en el texto, solo sumar", () => {
    expect(groupByFixes("SELECT a, b FROM t", { from: 10, to: 11 })).toHaveLength(1);
  });
});

describe("lineColumnToOffset", () => {
  it("cuenta caracteres, no unidades UTF-16", () => {
    const sql = "SELECT '🙂',\n  fcha FROM t";
    expect(sql.slice(lineColumnToOffset(sql, 2, 3), lineColumnToOffset(sql, 2, 7))).toBe("fcha");
    expect(sql.slice(lineColumnToOffset(sql, 1, 11))).toBe(",\n  fcha FROM t");
  });
});
