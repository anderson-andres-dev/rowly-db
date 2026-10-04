// Resaltado de JSON para las celdas del grid de resultados. Devuelve HTML
// (ya escapado) listo para concatenar en los strings con que DataGrid arma
// el cuerpo: una sola pasada de regex, sin parsear ni validar el JSON.
//
// Rendimiento: solo se envuelven en <span> las claves, strings, numeros y
// literales; la puntuacion y los espacios quedan como texto (toman el color
// de la celda). Y solo se resaltan los primeros MAX_HIGHLIGHTED_CHARS: una
// celda es una sola linea recortada, lo que sigue casi nunca se ve y no
// vale la pena llenarlo de nodos.

export const MAX_HIGHLIGHTED_CHARS = 2000;

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

// 1: string (y 2: los ":" que la vuelven clave), 3: literal, 4: numero.
const TOKEN = /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

export function highlightJson(text: string): string {
  const head = text.length > MAX_HIGHLIGHTED_CHARS ? text.slice(0, MAX_HIGHLIGHTED_CHARS) : text;
  const parts: string[] = [];
  let last = 0;
  TOKEN.lastIndex = 0;
  for (let match = TOKEN.exec(head); match !== null; match = TOKEN.exec(head)) {
    if (match.index > last) parts.push(escapeHtml(head.slice(last, match.index)));
    const [whole, string, colon, literal, number] = match;
    if (string !== undefined) {
      parts.push(`<span class="${colon ? "j-key" : "j-str"}">${escapeHtml(string)}</span>`);
      if (colon) parts.push(escapeHtml(colon));
    } else if (literal !== undefined) {
      parts.push(`<span class="j-lit">${literal}</span>`);
    } else if (number !== undefined) {
      parts.push(`<span class="j-num">${number}</span>`);
    }
    last = match.index + whole.length;
  }
  if (last < head.length) parts.push(escapeHtml(head.slice(last)));
  if (head.length < text.length) parts.push(escapeHtml(text.slice(head.length)));
  return parts.join("");
}

// Tipos de columna (tal como los reporta el driver) que se muestran como JSON.
export function isJsonColumnType(type: string): boolean {
  const normalized = type.toUpperCase();
  return normalized === "JSON" || normalized === "JSONB";
}

// Tipos de texto donde se busca JSON por contenido: muchas tablas guardan
// JSON en TEXT/VARCHAR, y en MariaDB el tipo JSON es un alias de LONGTEXT.
const TEXT_TYPE = /CHAR|TEXT|STRING|CLOB/i;

const SAMPLE_SIZE = 20;
const MAX_VALIDATED_CHARS = 4000;

function looksLikeJsonDocument(value: string): boolean {
  const text = value.trim();
  const first = text[0];
  const last = text[text.length - 1];
  if (!((first === "{" && last === "}") || (first === "[" && last === "]"))) return false;
  // Los largos solo se chequean por los delimitadores: validar megabytes
  // de texto por una muestra no vale la pena.
  if (text.length > MAX_VALIDATED_CHARS) return true;
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

// Se decide UNA vez por columna, con las primeras SAMPLE_SIZE celdas no
// vacias: si todas son objetos/arreglos JSON validos, la columna entera se
// resalta. Asi una columna de texto libre con algun "{...}" suelto no queda
// a medio pintar, y el costo no crece con la cantidad de filas.
export function detectJsonColumns(
  columns: { type: string }[],
  rows: (string | null)[][],
): boolean[] {
  return columns.map((column, index) => {
    if (isJsonColumnType(column.type)) return true;
    if (!TEXT_TYPE.test(column.type)) return false;
    let sampled = 0;
    for (const row of rows) {
      const value = row[index];
      if (value === null || value === undefined || value === "") continue;
      if (!looksLikeJsonDocument(value)) return false;
      if (++sampled >= SAMPLE_SIZE) break;
    }
    return sampled > 0;
  });
}
