import { commentAt } from "$lib/sqlComments";
import type { SqlLexical } from "$lib/sqlStatements";

// Parametros con nombre (:nombre) en una consulta, como en DataGrip: antes
// de ejecutar se piden sus valores y se reemplazan en el texto. El valor se
// escribe como SQL ('texto', 42, NULL, CURDATE()) y entra tal cual.
//
// Solo cuenta lo que esta en el codigo: nada dentro de strings, comentarios,
// identificadores entre comillas ni bloques $tag$ (Postgres). Tampoco los
// casts de Postgres (::tipo), la asignacion de MySQL (:=) ni un ":" pegado a
// una palabra o numero (arr[1:n], 10:30).

export interface SqlParameter {
  name: string;
  from: number;
  to: number;
}

const NAME_START = /[A-Za-z_]/;
const NAME_PART = /[A-Za-z0-9_]/;
const WORD_BEFORE = /[A-Za-z0-9_$]/;

// Fin del '...' que empieza en `at` (la comilla).
function stringEnd(text: string, at: number, escaping: boolean): number {
  let index = at + 1;
  while (index < text.length) {
    const char = text[index];
    if (char === "\\" && escaping) {
      index += 2;
      continue;
    }
    if (char === "'") {
      if (text[index + 1] === "'") {
        index += 2;
        continue;
      }
      return index + 1;
    }
    index += 1;
  }
  return text.length;
}

// Fin de lo que abre `quote` en `at` (identificador o, en MySQL, "texto"):
// la comilla doblada es una comilla mas.
function quotedEnd(text: string, at: number, closing: string): number {
  let index = at + 1;
  while (index < text.length) {
    if (text[index] === closing) {
      if (text[index + 1] === closing) {
        index += 2;
        continue;
      }
      return index + 1;
    }
    index += 1;
  }
  return text.length;
}

export function findParameters(text: string, lexical: SqlLexical): SqlParameter[] {
  if (!text.includes(":")) return [];
  const closers = new Map<string, string>([['"', '"']]);
  for (const quote of lexical.identifierQuotes) closers.set(quote, quote === "[" ? "]" : quote);
  const found: SqlParameter[] = [];
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    const next = text[index + 1];
    const comment = commentAt(text, index, lexical);
    if (comment) {
      index = comment.kind === "line" && comment.closed ? comment.end + 1 : comment.end;
      continue;
    }
    if (char === "'") {
      const prefixed =
        lexical.escapeStringPrefix && /[eE]/.test(text[index - 1] ?? "") && !WORD_BEFORE.test(text[index - 2] ?? "");
      index = stringEnd(text, index, lexical.backslashEscapes || prefixed);
      continue;
    }
    const closing = closers.get(char);
    if (closing !== undefined) {
      index = quotedEnd(text, index, closing);
      continue;
    }
    if (char === "$" && lexical.dollarQuotes && !WORD_BEFORE.test(text[index - 1] ?? "")) {
      const tag = /^\$[A-Za-z_]?[A-Za-z0-9_]*\$/.exec(text.slice(index, index + 64));
      if (tag) {
        const end = text.indexOf(tag[0], index + tag[0].length);
        index = end === -1 ? text.length : end + tag[0].length;
        continue;
      }
    }
    if (char === ":" && NAME_START.test(next ?? "")) {
      const before = text[index - 1] ?? "";
      if (before !== ":" && !WORD_BEFORE.test(before)) {
        let end = index + 2;
        while (end < text.length && NAME_PART.test(text[end])) end += 1;
        found.push({ name: text.slice(index + 1, end), from: index, to: end });
        index = end;
        continue;
      }
    }
    index += 1;
  }
  return found;
}

// Cada nombre una vez, en el orden en que aparece.
export function parameterNames(parameters: readonly SqlParameter[]): string[] {
  return [...new Set(parameters.map((parameter) => parameter.name))];
}

export function substituteParameters(
  text: string,
  parameters: readonly SqlParameter[],
  values: ReadonlyMap<string, string>,
): string {
  let out = "";
  let last = 0;
  for (const parameter of parameters) {
    out += text.slice(last, parameter.from) + (values.get(parameter.name) ?? text.slice(parameter.from, parameter.to));
    last = parameter.to;
  }
  return out + text.slice(last);
}

// --- Valores --------------------------------------------------------------
// El valor se escribe como dato y la app decide como entra en la consulta,
// segun el tipo de la columna con que se compara el parametro
// (editor/parameterTypes.ts): una fecha se valida y va en ISO entre comillas, un
// numero se valida y va tal cual, un texto va siempre entre comillas. Sin
// columna conocida, se deduce de lo escrito ("centro" con comillas, 42 tal
// cual). NOW(), CURRENT_DATE o algo que ya empieza con comilla entran tal
// cual en cualquier caso.

