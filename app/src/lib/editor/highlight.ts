import { escapeHtml } from "$lib/results/jsonHighlight";

// Resaltado de SQL liviano para vistas de solo lectura (p.ej. la vista
// previa de cambios): una pasada de regex a HTML escapado. Montar un
// CodeMirror entero para mostrar unas lineas fijas costaba mas que todo el
// resto del modal; esto es instantaneo. Colores: variables --syntax-* del
// tema (theme.ts).

const KEYWORDS = new Set(
  (
    "select from where and or not null is in as on join left right inner outer full cross " +
    "insert into values update set delete default returning order by group having limit " +
    "offset distinct union all case when then else end true false like between exists " +
    "create alter drop table index view primary key foreign references begin commit rollback"
  ).split(" "),
);

// 1: comentario, 2: string, 3: identificador citado, 4: numero, 5: palabra.
const TOKEN =
  /(--[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^'\\]|\\.|'')*')|(`[^`]*`|"[^"]*")|\b(\d+(?:\.\d+)?)\b|([A-Za-z_][A-Za-z0-9_]*)/g;

export function highlightSql(sql: string): string {
  const parts: string[] = [];
  let last = 0;
  TOKEN.lastIndex = 0;
  for (let match = TOKEN.exec(sql); match !== null; match = TOKEN.exec(sql)) {
    if (match.index > last) parts.push(escapeHtml(sql.slice(last, match.index)));
    const [whole, comment, string, quoted, number, word] = match;
    if (comment !== undefined) parts.push(`<span class="s-com">${escapeHtml(comment)}</span>`);
    else if (string !== undefined) parts.push(`<span class="s-str">${escapeHtml(string)}</span>`);
    else if (quoted !== undefined) parts.push(escapeHtml(quoted));
    else if (number !== undefined) parts.push(`<span class="s-num">${number}</span>`);
    else if (word !== undefined && KEYWORDS.has(word.toLowerCase())) parts.push(`<span class="s-kw">${word}</span>`);
    else parts.push(escapeHtml(whole));
    last = match.index + whole.length;
  }
  if (last < sql.length) parts.push(escapeHtml(sql.slice(last)));
  return parts.join("");
}
