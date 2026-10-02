import type { SqlProfile } from "$lib/engines";
import { commentAt } from "$lib/sqlComments";
import { sqlTokens, type Token } from "$lib/sqlContext";
import type { SqlLexical } from "$lib/sqlStatements";
import type { ExplorerRoutine, SchemaObjects } from "$lib/types";

// Hints de parametros: el nombre de cada parametro delante de su argumento
// en una llamada a una rutina del catalogo.
// Funciones puras sobre el texto de UNA sentencia; lo propio del motor
// (como se leen los nombres, que parametros se pasan) sale de su perfil.

export interface CatalogRoutine extends ExplorerRoutine {
  schema: string;
}

// Las rutinas del catalogo por nombre en minusculas (lo escrito se compara
// despues como el motor, con nameMatches).
export interface RoutineIndex {
  byName: Map<string, CatalogRoutine[]>;
  defaultSchema?: string;
}

export function buildRoutineIndex(schemas: readonly SchemaObjects[], defaultSchema?: string): RoutineIndex {
  const byName = new Map<string, CatalogRoutine[]>();
  for (const objects of schemas) {
    for (const routine of objects.routines) {
      const key = routine.name.toLowerCase();
      byName.set(key, [...(byName.get(key) ?? []), { ...routine, schema: objects.schema }]);
    }
  }
  return { byName, defaultSchema };
}

interface Name {
  text: string;
  quoted: boolean;
}

export interface CallArgument {
  // Primer caracter del argumento (sin espacios ni comentarios), relativo al
  // texto de la sentencia.
  from: number;
  // El argumento es un nombre suelto (`p_id`): si es el del parametro, el
  // hint sobra.
  bare?: Name;
  // Notacion nombrada: `p_id => 1` o `p_id := 1`.
  named: boolean;
}

export interface RoutineCall {
  schema?: Name;
  name: Name;
  // Despues de CALL: un procedimiento; si no, una funcion.
  viaCall: boolean;
  args: CallArgument[];
}

function isName(token: Token | undefined): token is Token {
  return !!token && (token.kind === "word" || token.kind === "quoted");
}

function nameOf(token: Token): Name {
  return { text: token.kind === "word" ? token.raw : token.text, quoted: token.kind === "quoted" };
}

// Salta espacios y comentarios desde `at`.
function skipBlank(text: string, at: number, lexical: SqlLexical): number {
  let index = at;
  for (;;) {
    while (index < text.length && /\s/.test(text[index])) index += 1;
    const comment = commentAt(text, index, lexical);
    if (!comment) return index;
    index = comment.kind === "line" && comment.closed ? comment.end + 1 : comment.end;
  }
}

const NAMED = /^(?:[A-Za-z_][A-Za-z0-9_$]*|"(?:[^"]|"")*")\s*(?:=>|:=)/;

// Las llamadas `nombre(...)` de la sentencia con sus argumentos. Sin cerrar
// (mientras se escribe) tambien cuentan los argumentos que ya hay.
export function findCalls(text: string, engine: SqlProfile): RoutineCall[] {
  const tokens = sqlTokens(text, engine.lexical);
  const calls: RoutineCall[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].kind !== "lparen") continue;
    const nameToken = tokens[index - 1];
    if (!isName(nameToken) || text.slice(nameToken.to, tokens[index].from).trim() !== "") continue;
    const qualified = tokens[index - 2]?.kind === "dot" && isName(tokens[index - 3]);
    const schemaToken = qualified ? tokens[index - 3] : undefined;
    const before = tokens[qualified ? index - 4 : index - 2];
    const beforeWord = before?.kind === "word" ? before.text : "";
    // La definicion de la rutina, no una llamada.
    if (beforeWord === "function" || beforeWord === "procedure") continue;

    const args: CallArgument[] = [];
    let depth = 1;
    let argFrom = tokens[index].to;
    let argTokens: Token[] = [];
    const closeArg = (end: number) => {
      const from = skipBlank(text, argFrom, engine.lexical);
      if (from >= end) return;
      const only = argTokens.length === 1 && isName(argTokens[0]) ? argTokens[0] : undefined;
      const bare =
        only && text.slice(from, only.from).trim() === "" && text.slice(only.to, end).trim() === "" ? nameOf(only) : undefined;
      args.push({ from, bare, named: NAMED.test(text.slice(from, end)) });
    };
    let cursor = index + 1;
    let closed = false;
    for (; cursor < tokens.length; cursor += 1) {
      const token = tokens[cursor];
      if (token.kind === "lparen") depth += 1;
      else if (token.kind === "rparen") {
        depth -= 1;
        if (depth === 0) {
          closeArg(token.from);
          closed = true;
          break;
        }
      } else if (token.kind === "comma" && depth === 1) {
        closeArg(token.from);
        argFrom = token.to;
        argTokens = [];
        continue;
      } else if (token.kind === "semi") break;
      if (depth === 1) argTokens.push(token);
    }
    if (!closed) closeArg(text.length);
    calls.push({
      schema: schemaToken ? nameOf(schemaToken) : undefined,
      name: nameOf(nameToken),
      viaCall: beforeWord === "call",
      args,
    });
  }
  return calls;
}

export interface ParameterHint {
  // Donde va el hint (el primer caracter del argumento), relativo al texto.
  at: number;
  label: string;
}

// Los nombres de los parametros que corresponden a los argumentos de la
// llamada con `routine`; null si esa rutina no acepta tantos argumentos.
function labelsFor(routine: CatalogRoutine, count: number, engine: SqlProfile): (string | null)[] | null {
  const passed = (routine.parameters ?? []).filter((parameter) => engine.passedInCall(parameter.mode, routine.kind));
  const variadic = passed.findIndex((parameter) => parameter.mode === "variadic");
  if (variadic === -1 && count > passed.length) return null;
  return Array.from({ length: count }, (_, index) => {
    // Del VARIADIC en adelante, solo el primero lleva el nombre.
    if (variadic !== -1 && index > variadic) return null;
    return passed[index]?.name ?? null;
  });
}

// Los hints de una sentencia. Sin la rutina en el catalogo, o si varias
// sobrecargas encajan y no dicen lo mismo, no se muestra nada: mejor nada que
// un nombre equivocado.
export function callHints(text: string, engine: SqlProfile, routines: RoutineIndex): ParameterHint[] {
  if (routines.byName.size === 0) return [];
  const hints: ParameterHint[] = [];
  for (const call of findCalls(text, engine)) {
    if (call.args.length === 0) continue;
    const kind: ExplorerRoutine["kind"] = call.viaCall ? "procedure" : "function";
    const candidates = (routines.byName.get(call.name.text.toLowerCase()) ?? []).filter(
      (routine) =>
        routine.kind === kind &&
        engine.nameMatches(call.name.text, call.name.quoted, routine.name) &&
        (call.schema
          ? engine.nameMatches(call.schema.text, call.schema.quoted, routine.schema)
          : routines.defaultSchema === undefined || routine.schema === routines.defaultSchema),
    );
    const options = candidates
      .map((routine) => labelsFor(routine, call.args.length, engine))
      .filter((labels): labels is (string | null)[] => labels !== null);
    if (options.length === 0) continue;
    const labels = options[0];
    if (options.some((other) => other.some((label, index) => label !== labels[index]))) continue;
    call.args.forEach((arg, index) => {
      const label = labels[index];
      if (!label || arg.named) return;
      if (arg.bare && engine.nameMatches(arg.bare.text, arg.bare.quoted, label)) return;
      hints.push({ at: arg.from, label });
    });
  }
  return hints;
}