export type ParameterType = "text" | "integer" | "decimal" | "date" | "datetime" | "time" | "boolean";

export type ParameterValue = { ok: true; sql: string } | { ok: false; error: "empty" | ParameterType };

// Sin ceros a la izquierda (0998... es un telefono, no un numero): 0, 0.5,
// -12, 3.14, 1e6.
const NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$|^-?0?\.\d+$/;
const INTEGER = /^-?\d+$/;
const DECIMAL = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const SQL_KEYWORDS = new Set([
  "CURRENT_DATE",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "LOCALTIME",
  "LOCALTIMESTAMP",
  "CURRENT_USER",
  "DEFAULT",
]);
// NOW(), CURDATE() - INTERVAL 1 DAY, schema.fn(x): una llamada al principio.
const CALL = /^[A-Za-z_][A-Za-z0-9_.]*\(/;
// DATE '2025-01-01', TIMESTAMP '...', INTERVAL '1 day', X'0A', B'01'.
const TYPED_LITERAL = /^(?:DATE|TIME|TIMESTAMP|INTERVAL|X|B|N|E)\s*'/i;

// Lo que parece SQL y no un dato.
function looksLikeSql(value: string): boolean {
  return (
    value.startsWith("'") ||
    SQL_KEYWORDS.has(value.toUpperCase()) ||
    CALL.test(value) ||
    TYPED_LITERAL.test(value) ||
    /^(?:CURRENT_DATE|CURRENT_TIMESTAMP|LOCALTIMESTAMP)\b/i.test(value) ||
    /^\(.*\)$/s.test(value)
  );
}

export function quoteText(value: string, lexical: SqlLexical): string {
  const escaped = lexical.backslashEscapes ? value.replace(/\\/g, "\\\\") : value;
  return `'${escaped.replace(/'/g, "''")}'`;
}

const pad = (part: string) => part.padStart(2, "0");

// AAAA-MM-DD (o AAAA/MM/DD) y DD/MM/AAAA (o DD-MM-AAAA), a ISO; null si no
// es una fecha real.
function isoDate(text: string): string | null {
  const ymd = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(text);
  const dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(text);
  const parts = ymd ? [ymd[1], ymd[2], ymd[3]] : dmy ? [dmy[3], dmy[2], dmy[1]] : null;
  if (!parts) return null;
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

// HH:MM o HH:MM:SS (con fraccion), a HH:MM:SS.
function isoTime(text: string): string | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2})(\.\d+)?)?$/.exec(text);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || Number(match[3] ?? 0) > 59) return null;
  return `${pad(match[1])}:${match[2]}:${match[3] ?? "00"}${match[4] ?? ""}`;
}

function formatted(value: string, type: ParameterType, lexical: SqlLexical): string | null {
  switch (type) {
    case "text":
      return quoteText(value, lexical);
    case "integer":
      return INTEGER.test(value) ? value : null;
    case "decimal": {
      // Coma decimal (3,5) si no hay punto.
      const normalized = value.includes(".") ? value : value.replace(",", ".");
      return DECIMAL.test(normalized) ? normalized : null;
    }
    case "boolean": {
      const lower = value.toLowerCase();
      if (["true", "1", "si", "sí", "yes", "t"].includes(lower)) return "TRUE";
      if (["false", "0", "no", "f"].includes(lower)) return "FALSE";
      return null;
    }
    case "date": {
      const date = isoDate(value);
      return date ? `'${date}'` : null;
    }
    case "time": {
      const time = isoTime(value);
      return time ? `'${time}'` : null;
    }
    case "datetime": {
      const [datePart, timePart] = value.split(/[ T]+/, 2);
      const date = isoDate(datePart);
      if (!date) return null;
      if (timePart === undefined) return `'${date}'`;
      const time = isoTime(timePart);
      return time ? `'${date} ${time}'` : null;
    }
  }
}

// `type`: el de la columna con que se compara (null si no se sabe);
// `isNull`: se eligio NULL.
export function parameterValue(
  raw: string,
  type: ParameterType | null,
  isNull: boolean,
  lexical: SqlLexical,
): ParameterValue {
  if (isNull) return { ok: true, sql: "NULL" };
  const value = raw.trim();
  if (value === "") return { ok: false, error: "empty" };
  const upper = value.toUpperCase();
  if (upper === "NULL") return { ok: true, sql: "NULL" };
  if (looksLikeSql(value)) return { ok: true, sql: value };
  if (type) {
    const sql = formatted(type === "text" ? raw : value, type, lexical);
    return sql === null ? { ok: false, error: type } : { ok: true, sql };
  }
  if (upper === "TRUE" || upper === "FALSE") return { ok: true, sql: upper };
  if (NUMBER.test(value)) return { ok: true, sql: value };
  return { ok: true, sql: quoteText(raw, lexical) };
}
