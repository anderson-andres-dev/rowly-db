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
// reconoce no se valida: mejor dejar pasar que rechazar algo valido. Con
// las fechas y horas, igual: cada motor entiende muchos formatos
// (PostgreSQL: "Jan 8 1999", "infinity", "44-03-15 BC"; MySQL: 2024/01/05,
// 20240105, fechas cero), asi que solo se marca lo que no puede ser una
// fecha (sin ningun digito) o una fecha ISO imposible (2023-02-30).

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
// Con llaves y sin guiones tambien (PostgreSQL los acepta).
const UUID = /^\{?[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}\}?$/i;
const BOOLEAN = new Set(["true", "false", "t", "f", "yes", "no", "y", "n", "on", "off", "1", "0"]);
// Valores especiales de fecha y hora de PostgreSQL.
const SPECIAL_DATES = new Set(["infinity", "+infinity", "-infinity", "epoch", "now", "today", "tomorrow", "yesterday", "allballs"]);
// Una fecha ISO (AAAA-MM-DD) al principio, y lo que siga.
const ISO_DATE = /^(\d{4})-(\d{1,2})-(\d{1,2})(?![\d])/;
// Una hora hh:mm[:ss] al principio (lo que siga: fraccion, zona...).
const CLOCK = /^(\d{1,3}):(\d{1,2})(?::(\d{1,2}))?/;

// Una fecha ISO con un mes o un dia que no existen (2023-02-30, mes 13).
// El mes o el dia 0 son las fechas cero de MySQL, que se admiten.
function impossibleIsoDate(text: string): boolean {
  const match = ISO_DATE.exec(text);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month === 0 || day === 0) return false;
  if (month > 12) return true;
  return day > new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Una hora con minutos o segundos de mas (10:61, 10:30:75).
function impossibleClock(text: string): boolean {
  const match = CLOCK.exec(text.replace(/^-/, ""));
  if (!match) return false;
  return Number(match[2]) > 59 || Number(match[3] ?? 0) > 60;
}

// Para date, time, datetime y timestamp: solo lo que seguro no es.
function temporalProblem(text: string, kind: "date" | "time" | "datetime"): boolean {
  const trimmed = text.trim().toLowerCase();
  if (SPECIAL_DATES.has(trimmed)) return false;
  if (!/\d/.test(trimmed)) return true;
  if (kind === "time") return impossibleClock(trimmed);
  if (impossibleIsoDate(trimmed)) return true;
  // La hora despues de la fecha ISO ("2024-05-01 10:61").
  const iso = ISO_DATE.exec(trimmed);
  if (kind === "datetime" && iso) {
    const rest = trimmed.slice(iso[0].length).replace(/^[ t]+/, "");
    return rest !== "" && impossibleClock(rest);
  }
  return false;
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
    // numeric de PostgreSQL admite NaN e Infinity (14+).
    if (!DECIMAL.test(trimmed) && !(name === "numeric" && /^[+-]?(nan|infinity|inf)$/i.test(trimmed))) {
      return { key: "type.decimal" };
    }
    if (unsigned && trimmed.startsWith("-")) return { key: "type.unsigned" };
    const [precision, scale = 0] = modifiers(type);
    if (precision && !/[en]/i.test(trimmed)) {
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

  if (name === "date") return temporalProblem(text, "date") ? { key: "type.date" } : null;

  // MySQL admite horas de mas de 24 ("838:59:59") y negativas; timetz, zona.
  if (name === "time" || name === "timetz" || name.startsWith("time without") || name.startsWith("time with")) {
    return temporalProblem(text, "time") ? { key: "type.time" } : null;
  }

  if (name === "datetime" || name === "timestamp" || name.startsWith("timestamp with") || name === "timestamptz") {
    return temporalProblem(text, "datetime") ? { key: "type.datetime" } : null;
  }

  // YEAR de MySQL: 4 digitos (1901-2155), 2 digitos (00-99) o 0.
  if (name === "year") {
    const trimmed = text.trim();
    if (/^\d{1,2}$/.test(trimmed)) return null;
    const year = Number(trimmed);
    return /^\d{4}$/.test(trimmed) && (year === 0 || (year >= 1901 && year <= 2155)) ? null : { key: "type.year" };
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
    // Como MySQL con la collation de la columna (casi siempre _ci): sin
    // distinguir mayusculas ni los espacios del final.
    const wanted = text.trimEnd().toLowerCase();
    if (!values || values.some((candidate) => candidate.trimEnd().toLowerCase() === wanted)) return null;
    return { key: "type.enum", params: { values: values.join(", ") } };
  }

  if (["varchar", "char", "character", "character varying", "nvarchar", "nchar", "varbinary", "binary"].includes(name)) {
    const [max] = modifiers(type);
    // Largo en caracteres (no en unidades UTF-16), sin los espacios del
    // final: los motores los recortan sin error.
    if (max && [...text.trimEnd()].length > max) return { key: "type.length", params: { max } };
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
// fila nueva, un NULL en una columna obligatoria no cuenta: puede ser el
// inicial mientras se completa la fila, o lo completa un trigger (el
// servidor dira si no).
export function invalidCells(edits: PendingEdits, info: ResultEditInfo, rows: readonly QueryRow[]): InvalidCell[] {
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
      if (value.kind === "null") return;
      check(rows.length + index, col, value);
    });
  });
  return found;
}
