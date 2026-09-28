// Division del texto del editor en sentencias y eleccion de la que "esta
// bajo el cursor" para ejecutar. No depende del arbol sintactico de
// CodeMirror (se parsea por partes y en los huecos entre sentencias no
// devuelve ninguna); nunca cae al documento entero.
//
// Se corta en cada ";" que no este dentro de comillas ('...', "...",
// `...`), de un comentario (-- ..., /* ... */) ni de un bloque $tag$ de
// PostgreSQL. Tambien en una linea en blanco, como en DataGrip o DBeaver,
// salvo dentro de parentesis o cuando la linea anterior termina en algo que
// pide seguir (una coma, un parentesis que abre, un operador). Un tramo que
// solo tiene espacios o comentarios no es una sentencia.
//
// En el editor no se usa sobre el texto entero: sqlStatementIndex.ts lleva
// las sentencias del documento al dia por partes, con este mismo escaner.

export interface StatementRange {
  from: number;
  to: number;
}

export interface ScannedStatement extends StatementRange {
  // Termino en ";": justo despues el escaner esta fuera de todo (comillas,
  // comentarios), asi que se puede volver a escanear desde ahi sin mirar
  // atras (sqlStatementIndex.ts). Una sentencia cortada por una linea en
  // blanco no lo es: si esa linea se borra, se une con la siguiente, y eso
  // solo se ve escaneando desde antes.
  terminated: boolean;
}

// Como se escribe el SQL de un motor (su perfil en lib/engines). Vive aca,
// en el modulo mas bajo, porque lo usan el escaner y el lexer del contexto.
export interface SqlLexical {
  // Comillas de identificadores que acepta ("nombre", `nombre`, [nombre]).
  identifierQuotes: readonly ('"' | "`" | "[")[];
  // En '...', la barra invertida escapa (MySQL) o es un caracter mas
  // (Postgres, con standard_conforming_strings).
  backslashEscapes: boolean;
  // "#" abre un comentario de linea (MySQL).
  hashComments: boolean;
  // Bloques $tag$ ... $tag$ (Postgres).
  dollarQuotes: boolean;
  // E'...': un texto donde la barra invertida escapa aunque en el resto no
  // (Postgres).
  escapeStringPrefix: boolean;
}

// El SQL estandar: sin conexion no hay motor (engines/standard.ts).
export const STANDARD_LEXICAL: SqlLexical = {
  identifierQuotes: ['"'],
  backslashEscapes: false,
  hashComments: false,
  dollarQuotes: false,
  escapeStringPrefix: false,
};

// Donde quedo el escaner al cortar un trozo: el documento se escanea por
// partes (sqlStatementIndex.ts) y cada una sigue donde la anterior quedo.
export interface ScanState {
  mode: number;
  // La comilla que cierra lo abierto (codigo de caracter) o el $tag$ abierto.
  quote: number;
  tag: string;
  // El texto abierto es un E'...' (la barra invertida escapa).
  escaping: boolean;
  // Inicio de la sentencia en curso (absoluto); -1 sin codigo todavia.
  codeStart: number;
  // Fin del ultimo caracter que no es espacio desde el ultimo ";" (absoluto):
  // el fin de una sentencia sin ";" final.
  lastNonSpace: number;
  // Parentesis abiertos en la sentencia en curso: una linea en blanco
  // adentro no la corta.
  depth: number;
}

const CODE = 0;
const LINE_COMMENT = 1;
const BLOCK_COMMENT = 2;
const QUOTED = 3;
const DOLLAR_QUOTED = 4;

const SEMICOLON = 59;
const DASH = 45;
const SLASH = 47;
const STAR = 42;
const SINGLE_QUOTE = 39;
const BACKSLASH = 92;
const DOLLAR = 36;
const OPEN_PAREN = 40;
const CLOSE_PAREN = 41;
const COMMA = 44;

// Cuanto puede mirar el escaner mas alla del corte de un trozo: "--", "/*",
// "''" y los $tag$ se leen enteros aunque crucen el corte.
export const SCAN_OVERLAP = 64;

const HASH = 35;
const CLOSE_BRACKET = 93;

const DOLLAR_TAG = /\$[A-Za-z_]*\$/y;


// Lo que, al final de una linea, dice que la sentencia sigue abajo aunque
// haya una linea en blanco en medio.
// El "*" no: casi siempre es "todas las columnas" (SELECT *).
const CONTINUES = new Set([COMMA, OPEN_PAREN, 43, DASH, SLASH, 61, 60, 62, 124, 38, 37]);

