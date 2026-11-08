// El indice del repositorio para orientarse: por archivo sus simbolos, sus
// dependencias, los textos de interfaz que usa y a que funcionalidad
// pertenece. Se arma desde lo versionado y se guarda en .orient/ (ignorado por
// git); al volver a armarlo solo se lee de nuevo lo que cambio (tamano o fecha).
//
//   node tools/orient/index.mjs            arma o actualiza el indice y dice que reuso
//   node tools/orient/index.mjs --rebuild  lo arma desde cero
//   node tools/orient/index.mjs --quiet    sin salida (para los hooks de tools/orient/hooks.mjs)
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { code, createDomainOf, createReferences } from "../architecture/deps.mjs";
import { covers, slug } from "./features.mjs";
import { extractFile, isTestFile } from "./extract.mjs";
import { tokens, words } from "./text.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CACHE_VERSION = 1;
const CODE = /\.(ts|svelte|rs|mjs|js)$/;
const DOCS = ["docs/ARCHITECTURE.md", "SQL_ENGINE.md", "ENGINE_GUIDE.md", "CONTRIBUTING.md"];
const EXTENSIONS = ["", ".ts", ".svelte", ".js", ".mjs", "/index.ts", "/index.js", "/mod.rs"];

// Encabezados con su rango de lineas: lo que se puede citar como `ruta#ancla Lx-Ly`.
export function headings(file, text) {
  const lines = text.split("\n");
  const found = [];
  let fence = false;
  lines.forEach((line, i) => {
    if (/^```/.test(line)) fence = !fence;
    const match = !fence && /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (match) found.push({ file, level: match[1].length, heading: match[2].replace(/`/g, ""), anchor: slug(match[2]), start: i + 1 });
  });
  return found.map((item, n) => {
    const next = found.slice(n + 1).find((other) => other.level <= item.level);
    return { ...item, end: next ? next.start - 1 : lines.length };
  });
}

// Lo que decide si lo guardado sirve: la version del formato y el codigo que extrae. Si
// cambia el extractor (o las referencias que comparte con graph.mjs), el cache se descarta
// solo; nadie tiene que acordarse de subir una constante.
export function extractorSignature(root = ROOT) {
  const hash = createHash("sha256");
  for (const file of ["tools/orient/extract.mjs", "tools/architecture/deps.mjs"]) hash.update(readFileSync(join(root, file)));
  return `${CACHE_VERSION}:${hash.digest("hex").slice(0, 16)}`;
}

// `fs`: { read(path), stat(path) -> {size, mtimeMs} }. `cache`: lo guardado la vez anterior,
// valido solo si su `signature` es la actual.
export function buildIndex({ tracked, model, inventory, fs, cache, signature = String(CACHE_VERSION) }) {
  const references = createReferences(model);
  const domainOf = createDomainOf(model);
  const entries = model.features.items.flatMap((feature) => feature.entry.map((entry) => ({ feature: feature.id, entry })));
  const featuresOf = (path) => [...new Set(entries.filter(({ entry }) => covers(entry, path)).map(({ feature }) => feature))];

  const stats = { files: 0, reused: 0, parsed: 0, removed: 0 };
  const previous = cache?.signature === signature ? cache.files : {};
  const next = {};
  const files = new Map();
  for (const path of tracked) {
    if (!CODE.test(path) || isTestFile(path)) continue;
    const owners = featuresOf(path);
    if (owners.length === 0) continue;
    const { size, mtimeMs } = fs.stat(path);
    const old = previous[path];
    let rec;
    if (old && old.size === size && old.mtimeMs === mtimeMs) {
      rec = old.rec;
      stats.reused += 1;
    } else {
      rec = extractFile(path, fs.read(path), references, code);
      stats.parsed += 1;
    }
    next[path] = { size, mtimeMs, rec };
    files.set(path, { path, rec, domain: domainOf(path), features: owners, deps: [], rdeps: [], calls: [], callers: [], ui: "" });
  }
  stats.files = files.size;
  stats.removed = Object.keys(previous).filter((path) => !(path in next)).length;

  // Dependencias entre archivos: imports resueltos y comandos IPC invocados.
  const trackedSet = new Set(tracked);
  const resolve = (target) => EXTENSIONS.map((ext) => `${target}${ext}`).find((candidate) => trackedSet.has(candidate) && files.has(candidate));
  const commandOwner = new Map();
  for (const file of files.values()) for (const name of file.rec.commands) commandOwner.set(name, file.path);
  const link = (from, to, kind) => {
    if (!to || to === from.path) return;
    const target = files.get(to);
    const list = kind === "ipc" ? from.calls : from.deps;
    if (list.includes(to)) return;
    list.push(to);
    (kind === "ipc" ? target.callers : target.rdeps).push(from.path);
  };
  for (const file of files.values()) {
    for (const ref of file.rec.refs) link(file, resolve(ref), "import");
    for (const name of file.rec.invokes) link(file, commandOwner.get(name), "ipc");
  }

  // Textos de interfaz: lo que el usuario lee en cada archivo, en es y en.
  const keys = new Map();
  for (const file of files.values()) {
    const messages = file.rec.messages;
    if (!messages) continue;
    const area = file.path.split("/").pop().replace(/\.ts$/, "");
    for (const key of Object.keys(messages.es ?? {})) keys.set(`${area}.${key}`, `${messages.es[key]} ${messages.en?.[key] ?? ""}`);
  }
  for (const file of files.values()) {
    if (file.rec.messages) continue;
    file.ui = file.rec.literals.filter((key) => keys.has(key)).map((key) => keys.get(key)).join(" ");
  }

  // Paquete de Cargo de cada carpeta con Cargo.toml: para `cargo test -p <paquete>`.
  const packages = new Map(
    tracked
      .filter((path) => path.endsWith("/Cargo.toml"))
      .map((path) => [path.slice(0, -"Cargo.toml".length), /^name\s*=\s*"([^"]+)"/m.exec(fs.read(path))?.[1]])
      .filter(([, name]) => name),
  );
  const docs = DOCS.filter((path) => trackedSet.has(path)).flatMap((path) => headings(path, fs.read(path)));
  const testFiles = tracked.filter(isTestFile);
  const indegree = (path) => files.get(path).rdeps.length + files.get(path).callers.length;
  return {
    index: { files, keys, docs, packages, tests: testFiles, model, inventory, domainOf, indegree, featureById: new Map(model.features.items.map((f) => [f.id, f])) },
    cache: { signature, files: next },
    stats,
  };
}

