import type { SqlParameter, ParameterType } from "$lib/sqlParameters";
import { statementRelations } from "$lib/sqlRelations";
import type { SqlLexical } from "$lib/sqlStatements";
import type { CatalogTable } from "$lib/types";

// El tipo de cada parametro, por la columna con que se compara en la
// consulta: `col = :p`, `:p = col`, `col LIKE :p`, `col IN (..., :p)`,
// `col BETWEEN :a AND :b`. La columna se busca en las tablas de la consulta
// (con su alias) y, si no, en todo el catalogo cargado. Sin columna, o con
// un tipo que no se reconoce, no hay tipo: el valor se deduce de lo escrito.

export interface ParameterColumn {
  // Tal como la declara el motor (datetime, varchar(45), integer, ...).
  dataType: string;
  type: ParameterType;
}

const NAME = String.raw`(?:[A-Za-z_][A-Za-z0-9_$]*|\x60[^\x60]+\x60|"[^"]+")`;
const COLUMN = String.raw`(${NAME}(?:\s*\.\s*${NAME})?)`;
const OPERATOR = String.raw`(?:=|<>|!=|<=>|<=|>=|<|>|(?:NOT\s+)?I?LIKE|(?:NOT\s+)?IN\s*\((?:[^()]*,)?)`;
const LEFT = new RegExp(String.raw`${COLUMN}\s*${OPERATOR}\s*$`, "i");
const BETWEEN_FIRST = new RegExp(String.raw`${COLUMN}\s+(?:NOT\s+)?BETWEEN\s+$`, "i");
const BETWEEN_SECOND = new RegExp(String.raw`${COLUMN}\s+(?:NOT\s+)?BETWEEN\s+\S+\s+AND\s+$`, "i");
const RIGHT = new RegExp(String.raw`^\s*(?:=|<>|!=|<=>|<=|>=|<|>)\s*${COLUMN}`, "i");
// Lo que no es una columna aunque tenga su forma.
const NOT_COLUMNS = new Set(["and", "or", "not", "null", "is", "where", "on", "when", "then", "else", "case"]);

export function typeOfColumn(dataType: string): ParameterType | null {
  const type = dataType.trim().toLowerCase();
  if (/^bool/.test(type)) return "boolean";
  if (/^date$/.test(type)) return "date";
  if (/^(?:datetime|timestamp|smalldatetime)/.test(type)) return "datetime";
  if (/^time\b/.test(type)) return "time";
  if (/^(?:tiny|small|medium|big)?int(?:eger|\d)?\b|^(?:small|big)?serial|^year\b/.test(type)) return "integer";
  if (/^(?:decimal|numeric|float|double|real|money|dec\b)/.test(type)) return "decimal";
  if (/char|text|enum|set\(|uuid|json|citext|string/.test(type)) return "text";
  return null;
}

function unquote(name: string): string {
  return /^[\x60"]/.test(name) ? name.slice(1, -1) : name;
}

function splitColumn(written: string): { qualifier?: string; column: string } {
  const parts = written.split(/\s*\.\s*/);
  return parts.length === 2 ? { qualifier: unquote(parts[0]), column: unquote(parts[1]) } : { column: unquote(parts[0]) };
}

// La columna escrita junto al parametro, si hay una.
function columnNextTo(sql: string, parameter: SqlParameter): { qualifier?: string; column: string } | null {
  const before = sql.slice(Math.max(0, parameter.from - 300), parameter.from);
  const after = sql.slice(parameter.to, parameter.to + 200);
  const match = LEFT.exec(before) ?? BETWEEN_FIRST.exec(before) ?? BETWEEN_SECOND.exec(before) ?? RIGHT.exec(after);
  if (!match) return null;
  const written = splitColumn(match[1]);
  return NOT_COLUMNS.has(written.column.toLowerCase()) ? null : written;
}

export function parameterColumns(
  sql: string,
  parameters: readonly SqlParameter[],
  lexical: SqlLexical,
  catalog: readonly CatalogTable[],
): Map<string, ParameterColumn> {
  const out = new Map<string, ParameterColumn>();
  if (catalog.length === 0) return out;
  const { relations } = statementRelations(sql, lexical);
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const tableOf = (relation: { table: string; schema?: string }) =>
    catalog.find((table) => same(table.name, relation.table) && (!relation.schema || same(table.schema, relation.schema)));
  const queryTables = relations.map(tableOf).filter((table): table is CatalogTable => table !== undefined);

  for (const parameter of parameters) {
    if (out.has(parameter.name)) continue;
    const written = columnNextTo(sql, parameter);
    if (!written) continue;
    let candidates: readonly CatalogTable[] = queryTables;
    if (written.qualifier) {
      const qualifier = written.qualifier;
      const relation = relations.find((item) => same(item.alias ?? item.table, qualifier) || same(item.table, qualifier));
      const table = relation ? tableOf(relation) : undefined;
      candidates = table ? [table] : [];
    }
    const find = (tables: readonly CatalogTable[]) =>
      tables.flatMap((table) => table.columns).find((column) => same(column.name, written.column));
    const column = find(candidates) ?? (written.qualifier ? undefined : find(catalog));
    const type = column ? typeOfColumn(column.dataType) : null;
    if (column && type) out.set(parameter.name, { dataType: column.dataType, type });
  }
  return out;
}
