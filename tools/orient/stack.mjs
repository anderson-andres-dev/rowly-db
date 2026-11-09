#!/usr/bin/env node
// Las versiones reales de las dependencias directas y donde leer la documentacion
// de ESA version: un agente que escribe de memoria usa la API de otra version.
//
// Sale de los manifiestos y los lockfiles (Cargo.toml, Cargo.lock, app/package.json,
// app/package-lock.json); nada se escribe a mano salvo la lista corta de guias oficiales.
// Sin red: los enlaces se arman con la version resuelta.
//
//   node tools/orient/stack.mjs            valida que toda dependencia directa tenga version resuelta
//   node tools/orient/stack.mjs --write    escribe docs/map/STACK.md
//   node tools/orient/stack.mjs --check    valida y falla si STACK.md quedo atras
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DOC = "docs/map/STACK.md";

// Guias oficiales de las librerias de las que depende el diseno (la documentacion de
// una version concreta existe en docs.rs y en la pagina de cada paquete npm).
export const GUIDES = {
  tauri: ["Tauri", "https://v2.tauri.app/"],
  "@tauri-apps/api": ["Tauri", "https://v2.tauri.app/reference/javascript/api/"],
  svelte: ["Svelte", "https://svelte.dev/docs/svelte/overview"],
  "@sveltejs/kit": ["SvelteKit", "https://svelte.dev/docs/kit"],
  codemirror: ["CodeMirror", "https://codemirror.net/docs/"],
  "@xterm/xterm": ["xterm.js", "https://xtermjs.org/docs/"],
  vite: ["Vite", "https://vite.dev/guide/"],
  vitest: ["Vitest", "https://vitest.dev/guide/"],
  tokio: ["Tokio", "https://tokio.rs/tokio/tutorial"],
};

// Dependencias de un Cargo.toml: lee tablas y lineas, sin parser TOML (el repo no agrega dependencias).
export function parseManifest(text) {
  const out = { name: null, workspace: [], deps: [] };
  let table = "";
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s#.*$/, "").trim();
    const header = /^\[+\s*([^\]]+?)\s*\]+$/.exec(line);
    if (header) {
      table = header[1];
      continue;
    }
    const pair = /^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/.exec(line);
    if (!pair) continue;
    const [, key, value] = pair;
    if (table === "package" && key === "name") out.name = /"([^"]+)"/.exec(value)?.[1] ?? null;
    const kind = { dependencies: "normal", "build-dependencies": "build", "dev-dependencies": "dev" }[table];
    if (kind || table === "workspace.dependencies") {
      const inherited = key.endsWith(".workspace");
      const name = inherited ? key.slice(0, -".workspace".length) : key;
      const version = inherited ? null : /^"([^"]+)"/.exec(value)?.[1] ?? /\bversion\s*=\s*"([^"]+)"/.exec(value)?.[1] ?? null;
      const local = /\bpath\s*=/.test(value);
      if (local) continue;
      if (table === "workspace.dependencies") out.workspace.push({ name, req: version });
      else out.deps.push({ name, req: version, kind, inherited: inherited || /\bworkspace\s*=\s*true/.test(value) });
    }
  }
  return out;
}

// Paquetes del Cargo.lock: nombre -> versiones.
export function parseCargoLock(text) {
  const out = new Map();
  for (const block of text.split("\n[[package]]\n")) {
    const name = /^name = "([^"]+)"/m.exec(block)?.[1];
    const version = /^version = "([^"]+)"/m.exec(block)?.[1];
    if (name && version) out.set(name, [...(out.get(name) ?? []), version]);
  }
  return out;
}

const parts = (version) => version.split(/[.+-]/).slice(0, 3).map((n) => Number.parseInt(n, 10) || 0);
const compare = (a, b) => {
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
};

// Si `version` cumple la exigencia de Cargo (`1`, `0.56`, `~2.4.1`, `=0.9.0`, `^4.2.0`).
export function satisfies(version, req) {
  const exact = req.startsWith("=");
  const base = req.replace(/^[\^~=]\s*/, "");
  const want = base.split(".").map((n) => Number.parseInt(n, 10));
  const have = parts(version);
  if (exact) return compare(version, base) === 0;
  if (req.startsWith("~")) return have[0] === want[0] && (want.length < 2 || have[1] === want[1]) && compare(version, base) >= 0;
  const lead = want[0] > 0 ? 1 : want.length > 1 ? 2 : 1; // ^0.x fija el menor
  for (let i = 0; i < lead; i += 1) if (have[i] !== want[i]) return false;
  return compare(version, base.split(".").length < 3 ? `${base}${".0".repeat(3 - base.split(".").length)}` : base) >= 0;
}

export const resolveRust = (name, req, lock) => (lock.get(name) ?? []).filter((version) => satisfies(version, req)).sort(compare).pop() ?? null;

