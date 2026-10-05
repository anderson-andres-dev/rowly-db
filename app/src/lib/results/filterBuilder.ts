import type { SqlProfile } from "$lib/engines";
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

// El nombre como lo lee el motor: tal cual si es simple, con comillas si es
// reservado, tiene caracteres raros o (en Postgres) mayusculas.
export function quoteIdentifier(name: string, engine: SqlProfile): string {
  return engine.identifier(name);
}

const NUMERIC_TYPE = /int|serial|decimal|numeric|float|double|real|money|number|bit/i;
const BOOLEAN_TYPE = /bool/i;

// Literal SQL para un valor escrito por el usuario: numeros y booleanos
// tal cual si el tipo de la columna lo es y el texto encaja; todo lo demas,
// como texto del motor (comillas duplicadas y, en MySQL, la barra invertida).
export function sqlLiteral(raw: string, dataType: string, engine: SqlProfile): string {
  const value = raw.trim();
  if (NUMERIC_TYPE.test(dataType) && /^-?\d+(\.\d+)?$/.test(value)) return value;
  if (BOOLEAN_TYPE.test(dataType) && /^(true|false)$/i.test(value)) return value.toUpperCase();
  return engine.quoteString(value);
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
  engine: SqlProfile,
  typeOf: (column: string) => string = () => "",
): string | null {
  if (!condition.column) return null;
  const column = quoteIdentifier(condition.column, engine);
  const type = typeOf(condition.column);
  switch (operatorArity(condition.operator)) {
    case "none":
      return `${column} ${condition.operator}`;
    case "one":
      if (condition.value.trim() === "") return null;
      return `${column} ${condition.operator} ${sqlLiteral(condition.value, type, engine)}`;
    case "two":
      if (condition.value.trim() === "" || condition.value2.trim() === "") return null;
      return `${column} BETWEEN ${sqlLiteral(condition.value, type, engine)} AND ${sqlLiteral(condition.value2, type, engine)}`;
    case "list": {
      const values = listValues(condition.value);
      if (values.length === 0) return null;
      return `${column} ${condition.operator} (${values.map((value) => sqlLiteral(value, type, engine)).join(", ")})`;
    }
  }
}

// La clausula WHERE (sin la palabra WHERE). Se lee de izquierda a derecha,
// como en pantalla: si se mezclan Y y O, cada paso se agrupa con parentesis
// ((a Y b) O c) en vez de dejarlo a la precedencia de SQL.
export function buildWhere(
  conditions: FilterCondition[],
  engine: SqlProfile,
  typeOf?: (column: string) => string,
): string {
  const parts = conditions
    .map((condition) => ({ join: condition.join, sql: conditionSql(condition, engine, typeOf) }))
    .filter((part): part is { join: FilterJoin; sql: string } => part.sql !== null);
  if (parts.length === 0) return "";
  const mixed = new Set(parts.slice(1).map((part) => part.join)).size > 1;
  return parts.slice(1).reduce((sql, part) => {
    const combined = `${sql} ${part.join === "and" ? "AND" : "OR"} ${part.sql}`;
    return mixed ? `(${combined})` : combined;
  }, parts[0].sql);
}
