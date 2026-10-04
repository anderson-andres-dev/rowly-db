import type { SqlLexical } from "$lib/sqlStatements";

// Donde empieza y acaba un comentario, segun el motor.
// Las reglas salen solo de `SqlLexical`; los escaneres del editor (divisor,
// contexto del cursor, parametros, pistas de llamada, formateador, pegado)
// preguntan aqui.

export type CommentKind = "line" | "block" | "executable";

export interface Comment {
  kind: CommentKind;
  // Despues del cierre: el fin del texto si el comentario no se cierra.
  end: number;
  closed: boolean;
}

// "--" abre un comentario; en MySQL y MariaDB solo seguido de un espacio o un
// caracter de control ("--x" es "-" y "-x").
export function opensDashComment(text: string, at: number, lexical: SqlLexical): boolean {
  if (text.charCodeAt(at) !== 45 || text.charCodeAt(at + 1) !== 45) return false;
  if (!lexical.dashCommentNeedsSpace) return true;
  const after = text.charCodeAt(at + 2);
  return Number.isNaN(after) || after <= 32 || after === 127;
}

export function opensLineComment(text: string, at: number, lexical: SqlLexical): boolean {
  return opensDashComment(text, at, lexical) || (lexical.hashComments && text.charCodeAt(at) === 35);
}

// El prefijo de un comentario que el motor ejecuta ("/*!", "/*M!"), si abre
// uno en `at`.
export function executablePrefix(text: string, at: number, lexical: SqlLexical): string | null {
  for (const prefix of lexical.executableComments) {
    if (text.startsWith(prefix, at)) return prefix;
  }
  return null;
}

// Donde acaba un comentario de bloque que abre en `at` (en "/*").
export function blockCommentEnd(text: string, at: number, lexical: SqlLexical): { end: number; closed: boolean } {
  if (!lexical.nestedComments) {
    const close = text.indexOf("*/", at + 2);
    return close === -1 ? { end: text.length, closed: false } : { end: close + 2, closed: true };
  }
  let depth = 1;
  let index = at + 2;
  while (index < text.length) {
    const open = text.indexOf("/*", index);
    const close = text.indexOf("*/", index);
    if (close === -1) break;
    if (open !== -1 && open < close) {
      depth += 1;
      index = open + 2;
    } else {
      depth -= 1;
      index = close + 2;
      if (depth === 0) return { end: index, closed: true };
    }
  }
  return { end: text.length, closed: false };
}

// El comentario que abre en `at`, si abre uno.
export function commentAt(text: string, at: number, lexical: SqlLexical): Comment | null {
  if (opensLineComment(text, at, lexical)) {
    const newline = text.indexOf("\n", at);
    return { kind: "line", end: newline === -1 ? text.length : newline, closed: newline !== -1 };
  }
  if (text.charCodeAt(at) === 47 && text.charCodeAt(at + 1) === 42) {
    const { end, closed } = blockCommentEnd(text, at, lexical);
    return { kind: executablePrefix(text, at, lexical) ? "executable" : "block", end, closed };
  }
  return null;
}
