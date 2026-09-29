// Retoques sobre lo que devuelve sql-formatter (sqlFormatter.ts), linea por
// linea: un punto medio entre lo muy vertical de sql-formatter y lo muy
// ancho de DataGrip.
//
// - WITH y su primera CTE en una linea, el cuerpo sin la sangria extra y una
//   linea en blanco antes de la consulta principal.
// - El AND/OR extra de un JOIN ... ON, bajo el ON (no como si fuera del WHERE).
// - GROUP BY / ORDER BY / PARTITION BY en una linea si caben.
// - Un parentesis corto que sql-formatter abrio en varias lineas, en una
//   (condiciones, listas de IN, argumentos). Las subconsultas no.
// - IS, NOT, LIKE, REGEXP, NULL... en mayusculas: sql-formatter los trata
//   como operadores en MySQL y los deja como vinieron.
// - Opcional, alineacion en columnas: los AS de cada SELECT, los ON de los
//   JOIN seguidos y los operadores de las condiciones de un WHERE/HAVING,
//   cada cosa en su columna. Nunca pasa del ancho: lo que no cabe queda sin
//   alinear y no ensancha lo demas.
//
// Nada toca lineas con comentarios ni el texto de strings e identificadores
// entre comillas.

export interface LayoutOptions {
  // Ancho hasta donde se juntan lineas o se alinea.
  width: number;
  alignAliases: boolean;
}

const indentOf = (line: string) => line.match(/^\s*/)?.[0].length ?? 0;
const hasComment = (masked: string) => masked.includes("--") || masked.includes("/*");

// La linea con el contenido de strings e identificadores entre comillas
// reemplazado por "x" (mismo largo): para buscar palabras y parentesis sin
// caer adentro de un texto.
export function maskQuoted(line: string): string {
  let out = "";
  let quote: string | null = null;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (quote) {
      if (char === "\\" && quote === "'") {
        out += "xx";
        index += 1;
        continue;
      }
      if (char === quote) {
        if (line[index + 1] === quote) {
          out += "xx";
          index += 1;
          continue;
        }
        quote = null;
        out += char;
        continue;
      }
      out += "x";
      continue;
    }
    if (char === "'" || char === '"' || char === "`") quote = char;
    out += char;
  }
  return out;
}

function withPass(lines: string[]): string[] {
  const out: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim().toUpperCase();
    const next = lines[index + 1];
    if ((trimmed !== "WITH" && trimmed !== "WITH RECURSIVE") || next === undefined) {
      out.push(line);
      continue;
    }
    const base = indentOf(line);
    const shift = indentOf(next) - base;
    if (shift <= 0) {
      out.push(line);
      continue;
    }
    out.push(`${line.trimEnd()} ${next.trim()}`);
    index += 1;
    while (index + 1 < lines.length && (lines[index + 1].trim() === "" || indentOf(lines[index + 1]) > base)) {
      index += 1;
      const current = lines[index];
      out.push(current.trim() === "" ? current : " ".repeat(Math.max(base, indentOf(current) - shift)) + current.trim());
    }
    // La consulta principal, separada de las CTE.
    if (index + 1 < lines.length && out[out.length - 1].trim() !== "") out.push("");
  }
  return out;
}

const JOIN_ON = /^\s*(?:(?:LEFT|RIGHT|FULL|INNER|CROSS|NATURAL)\s+)*(?:OUTER\s+)?JOIN\s.*?\sON\s/i;

function joinConditionPass(lines: string[]): string[] {
  const out = [...lines];
  for (let index = 0; index < out.length; index++) {
    const masked = maskQuoted(out[index]);
    const match = JOIN_ON.exec(masked);
    if (!match || hasComment(masked)) continue;
    const indent = indentOf(out[index]);
    const onColumn = match[0].length - 3;
    for (let next = index + 1; next < out.length; next++) {
      const line = out[next];
      if (indentOf(line) !== indent || !/^(?:AND|OR)\s/i.test(line.trim())) break;
      out[next] = " ".repeat(onColumn) + line.trim();
    }
  }
  return out;
}

const LIST_CLAUSE = /^(?:GROUP BY|ORDER BY|PARTITION BY)\s/i;

function listPass(lines: string[], width: number): string[] {
  const out: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const indent = indentOf(line);
    if (!LIST_CLAUSE.test(line.trim()) || !line.trimEnd().endsWith(",")) {
      out.push(line);
      continue;
    }
    let end = index;
    while (end + 1 < lines.length && lines[end + 1].trim() !== "" && indentOf(lines[end + 1]) > indent) end += 1;
    const parts = lines.slice(index, end + 1).map((part) => part.trim());
    const joined = parts.join(" ");
    if (end > index && indent + joined.length <= width && !hasComment(maskQuoted(joined))) {
      out.push(" ".repeat(indent) + joined);
      index = end;
    } else {
      out.push(line);
    }
  }
  return out;
}