// La parte de cada archivo que se busca: ruta, simbolos, textos de interfaz y comentario de apertura.
export function fieldsOf(file) {
  return {
    path: words(file.path).map((word) => tokens(word)[0]).filter(Boolean),
    name: tokens(file.path.split("/").pop().replace(/\.[a-z]+$/, "")),
    symbols: file.rec.symbols.flatMap((symbol) => tokens(symbol.name)),
    ui: tokens(file.ui),
    lead: tokens(file.rec.lead),
  };
}

// Archivos del repositorio: los versionados y los nuevos que git no ignora, para que un
// archivo recien creado por una tarea ya cuente aunque todavia no se haya agregado.
function listFiles(root) {
  const out = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return [...new Set(out.split("\n").filter(Boolean))].sort().filter((path) => existsSync(join(root, path)));
}

export function loadIndex({ root = ROOT, useCache = true, rebuild = false } = {}) {
  const read = (path) => readFileSync(join(root, path), "utf8");
  const model = JSON.parse(read("tools/architecture/model.json"));
  const inventory = JSON.parse(read("tests/inventory.json"));
  const tracked = listFiles(root);
  const signature = extractorSignature(root);
  const cachePath = join(root, ".orient/files.json");
  let cache = null;
  if (useCache && !rebuild && existsSync(cachePath)) {
    try {
      cache = JSON.parse(readFileSync(cachePath, "utf8"));
    } catch {
      cache = null;
    }
  }
  const fs = { read, stat: (path) => { const s = statSync(join(root, path)); return { size: s.size, mtimeMs: s.mtimeMs }; } };
  const built = buildIndex({ tracked, model, inventory, fs, cache, signature });
  // Solo se reescribe si cambio algo, y de forma atomica: un proceso que lee a la vez nunca
  // ve un archivo a medias.
  if (useCache && (cache?.signature !== signature || built.stats.parsed > 0 || built.stats.removed > 0)) {
    mkdirSync(dirname(cachePath), { recursive: true });
    const temp = `${cachePath}.${process.pid}.tmp`;
    writeFileSync(temp, JSON.stringify(built.cache));
    renameSync(temp, cachePath);
  }
  return built;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const started = performance.now();
  const { stats } = loadIndex({ rebuild: process.argv.includes("--rebuild") });
  if (!process.argv.includes("--quiet")) console.log(`indice: ${stats.files} archivos (${stats.reused} reutilizados, ${stats.parsed} leidos, ${stats.removed} quitados) en ${Math.round(performance.now() - started)} ms`);
}
