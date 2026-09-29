import type { CellValue, RowRange } from "$lib/resultEditing";

// Lo que dice la barra del resultado sobre la seleccion: cuantas filas y
// celdas (las ocultas por "Filtrar filas" no cuentan, y lo que se solapa con
// Ctrl+clic no cuenta dos veces) y la suma de las celdas numericas. Se suma
// en decimal exacto: 0.1 + 0.2 da 0.3 y un DECIMAL(18,2) no pierde centavos.

export interface SelectionSummary {
  rows: number;
  cells: number;
  // La suma exacta como texto ("1234.50"), o null si no hay celdas
  // numericas en columnas numericas.
  sum: string | null;
  // Cifras decimales de la suma (las del valor con mas decimales).
  scale: number;
}

// Por el nombre del tipo, como lo da cada driver ("int unsigned",
// "decimal(12,2)", "double precision", "bigint"): el primer nombre, sin
// parentesis ni modificadores. Por nombre exacto: "interval" o "point" no son
// numeros aunque contengan "int".
const NUMERIC_TYPES = new Set([
  "tinyint",
  "smallint",
  "mediumint",
  "int",
  "integer",
  "bigint",
  "int2",
  "int4",
  "int8",
  "decimal",
  "numeric",
  "dec",
  "fixed",
  "float",
  "float4",
  "float8",
  "double",
  "real",
  "money",
  "serial",
  "smallserial",
  "bigserial",
]);

export function isNumericType(type: string): boolean {
  const name = type.trim().toLowerCase().split(/[\s(]/, 1)[0];
  return NUMERIC_TYPES.has(name);
}

const DECIMAL = /^\s*([+-])?(\d+)(?:\.(\d*))?\s*$/;

// Suma exacta: enteros escalados a la mayor cantidad de decimales vista.
class DecimalSum {
  private total = 0n;
  scale = 0;
  count = 0;

  add(text: string): boolean {
    const match = DECIMAL.exec(text);
    if (!match) return false;
    const [, sign, whole, fraction = ""] = match;
    if (fraction.length > this.scale) {
      this.total *= 10n ** BigInt(fraction.length - this.scale);
      this.scale = fraction.length;
    }
    const value = BigInt(whole + fraction.padEnd(this.scale, "0"));
    this.total += sign === "-" ? -value : value;
    this.count++;
    return true;
  }

  toString(): string {
    const negative = this.total < 0n;
    const digits = (negative ? -this.total : this.total).toString().padStart(this.scale + 1, "0");
    const whole = digits.slice(0, digits.length - this.scale);
    const fraction = digits.slice(digits.length - this.scale);
    return `${negative ? "-" : ""}${whole}${this.scale > 0 ? `.${fraction}` : ""}`;
  }
}

export interface SummaryInput {
  ranges: readonly RowRange[];
  columnTypes: readonly string[];
  totalRows: number;
  value: (row: number, col: number) => CellValue;
  hidden: (row: number) => boolean;
}

export function summarizeSelection({ ranges, columnTypes, totalRows, value, hidden }: SummaryInput): SelectionSummary {
  const numeric = columnTypes.map(isNumericType);
  const sum = new DecimalSum();
  const rows = new Set<number>();
  // Con un solo rango no hay solapes: no hace falta recordar cada celda.
  const seen = ranges.length > 1 ? new Set<string>() : null;
  let cells = 0;
  for (const range of ranges) {
    const lastRow = Math.min(range.maxRow, totalRows - 1);
    const lastCol = Math.min(range.maxCol, columnTypes.length - 1);
    for (let row = Math.max(0, range.minRow); row <= lastRow; row++) {
      if (hidden(row)) continue;
      rows.add(row);
      for (let col = Math.max(0, range.minCol); col <= lastCol; col++) {
        if (seen) {
          const key = `${row}:${col}`;
          if (seen.has(key)) continue;
          seen.add(key);
        }
        cells++;
        if (!numeric[col]) continue;
        const cell = value(row, col);
        if (cell.kind === "text") sum.add(cell.value);
      }
    }
  }
  return { rows: rows.size, cells, sum: sum.count > 0 ? sum.toString() : null, scale: sum.scale };
}

// La suma exacta con los separadores del idioma: la parte entera como BigInt
// (sin perder digitos) y los decimales tal cual.
export function formatDecimal(text: string, format: Intl.NumberFormat): string {
  const negative = text.startsWith("-");
  const [whole, fraction] = text.replace(/^[+-]/, "").split(".");
  const separator = format.formatToParts(1.5).find((part) => part.type === "decimal")?.value ?? ".";
  const formatted = format.format(BigInt(whole));
  return `${negative ? "-" : ""}${formatted}${fraction ? `${separator}${fraction}` : ""}`;
}