const SUBQUERY = /^(?:SELECT|WITH|VALUES|INSERT|UPDATE|DELETE)\b/i;

// Una pasada: junta los parentesis mas internos que quepan.
function parenPassOnce(lines: string[], width: number): { lines: string[]; changed: boolean } {
  const out: string[] = [];
  let changed = false;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const masked = maskQuoted(line);
    if (!masked.trimEnd().endsWith("(") || hasComment(masked)) {
      out.push(line);
      continue;
    }
    const indent = indentOf(line);
    let close = index + 1;
    let simple = true;
    while (close < lines.length && !(indentOf(lines[close]) === indent && lines[close].trim().startsWith(")"))) {
      const inner = maskQuoted(lines[close]);
      if (indentOf(lines[close]) <= indent || inner.trim() === "" || hasComment(inner) || inner.trimEnd().endsWith("(") || SUBQUERY.test(inner.trim())) {
        simple = false;
        break;
      }
      close += 1;
    }
    if (!simple || close >= lines.length || close === index + 1) {
      out.push(line);
      continue;
    }
    const inner = lines.slice(index + 1, close).map((part) => part.trim()).join(" ");
    const joined = `${line.trimEnd()}${inner}${lines[close].trim()}`;
    if (joined.length > width) {
      out.push(line);
      continue;
    }
    out.push(joined);
    index = close;
    changed = true;
  }
  return { lines: out, changed };
}

function parenPass(lines: string[], width: number): string[] {
  let current = lines;
  for (let round = 0; round < 6; round++) {
    const next = parenPassOnce(current, width);
    current = next.lines;
    if (!next.changed) break;
  }
  return current;
}

// El " AS " de mas afuera (fuera de parentesis) de una linea enmascarada.
function topLevelAs(masked: string): number {
  let depth = 0;
  let found = -1;
  for (let index = 0; index < masked.length; index++) {
    const char = masked[index];
    if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if (depth === 0 && (char === " " || char === "\t") && /^\sAS\s/i.test(masked.slice(index, index + 4))) found = index;
  }
  return found;
}

const OUTLIER = 20;

function alignPass(lines: string[], width: number): string[] {
  const out = [...lines];
  for (let index = 0; index < out.length; index++) {
    if (!/^SELECT(?:\s+DISTINCT)?$/i.test(out[index].trim())) continue;
    const itemIndent = out[index + 1] !== undefined ? indentOf(out[index + 1]) : 0;
    if (itemIndent <= indentOf(out[index])) continue;
    // Items de una sola linea: [linea, expresion, resto desde AS].
    const items: { at: number; expr: string; rest: string }[] = [];
    let at = index + 1;
    while (at < out.length && out[at].trim() !== "" && indentOf(out[at]) >= itemIndent) {
      const single = indentOf(out[at]) === itemIndent && (at + 1 >= out.length || indentOf(out[at + 1]) <= itemIndent);
      const masked = maskQuoted(out[at]);
      const split = single && !hasComment(masked) ? topLevelAs(masked) : -1;
      if (split > 0) items.push({ at, expr: out[at].slice(itemIndent, split).trimEnd(), rest: out[at].slice(split + 1) });
      at += 1;
    }
    const fitting = items.filter((item) => itemIndent + item.expr.length + 1 + item.rest.length <= width);
    if (fitting.length < 2) continue;
    // Una expresion mucho mas larga que las demas queda sin alinear: si no,
    // empuja la columna de todas y la consulta se ensancha.
    const lengths = fitting.map((item) => item.expr.length).sort((a, b) => b - a);
    while (lengths.length > 2 && lengths[0] - lengths[1] > OUTLIER) lengths.shift();
    const column = lengths[0];
    for (const item of items) {
      if (item.expr.length > column) continue;
      out[item.at] = " ".repeat(itemIndent) + item.expr.padEnd(column) + " " + item.rest;
    }
    index = at - 1;
  }
  return out;
}

const OPERATOR_WORDS = /\b(is|not|null|like|rlike|regexp|xor|div|escape)\b/gi;

// Solo en el codigo: no en strings ni comentarios, ni un nombre calificado
// (t.like) ni una funcion (like(...)).
function upperOperatorsPass(lines: string[]): string[] {
  return lines.map((line) => {
    const masked = maskQuoted(line);
    const comment = masked.search(/--|\/\*/);
    const end = comment === -1 ? line.length : comment;
    let out = line;
    for (const match of masked.slice(0, end).matchAll(OPERATOR_WORDS)) {
      const at = match.index;
      const before = masked[at - 1] ?? "";
      const after = masked.slice(at + match[0].length).trimStart()[0] ?? "";
      if (before === "." || after === "(" || after === ".") continue;
      out = out.slice(0, at) + match[0].toUpperCase() + out.slice(at + match[0].length);
    }
    return out;
  });
}

