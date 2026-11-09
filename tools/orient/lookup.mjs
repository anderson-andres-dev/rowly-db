// Dos busquedas exactas que la tarjeta no da: donde vive un texto de la interfaz y el mapa de
// comandos IPC. Salen del indice que orient ya construye (textos es/en por clave, claves usadas
// por cada archivo, comandos de Rust e `invoke` del frontend); solo se lee, al consultar, el
// archivo de mensajes (para dar la linea) y `lib.rs` / `backend.test.ts` (registro y dueno).
//
// Las usan la CLI (`--text`, `--ipc`), el servidor MCP (`ui_text`, `ipc`) y `start` (hints).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const norm = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const MESSAGES = /\/i18n\/messages\/[^/]+\.ts$/;
const LIB = "app/src-tauri/src/lib.rs";
const OWNERS_FILE = "app/src/lib/backend.test.ts";
const rel = (path) => path.replace(/^app\/src\//, "");

// Linea (1-based) de una clave dentro del bloque `es` o `en` de un archivo de mensajes.
function lineOf(text, key, lang) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^ {2}${lang}: \\{`).test(line));
  if (start < 0) return null;
  const quoted = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const at = lines.findIndex((line, i) => i > start && new RegExp(`^ {4}(?:"${quoted}"|${quoted}):`).test(line));
  return at < 0 ? null : at + 1;
}

// Lo que el usuario ve, buscado por su texto (es o en) o por su clave.
export function findText(orient, root, query, { limit = 6, heading = true } = {}) {
  const q = norm(String(query ?? "").trim());
  if (q.length < 2) throw new Error("`text` necesita al menos 2 caracteres");
  const { files } = orient.prepared.index;
  const users = new Map();
  for (const file of files.values()) {
    if (MESSAGES.test(file.path)) continue;
    for (const literal of file.rec.literals) users.set(literal, [...(users.get(literal) ?? []), file.path]);
  }
  const found = [];
  for (const file of files.values()) {
    const messages = file.rec.messages;
    if (!messages || !MESSAGES.test(file.path)) continue;
    const area = file.path.split("/").pop().replace(/\.ts$/, "");
    for (const key of new Set([...Object.keys(messages.es ?? {}), ...Object.keys(messages.en ?? {})])) {
      const es = messages.es?.[key] ?? "";
      const en = messages.en?.[key] ?? "";
      const full = `${area}.${key}`;
      const texts = [norm(es), norm(en)];
      const score = texts.includes(q) ? 4 : texts.some((text) => text.startsWith(q)) ? 3 : texts.some((text) => text.includes(q)) ? 2 : norm(full).includes(q) ? 1 : 0;
      const exactCase = es === String(query).trim() || en === String(query).trim() ? 0.5 : 0;
      if (score) found.push({ key: full, path: file.path, bare: key, es, en, score: score + exactCase, used: users.get(full) ?? [], size: Math.min(es.length || 1e3, en.length || 1e3) });
    }
  }
  found.sort((a, b) => b.score - a.score || b.used.length - a.used.length || a.size - b.size || a.key.localeCompare(b.key));
  const out = heading ? [`# orient: interface text \`${query}\``, ""] : [];
  if (!found.length) {
    out.push(`No interface text or key contains \`${query}\`. Try a shorter word, the other language (es/en) or the area of the key (e.g. \`guard\`).`);
    return `${out.join("\n")}\n`;
  }
  const sources = new Map();
  const text = (path) => {
    if (!sources.has(path)) sources.set(path, readFileSync(join(root, path), "utf8"));
    return sources.get(path);
  };
  for (const hit of found.slice(0, limit)) {
    const es = lineOf(text(hit.path), hit.bare, "es");
    const en = lineOf(text(hit.path), hit.bare, "en");
    out.push(`- \`${hit.key}\` — es "${hit.es}" · en "${hit.en}"`);
    out.push(`  defined: \`${hit.path}\` (es L${es ?? "?"}, en L${en ?? "?"})`);
    out.push(`  used by: ${hit.used.length ? hit.used.slice(0, 4).map((path) => `\`${path}\``).join(", ") + (hit.used.length > 4 ? ` +${hit.used.length - 4}` : "") : "no file names this key literally (it may be built at runtime)"}`);
  }
  if (found.length > limit) out.push("", `${found.length - limit} more: narrow the text.`);
  out.push("", "Visible text goes through `app/src/lib/i18n/messages/` in Spanish and English with the same keys (`cd app && npm run check`).");
  return `${out.join("\n")}\n`;
}

// Mapa de comandos IPC: archivo de Rust, registro en lib.rs, dueno en el frontend (backend.test.ts)
// y quien los invoca. Marca lo incoherente.
function ipcTable(orient, root) {
  const { files } = orient.prepared.index;
  const read = (path) => {
    try {
      return readFileSync(join(root, path), "utf8");
    } catch {
      return "";
    }
  };
  const libLines = read(LIB).split(/\r?\n/);
  const registered = new Map();
  let handler = false;
  libLines.forEach((line, i) => {
    if (line.includes("generate_handler![")) handler = true;
    else if (handler && /^\s*\]/.test(line)) handler = false;
    const match = handler && /^\s*(?:\w+::)+(\w+),?\s*$/.exec(line);
    if (match) registered.set(match[1], i + 1);
  });
  const ownerLines = read(OWNERS_FILE).split(/\r?\n/);
  const owners = new Map();
  let inside = false;
  ownerLines.forEach((line, i) => {
    if (/^const OWNERS\b/.test(line)) inside = true;
    else if (inside && /^\};/.test(line)) inside = false;
    const match = inside && /^\s+(\w+):\s*"([^"]+)"/.exec(line);
    if (match) owners.set(match[1], { path: `app/src/${match[2]}`, line: i + 1 });
  });
  const invokers = new Map();
  const defined = new Map();
  for (const file of files.values()) {
    for (const name of file.rec.invokes) invokers.set(name, [...(invokers.get(name) ?? []), file.path]);
    for (const name of file.rec.commands) {
      const symbol = file.rec.symbols.find((item) => item.name === name && item.kind === "fn");
      defined.set(name, { path: file.path, line: symbol?.start ?? null });
    }
  }
  const names = [...new Set([...defined.keys(), ...registered.keys(), ...owners.keys()])].sort();
  const rows = names.map((name) => ({ name, rust: defined.get(name) ?? null, lib: registered.get(name) ?? null, owner: owners.get(name) ?? null, calls: (invokers.get(name) ?? []).sort() }));
  const problems = [];
  for (const row of rows) {
    if (row.rust && !row.lib) problems.push(`\`${row.name}\` is defined (${row.rust.path}) but not registered in ${LIB}`);
    if (row.lib && !row.owner) problems.push(`\`${row.name}\` is registered but has no owner in ${OWNERS_FILE}`);
    if (row.owner && !row.rust) problems.push(`\`${row.name}\` has an owner in ${OWNERS_FILE} but no Rust command`);
  }
  return { rows, problems };
}

