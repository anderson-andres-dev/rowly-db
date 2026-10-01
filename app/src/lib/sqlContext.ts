// Clasificador de contexto del cursor dentro de una sentencia SQL. Sin
// dependencias de CodeMirror/Svelte/Tauri: es una funcion pura sobre texto,
// pensada para testearse en aislamiento (ver sqlContext.test.ts).
//
// Las comillas y comentarios los dice el motor (SqlLexical): en MySQL "#"
// abre un comentario y la barra invertida escapa; en Postgres, no.
//
// No es un parser SQL real. `sqlparser` (crates/engine/src/parser.rs) solo
// puede validar SQL completo y sintacticamente valido, asi que no sirve para
// entender una sentencia a medio escribir mientras el cursor esta en el
// medio. Este modulo es, a proposito, un tokenizador liviano + una maquina
// de estados chica: reconoce un vocabulario deliberadamente pequeno de
// transiciones (SELECT/FROM/JOIN/ON/WHERE/HAVING/GROUP BY/ORDER BY) y
// degrada a "unknown" ante cualquier cosa que no reconozca (CTEs, DDL,
// bloques procedurales, anidamiento malformado) en vez de adivinar mal.

import type { SqlLexical } from "$lib/sqlStatements";

export type ClauseKind =
  | "select"
  | "from"
  | "join"
  | "on"
  | "where"
  | "having"
  | "group-by"
  | "order-by"
  | "other"
  | "none";

export type PositionKind =
  | "statement-start"
  | "expression"
  | "select-tail"
  | "relation-target"
  | "relation-tail"
  | "alias"
  | "keyword-continuation"
  | "unknown";

export interface ClauseContext {
  position: PositionKind;
  clause: ClauseKind;
  confidence: "confident" | "tentative" | "unknown";
  lexical: "code" | "string" | "comment" | "quoted-identifier";
  activeWord: { from: number; to: number; text: string };
  /** La palabra activa esta precedida por un "." sin espacio (p.ej. "u.na|"). */
  qualified: boolean;
  pendingKeyword?: "by" | "join";
  /** Solo el FROM simple de la sentencia actual, mejor esfuerzo. No se usa
   * todavia en buildCompletionSource (fase 1-2) - extractFromContext sigue
   * siendo la fuente de verdad para eso hasta la fase 3. */
  primaryRelation?: { table: string; alias?: string };
}

const MAX_SCAN_CHARS = 128 * 1024;

type TokenKind = "word" | "quoted" | "dot" | "comma" | "lparen" | "rparen" | "semi" | "star" | "other";

export interface Token {
  kind: TokenKind;
  /** Minuscula para "word" (para comparar contra keywords); tal cual para el resto. */
  text: string;
  /** Texto original, sin normalizar (para usar como nombre de tabla/alias). */
  raw: string;
  from: number;
  to: number;
}

type Lexical = ClauseContext["lexical"];

// Los tokens de `text` hasta `end` (sqlRelations.ts arma las relaciones de
// la sentencia con ellos).
export function sqlTokens(text: string, lexical: SqlLexical, end = text.length): Token[] {
  return lex(text, end, lexical).tokens;
}

