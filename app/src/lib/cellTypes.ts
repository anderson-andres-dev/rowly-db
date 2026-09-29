import type { CellValue, EditableColumn, PendingEdits, ResultEditInfo } from "$lib/resultEditing";
import type { QueryRow } from "$lib/types";

// Si un valor editado en el grid encaja en el tipo de su columna, antes de
// mandarlo a la base: la celda que no encaja se pinta en rojo al terminar
// de editarla y "Aplicar" no manda nada hasta corregirla. Asi no hace falta
// esperar el error del servidor para darse cuenta de que se escribio un
// nombre en una columna de numeros.
//
// El tipo es el declarado, como lo da cada driver: COLUMN_TYPE en MySQL
// ("int unsigned", "varchar(255)", "enum('a','b')", "tinyint(1)") y
// format_type en PostgreSQL ("integer", "character varying(255)",
// "numeric(10,2)", "timestamp without time zone"). Un tipo que no se
// reconoce no se valida: mejor dejar pasar que rechazar algo valido.

export type TypeProblemKey =
  | "type.integer"
  | "type.integerRange"
  | "type.decimal"
  | "type.decimalDigits"
  | "type.unsigned"
  | "type.number"
  | "type.boolean"
  | "type.date"
  | "type.time"
  | "type.datetime"
  | "type.year"
  | "type.uuid"
  | "type.json"
  | "type.length"
  | "type.enum"
  | "type.notNull";

export interface TypeProblem {
  // Clave de i18n (grid.type.*) y sus parametros.
  key: TypeProblemKey;
  params?: Record<string, string | number>;
}

const INTEGER_RANGES: Record<string, { signed: [bigint, bigint]; unsigned: [bigint, bigint] }> = {
  tinyint: { signed: [-128n, 127n], unsigned: [0n, 255n] },
  smallint: { signed: [-32768n, 32767n], unsigned: [0n, 65535n] },
  mediumint: { signed: [-8388608n, 8388607n], unsigned: [0n, 16777215n] },
  int: { signed: [-2147483648n, 2147483647n], unsigned: [0n, 4294967295n] },
  bigint: { signed: [-9223372036854775808n, 9223372036854775807n], unsigned: [0n, 18446744073709551615n] },
};

// Sinonimos (PostgreSQL y los de MySQL) al nombre de INTEGER_RANGES.
const INTEGER_ALIASES: Record<string, string> = {
  tinyint: "tinyint",
  smallint: "smallint",
  int2: "smallint",
  smallserial: "smallint",
  serial2: "smallint",
  mediumint: "mediumint",
  int: "int",
  integer: "int",
  int4: "int",
  serial: "int",
  serial4: "int",
  bigint: "bigint",
  int8: "bigint",
  bigserial: "bigint",
  serial8: "bigint",
};

const INTEGER = /^[+-]?\d+$/;
const DECIMAL = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const UUID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const DATE = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const TIME = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d{1,6})?)?$/;
// Con zona horaria (PostgreSQL): Z, +05, -03:00, +0530.
const ZONE = /^(?:Z|[+-]\d{2}(?::?\d{2})?)$/i;
const BOOLEAN = new Set(["true", "false", "t", "f", "yes", "no", "y", "n", "on", "off", "1", "0"]);

function validDate(text: string): boolean {
  const match = DATE.exec(text);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function validTime(text: string): boolean {
  const match = TIME.exec(text);
  if (!match) return false;
  const [hours, minutes, seconds] = [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
  return hours <= 24 && minutes <= 59 && seconds <= 59;
}

function validDateTime(text: string, withZone: boolean): boolean {
  const trimmed = text.trim();
  if (validDate(trimmed)) return true;
  const match = /^(\S+)[ T](.+)$/.exec(trimmed);
  if (!match || !validDate(match[1])) return false;
  let time = match[2].trim();
  if (withZone) {
    const zone = /(Z|[+-]\d{2}(?::?\d{2})?)$/i.exec(time);
    if (zone && ZONE.test(zone[1]) && /\d(?=[Z+-])/i.test(time.slice(0, zone.index + 1))) {
      time = time.slice(0, zone.index).trim();
    }
  }
  return validTime(time);
}

// "enum('a','b''c')" -> ["a", "b'c"].
function enumValues(type: string): string[] | null {
  const match = /^enum\s*\((.*)\)$/i.exec(type.trim());
  if (!match) return null;
  const values: string[] = [];
  const pattern = /'((?:[^']|'')*)'/g;
  for (let found = pattern.exec(match[1]); found; found = pattern.exec(match[1])) {
    values.push(found[1].replace(/''/g, "'"));
  }
  return values;
}

// Lo que va entre parentesis despues del nombre: "varchar(255)" -> [255].
function modifiers(type: string): number[] {
  const match = /\(([\d\s,]+)\)/.exec(type);
  return match ? match[1].split(",").map((part) => Number(part.trim())) : [];
}

