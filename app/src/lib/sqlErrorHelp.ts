// Ayuda para los errores de la base que mas se ven: un titulo y una
// explicacion en el idioma de la app (editor.help.*), por codigo de
// Postgres (SQLSTATE) o de MySQL. La ventana de detalle del diagnostico los
// muestra junto al texto del servidor.

export type ErrorHelp =
  | "tableMissing"
  | "columnMissing"
  | "syntax"
  | "groupBy"
  | "foreignKey"
  | "duplicate"
  | "notNull"
  | "invalidValue"
  | "functionMissing"
  | "ambiguous"
  | "permission"
  | "cancelled";

const BY_CODE: Record<string, ErrorHelp> = {
  "42P01": "tableMissing",
  "1146": "tableMissing",
  "42703": "columnMissing",
  "1054": "columnMissing",
  "42601": "syntax",
  "1064": "syntax",
  "42803": "groupBy",
  "1055": "groupBy",
  "23503": "foreignKey",
  "1451": "foreignKey",
  "1452": "foreignKey",
  "23505": "duplicate",
  "1062": "duplicate",
  "23502": "notNull",
  "1048": "notNull",
  "1364": "notNull",
  "22P02": "invalidValue",
  "22007": "invalidValue",
  "1366": "invalidValue",
  "1292": "invalidValue",
  "42883": "functionMissing",
  "1305": "functionMissing",
  "42702": "ambiguous",
  "1052": "ambiguous",
  "42501": "permission",
  "1142": "permission",
  "1044": "permission",
  "57014": "cancelled",
  "1317": "cancelled",
};

export function errorHelp(code: string | undefined): ErrorHelp | null {
  return code ? (BY_CODE[code] ?? null) : null;
}

// Correcciones para "columna fuera del GROUP BY": envolverla en SUM() o
// agregarla al GROUP BY. Offsets relativos a `statement`; [from, to) es la
// columna. Sin GROUP BY en el texto, solo la primera.
export function groupByFixes(
  statement: string,
  range: { from: number; to: number },
): { kind: "aggregate" | "groupBy"; column: string; from: number; to: number; insert: string }[] {
  const column = statement.slice(range.from, range.to);
  if (!column) return [];
  const fixes: { kind: "aggregate" | "groupBy"; column: string; from: number; to: number; insert: string }[] = [
    { kind: "aggregate", column, from: range.from, to: range.to, insert: `SUM(${column})` },
  ];
  const groupBy = /\bgroup\s+by\b/i.exec(statement);
  if (groupBy) {
    const after = groupBy.index + groupBy[0].length;
    const next = /\b(having|order\s+by|limit|offset|union|window)\b|;/i.exec(statement.slice(after));
    const end = next ? after + next.index : statement.length;
    const listEnd = after + statement.slice(after, end).trimEnd().length;
    fixes.push({ kind: "groupBy", column, from: listEnd, to: listEnd, insert: `, ${column}` });
  }
  return fixes;
}
