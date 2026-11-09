// Lo que se saca de un archivo para orientarse: sus simbolos con el rango de
// lineas, el comentario con que abre, los comandos IPC que invoca o define y
// las claves de traduccion que usa. Regex y conteo de llaves, sin parsers: es
// una guia para saber que rango leer, no un analisis exacto.

const STRINGS = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g;
const MAX_SPAN = 600;

const TS = [
  [/^\s{0,4}(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*(\w+)/, "fn"],
  [/^\s{0,4}(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/, "class"],
  [/^\s{0,4}(?:export\s+)?(?:interface|type|enum)\s+(\w+)/, "type"],
  [/^\s{0,4}(?:export\s+)?(?:const|let)\s+(\w+)\s*(?::[^=]+)?=/, "const"],
];
const RUST = [
  [/^\s*(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?(?:unsafe\s+)?(?:const\s+)?fn\s+(\w+)/, "fn"],
  [/^\s*(?:pub(?:\([^)]*\))?\s+)?(struct|enum|trait|type|mod)\s+(\w+)/, "type"],
  [/^\s*impl(?:<[^>]*>)?\s+(?:[\w:<>, &']+\s+for\s+)?(\w+)/, "impl"],
  [/^\s*(?:pub(?:\([^)]*\))?\s+)?(?:const|static)\s+(\w+)\s*:/, "const"],
];

export const isTestFile = (path) => /\.test\.[a-z]+$/.test(path) || /(^|\/)(tests|__test-stubs__)\//.test(path);

// Linea (1-based) donde acaba el bloque que abre en `start` (0-based): cuenta
// llaves sin las que van en textos; si no abre ninguna, la sentencia acaba en `;`.
function blockEnd(lines, start) {
  let depth = 0;
  let opened = false;
  const last = Math.min(lines.length, start + MAX_SPAN);
  for (let i = start; i < last; i += 1) {
    const text = lines[i].replace(STRINGS, '""').replace(/\/\/.*$/, "");
    for (const char of text) {
      if (char === "{") {
        depth += 1;
        opened = true;
      } else if (char === "}") depth -= 1;
    }
    if (opened && depth <= 0) return i + 1;
    if (!opened && (i - start >= 8 || /;\s*$/.test(text))) return i + 1;
  }
  return last;
}

function symbolsOf(path, lines) {
  const rust = path.endsWith(".rs");
  const patterns = rust ? RUST : TS;
  const out = [];
  let inside = null; // la funcion que esta abierta: sus locales no son simbolos del archivo
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (rust && /^\s*#\[cfg\(test\)\]/.test(line)) break;
    const indent = line.length - line.trimStart().length;
    if (inside && i + 1 > inside.end) inside = null;
    for (const [pattern, kind] of patterns) {
      const match = pattern.exec(line);
      if (!match) continue;
      if (inside && indent > inside.indent) break;
      const name = match[match.length - 1];
      const symbol = { name, kind, start: i + 1, end: blockEnd(lines, i) };
      out.push(symbol);
      if ((kind === "fn" || kind === "const") && symbol.end > symbol.start) inside = { end: symbol.end, indent };
      break;
    }
  }
  return out;
}

// El comentario con que abre el archivo: lo que su autor dijo que es.
function leadOf(lines) {
  const out = [];
  for (const line of lines.slice(0, 40)) {
    const text = line.trim();
    const comment = /^(?:\/\/[/!]?|\/\*\*?|\*\/?|<!--|#(?!\[|!))\s?(.*?)(?:-->|\*\/)?$/.exec(text);
    if (comment) out.push(comment[1]);
    else if (text && !/^(#!|use |import |<script)/.test(text)) break;
  }
  return out.join(" ").slice(0, 600);
}

// Claves "area.clave" de traduccion que aparecen como texto.
function literalsOf(text) {
  return [...new Set([...text.matchAll(/["'`]([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)+)["'`]/g)].map((match) => match[1]))];
}

// Textos es/en de un archivo de mensajes: `es: { clave: "texto" }`.
export function messagesOf(text) {
  const out = {};
  let lang = null;
  for (const line of text.split("\n")) {
    const open = /^ {2}(es|en): \{/.exec(line);
    if (open) {
      lang = open[1];
      out[lang] = {};
      continue;
    }
    if (/^ {2}\}/.test(line)) lang = null;
    const pair = lang && /^ {4}(?:"([^"]+)"|(\w+)):\s*(?:"((?:\\.|[^"\\])*)"|`([^`]*)`)/.exec(line);
    if (pair) out[lang][pair[1] ?? pair[2]] = pair[3] ?? pair[4];
  }
  return out;
}

export function extractFile(path, text, references, code) {
  const lines = text.split("\n");
  const rec = {
    lines: lines.length,
    symbols: symbolsOf(path, lines),
    lead: leadOf(lines),
    refs: references(path, code(path, text)).filter(([, kind]) => kind === "code").map(([target]) => target).filter((target) => target.includes("/")),
    invokes: [...new Set([...text.matchAll(/\binvoke(?:<[^>]*>)?\(\s*["'](\w+)["']/g)].map((match) => match[1]))],
    commands: [],
    literals: literalsOf(text),
  };
  if (path.endsWith(".rs")) {
    for (let i = 0; i < lines.length; i += 1) {
      if (!/^\s*#\[tauri::command/.test(lines[i])) continue;
      const name = /\bfn\s+(\w+)/.exec(lines.slice(i, i + 6).join("\n"));
      if (name) rec.commands.push(name[1]);
    }
  }
  if (/\/i18n\/messages\/[^/]+\.ts$/.test(path)) rec.messages = messagesOf(text);
  return rec;
}
