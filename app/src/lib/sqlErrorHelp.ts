// Ayuda para los errores de la base que mas se ven: un titulo y una
// explicacion en el idioma de la app (editor.help.*). Que codigo del
// servidor es cual lo dice el perfil de cada motor (`errorHelp` en
// lib/engines). La ventana de detalle del diagnostico los muestra junto al
// texto del servidor.

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