// `lexical`: las comillas y comentarios del motor (su perfil en lib/engines).
function lex(doc: string, end: number, rules: SqlLexical): { tokens: Token[]; lexicalAtEnd: Lexical } {
  const identifierQuotes = new Map<string, string>(
    rules.identifierQuotes.map((quote) => [quote, quote === "[" ? "]" : quote]),
  );
  const tokens: Token[] = [];
  let i = 0;
  let lexicalAtEnd: Lexical = "code";

  while (i < end) {
    const ch = doc[i];

    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      lexicalAtEnd = "code";
      continue;
    }

    // Comentario de linea: "--" (todos los motores) o "#" (si el motor lo
    // usa: MySQL/MariaDB; en Postgres es un operador).
    if ((ch === "-" && doc[i + 1] === "-") || (ch === "#" && rules.hashComments)) {
      i += ch === "#" ? 1 : 2;
      while (i < end && doc[i] !== "\n") i++;
      lexicalAtEnd = i >= end ? "comment" : "code";
      continue;
    }

    if (ch === "/" && doc[i + 1] === "*") {
      i += 2;
      let closed = false;
      while (i < end) {
        if (doc[i] === "*" && doc[i + 1] === "/") {
          i += 2;
          closed = true;
          break;
        }
        i++;
      }
      lexicalAtEnd = closed ? "code" : "comment";
      continue;
    }

    // String literal: '...'. Comillas dobles escapadas ('') y la barra
    // invertida si el motor la usa de escape (MySQL).
    if (ch === "'") {
      // E'...' (Postgres): ahi la barra invertida si escapa.
      const escaping =
        rules.backslashEscapes ||
        (rules.escapeStringPrefix && /[eE]/.test(doc[i - 1] ?? "") && !/[A-Za-z0-9_$]/.test(doc[i - 2] ?? ""));
      i++;
      let closed = false;
      while (i < end) {
        if (doc[i] === "\\" && escaping) {
          i += 2;
          continue;
        }
        if (doc[i] === "'" && doc[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (doc[i] === "'") {
          i++;
          closed = true;
          break;
        }
        i++;
      }
      lexicalAtEnd = closed ? "code" : "string";
      continue;
    }

    // Identificador entre las comillas que acepta el motor: backtick
    // (MySQL/MariaDB), comilla doble (Postgres/ANSI), corchetes ([nombre]).
    const closing = identifierQuotes.get(ch);
    if (closing !== undefined) {
      const quote = closing;
      const start = i;
      i++;
      let closed = false;
      while (i < end) {
        if (doc[i] === quote && doc[i + 1] === quote) {
          i += 2;
          continue;
        }
        if (doc[i] === quote) {
          i++;
          closed = true;
          break;
        }
        i++;
      }
      const raw = doc.slice(start, i);
      const inner = doc.slice(start + 1, closed ? i - 1 : i);
      tokens.push({ kind: "quoted", text: inner, raw, from: start, to: i });
      lexicalAtEnd = closed ? "code" : "quoted-identifier";
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      const start = i;
      i++;
      while (i < end && /[A-Za-z0-9_]/.test(doc[i])) i++;
      const raw = doc.slice(start, i);
      tokens.push({ kind: "word", text: raw.toLowerCase(), raw, from: start, to: i });
      lexicalAtEnd = "code";
      continue;
    }

    if (ch === ".") {
      tokens.push({ kind: "dot", text: ".", raw: ".", from: i, to: i + 1 });
      i++;
      lexicalAtEnd = "code";
      continue;
    }
    if (ch === ",") {
      tokens.push({ kind: "comma", text: ",", raw: ",", from: i, to: i + 1 });
      i++;
      lexicalAtEnd = "code";
      continue;
    }
    if (ch === "(") {
      tokens.push({ kind: "lparen", text: "(", raw: "(", from: i, to: i + 1 });
      i++;
      lexicalAtEnd = "code";
      continue;
    }
    if (ch === ")") {
      tokens.push({ kind: "rparen", text: ")", raw: ")", from: i, to: i + 1 });
      i++;
      lexicalAtEnd = "code";
      continue;
    }
    if (ch === ";") {
      tokens.push({ kind: "semi", text: ";", raw: ";", from: i, to: i + 1 });
      i++;
      lexicalAtEnd = "code";
      continue;
    }
    if (ch === "=") {
      tokens.push({ kind: "other", text: "=", raw: "=", from: i, to: i + 1 });
      i++;
      lexicalAtEnd = "code";
      continue;
    }
    if (ch === "*") {
      tokens.push({ kind: "star", text: "*", raw: "*", from: i, to: i + 1 });
      i++;
      lexicalAtEnd = "code";
      continue;
    }

    // Operadores, numeros, etc.: irrelevantes para clasificar la clausula.
    i++;
    lexicalAtEnd = "code";
  }

  return { tokens, lexicalAtEnd };
}

const CLAUSE_KEYWORDS = new Set(["select", "from", "join", "on", "where", "having"]);
const JOIN_MODIFIERS = new Set(["left", "right", "inner", "full", "outer", "cross"]);

interface FrameState {
  clause: ClauseKind;
  pendingKeyword?: "by" | "join";
  pendingClauseTarget?: ClauseKind;
  primaryRelation?: { table: string; alias?: string };
  // Solo se llena para el primer FROM de la sentencia (no JOINs): "none" no
  // se esta rastreando, "await-table" esperando el nombre (de una relacion
  // nueva: la primera, o la siguiente tras una coma), "await-qualified-table"
  // esperando la 2da parte de un "schema.tabla" (reemplaza el nombre de LA
  // MISMA relacion en vez de tratarla como una relacion nueva), "await-alias"
  // ya tiene tabla y podria venir un alias (implicito o con AS), "as" vio
  // "AS" y el siguiente word es el alias seguro.
  relationCapture: "none" | "await-table" | "await-qualified-table" | "await-alias" | "as";
}

function newFrame(): FrameState {
  return { clause: "none", relationCapture: "none" };
}

export function classifyContext(doc: string, pos: number, lexical: SqlLexical): ClauseContext {
  // No hay forma de conocer con seguridad el estado lexico (dentro de un
  // string/comentario abierto, profundidad de parentesis, etc.) sin escanear
  // desde el principio de la sentencia. Mas alla del limite, no se adivina:
  // se devuelve "unknown" en vez de escanear una ventana arbitraria
  // asumiendo que empieza fuera de un string/comentario.
  if (pos > MAX_SCAN_CHARS) {
    return {
      position: "unknown",
      clause: "none",
      confidence: "unknown",
      lexical: "code",
      activeWord: { from: pos, to: pos, text: "" },
      qualified: false,
    };
  }

  const { tokens: rawTokens, lexicalAtEnd } = lex(doc, pos, lexical);

  // Si el cursor esta dentro de un string/comentario/identificador sin
  // cerrar, no tiene sentido completar sintaxis SQL ahi - la libreria ya
  // suprime keywords en ese caso via su propio arbol de sintaxis.
  if (lexicalAtEnd !== "code") {
    return {
      position: "unknown",
      clause: "none",
      confidence: "unknown",
      lexical: lexicalAtEnd,
      activeWord: { from: pos, to: pos, text: "" },
      qualified: false,
    };
  }

  // La ultima palabra, si toca el cursor, es la que se esta escribiendo -
  // nunca se trata como un token ya comprometido (asi "FROM users wh|" no
  // registra "wh" como alias).
  let tokens = rawTokens;
  let activeWord = { from: pos, to: pos, text: "" };
  const last = tokens[tokens.length - 1];
  if (last && last.kind === "word" && last.to === pos) {
    activeWord = { from: last.from, to: last.to, text: last.raw };
    tokens = tokens.slice(0, -1);
  }

  const qualified = activeWord.from > 0 && doc[activeWord.from - 1] === ".";

  // Restringir a la sentencia actual: todo despues del ultimo ";" visto
  // (los ; dentro de strings/comentarios/identificadores nunca llegan aca
  // porque el lexer los consume como parte de esos tokens).
  const lastSemi = [...tokens].reverse().findIndex((t) => t.kind === "semi");
  const statementTokens = lastSemi === -1 ? tokens : tokens.slice(tokens.length - lastSemi);

  // Pila de "frames" por nivel de parentesis: entrar a "(" abre un frame
  // nuevo (asi "EXTRACT(x FROM y)" o una subquery no contaminan la clausula
  // de la sentencia que los contiene); salir de ")" vuelve al padre.
  const frames: FrameState[] = [newFrame()];
  let primaryRelation: FrameState["primaryRelation"];

  for (const token of statementTokens) {
    const frame = frames[frames.length - 1];

    if (token.kind === "lparen") {
      frames.push(newFrame());
      continue;
    }
    if (token.kind === "rparen") {
      if (frames.length > 1) frames.pop();
      continue;
    }
    if (token.kind === "semi") continue; // no deberia aparecer (ver arriba), defensivo

    // Palabra dentro de FROM/JOIN: nombre de relacion, punto calificador, o
    // alias (explicito con AS o implicito).
    if (frame.clause === "from" || frame.clause === "join") {
      if (frame.relationCapture === "await-table") {
        if (token.kind === "word" || token.kind === "quoted") {
          if (frame.clause === "from" && !primaryRelation) {
            frame.primaryRelation = { table: token.raw };
            // Se captura la referencia una sola vez, aca: las mutaciones
            // posteriores (fijar el alias) se ven solas por ser el mismo
            // objeto, sin depender de volver a "atrapar" el chequeo mas
            // abajo (que se salteaba con los continue de este bloque).
            primaryRelation = frame.primaryRelation;
          }
          frame.relationCapture = "await-alias";
          continue;
        }
      } else if (frame.relationCapture === "await-qualified-table") {
        if (token.kind === "word" || token.kind === "quoted") {
          // "schema.tabla": la 2da palabra reemplaza el nombre capturado con
          // la 1ra (que en realidad era el schema), en la MISMA relacion -
          // a diferencia de "await-table", nunca crea una relacion nueva.
          if (frame.clause === "from" && frame.primaryRelation) {
            frame.primaryRelation.table = token.raw;
          }
          frame.relationCapture = "await-alias";
          continue;
        }
      } else if (frame.relationCapture === "await-alias") {
        if (token.kind === "dot") {
          frame.relationCapture = "await-qualified-table";
          continue;
        }
        if (token.kind === "word" && token.text === "as") {
          frame.relationCapture = "as";
          continue;
        }
        if (token.kind === "comma") {
          frame.relationCapture = "await-table"; // FROM a, b: otra tabla mas
          continue;
        }
        if (token.kind === "word" && !CLAUSE_KEYWORDS.has(token.text) && !JOIN_MODIFIERS.has(token.text)) {
          // alias implicito: "FROM users u"
          if (frame.clause === "from" && frame.primaryRelation && !frame.primaryRelation.alias) {
            frame.primaryRelation.alias = token.raw;
          }
          frame.relationCapture = "none";
          // sigue el manejo normal de keywords mas abajo por si esta palabra fuera una
        }
      } else if (frame.relationCapture === "as") {
        if (token.kind === "word") {
          if (frame.clause === "from" && frame.primaryRelation) {
            frame.primaryRelation.alias = token.raw;
          }
          frame.relationCapture = "none";
          continue;
        }
      }
    }

    if (token.kind !== "word") continue;

    if (token.text === "select") {
      frame.clause = "select";
      frame.pendingKeyword = undefined;
      frame.relationCapture = "none";
    } else if (token.text === "from") {
      frame.clause = "from";
      frame.pendingKeyword = undefined;
      frame.relationCapture = "await-table";
    } else if (token.text === "join") {
      frame.clause = "join";
      frame.pendingKeyword = undefined;
      frame.relationCapture = "await-table";
    } else if (JOIN_MODIFIERS.has(token.text)) {
      frame.pendingKeyword = "join";
    } else if (token.text === "on") {
      frame.clause = "on";
      frame.pendingKeyword = undefined;
      frame.relationCapture = "none";
    } else if (token.text === "where") {
      frame.clause = "where";
      frame.pendingKeyword = undefined;
      frame.relationCapture = "none";
    } else if (token.text === "having") {
      frame.clause = "having";
      frame.pendingKeyword = undefined;
      frame.relationCapture = "none";
    } else if (token.text === "group") {
      frame.pendingKeyword = "by";
      frame.pendingClauseTarget = "group-by";
    } else if (token.text === "order") {
      frame.pendingKeyword = "by";
      frame.pendingClauseTarget = "order-by";
    } else if (token.text === "by" && frame.pendingKeyword === "by") {
      frame.clause = frame.pendingClauseTarget ?? "other";
      frame.pendingKeyword = undefined;
    }
    // Cualquier otra palabra (identificador, "as" fuera de contexto de
    // relacion, CASE/WHEN/END/AND/OR/...) no cambia la clausula: solo un
    // keyword reconocido explicitamente arriba lo hace.
  }

  const frame = frames[frames.length - 1];
  const committed = statementTokens; // ya sin el activeWord
  const lastCommitted = committed[committed.length - 1];

  if (frames.length > 1) {
    // Seguimos dentro de parentesis sin cerrar al llegar al cursor (funcion
    // o subquery a medio escribir). Es una sentencia valida a medio
    // terminar, no un error: se reporta con confianza reducida en vez de
    // "unknown" para no perder toda ayuda de golpe.
    return classifyFrame(frame, committed, lastCommitted, activeWord, qualified, "tentative");
  }

  if (committed.length === 0) {
    return {
      position: "statement-start",
      clause: "none",
      confidence: "confident",
      lexical: "code",
      activeWord,
      qualified,
      primaryRelation,
    };
  }

  return classifyFrame(frame, committed, lastCommitted, activeWord, qualified, "confident", primaryRelation);
}

function classifyFrame(
  frame: FrameState,
  committed: Token[],
  last: Token | undefined,
  activeWord: ClauseContext["activeWord"],
  qualified: boolean,
  confidence: ClauseContext["confidence"],
  primaryRelation?: FrameState["primaryRelation"],
): ClauseContext {
  const base = { activeWord, qualified, lexical: "code" as const, primaryRelation };

  if (frame.pendingKeyword === "by") {
    return { ...base, position: "keyword-continuation", clause: frame.pendingClauseTarget ?? "other", confidence, pendingKeyword: "by" };
  }
  if (frame.pendingKeyword === "join") {
    return { ...base, position: "keyword-continuation", clause: "join", confidence, pendingKeyword: "join" };
  }

  if (!last) {
    return { ...base, position: "unknown", clause: "other", confidence: "unknown" };
  }

  if (frame.clause === "from" || frame.clause === "join") {
    if (last.kind === "word" && (last.text === "from" || last.text === "join")) {
      return { ...base, position: "relation-target", clause: frame.clause, confidence };
    }
    if (last.kind === "comma" || last.kind === "dot") {
      return { ...base, position: "relation-target", clause: frame.clause, confidence };
    }
    if (last.kind === "word" && last.text === "as") {
      return { ...base, position: "alias", clause: frame.clause, confidence };
    }
    return { ...base, position: "relation-tail", clause: frame.clause, confidence };
  }

  if (frame.clause === "select") {
    if (last.kind === "star") {
      return { ...base, position: "select-tail", clause: "select", confidence };
    }
    return { ...base, position: "expression", clause: "select", confidence: confidence === "confident" ? "tentative" : confidence };
  }

  if (
    frame.clause === "where" ||
    frame.clause === "on" ||
    frame.clause === "having" ||
    frame.clause === "group-by" ||
    frame.clause === "order-by"
  ) {
    return { ...base, position: "expression", clause: frame.clause, confidence };
  }

  return { ...base, position: "unknown", clause: "other", confidence: "unknown" };
}
