// Lo que comparten todos los motores: el SQL estandar.

export const COMMON_STARTERS = [
  "select",
  "insert",
  "update",
  "delete",
  "with",
  "explain",
  "create",
  "alter",
  "show",
  "set",
];

// Reservadas cortas del SQL estandar: un alias asi rompe la consulta en
// cualquier motor.
export const COMMON_RESERVED = [
  "as",
  "at",
  "by",
  "do",
  "if",
  "in",
  "is",
  "no",
  "of",
  "on",
  "or",
  "to",
  "add",
  "all",
  "and",
  "any",
  "are",
  "asc",
  "end",
  "for",
  "key",
  "not",
  "set",
  "top",
  "use",
  "both",
  "case",
  "cast",
  "desc",
  "drop",
  "else",
  "from",
  "full",
  "into",
  "join",
  "left",
  "like",
  "null",
  "only",
  "over",
  "rows",
  "some",
  "then",
  "true",
  "user",
  "view",
  "when",
  "with",
];

// Las palabras que alguna linea del motor vuelve reservadas
// (support/<motor>.json, la misma declaracion que lee el backend): el SQL
// generado las cita en cualquier version del motor (SQL_ENGINE.es.md §5.2).
export function lineReservedWords(engineLines: { lines: { line: string; reservedWords?: string[] }[] }): string[] {
  return engineLines.lines.flatMap((line) => line.reservedWords ?? []);
}

// El literal del SQL estandar: la comilla simple duplicada. Es tambien lo que
// se usa sin conexion (copiar un resultado fijado despues de desconectar).
export function ansiString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

// Reservadas de verdad en el SQL estandar y en los dos motores: un nombre
// asi solo se puede escribir entre comillas. Mas corta que las de los alias
// (COMMON_RESERVED + las de cada motor), que evitan tambien palabras que
// confunden: `type` o `year` como columna no necesitan comillas.
export const QUOTING_RESERVED = [
  "all",
  "and",
  "any",
  "as",
  "asc",
  "between",
  "by",
  "case",
  "check",
  "column",
  "constraint",
  "create",
  "cross",
  "default",
  "delete",
  "desc",
  "distinct",
  "drop",
  "else",
  "end",
  "exists",
  "for",
  "foreign",
  "from",
  "full",
  "grant",
  "group",
  "having",
  "in",
  "inner",
  "insert",
  "intersect",
  "into",
  "is",
  "join",
  "left",
  "like",
  "limit",
  "not",
  "null",
  "on",
  "or",
  "order",
  "outer",
  "primary",
  "references",
  "right",
  "select",
  "set",
  "table",
  "then",
  "to",
  "union",
  "unique",
  "update",
  "using",
  "values",
  "when",
  "where",
  "with",
];

// El nombre sin comillas si el motor lo lee igual (`plain`) y no es
// reservado; si no, con sus comillas.
export function identifierWith(
  plain: RegExp,
  reserved: ReadonlySet<string>,
  quote: (name: string) => string,
): (name: string) => string {
  return (name) => (plain.test(name) && !reserved.has(name.toLowerCase()) ? name : quote(name));
}

// Sin distinguir mayusculas (MySQL; el SQL estandar, sin conexion).
export function caseInsensitiveName(written: string, _quoted: boolean, catalogName: string): boolean {
  return written.toLowerCase() === catalogName.toLowerCase();
}

// Lo que no va entre comillas se lee en minusculas; entre comillas, exacto
// (Postgres).
export function foldedName(written: string, quoted: boolean, catalogName: string): boolean {
  return quoted ? written === catalogName : written.toLowerCase() === catalogName;
}

// Comillas de identificador con la comilla de adentro duplicada.
export function quoteWith(open: string, close: string, name: string): string {
  return `${open}${name.split(close).join(close + close)}${close}`;
}
