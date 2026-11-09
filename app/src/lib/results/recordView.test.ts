import { describe, expect, it } from "vitest";
import {
  binaryBytes,
  clampRow,
  draftChanged,
  indentJson,
  recordFields,
  stepRow,
  totalRows,
} from "./recordView";
import { EMPTY_EDITS, setCellValue, type PendingEdits, type ResultEditInfo } from "./resultEditing";

const columns = [
  { name: "id", type: "INT" },
  { name: "name", type: "VARCHAR" },
  { name: "doc", type: "JSON" },
  { name: "blob", type: "BLOB" },
];
const rows = [
  ["1", "Ana", '{"a":1,"b":[1,2],"big":12345678901234567890}', "0xdeadbeef"],
  ["2", null, "{}", "0x"],
];
const info: ResultEditInfo = {
  target: { schema: "s", table: "t" },
  keyColumns: ["id"],
  columns: [
    { name: "id", dataType: "int", nullable: false, isPrimaryKey: true, defaultValue: null, generated: false },
    { name: "name", dataType: "varchar(20)", nullable: true, isPrimaryKey: false, defaultValue: "x", generated: false },
    { name: "doc", dataType: "json", nullable: true, isPrimaryKey: false, defaultValue: null, generated: false },
    null,
  ],
};

describe("filas", () => {
  it("cuenta las filas nuevas y acota la fila mostrada", () => {
    const withNew: PendingEdits = { ...EMPTY_EDITS, inserted: [[]] };
    expect(totalRows(rows, withNew)).toBe(3);
    expect(clampRow(null, 3)).toBe(0);
    expect(clampRow(9, 3)).toBe(2);
    expect(clampRow(-1, 3)).toBe(0);
    expect(clampRow(0, 0)).toBeNull();
  });

  it("salta las filas ocultas y se queda en el borde", () => {
    expect(stepRow(0, 1, 5, new Set([1, 2]))).toBe(3);
    expect(stepRow(3, -1, 5, new Set([1, 2]))).toBe(0);
    expect(stepRow(4, 1, 5, null)).toBe(4);
    expect(stepRow(0, -1, 5, null)).toBe(0);
    expect(stepRow(2, 1, 5, new Set([3, 4]))).toBe(2);
  });
});

describe("valores", () => {
  it("sangra el JSON sin tocar los numeros grandes", () => {
    const out = indentJson('{"a":1,"b":[1,2],"big":12345678901234567890,"e":{},"s":"x,{y}\\"z"}');
    expect(out).toBe(
      '{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ],\n  "big": 12345678901234567890,\n  "e": {},\n  "s": "x,{y}\\"z"\n}',
    );
    expect(() => JSON.parse(out)).not.toThrow();
  });

  it("devuelve igual lo que no es JSON valido", () => {
    expect(indentJson("hola")).toBe("hola");
    expect(indentJson("{roto")).toBe("{roto");
    expect(indentJson("[1, 2")).toBe("[1, 2");
  });

  it("detecta el binario por tipo y por hex, con su tamaño", () => {
    expect(binaryBytes("BLOB", "0xdeadbeef")).toBe(4);
    expect(binaryBytes("bytea", "\\xCAFE")).toBe(2);
    expect(binaryBytes("BLOB", "0x")).toBe(0);
    expect(binaryBytes("VARCHAR", "0xdeadbeef")).toBeNull();
    expect(binaryBytes("BLOB", "texto")).toBeNull();
  });
});

describe("campos", () => {
  it("muestra todas las columnas con tipo, nulabilidad, defecto y clave", () => {
    const fields = recordFields(columns, rows, EMPTY_EDITS, info, 0);
    expect(fields.map((f) => f.name)).toEqual(["id", "name", "doc", "blob"]);
    expect(fields[0]).toMatchObject({ type: "int", nullable: false, primaryKey: true, kind: "text", modified: false });
    expect(fields[1]).toMatchObject({ type: "varchar(20)", nullable: true, defaultValue: "x" });
    expect(fields[2].kind).toBe("json");
    expect(fields[2].display).toContain('\n  "a": 1');
    expect(fields[3]).toMatchObject({ kind: "binary", bytes: 4, display: "0xdeadbeef" });
  });

  it("distingue NULL, marca lo editado y cree lo mismo que la rejilla", () => {
    const edited = setCellValue(EMPTY_EDITS, rows, 1, 1, { kind: "text", value: "Beto" });
    const fields = recordFields(columns, rows, edited, info, 1);
    expect(fields[1]).toMatchObject({ kind: "text", display: "Beto", modified: true });
    const original = recordFields(columns, rows, EMPTY_EDITS, info, 1);
    expect(original[1]).toMatchObject({ kind: "null", modified: false });
  });

  it("marca el valor que no encaja con su columna", () => {
    const edited = setCellValue(EMPTY_EDITS, rows, 0, 0, { kind: "text", value: "abc" });
    expect(recordFields(columns, rows, edited, info, 0)[0].problem?.key).toBe("type.integer");
    expect(recordFields(columns, rows, EMPTY_EDITS, info, 0)[0].problem).toBeNull();
  });

  it("da el motivo de lo que no se edita: sin tabla, calculada o fila eliminada", () => {
    expect(recordFields(columns, rows, EMPTY_EDITS, null, 0)[0].blocked?.key).toBe("blocked.result");
    expect(recordFields(columns, rows, EMPTY_EDITS, info, 0)[3].blocked?.key).toBe("blocked.computedColumn");
    expect(recordFields(columns, rows, EMPTY_EDITS, info, 0)[0].blocked).toBeNull();
    const deleted: PendingEdits = { ...EMPTY_EDITS, deleted: new Set([0]) };
    expect(recordFields(columns, rows, deleted, info, 0)[0].blocked?.key).toBe("blocked.deletedRow");
  });

  it("una fila nueva se ve como modificada y sin valores originales", () => {
    const withNew: PendingEdits = {
      ...EMPTY_EDITS,
      inserted: [[{ kind: "null" }, { kind: "default" }, { kind: "null" }, { kind: "null" }]],
    };
    const fields = recordFields(columns, rows, withNew, info, 2);
    expect(fields.every((f) => f.modified)).toBe(true);
    expect(fields[1].kind).toBe("default");
  });
});

describe("borrador", () => {
  it("detecta si lo escrito cambio el valor", () => {
    const [id, name] = recordFields(columns, rows, EMPTY_EDITS, info, 1);
    expect(draftChanged(id, "2")).toBe(false);
    expect(draftChanged(id, "3")).toBe(true);
    expect(draftChanged(name, "")).toBe(false);
    expect(draftChanged(name, "x")).toBe(true);
  });
});
