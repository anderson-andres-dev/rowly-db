// Formato para las vistas previas de SQL generado (INSERT / UPDATE / DELETE
// de "Aplicar cambios"): ni una sola linea kilometrica ni un valor por linea.
// Se corta solo antes de VALUES, SET y WHERE, y una lista que no entra en el
// ancho se ajusta en las comas con sangria colgante:
//
//   INSERT INTO core.tabla (run_token, nombre, estado, nota)
//   VALUES ('sdd-1', 'sdd-test', 'activo', 'actualizada-por-call',
//           '2026-08-12 16:18:09', '2026-08-12 16:18:09');
//
// Respeta literales e identificadores entre comillas: nada de lo que hay
// dentro se corta ni se toca.

const CLAUSE_BREAKS = ["VALUES", "SET", "WHERE"];

interface Scanned {
  // Para cada caracter: true si esta fuera de comillas.
  code: boolean[];
  // Profundidad de parentesis en cada caracter (fuera de comillas).
  depth: number[];
}

function scan(sql: string): Scanned {
  const code: boolean[] = [];
  const depth: number[] = [];
  let quote: string | null = null;
  let level = 0;
  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    if (quote) {
      code.push(false);
      depth.push(level);
      if (char === quote) {
        if (sql[index + 1] === quote) {
          code.push(false);
          depth.push(level);
          index += 1;
        } else if (sql[index - 1] !== "\\") {
          quote = null;
        }
      }
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      code.push(false);
      depth.push(level);
      continue;
    }
    if (char === "(") level += 1;
    code.push(true);
    depth.push(level);
    if (char === ")") level = Math.max(0, level - 1);
  }
  return { code, depth };
}

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z0-9_$]/.test(char);
}

// Parte la sentencia antes de cada VALUES / SET / WHERE de primer nivel.
function splitClauses(sql: string): string[] {
  const { code, depth } = scan(sql);
  const cuts: number[] = [];
  for (let index = 1; index < sql.length; index += 1) {
    if (!code[index] || depth[index] !== 0 || isWordChar(sql[index - 1])) continue;
    const keyword = CLAUSE_BREAKS.find((word) => {
      const candidate = sql.slice(index, index + word.length);
      return candidate.toUpperCase() === word && !isWordChar(sql[index + word.length]);
    });
    if (keyword) cuts.push(index);
  }
  const parts: string[] = [];
  let start = 0;
  for (const cut of cuts) {
    parts.push(sql.slice(start, cut).trim());
    start = cut;
  }
  parts.push(sql.slice(start).trim());
  return parts.filter(Boolean);
}

// Ajusta una linea larga en las comas (fuera de comillas y de parentesis
// anidados). Las continuaciones se alinean tras el primer "(" de la linea o,
// si no hay, tras la primera palabra (SET, WHERE...).
function wrap(line: string, width: number): string[] {
  if (line.length <= width) return [line];
  const { code, depth } = scan(line);
  const firstParen = line.indexOf("(");
  const listDepth = firstParen >= 0 && code[firstParen] ? 1 : 0;
  const indentSize = firstParen >= 0 && code[firstParen] ? firstParen + 1 : line.indexOf(" ") + 1;
  const indent = " ".repeat(Math.max(0, Math.min(indentSize, Math.floor(width / 2))));

  const pieces: string[] = [];
  let start = 0;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === "," && code[index] && depth[index] === listDepth) {
      pieces.push(line.slice(start, index + 1));
      start = index + 1;
    }
  }
  pieces.push(line.slice(start));

  const lines: string[] = [];
  let current = "";
  for (const raw of pieces) {
    const piece = current === "" ? raw : raw.trimStart();
    const joiner = current === "" || current.endsWith("(") ? "" : " ";
    if (current !== "" && current.length + joiner.length + piece.length > width) {
      lines.push(current);
      current = indent + piece;
    } else {
      current += joiner + piece;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Junta todo el espacio (saltos incluidos) fuera de comillas en un solo
// espacio: el formato parte de una sentencia en una linea.
function collapseWhitespace(sql: string): string {
  const { code } = scan(sql);
  let result = "";
  let pendingSpace = false;
  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    if (code[index] && /\s/.test(char)) {
      pendingSpace = result.length > 0;
      continue;
    }
    if (pendingSpace) result += " ";
    pendingSpace = false;
    result += char;
  }
  return result;
}

export function formatPreviewSql(sql: string, width = 100): string {
  const compact = collapseWhitespace(sql.trim());
  if (!compact) return sql;
  return splitClauses(compact)
    .flatMap((clause) => wrap(clause, width))
    .join("\n");
}