export function typeProblem(column: EditableColumn, value: CellValue): TypeProblem | null {
  if (value.kind === "default") return null;
  if (value.kind === "null") return column.nullable ? null : { key: "type.notNull" };
  const text = value.value;
  const type = column.dataType.trim().toLowerCase();
  // Arreglos y tipos propios (PostgreSQL): no se validan.
  if (type.endsWith("]") || type === "user-defined") return null;
  const unsigned = /\bunsigned\b/.test(type);
  // El nombre sin modificadores: "int(11) unsigned zerofill" -> "int",
  // "timestamp(3) with time zone" -> "timestamp with time zone".
  const name = type
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(unsigned|signed|zerofill)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const integer = INTEGER_ALIASES[name];
  // tinyint(1) es el booleano de MySQL: igual es un numero.
  if (integer) {
    if (!INTEGER.test(text.trim())) return { key: "type.integer" };
    const [min, max] = INTEGER_RANGES[integer][unsigned ? "unsigned" : "signed"];
    const number = BigInt(text.trim());
    if (number < min || number > max) return { key: "type.integerRange", params: { min: String(min), max: String(max) } };
    return null;
  }

  if (name === "decimal" || name === "numeric" || name === "dec" || name === "fixed") {
    const trimmed = text.trim();
    if (!DECIMAL.test(trimmed) && !(name === "numeric" && /^nan$/i.test(trimmed))) return { key: "type.decimal" };
    if (unsigned && trimmed.startsWith("-")) return { key: "type.unsigned" };
    const [precision, scale = 0] = modifiers(type);
    if (precision && !/e/i.test(trimmed)) {
      const whole = trimmed.replace(/^[+-]/, "").split(".")[0].replace(/^0+(?=\d)/, "");
      const digits = whole === "0" ? 0 : whole.length;
      if (digits > precision - scale) return { key: "type.decimalDigits", params: { digits: precision - scale } };
    }
    return null;
  }

  if (["float", "double", "double precision", "real", "float4", "float8"].includes(name)) {
    const trimmed = text.trim();
    if (DECIMAL.test(trimmed) || /^[+-]?(nan|infinity|inf)$/i.test(trimmed)) {
      return unsigned && trimmed.startsWith("-") ? { key: "type.unsigned" } : null;
    }
    return { key: "type.number" };
  }

  if (name === "boolean" || name === "bool") {
    return BOOLEAN.has(text.trim().toLowerCase()) ? null : { key: "type.boolean" };
  }

  if (name === "date") return validDate(text.trim()) ? null : { key: "type.date" };

  if (name === "time" || name.startsWith("time without") || name.startsWith("time with")) {
    const trimmed = text.trim();
    // MySQL admite horas de mas de 24 ("838:59:59") y negativas.
    const long = /^-?\d{1,3}:(\d{2})(?::(\d{2})(?:\.\d{1,6})?)?$/.exec(trimmed);
    if (long && Number(long[1]) <= 59 && Number(long[2] ?? 0) <= 59) return null;
    return validTime(trimmed) ? null : { key: "type.time" };
  }

  if (name === "datetime" || name === "timestamp" || name.startsWith("timestamp with") || name === "timestamptz") {
    const withZone = name === "timestamptz" || name.startsWith("timestamp with time zone");
    return validDateTime(text, withZone) ? null : { key: "type.datetime" };
  }

  if (name === "year") {
    const trimmed = text.trim();
    if (!/^\d{4}$/.test(trimmed) && trimmed !== "0") return { key: "type.year" };
    const year = Number(trimmed);
    return year === 0 || (year >= 1901 && year <= 2155) ? null : { key: "type.year" };
  }

  if (name === "uuid") return UUID.test(text.trim()) ? null : { key: "type.uuid" };

  if (name === "json" || name === "jsonb") {
    try {
      JSON.parse(text);
      return null;
    } catch {
      return { key: "type.json" };
    }
  }

  if (name === "enum") {
    const values = enumValues(type);
    if (!values || values.includes(text)) return null;
    return { key: "type.enum", params: { values: values.join(", ") } };
  }

  if (["varchar", "char", "character", "character varying", "nvarchar", "nchar", "varbinary", "binary"].includes(name)) {
    const [max] = modifiers(type);
    // Largo en caracteres (no en unidades UTF-16).
    if (max && [...text].length > max) return { key: "type.length", params: { max } };
    return null;
  }

  return null;
}

export interface InvalidCell {
  row: number;
  col: number;
  problem: TypeProblem;
}

// Los cambios pendientes que no encajan en su columna, en orden. En una
// fila nueva, el NULL inicial de una columna obligatoria no se marca
// mientras se completa la fila (seria todo rojo al crearla); con
// `requiredNulls` (al aplicar) si cuenta: el servidor lo rechazaria.
export function invalidCells(
  edits: PendingEdits,
  info: ResultEditInfo,
  rows: readonly QueryRow[],
  options: { requiredNulls?: boolean } = {},
): InvalidCell[] {
  const found: InvalidCell[] = [];
  const check = (row: number, col: number, value: CellValue) => {
    const column = info.columns[col];
    if (!column || column.generated) return;
    const problem = typeProblem(column, value);
    if (problem) found.push({ row, col, problem });
  };
  for (const [row, cols] of [...edits.updates].sort(([a], [b]) => a - b)) {
    if (edits.deleted.has(row)) continue;
    for (const [col, value] of [...cols].sort(([a], [b]) => a - b)) check(row, col, value);
  }
  edits.inserted.forEach((values, index) => {
    values.forEach((value, col) => {
      if (value.kind === "null" && !options.requiredNulls) return;
      check(rows.length + index, col, value);
    });
  });
  return found;
}
