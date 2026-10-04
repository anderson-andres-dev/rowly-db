// Las relaciones (tablas con su alias) de una sentencia a medio escribir y
// los alias automaticos al estilo DataGrip. Funciones puras sobre el texto de
// UNA sentencia (statementTextAt):
// nada recorre el documento.

import { sqlTokens, type Token } from "$lib/sqlContext";
import type { SqlLexical } from "$lib/sqlStatements";

export interface StatementRelation {
  schema?: string;
  table: string;
  alias?: string;
  // Donde empieza el nombre, relativo al texto de la sentencia.
  from: number;
  // Como se escribio la referencia (el alias o el nombre, con sus comillas
  // si las tenia): asi se la nombra en una condicion.
  written: string;
  // El nombre (y el schema) iban entre comillas: en Postgres, `"Users"` no es
  // `Users` (ver nameMatches en el perfil).
  quoted: boolean;
  schemaQuoted?: boolean;
}

// Palabras que, despues de una tabla, nunca son su alias.
const NOT_ALIAS = new Set([
  "where",
  "join",
  "inner",
  "left",
  "right",
  "full",
  "outer",
  "cross",
  "natural",
  "straight_join",
  "on",
  "using",
  "group",
  "order",
  "having",
  "limit",
  "offset",
  "union",
  "except",
  "intersect",
  "window",
  "for",
  "lock",
  "returning",
  "set",
  "values",
  "select",
  "from",
]);

// Terminan la lista de tablas del FROM (despues, una coma ya no es otra
// tabla).
const END_FROM_LIST = new Set(["where", "group", "order", "having", "limit", "union", "select", "on", "window"]);

function isName(token: Token): boolean {
  return token.kind === "word" || token.kind === "quoted";
}

// El nombre tal como se escribio (sin comillas si las tenia).
function nameOf(token: Token): string {
  return token.kind === "word" ? token.raw : token.text;
}

// Las tablas del FROM y de los JOIN, en orden, con su schema y alias si los
// tienen. Las subconsultas (`FROM (SELECT ...) x`) no son tablas: solo
// aportan su alias a `aliases`.
export function statementRelations(
  text: string,
  lexical: SqlLexical,
): { relations: StatementRelation[]; aliases: string[] } {
  const tokens = sqlTokens(text, lexical);
  const relations: StatementRelation[] = [];
  const aliases: string[] = [];
  let depth = 0;
  let state: "none" | "table" | "qualified" | "after" | "as" | "subquery" | "after-subquery" | "as-subquery" = "none";
  let subqueryDepth = 0;
  let current: StatementRelation | null = null;
  let fromListDepth = -1;

  const finish = (alias?: Token) => {
    const name = alias ? nameOf(alias) : undefined;
    if (current) relations.push(alias ? { ...current, alias: name, written: alias.raw } : current);
    if (name) aliases.push(name);
    current = null;
    state = "none";
  };

  for (const token of tokens) {
    if (token.kind === "lparen") {
      depth += 1;
      if (state === "table") {
        state = "subquery";
        subqueryDepth = depth;
      }
      continue;
    }
    if (token.kind === "rparen") {
      if (state === "subquery" && depth === subqueryDepth) state = "after-subquery";
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (state === "subquery") continue;

    if (state === "table") {
      if (isName(token)) {
        current = { table: nameOf(token), from: token.from, written: token.raw, quoted: token.kind === "quoted" };
        state = "after";
        continue;
      }
      state = "none";
    } else if (state === "qualified") {
      if (isName(token) && current) {
        current = {
          schema: current.table,
          schemaQuoted: current.quoted,
          table: nameOf(token),
          from: current.from,
          written: token.raw,
          quoted: token.kind === "quoted",
        };
        state = "after";
        continue;
      }
      finish();
    } else if (state === "after" || state === "after-subquery") {
      if (token.kind === "dot" && state === "after") {
        state = "qualified";
        continue;
      }
      if (token.kind === "word" && token.text === "as") {
        state = state === "after" ? "as" : "as-subquery";
        continue;
      }
      if (isName(token) && !(token.kind === "word" && NOT_ALIAS.has(token.text))) {
        finish(token);
        continue;
      }
      finish();
    } else if (state === "as" || state === "as-subquery") {
      if (isName(token)) {
        finish(token);
        continue;
      }
      finish();
    }

    if (token.kind === "comma" && depth === fromListDepth) {
      state = "table";
      continue;
    }
    if (token.kind !== "word") continue;
    if (token.text === "from") {
      state = "table";
      fromListDepth = depth;
    } else if (token.text === "join") {
      state = "table";
      if (depth === fromListDepth) fromListDepth = -1;
    } else if (END_FROM_LIST.has(token.text) && depth === fromListDepth) {
      fromListDepth = -1;
    }
  }
  if (state === "after" || state === "qualified" || state === "as") finish();
  return { relations, aliases };
}

// Como se nombra una relacion en una condicion: su alias o su nombre, tal
// como se escribieron (con sus comillas, si las tenian).
export function relationRef(relation: StatementRelation): string {
  return relation.written;
}

// Iniciales de cada parte del nombre: separadas por "_" o por mayusculas
// (camelCase), en minusculas. "tec_abonados_cambios" -> "tac",
// "OrderItems" -> "oi".
function initials(table: string): string {
  const parts = table
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .split(/[_\s$]+/)
    .filter((part) => /[A-Za-z]/.test(part));
  return parts.map((part) => part.match(/[A-Za-z]/)![0].toLowerCase()).join("");
}

// El alias para una tabla nueva en la sentencia: las iniciales; si son una
// palabra reservada del motor (`reserved`, en minusculas: su perfil mas las
// keywords de su dialecto), la primera letra; unico entre `taken` (alias y
// tablas ya presentes, en minusculas) con un numero si hace falta.
// undefined si no hay alias posible (se usa el nombre de la tabla).
export function aliasFor(table: string, taken: ReadonlySet<string>, reserved: ReadonlySet<string>): string | undefined {
  const isReserved = (word: string) => reserved.has(word);
  let base = initials(table);
  if (!base) return undefined;
  if (isReserved(base)) base = base[0];
  if (isReserved(base)) return undefined;
  if (!taken.has(base)) return base;
  for (let suffix = 1; suffix < 100; suffix += 1) {
    const candidate = `${base}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  return undefined;
}

// Alias y nombres ya usados en la sentencia, en minusculas.
export function takenNames(relations: readonly StatementRelation[], aliases: readonly string[]): Set<string> {
  const taken = new Set<string>();
  for (const relation of relations) {
    taken.add(relation.table.toLowerCase());
    if (relation.alias) taken.add(relation.alias.toLowerCase());
  }
  for (const alias of aliases) taken.add(alias.toLowerCase());
  return taken;
}