// Las reglas de un motor, ya compiladas: lo que puede abrir o cerrar algo en
// codigo (una regex para saltar rapido lo demas) y, por cada comilla, la
// que la cierra y como buscarla.
interface ScanRules {
  special: RegExp;
  closeOf: Map<number, number>;
  closer: Map<number, RegExp>;
  hash: boolean;
  dollar: boolean;
  escapePrefix: boolean;
}

// Dentro de un E'...': la comilla o la barra invertida.
const ESCAPED_SINGLE = /['\\]/g;

// "E" o "e" pegada a la comilla, y que no sea el final de otra palabra.
function opensEscapeString(text: string, quoteAt: number): boolean {
  const prefix = text.charCodeAt(quoteAt - 1);
  if (prefix !== 69 && prefix !== 101) return false;
  const before = text.charCodeAt(quoteAt - 2);
  return !(
    (before >= 48 && before <= 57) ||
    (before >= 65 && before <= 90) ||
    (before >= 97 && before <= 122) ||
    before === 95 ||
    before === DOLLAR
  );
}

const compiled = new WeakMap<SqlLexical, ScanRules>();

function escapeClass(char: string): string {
  return char.replace(/[\\\]\[^-]/g, "\\$&");
}

function rulesFor(lexical: SqlLexical): ScanRules {
  const cached = compiled.get(lexical);
  if (cached) return cached;
  const closeOf = new Map<number, number>([[SINGLE_QUOTE, SINGLE_QUOTE]]);
  for (const quote of lexical.identifierQuotes) {
    closeOf.set(quote.charCodeAt(0), quote === "[" ? CLOSE_BRACKET : quote.charCodeAt(0));
  }
  const closer = new Map<number, RegExp>();
  for (const close of new Set(closeOf.values())) {
    const char = escapeClass(String.fromCharCode(close));
    // En '...', tambien la barra invertida si el motor la usa de escape.
    const escape = close === SINGLE_QUOTE && lexical.backslashEscapes ? "\\\\" : "";
    closer.set(close, new RegExp(`[${char}${escape}]`, "g"));
  }
  const opens = [...closeOf.keys()].map((code) => escapeClass(String.fromCharCode(code))).join("");
  const special = new RegExp(`[;()\\-/${opens}${lexical.dollarQuotes ? "$" : ""}${lexical.hashComments ? "#" : ""}]`, "g");
  const rules = {
    special,
    closeOf,
    closer,
    hash: lexical.hashComments,
    dollar: lexical.dollarQuotes,
    escapePrefix: lexical.escapeStringPrefix,
  };
  compiled.set(lexical, rules);
  return rules;
}

// Lo mismo que /\s/ (espacios de Unicode incluidos), sin regex por caracter.
function isSpace(code: number): boolean {
  if (code <= 32) return code === 32 || (code >= 9 && code <= 13);
  if (code < 160) return false;
  return (
    code === 160 ||
    code === 0x1680 ||
    (code >= 0x2000 && code <= 0x200a) ||
    code === 0x2028 ||
    code === 0x2029 ||
    code === 0x202f ||
    code === 0x205f ||
    code === 0x3000 ||
    code === 0xfeff
  );
}

export function initialScanState(): ScanState {
  return { mode: CODE, quote: 0, tag: "", escaping: false, codeStart: -1, lastNonSpace: -1, depth: 0 };
}

// El salto de linea que abre una linea en blanco (con espacios o no, y con
// \r\n) dentro de text[from, to), o -1. Solo mira ese tramo.
function blankLineIn(text: string, from: number, to: number): number {
  for (let newline = text.indexOf("\n", from); newline !== -1 && newline < to; newline = text.indexOf("\n", newline + 1)) {
    let next = newline + 1;
    while (next < text.length && next < to) {
      const code = text.charCodeAt(next);
      if (code === 10) return newline;
      if (code !== 32 && (code < 9 || code > 13)) break;
      next += 1;
    }
  }
  return -1;
}

// Ultimo caracter que no es espacio en text[from, to), absoluto; o `fallback`.
function trimmedEnd(text: string, from: number, to: number, base: number, fallback: number): number {
  let end = to;
  while (end > from && isSpace(text.charCodeAt(end - 1))) end -= 1;
  return end > from ? base + end : fallback;
}

// Escanea `text` (que empieza en `base` del documento) desde `state` hasta
// `limit`; un token empezado antes del limite se lee hasta su fin si cabe
// en `text`. Agrega a `out` las sentencias completas y devuelve donde seguir
// (relativo a `text`). Con `final`, `text` llega al fin del documento y la
// sentencia en curso se cierra ahi.
export function scanChunk(
  text: string,
  base: number,
  limit: number,
  final: boolean,
  state: ScanState,
  out: ScannedStatement[],
  lexical: SqlLexical,
  // Donde empezar dentro de `text`: lo anterior es contexto (la "E" de un
  // E'...' que quedo al final del trozo previo).
  start = 0,
): number {
  const rules = rulesFor(lexical);
  const SPECIAL = rules.special;
  const length = text.length;
  // En variables locales: leer y escribir `state` en cada caracter es lo
  // que mas cuesta en un documento de 30 MB.
  let { mode, codeStart, lastNonSpace, depth } = state;
  let index = start;

  scan: while (index < limit) {
    switch (mode) {
      case LINE_COMMENT: {
        const end = text.indexOf("\n", index);
        const stop = end === -1 ? length : end;
        lastNonSpace = trimmedEnd(text, index, stop, base, lastNonSpace);
        index = stop;
        if (end === -1) break scan;
        mode = CODE;
        continue;
      }
      case BLOCK_COMMENT: {
        const end = text.indexOf("*/", index);
        if (end === -1) {
          lastNonSpace = trimmedEnd(text, index, length, base, lastNonSpace);
          // El "*" del final puede cerrar con el "/" del trozo siguiente.
          index = final ? length : Math.max(index, length - 1);
          break scan;
        }
        index = end + 2;
        lastNonSpace = base + index;
        mode = CODE;
        continue;
      }
      case DOLLAR_QUOTED: {
        const end = text.indexOf(state.tag, index);
        if (end === -1) {
          lastNonSpace = trimmedEnd(text, index, length, base, lastNonSpace);
          index = final ? length : Math.max(index, length - state.tag.length + 1);
          break scan;
        }
        index = end + state.tag.length;
        lastNonSpace = base + index;
        mode = CODE;
        continue;
      }
      case QUOTED: {
        const quote = state.quote;
        // La comilla que cierra (y en '...' la barra invertida, si escapa).
        const pattern = state.escaping ? ESCAPED_SINGLE : rules.closer.get(quote)!;
        for (;;) {
          if (index >= length) break scan;
          pattern.lastIndex = index;
          const at = pattern.exec(text)?.index ?? -1;
          if (at === -1) {
            lastNonSpace = trimmedEnd(text, index, length, base, lastNonSpace);
            index = length;
            break scan;
          }
          if (text.charCodeAt(at) === BACKSLASH) {
            index = at + 2;
            lastNonSpace = base + Math.min(index, length);
            continue;
          }
          // Comilla doble ('it''s'): hay que ver la siguiente.
          if (at + 1 >= length && !final) {
            lastNonSpace = trimmedEnd(text, index, at, base, lastNonSpace);
            index = at;
            break scan;
          }
          if (text.charCodeAt(at + 1) === quote) {
            index = at + 2;
            lastNonSpace = base + index;
            continue;
          }
          index = at + 1;
          lastNonSpace = base + index;
          mode = CODE;
          state.escaping = false;
          continue scan;
        }
      }
    }

    // Codigo: se salta con una regex (nativa, mucho mas rapida que ir
    // caracter por caracter) hasta el proximo que abre o cierra algo; del
    // tramo intermedio solo importan su primer y su ultimo caracter que no
    // son espacio.
    while (index < limit) {
      SPECIAL.lastIndex = index;
      const found = SPECIAL.exec(text);
      const at = found === null || found.index >= limit ? limit : found.index;
      while (at > index) {
        // Una linea en blanco en el tramo parte en dos lo que hay a cada lado.
        const blank = depth === 0 ? blankLineIn(text, index, at) : -1;
        const cut = blank === -1 ? at : blank;
        if (codeStart < 0) {
          let first = index;
          while (first < cut && isSpace(text.charCodeAt(first))) first += 1;
          if (first < cut) codeStart = base + first;
        }
        lastNonSpace = trimmedEnd(text, index, cut, base, lastNonSpace);
        index = cut;
        if (cut === at) break;
        const last = lastNonSpace - base - 1;
        const continues = last >= 0 && CONTINUES.has(text.charCodeAt(last));
        if (codeStart >= 0 && depth === 0 && !continues) {
          out.push({ from: codeStart, to: lastNonSpace, terminated: false });
          codeStart = -1;
          lastNonSpace = -1;
        }
        index = cut + 1;
      }
      if (index >= limit) break;

      const code = text.charCodeAt(index);
      if (code === SEMICOLON) {
        if (codeStart >= 0) out.push({ from: codeStart, to: base + index + 1, terminated: true });
        codeStart = -1;
        lastNonSpace = -1;
        depth = 0;
        index += 1;
        continue;
      }
      if (code === OPEN_PAREN || code === CLOSE_PAREN) {
        depth = code === OPEN_PAREN ? depth + 1 : Math.max(0, depth - 1);
        if (codeStart < 0) codeStart = base + index;
        lastNonSpace = base + index + 1;
        index += 1;
        continue;
      }
      if (code === DASH && text.charCodeAt(index + 1) === DASH) {
        mode = LINE_COMMENT;
        index += 2;
        continue scan;
      }
      if (code === SLASH && text.charCodeAt(index + 1) === STAR) {
        mode = BLOCK_COMMENT;
        index += 2;
        continue scan;
      }
      if (code === HASH && rules.hash) {
        mode = LINE_COMMENT;
        index += 1;
        continue scan;
      }
      const close = rules.closeOf.get(code);
      if (close !== undefined) {
        if (codeStart < 0) codeStart = base + index;
        mode = QUOTED;
        state.quote = close;
        state.escaping = rules.escapePrefix && code === SINGLE_QUOTE && opensEscapeString(text, index);
        index += 1;
        lastNonSpace = base + index;
        continue scan;
      }
      if (code === DOLLAR && rules.dollar) {
        DOLLAR_TAG.lastIndex = index;
        const tag = DOLLAR_TAG.exec(text)?.[0];
        if (tag) {
          if (codeStart < 0) codeStart = base + index;
          mode = DOLLAR_QUOTED;
          state.tag = tag;
          index += tag.length;
          lastNonSpace = base + index;
          continue scan;
        }
      }
      // Un "-", "/" o "$" sueltos: codigo comun.
      if (codeStart < 0) codeStart = base + index;
      lastNonSpace = base + index + 1;
      index += 1;
    }
  }

  if (final) {
    if (codeStart >= 0) out.push({ from: codeStart, to: lastNonSpace, terminated: false });
    state.mode = mode;
    state.codeStart = -1;
    state.lastNonSpace = -1;
    state.depth = 0;
    return length;
  }
  state.mode = mode;
  state.codeStart = codeStart;
  state.lastNonSpace = lastNonSpace;
  state.depth = depth;
  return index;
}

// Las sentencias de `text` con las reglas de un motor (`lexical`, de su
// perfil).
export function splitStatements(text: string, lexical: SqlLexical): StatementRange[] {
  const out: ScannedStatement[] = [];
  scanChunk(text, 0, text.length, true, initialScanState(), out, lexical);
  return out.map(({ from, to }) => ({ from, to }));
}

function lineOf(text: string, offset: number): number {
  let line = 0;
  let index = text.indexOf("\n");
  while (index !== -1 && index < offset) {
    line += 1;
    index = text.indexOf("\n", index + 1);
  }
  return line;
}

// La sentencia a ejecutar para el cursor en `offset`:
// - la que contiene el cursor (incluido justo despues de su ";");
// - si el cursor esta entre sentencias: la que empieza en su misma linea
//   (cursor al inicio de la linea), si no la que termina en su misma linea
//   (cursor despues del ";"), si no la mas cercana en lineas (a igual
//   distancia, la anterior);
// - null si no hay ninguna.
//
// `ranges` en orden; basta con las vecinas del cursor. `lineAt` da el numero
// de linea de una posicion.
export function chooseStatement<T extends StatementRange>(
  ranges: readonly T[],
  offset: number,
  lineAt: (pos: number) => number,
): T | null {
  const inside = ranges.find((range) => offset >= range.from && offset <= range.to);
  if (inside) return inside;

  const after = ranges.find((range) => range.from > offset);
  const before = ranges.findLast((range) => range.to < offset);
  if (!after && !before) return null;

  const cursorLine = lineAt(offset);
  if (after && lineAt(after.from) === cursorLine) return after;
  if (before && lineAt(before.to) === cursorLine) return before;
  if (!after) return before ?? null;
  if (!before) return after;
  const distanceAfter = lineAt(after.from) - cursorLine;
  const distanceBefore = cursorLine - lineAt(before.to);
  return distanceAfter < distanceBefore ? after : before;
}

export function statementAt(text: string, offset: number, lexical: SqlLexical): StatementRange | null {
  return chooseStatement(splitStatements(text, lexical), offset, (pos) => lineOf(text, pos));
}
