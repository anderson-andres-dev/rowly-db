import { describe, expect, it } from "vitest";
import type { CellValue } from "$lib/resultEditing";
import { isNumericType, summarizeSelection } from "$lib/gridSelectionSummary";

const text = (value: string): CellValue => ({ kind: "text", value });

// abon_codi (int), nombre (varchar), saldo (decimal), telefono (varchar)
const TYPES = ["int unsigned", "varchar(120)", "decimal(12,2)", "varchar(10)"];
const DATA: (string | null)[][] = [
  ["101439", "Freddy", "10.10", "0967894466"],
  ["103826", "Manuel", "0.20", "0999889220"],
  ["106695", "Angela", null, "0988384641"],
  ["104155", "Dayanara", "-5.05", "0992648650"],
];

function summary(ranges: { minRow: number; maxRow: number; minCol: number; maxCol: number }[], hidden: number[] = []) {
  return summarizeSelection({
    ranges,
    columnTypes: TYPES,
    totalRows: DATA.length,
    value: (row, col) => (DATA[row][col] === null ? { kind: "null" } : text(DATA[row][col] as string)),
    hidden: (row) => hidden.includes(row),
  });
}

describe("tipos numericos", () => {
  it("por nombre exacto, con modificadores y parentesis", () => {
    for (const type of ["int", "int unsigned", "bigint", "decimal(12,2)", "numeric", "double precision", "tinyint(1)", "real", "float8"]) {
      expect(isNumericType(type), type).toBe(true);
    }
    for (const type of ["varchar(10)", "interval", "point", "text", "date", "json", "character varying(255)"]) {
      expect(isNumericType(type), type).toBe(false);
    }
  });
});

describe("resumen de la seleccion", () => {
  it("filas, celdas y suma exacta de lo numerico", () => {
    const found = summary([{ minRow: 0, maxRow: 3, minCol: 2, maxCol: 2 }]);
    expect(found).toEqual({ rows: 4, cells: 4, sum: "5.25", scale: 2 });
  });

  it("0.1 + 0.2 es 0.3, sin error de coma flotante", () => {
    const found = summarizeSelection({
      ranges: [{ minRow: 0, maxRow: 1, minCol: 0, maxCol: 0 }],
      columnTypes: ["numeric"],
      totalRows: 2,
      value: (row) => text(row === 0 ? "0.1" : "0.2"),
      hidden: () => false,
    });
    expect(found.sum).toBe("0.3");
  });

  it("los numeros guardados como texto (telefonos) no se suman", () => {
    const found = summary([{ minRow: 0, maxRow: 1, minCol: 3, maxCol: 3 }]);
    expect(found).toEqual({ rows: 2, cells: 2, sum: null, scale: 0 });
  });

  it("varias columnas: cuenta todas, suma solo las numericas", () => {
    const found = summary([{ minRow: 0, maxRow: 1, minCol: 0, maxCol: 3 }]);
    expect(found.rows).toBe(2);
    expect(found.cells).toBe(8);
    expect(found.sum).toBe("205275.30");
  });

  it("lo oculto por el filtro no cuenta", () => {
    const found = summary([{ minRow: 0, maxRow: 3, minCol: 2, maxCol: 2 }], [0, 3]);
    expect(found).toEqual({ rows: 2, cells: 2, sum: "0.20", scale: 2 });
  });

  it("rangos que se solapan (Ctrl+clic) no cuentan dos veces", () => {
    const found = summary([
      { minRow: 0, maxRow: 1, minCol: 2, maxCol: 2 },
      { minRow: 1, maxRow: 2, minCol: 2, maxCol: 2 },
    ]);
    expect(found).toEqual({ rows: 3, cells: 3, sum: "10.30", scale: 2 });
  });

  it("negativos que dejan la suma bajo cero", () => {
    const found = summary([{ minRow: 3, maxRow: 3, minCol: 2, maxCol: 2 }]);
    expect(found.sum).toBe("-5.05");
  });
});

describe("la suma, con los separadores del idioma", () => {
  it("miles y decimales exactos", async () => {
    const { formatDecimal } = await import("$lib/gridSelectionSummary");
    expect(formatDecimal("1234567.50", new Intl.NumberFormat("es-EC"))).toBe("1.234.567,50");
    expect(formatDecimal("1234567.50", new Intl.NumberFormat("en-US"))).toBe("1,234,567.50");
    expect(formatDecimal("-0.05", new Intl.NumberFormat("en-US"))).toBe("-0.05");
    expect(formatDecimal("123456789012345678901", new Intl.NumberFormat("en-US"))).toBe("123,456,789,012,345,678,901");
  });
});
