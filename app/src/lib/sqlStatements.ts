// Division del texto del editor en sentencias y eleccion de la que "esta
// bajo el cursor" para ejecutar. No depende del arbol sintactico de
// CodeMirror (se parsea por partes y en los huecos entre sentencias no
// devuelve ninguna); nunca cae al documento entero.
//
// Se corta en cada ";" que no este dentro de comillas ('...', "...",
// `...`), de un comentario (-- ..., /* ... */) ni de un bloque $tag$ de
// PostgreSQL. Un tramo que solo tiene espacios o comentarios no es una
// sentencia.

export interface StatementRange {
  from: number;
  to: number;
}

export function splitStatements(text: string): StatementRange[] {
  const ranges: StatementRange[] = [];
  let start = 0;
  let index = 0;
  let hasCode = false;
  let codeStart = -1;

  const push = (end: number) => {
    if (hasCode) ranges.push({ from: codeStart, to: end });
    hasCode = false;
    codeStart = -1;
  };
  const markCode = (at: number) => {
    if (!hasCode) {
      hasCode = true;
      codeStart = at;
    }
  };

  while (index < text.length) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "-" && next === "-") {
      const end = text.indexOf("\n", index);
      index = end === -1 ? text.length : end;
      continue;
    }
    if (char === "/" && next === "*") {
      const end = text.indexOf("*/", index + 2);
      index = end === -1 ? text.length : end + 2;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      markCode(index);
      index += 1;
      while (index < text.length) {
        if (text[index] === "\\" && char === "'") {
          index += 2;
          continue;
        }
        if (text[index] === char) {
          if (text[index + 1] === char) {
            index += 2;
            continue;
          }
          break;
        }
        index += 1;
      }
      index += 1;
      continue;
    }
    if (char === "$") {
      const tag = text.slice(index).match(/^\$[A-Za-z_]*\$/)?.[0];
      if (tag) {
        markCode(index);
        const end = text.indexOf(tag, index + tag.length);
        index = end === -1 ? text.length : end + tag.length;
        continue;
      }
    }
    if (char === ";") {
      if (hasCode) push(index + 1);
      start = index + 1;
      index += 1;
      continue;
    }
    if (!/\s/.test(char)) markCode(index);
    index += 1;
  }
  push(lastCodeEnd(text, start));
  return ranges;
}

// Fin del ultimo tramo sin ";" final: hasta el ultimo caracter que no es
// espacio.
function lastCodeEnd(text: string, from: number): number {
  let end = text.length;
  while (end > from && /\s/.test(text[end - 1])) end -= 1;
  return end;
}

function lineOf(text: string, offset: number): number {
  let line = 0;
  for (let index = 0; index < offset && index < text.length; index += 1) {
    if (text[index] === "\n") line += 1;
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
export function statementAt(text: string, offset: number): StatementRange | null {
  const ranges = splitStatements(text);
  if (ranges.length === 0) return null;

  const inside = ranges.find((range) => offset >= range.from && offset <= range.to);
  if (inside) return inside;

  const cursorLine = lineOf(text, offset);
  const after = ranges.find((range) => range.from > offset);
  const before = [...ranges].reverse().find((range) => range.to < offset);

  if (after && lineOf(text, after.from) === cursorLine) return after;
  if (before && lineOf(text, before.to) === cursorLine) return before;
  if (!after) return before ?? null;
  if (!before) return after;
  const distanceAfter = lineOf(text, after.from) - cursorLine;
  const distanceBefore = cursorLine - lineOf(text, before.to);
  return distanceAfter < distanceBefore ? after : before;
}