// Las dependencias directas de Rust: nombre -> { req, resolved, usedBy[], kinds[] }.
export function rustDependencies(manifests, lockText) {
  const lock = parseCargoLock(lockText);
  const workspace = new Map();
  const found = new Map();
  for (const { text } of manifests) for (const dep of parseManifest(text).workspace) workspace.set(dep.name, dep.req);
  for (const { text } of manifests) {
    const manifest = parseManifest(text);
    if (!manifest.name) continue;
    for (const dep of manifest.deps) {
      const req = dep.req ?? workspace.get(dep.name);
      if (!req) continue; // dependencia de otro crate del repositorio
      const row = found.get(dep.name) ?? { name: dep.name, req, usedBy: new Set(), kinds: new Set() };
      row.usedBy.add(manifest.name);
      row.kinds.add(dep.kind);
      found.set(dep.name, row);
    }
  }
  return [...found.values()]
    .map((row) => ({ ...row, usedBy: [...row.usedBy].sort(), kinds: [...row.kinds].sort(), resolved: resolveRust(row.name, row.req, lock) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Las de npm: de package.json y package-lock.json.
export function npmDependencies(pkg, lock) {
  const rows = [];
  for (const [kind, table] of [["normal", pkg.dependencies], ["dev", pkg.devDependencies]]) {
    for (const [name, req] of Object.entries(table ?? {})) rows.push({ name, req, kind, resolved: lock.packages?.[`node_modules/${name}`]?.version ?? null });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export const rustDocsUrl = (row) => `https://docs.rs/${row.name}/${row.resolved}`;
export const npmDocsUrl = (row) => `https://www.npmjs.com/package/${row.name}/v/${row.resolved}`;
const rustDocs = (row) => `[docs.rs](${rustDocsUrl(row)})`;
const npmDocs = (row) => `[npm](${npmDocsUrl(row)})`;
const guide = (name) => (GUIDES[name] ? ` · [${GUIDES[name][0]} guide](${GUIDES[name][1]})` : "");
const cell = (text) => text.replace(/\|/g, "\\|");

export function render({ rust, npm }) {
  const lines = [
    "# Stack",
    "",
    "<!-- generated: stack (tools/orient/stack.mjs) -->",
    "",
    "The direct dependencies with the version this repository really resolves, and where to read the documentation of **that** version. Before using the API of a dependency, look it up here: a library's \"latest\" docs and what you remember may describe another major version. Generated from `Cargo.toml`, `Cargo.lock`, `app/package.json` and `app/package-lock.json` by `node tools/orient/stack.mjs --write`; never edit it by hand.",
    "",
    "The version-specific link is `docs.rs/<crate>/<version>` for crates and the package's version page for npm. The guide link is the library's official site; it usually follows the latest release, so check its version selector against the resolved version.",
    "",
    "## Rust (workspace)",
    "",
    "| Crate | Declared | Resolved | Used by | Docs |",
    "| :--- | :--- | :--- | :--- | :--- |",
    ...rust.map((row) => `| \`${row.name}\` | \`${cell(row.req)}\` | ${row.resolved ? `**${row.resolved}**` : "not resolved"} | ${row.usedBy.map((name) => `\`${name}\``).join(", ")}${row.kinds.every((kind) => kind !== "normal") ? ` (${row.kinds.join(", ")})` : ""} | ${row.resolved ? rustDocs(row) : "-"}${guide(row.name)} |`),
    "",
    "## Frontend (`app/package.json`)",
    "",
    "| Package | Declared | Resolved | Kind | Docs |",
    "| :--- | :--- | :--- | :--- | :--- |",
    ...npm.map((row) => `| \`${row.name}\` | \`${cell(row.req)}\` | ${row.resolved ? `**${row.resolved}**` : "not resolved"} | ${row.kind} | ${row.resolved ? npmDocs(row) : "-"}${guide(row.name)} |`),
    "",
    "<!-- /generated -->",
    "",
  ];
  return lines.join("\n");
}

// Problemas: toda dependencia directa debe tener version resuelta en el lockfile.
export function validate({ rust, npm }) {
  return [
    ...rust.filter((row) => !row.resolved).map((row) => `Cargo: ${row.name} \`${row.req}\` no tiene version resuelta en Cargo.lock`),
    ...npm.filter((row) => !row.resolved).map((row) => `npm: ${row.name} \`${row.req}\` no tiene version resuelta en app/package-lock.json`),
  ];
}

export function load(root = ROOT) {
  const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
  const read = (path) => readFileSync(join(root, path), "utf8");
  const manifests = tracked.filter((path) => /(^|\/)Cargo\.toml$/.test(path)).map((path) => ({ path, text: read(path) }));
  return {
    rust: rustDependencies(manifests, read("Cargo.lock")),
    npm: npmDependencies(JSON.parse(read("app/package.json")), JSON.parse(read("app/package-lock.json"))),
  };
}

function main(args) {
  const data = load();
  const problems = validate(data);
  const rendered = render(data);
  const path = join(ROOT, DOC);
  if (args.includes("--write")) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, rendered);
  } else if (args.includes("--check") && (!existsSync(path) || readFileSync(path, "utf8") !== rendered)) {
    problems.push(`${DOC} quedo atras; corre node tools/orient/stack.mjs --write`);
  }
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log(`${data.rust.length} crates y ${data.npm.length} paquetes npm con version resuelta`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
