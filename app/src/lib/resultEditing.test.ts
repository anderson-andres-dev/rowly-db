import { describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import {
  EMPTY_EDITS,
  addRow,
  buildChanges,
  deleteRows,
  fillCells,
  pendingCount,
  revert,
  setCellValue,
  type ResultEditInfo,
} from "./resultEditing";

const info: ResultEditInfo = {
  target: { schema: "core", table: "incidents" },
  keyColumns: ["id"],
  columns: [
    { name: "id", dataType: "int", nullable: false, isPrimaryKey: true, defaultValue: null, generated: true },
    { name: "seve", dataType: "varchar(20)", nullable: true, isPrimaryKey: false, defaultValue: "'low'", generated: false },
    null,
  ],
};
const rows = [
  ["6", "critical", "x"],
  ["7", "critical", "y"],
  ["24", "critical", "z"],
];

describe("resultEditing", () => {
  it("volver al valor original quita el cambio pendiente", () => {
    let edits = setCellValue(EMPTY_EDITS, rows, 2, 1, { kind: "text", value: "error" });
    expect(pendingCount(edits)).toBe(1);
    edits = setCellValue(edits, rows, 2, 1, { kind: "text", value: "critical" });
    expect(pendingCount(edits)).toBe(0);
  });

  it("arma deletes, updates e inserts con la clave original", () => {
    let edits = setCellValue(EMPTY_EDITS, rows, 2, 1, { kind: "text", value: "error" });
    edits = deleteRows(edits, rows.length, { minRow: 1, maxRow: 1, minCol: 0, maxCol: 2 });
    edits = addRow(edits, info);
    edits = setCellValue(edits, rows, 3, 1, { kind: "text", value: "high" });

    expect(buildChanges(edits, info, rows)).toEqual({
      deletes: [[{ column: "id", value: { kind: "text", value: "7" } }]],
      updates: [
        {
          key: [{ column: "id", value: { kind: "text", value: "24" } }],
          set: [{ column: "seve", value: { kind: "text", value: "error" } }],
        },
      ],
      inserts: [[{ column: "seve", value: { kind: "text", value: "high" } }]],
    });
  });

  it("eliminar una fila nueva la quita y revertir deshace el rango", () => {
    let edits = addRow(EMPTY_EDITS, info);
    edits = deleteRows(edits, rows.length, { minRow: 3, maxRow: 3, minCol: 0, maxCol: 0 });
    expect(edits.inserted).toHaveLength(0);

    edits = setCellValue(edits, rows, 0, 1, { kind: "null" });
    edits = deleteRows(edits, rows.length, { minRow: 2, maxRow: 2, minCol: 0, maxCol: 0 });
    edits = revert(edits, rows.length, { minRow: 2, maxRow: 2, minCol: 0, maxCol: 2 });
    expect(edits.deleted.size).toBe(0);
    expect(pendingCount(edits)).toBe(1);
    expect(pendingCount(revert(edits, rows.length, null))).toBe(0);
  });
});

describe("fillCells: escribir con varias celdas seleccionadas", () => {
  const value = { kind: "text" as const, value: "high" };

  it("pone el mismo valor en todas las celdas de todos los rangos", () => {
    const edits = fillCells(EMPTY_EDITS, info, rows, [
      { minRow: 0, maxRow: 1, minCol: 1, maxCol: 1 },
      { minRow: 2, maxRow: 2, minCol: 1, maxCol: 1 },
    ], value);
    expect([0, 1, 2].map((row) => edits.updates.get(row)?.get(1))).toEqual([value, value, value]);
  });

  it("salta las columnas de solo lectura o generadas y las filas a eliminar", () => {
    const deleted = deleteRows(EMPTY_EDITS, rows.length, { minRow: 1, maxRow: 1, minCol: 0, maxCol: 2 });
    const edits = fillCells(deleted, info, rows, [{ minRow: 0, maxRow: 2, minCol: 0, maxCol: 2 }], value);
    // id (generada) y la columna calculada no se tocan; la fila 1 tampoco.
    expect([...edits.updates.keys()].sort()).toEqual([0, 2]);
    expect([...edits.updates.get(0)!.keys()]).toEqual([1]);
    expect(edits.deleted.has(1)).toBe(true);
  });

  it("volver al valor original no deja un cambio pendiente", () => {
    const edits = fillCells(EMPTY_EDITS, info, rows, [{ minRow: 0, maxRow: 2, minCol: 1, maxCol: 1 }], {
      kind: "text",
      value: "critical",
    });
    expect(pendingCount(edits)).toBe(0);
  });

  it("tambien en filas nuevas", () => {
    const withRow = addRow(EMPTY_EDITS, info);
    const edits = fillCells(withRow, info, rows, [{ minRow: 2, maxRow: 3, minCol: 1, maxCol: 1 }], value);
    expect(edits.updates.get(2)?.get(1)).toEqual(value);
    expect(edits.inserted[0][1]).toEqual(value);
  });
});
