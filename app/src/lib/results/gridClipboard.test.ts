import { describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({ readText: vi.fn(), writeText: vi.fn() }));

import { parseClipboard, rememberCopy, serializeSelection, type CopyColumn } from "./gridClipboard";
import {
  EMPTY_EDITS,
  pasteBlock,
  pendingCount,
  type CellValue,
  type PendingEdits,
  type ResultEditInfo,
} from "./resultEditing";

const t = (value: string): CellValue => ({ kind: "text", value });
const NULL: CellValue = { kind: "null" };
const columns: CopyColumn[] = [
  { name: "id", type: "int" },
  { name: "seve", type: "varchar(20)" },
  { name: "ctx", type: "json" },
];
const options = { format: "tsv" as const, headers: false, tableName: "core.t" };

describe("gridClipboard: copiar", () => {
  it("una sola celda se copia como su valor puro", () => {
    expect(serializeSelection([columns[1]], [[t("critical")]], { ...options, format: "json" })).toBe("critical");
  });

  it("serializa TSV, CSV, JSON, Markdown y SQL", () => {
    const rows = [
      [t("7"), t('a,"b"'), t('{"x": 1}')],
      [t("8"), NULL, NULL],
    ];
    expect(serializeSelection(columns, rows, options)).toBe('7\ta,"b"\t{"x": 1}\n8\t\t');
    expect(serializeSelection(columns, rows, { ...options, format: "csv", headers: true })).toBe(
      'id,seve,ctx\n7,"a,""b""","{""x"": 1}"\n8,,',
    );
    expect(JSON.parse(serializeSelection(columns, rows, { ...options, format: "json" }))).toEqual([
      { id: 7, seve: 'a,"b"', ctx: { x: 1 } },
      { id: 8, seve: null, ctx: null },
    ]);
    expect(serializeSelection(columns, rows, { ...options, format: "markdown" })).toBe(
      '| id | seve | ctx |\n| --- | --- | --- |\n| 7 | a,"b" | {"x": 1} |\n| 8 | NULL | NULL |',
    );
    expect(serializeSelection(columns.slice(0, 2), [[t("7"), t("o'h")]], { ...options, format: "sql" })).toBe(
      "INSERT INTO core.t (id, seve) VALUES (7, 'o''h');",
    );
  });
});

describe("gridClipboard: pegar", () => {
  it("lo copiado por el grid se pega con sus valores reales, sin importar el formato", () => {
    const rows = [[t("7"), NULL]];
    const json = serializeSelection(columns.slice(0, 2), rows, { ...options, format: "json" });
    rememberCopy(json, rows);
    expect(parseClipboard(json, ["id", "seve"])).toEqual({ rows, alignedByName: false });
  });

  it("interpreta TSV de planillas (con salto final) y JSON externo por nombre", () => {
    expect(parseClipboard("1\ta\n2\tNULL\n", ["id", "seve"])?.rows).toEqual([
      [t("1"), t("a")],
      [t("2"), NULL],
    ]);
    const json = parseClipboard('[{"SEVE": "x", "id": 3}]', ["id", "seve", "ctx"]);
    expect(json).toEqual({ rows: [[t("3"), t("x"), undefined]], alignedByName: true });
  });
});

describe("pasteBlock", () => {
  const info: ResultEditInfo = {
    target: { schema: "core", table: "t" },
    keyColumns: ["id"],
    columns: [
      { name: "id", dataType: "int", nullable: false, isPrimaryKey: true, defaultValue: null, generated: true },
      { name: "seve", dataType: "varchar(20)", nullable: true, isPrimaryKey: false, defaultValue: null, generated: false },
      { name: "ctx", dataType: "json", nullable: true, isPrimaryKey: false, defaultValue: null, generated: false },
    ],
  };
  const rows = [
    ["1", "a", null],
    ["2", "b", null],
  ];

  it("crea las filas que faltan y respeta las columnas generadas", () => {
    let edits: PendingEdits = { ...EMPTY_EDITS, inserted: [[{ kind: "default" }, NULL, NULL]] };
    const block = [
      [t("9"), t("x"), t("{}")],
      [t("9"), t("y"), NULL],
      [t("9"), t("z"), NULL],
    ];
    const result = pasteBlock(edits, info, rows, 2, 0, block)!;
    edits = result.edits;
    expect(edits.inserted).toHaveLength(3);
    expect(result.firstNewRow).toBe(3);
    expect(edits.inserted.map((values) => values[0].kind)).toEqual(["default", "default", "default"]);
    expect(edits.inserted.map((values) => values[1])).toEqual([t("x"), t("y"), t("z")]);
  });

  it("sobre filas existentes genera cambios; un solo valor rellena la seleccion", () => {
    const fill = { minRow: 0, maxRow: 1, minCol: 1, maxCol: 1 };
    const result = pasteBlock(EMPTY_EDITS, info, rows, 0, 1, [[t("zz")]], fill)!;
    expect(pendingCount(result.edits)).toBe(2);
    expect(result.edits.updates.get(1)?.get(1)).toEqual(t("zz"));
    // Pegar el valor original no deja cambio pendiente.
    expect(pendingCount(pasteBlock(EMPTY_EDITS, info, rows, 0, 1, [[t("a")]])!.edits)).toBe(0);
  });
});
