// Constructor visual de filtros de una pestaña de tabla: condiciones
// (columna · operador · valor) unidas con Y / O, convertidas a la clausula
// WHERE que se ejecuta. Los operadores se muestran tal cual en SQL, asi se
// leen igual en cualquier idioma.

export type FilterJoin = "and" | "or";

export type FilterOperator =
  | "="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "LIKE"
  | "NOT LIKE"
  | "IN"
  | "NOT IN"
  | "BETWEEN"
  | "IS NULL"
  | "IS NOT NULL";

export interface FilterCondition {
  id: string;
  // Como se une con la anterior (se ignora en la primera).
  join: FilterJoin;
  column: string;
  operator: FilterOperator;
  value: string;
  // Segundo valor de BETWEEN.
  value2: string;
}

// Cuantos valores pide cada operador: ninguno, uno, dos (BETWEEN) o una
// lista separada por comas (IN).
export type OperatorArity = "none" | "one" | "two" | "list";

export const FILTER_OPERATORS: { value: FilterOperator; arity: OperatorArity }[] = [
  { value: "=", arity: "one" },
  { value: "!=", arity: "one" },
  { value: "<", arity: "one" },
  { value: "<=", arity: "one" },
  { value: ">", arity: "one" },
  { value: ">=", arity: "one" },
  { value: "LIKE", arity: "one" },
  { value: "NOT LIKE", arity: "one" },
  { value: "IN", arity: "list" },
  { value: "NOT IN", arity: "list" },
  { value: "BETWEEN", arity: "two" },
  { value: "IS NULL", arity: "none" },
  { value: "IS NOT NULL", arity: "none" },
];

export function operatorArity(operator: FilterOperator): OperatorArity {
  return FILTER_OPERATORS.find((item) => item.value === operator)?.arity ?? "one";
}

export function isFilterOperator(value: unknown): value is FilterOperator {
  return FILTER_OPERATORS.some((item) => item.value === value);
}

export function newCondition(column = "", join: FilterJoin = "and"): FilterCondition {
  return { id: crypto.randomUUID(), join, column, operator: "=", value: "", value2: "" };
}

export type SqlDriverKind = "mysql" | "mariadb" | "postgres";

export function quoteIdentifier(name: string, driver: SqlDriverKind): string {
  if (/^[A-Za-z_][A-Za-z0-9_$]*$/.test(name)) return name;
  return driver === "postgres" ? `"${name.replace(/"/g, '""')}"` : `\`${name.replace(/`/g, "``")}\``;
}

const NUMERIC_TYPE = /int|serial|decimal|numeric|float|double|real|money|number|bit/i;
const BOOLEAN_TYPE = /bool/i;

// Literal SQL para un valor escrito por el usuario: numeros y booleanos
// tal cual si el tipo de la columna lo es y el texto encaja; todo lo demas,
// entre comillas simples con las comillas internas duplicadas.
export function sqlLiteral(raw: string, dataType = ""): string {
  const value = raw.trim();
  if (NUMERIC_TYPE.test(dataType) && /^-?\d+(\.\d+)?$/.test(value)) return value;
  if (BOOLEAN_TYPE.test(dataType) && /^(true|false)$/i.test(value)) return value.toUpperCase();
  return `'${value.replace(/'/g, "''")}'`;
}

function listValues(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

// Una condicion en SQL, o null si esta incompleta (sin columna o sin el
// valor que su operador pide): una condicion a medias no filtra.
export function conditionSql(
  condition: FilterCondition,
  driver: SqlDriverKind,
  typeOf: (column: string) => string = () => "",
): string | null {
  if (!condition.column) return null;
  const column = quoteIdentifier(condition.column, driver);
  const type = typeOf(condition.column);
  switch (operatorArity(condition.operator)) {
    case "none":
      return `${column} ${condition.operator}`;
    case "one":
      if (condition.value.trim() === "") return null;
      return `${column} ${condition.operator} ${sqlLiteral(condition.value, type)}`;
    case "two":
      if (condition.value.trim() === "" || condition.value2.trim() === "") return null;
      return `${column} BETWEEN ${sqlLiteral(condition.value, type)} AND ${sqlLiteral(condition.value2, type)}`;
    case "list": {
      const values = listValues(condition.value);
      if (values.length === 0) return null;
      return `${column} ${condition.operator} (${values.map((value) => sqlLiteral(value, type)).join(", ")})`;
    }
  }
}

// La clausula WHERE (sin la palabra WHERE). Se lee de izquierda a derecha,
// como en pantalla: si se mezclan Y y O, cada paso se agrupa con parentesis
// ((a Y b) O c) en vez de dejarlo a la precedencia de SQL.
export function buildWhere(
  conditions: FilterCondition[],
  driver: SqlDriverKind,
  typeOf?: (column: string) => string,
): string {
  const parts = conditions
    .map((condition) => ({ join: condition.join, sql: conditionSql(condition, driver, typeOf) }))
    .filter((part): part is { join: FilterJoin; sql: string } => part.sql !== null);
  if (parts.length === 0) return "";
  const mixed = new Set(parts.slice(1).map((part) => part.join)).size > 1;
  return parts.slice(1).reduce((sql, part) => {
    const combined = `${sql} ${part.join === "and" ? "AND" : "OR"} ${part.sql}`;
    return mixed ? `(${combined})` : combined;
  }, parts[0].sql);
}
