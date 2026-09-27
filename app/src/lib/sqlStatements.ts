// Division del texto del editor en sentencias y eleccion de la que "esta
// bajo el cursor" para ejecutar. No depende del arbol sintactico de
// CodeMirror (se parsea por partes y en los huecos entre sentencias no
// devuelve ninguna); nunca cae al documento entero.
//
// Se corta en cada ";" que no este dentro de comillas ('...', "...",
// `...`), de un comentario (-- ..., /* ... */) ni de un bloque $tag$ de
// PostgreSQL. Un tramo que solo tiene espacios o comentarios no es una
// sentencia.
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
  // atras (sqlStatementIndex.ts).
  terminated: boolean;
}

// Donde quedo el escaner al cortar un trozo: el documento se escanea por
// partes (sqlStatementIndex.ts) y cada una sigue donde la anterior quedo.
export interface ScanState {
  mode: number;
  // La comilla abierta (codigo de caracter) o el $tag$ abierto.
  quote: number;
  tag: string;
  // Inicio de la sentencia en curso (absoluto); -1 sin codigo todavia.
  codeStart: number;
  // Fin del ultimo caracter que no es espacio desde el ultimo ";" (absoluto):
  // el fin de una sentencia sin ";" final.
  lastNonSpace: number;
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
const DOUBLE_QUOTE = 34;
const BACKTICK = 96;
const BACKSLASH = 92;
const DOLLAR = 36;

// Cuanto puede mirar el escaner mas alla del corte de un trozo: "--", "/*",
// "''" y los $tag$ se leen enteros aunque crucen el corte.
export const SCAN_OVERLAP = 64;

const DOLLAR_TAG = /\$[A-Za-z_]*\$/y;
// Lo que puede abrir o cerrar algo en codigo.
const SPECIAL = /[;\-\/'"`$]/g;
const QUOTE_OR_ESCAPE = /['\\]/g;
const DOUBLE = /"/g;
const BACKTICKS = /`/g;

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
  return { mode: CODE, quote: 0, tag: "", codeStart: -1, lastNonSpace: -1 };
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
): number {
  const length = text.length;
  // En variables locales: leer y escribir `state` en cada caracter es lo
  // que mas cuesta en un documento de 30 MB.
  let { mode, codeStart, lastNonSpace } = state;
  let index = 0;

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
        // En '...' tambien cuenta la barra invertida (escape de MySQL).
        const pattern = quote === SINGLE_QUOTE ? QUOTE_OR_ESCAPE : quote === DOUBLE_QUOTE ? DOUBLE : BACKTICKS;
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
      if (at > index) {
        if (codeStart < 0) {
          let first = index;
          while (first < at && isSpace(text.charCodeAt(first))) first += 1;
          if (first < at) codeStart = base + first;
        }
        lastNonSpace = trimmedEnd(text, index, at, base, lastNonSpace);
        index = at;
      }
      if (index >= limit) break;

      const code = text.charCodeAt(index);
      if (code === SEMICOLON) {
        if (codeStart >= 0) out.push({ from: codeStart, to: base + index + 1, terminated: true });
        codeStart = -1;
        lastNonSpace = -1;
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
      if (code === SINGLE_QUOTE || code === DOUBLE_QUOTE || code === BACKTICK) {
        if (codeStart < 0) codeStart = base + index;
        mode = QUOTED;
        state.quote = code;
        index += 1;
        lastNonSpace = base + index;
        continue scan;
      }
      if (code === DOLLAR) {
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
    return length;
  }
  state.mode = mode;
  state.codeStart = codeStart;
  state.lastNonSpace = lastNonSpace;
  return index;
}

export function splitStatements(text: string): StatementRange[] {
  const out: ScannedStatement[] = [];
  scanChunk(text, 0, text.length, true, initialScanState(), out);
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

export function statementAt(text: string, offset: number): StatementRange | null {
  return chooseStatement(splitStatements(text), offset, (pos) => lineOf(text, pos));
}