export function listCommands(orient, root, filter = "", { limit = 8, heading = true } = {}) {
  const { rows, problems } = ipcTable(orient, root);
  const needle = norm(String(filter ?? "").trim());
  const out = heading ? [`# orient: IPC commands${needle ? ` matching \`${filter}\`` : ""}`, ""] : [];
  if (!needle) {
    const byOwner = new Map();
    for (const row of rows) byOwner.set(row.owner?.path ?? "(no owner)", [...(byOwner.get(row.owner?.path ?? "(no owner)") ?? []), row.name]);
    out.push(`${rows.length} commands, one owner module each. Narrow with a command name or a path for the detail.`, "");
    for (const [owner, names] of [...byOwner.entries()].sort((a, b) => a[0].localeCompare(b[0]))) out.push(`- \`${rel(owner)}\`: ${names.join(", ")}`);
  } else {
    const picked = rows.filter((row) => norm(row.name).includes(needle) || norm(row.rust?.path ?? "").includes(needle) || norm(row.owner?.path ?? "").includes(needle) || row.calls.some((path) => norm(path).includes(needle)));
    if (!picked.length) out.push(`No IPC command matches \`${filter}\`. List them all without a filter.`);
    for (const row of picked.slice(0, limit)) {
      out.push(`## ${row.name}`);
      out.push(`- Rust: ${row.rust ? `\`${row.rust.path}${row.rust.line ? `:${row.rust.line}` : ""}\`` : "not found"}`);
      out.push(`- Registered: ${row.lib ? `\`${LIB}:${row.lib}\`` : "NO"}`);
      out.push(`- Owner (${OWNERS_FILE}${row.owner ? `:${row.owner.line}` : ""}): ${row.owner ? `\`${row.owner.path}\`` : "none"}`);
      out.push(`- Invoked by: ${row.calls.length ? row.calls.map((path) => `\`${path}\``).join(", ") : "nobody (not found by `invoke(\"name\")`)"}`, "");
    }
    if (picked.length > limit) out.push(`${picked.length - limit} more: narrow the filter.`);
  }
  const shown = needle ? problems.filter((problem) => norm(problem).includes(needle)) : problems;
  out.push("", shown.length ? `## Inconsistencies\n${shown.map((problem) => `- ${problem}`).join("\n")}` : "Registration and owners are consistent.");
  out.push("", "A new command is registered in `lib.rs` and added with its single owner to `backend.test.ts` (`cd app && npx vitest run src/lib/backend.test.ts`).");
  return `${out.join("\n")}\n`;
}

// Lo que una peticion nombra con precision: textos entre comillas y comandos IPC exactos.
export function hintsOf(request, orient) {
  const quoted = [...request.matchAll(/«([^»]{2,60})»|“([^”]{2,60})”|"([^"\n]{2,60})"/g)].map((match) => (match[1] ?? match[2] ?? match[3]).trim()).filter(Boolean);
  const known = new Set();
  for (const file of orient.prepared.index.files.values()) for (const name of file.rec.commands) known.add(name);
  const commands = [...new Set(request.match(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g) ?? [])].filter((name) => known.has(name));
  return { texts: [...new Set(quoted)].slice(0, 2), commands: commands.slice(0, 2) };
}

// El bloque corto que `start` suma cuando la peticion trae un texto entre comillas o un comando.
export function hintsBlock(orient, root, request) {
  const { texts, commands } = hintsOf(request, orient);
  const parts = [];
  for (const text of texts) {
    const block = findText(orient, root, text, { limit: 3, heading: false }).split("\n").filter((line) => !line.startsWith("Visible text goes"));
    parts.push(`## Interface text \`${text}\`\n${block.join("\n").trim()}`);
  }
  for (const command of commands) parts.push(listCommands(orient, root, command, { limit: 1, heading: false }).split("\n").filter((line) => !line.startsWith("A new command is registered")).join("\n").trim());
  return parts.length ? `${parts.join("\n\n")}\n` : "";
}