// Para la consulta corta que queda en una sola linea.
export function upperOperatorWords(text: string): string {
  return upperOperatorsPass(text.split("\n")).join("\n");
}

// Alinea el corte de cada linea (head | tail) en una columna, sin pasar del
// ancho. La que sobresale mas de `outlier` de las demas queda como esta.
function padTo(lines: string[], rows: { at: number; head: string; tail: string }[], width: number, outlier = OUTLIER) {
  if (rows.length < 2) return;
  const fitting = rows.filter((row) => row.head.length + 1 + row.tail.length <= width);
  if (fitting.length < 2) return;
  const lengths = fitting.map((row) => row.head.length).sort((a, b) => b - a);
  while (lengths.length > 2 && lengths[0] - lengths[1] > outlier) lengths.shift();
  const column = lengths[0];
  for (const row of rows) {
    if (row.head.length > column || column + 1 + row.tail.length > width) continue;
    lines[row.at] = row.head.padEnd(column) + " " + row.tail;
  }
}

// Los ON de JOIN seguidos (mismo bloque FROM), en una columna.
function alignJoinsPass(lines: string[], width: number): string[] {
  const out = [...lines];
  let group: { at: number; head: string; tail: string }[] = [];
  const flush = () => {
    padTo(out, group, width);
    group = [];
  };
  for (let index = 0; index < out.length; index++) {
    const masked = maskQuoted(out[index]);
    const match = hasComment(masked) ? null : JOIN_ON.exec(masked);
    if (!match || (group.length > 0 && indentOf(out[index]) !== indentOf(out[group[0].at]))) {
      // El AND extra de un JOIN (bajo su ON) no corta el grupo.
      if (group.length > 0 && /^(?:AND|OR)\s/i.test(out[index].trim()) && indentOf(out[index]) > indentOf(out[group[0].at])) continue;
      flush();
      if (!match) continue;
    }
    const on = match[0].length - 4;
    group.push({ at: index, head: out[index].slice(0, on).trimEnd(), tail: out[index].slice(on + 1) });
  }
  flush();
  // Los AND extra siguen bajo su ON, que pudo moverse.
  return joinConditionPass(out);
}

// Una condicion simple: columna, operador y lo demas. Nada con parentesis
// abiertos al final (una subconsulta o un grupo que sigue abajo).
const CONDITION = /^(\s*(?:WHERE|HAVING|AND|OR)\s+)(.+?)\s+((?:NOT\s+)?(?:=|<>|!=|<=>|<=|>=|<|>|LIKE|ILIKE|REGEXP|IN|BETWEEN|IS))\s+(.+)$/i;

const CONDITION_OUTLIER = 8;

function alignConditionsPass(lines: string[], width: number): string[] {
  const out = [...lines];
  let group: { at: number; head: string; tail: string }[] = [];
  let groupIndent = -1;
  // En las condiciones los huecos se notan mas: una columna larga
  // ((a - b) > 0) no arrastra a las demas.
  const flush = () => {
    padTo(out, group, width, CONDITION_OUTLIER);
    group = [];
    groupIndent = -1;
  };
  for (let index = 0; index < out.length; index++) {
    const line = out[index];
    const masked = maskQuoted(line);
    const trimmed = line.trim();
    const opens = /^(?:WHERE|HAVING)\s/i.test(trimmed);
    const continues = /^(?:AND|OR)\s/i.test(trimmed) && groupIndent >= 0 && indentOf(line) === groupIndent + 2;
    if (!opens && !continues) {
      if (groupIndent >= 0 && /^(?:AND|OR)\s/i.test(trimmed)) continue;
      flush();
      continue;
    }
    if (opens) {
      flush();
      groupIndent = indentOf(line);
    }
    // En lo enmascarado, para no partir dentro de un string.
    const match = !hasComment(masked) && !masked.trimEnd().endsWith("(") ? CONDITION.exec(masked) : null;
    if (!match || (match[2].split("(").length !== match[2].split(")").length)) continue;
    const headLength = match[1].length + match[2].length;
    group.push({ at: index, head: line.slice(0, headLength), tail: line.slice(headLength).trimStart() });
  }
  flush();
  return out;
}

export function refineLayout(formatted: string, options: LayoutOptions): string {
  let lines = upperOperatorsPass(formatted.split("\n"));
  lines = withPass(lines);
  lines = joinConditionPass(lines);
  lines = listPass(lines, options.width);
  lines = parenPass(lines, options.width);
  if (options.alignAliases) {
    lines = alignPass(lines, options.width);
    lines = alignJoinsPass(lines, options.width);
    lines = alignConditionsPass(lines, options.width);
  }
  return lines.join("\n");
}
