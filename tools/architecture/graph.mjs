#!/usr/bin/env node
// El grafo de arquitectura de docs/ARCHITECTURE.md, generado y comprobado.
//
// Las dependencias salen del codigo versionado: `use khipu_*`, modulos
// declarados (`mod x;`), `include_str!`, imports de TypeScript/Svelte, la IPC
// de Tauri y las rutas de archivos de datos que nombran herramientas y
// workflows. Lo que el codigo no dice (dominios, su tipo, que dependencia se
// permite, el flujo del SQL) esta en model.json; cada nodo del flujo apunta a
// un simbolo real y se comprueba que exista.
//
//   node tools/architecture/graph.mjs           muestra lo que generaria
//   node tools/architecture/graph.mjs --write   lo escribe en ARCHITECTURE
//   node tools/architecture/graph.mjs --check   falla si hay una dependencia no
//                                               permitida, un ancla perdida o el
//                                               documento quedo atras
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

const model = JSON.parse(readFileSync(new URL("model.json", import.meta.url), "utf8"));
const DOCS = ["docs/ARCHITECTURE.md", "docs/ARCHITECTURE.es.md"];
const files = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean);

// El dominio de una ruta: el de la ruta mas larga que la contiene.
function domainOf(path) {
  let best;
  for (const domain of model.domains) {
    if ((domain.except ?? []).some((prefix) => path === prefix || path.startsWith(prefix))) continue;
    for (const prefix of domain.paths) {
      if ((path === prefix || path.startsWith(prefix)) && (!best || prefix.length > best.length)) {
        best = { id: domain.id, length: prefix.length };
      }
    }
  }
  return best?.id;
}

// Codigo sin pruebas ni comentarios de linea: lo que la app ejecuta.
function code(path, text) {
  let body = text;
  if (path.endsWith(".rs") && !path.startsWith("crates/server-tests/")) body = body.split("#[cfg(test)]")[0];
  const comment = /\.(rs|ts|svelte|mjs|js)$/.test(path) ? /^\s*\/\/.*$/gm : /^\s*#.*$/gm;
  return body.replace(comment, "");
}

const crates = new Map(model.domains.filter((d) => d.crate).map((d) => [d.crate, d.id]));
// Referencias a datos por nombre, de los dominios de datos.
const dataNames = model.domains
  .filter((d) => d.kind === "data")
  .flatMap((d) => d.paths.map((path) => ({ id: d.id, pattern: new RegExp(`(^|[^\\w/.-])${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) })));

function references(path, text) {
  const found = [];
  const from = dirname(path);
  if (path.endsWith(".rs")) {
    for (const [crate, id] of crates) if (new RegExp(`\\b${crate}\\b`).test(text)) found.push([id, "code"]);
    for (const [, module] of text.matchAll(/^\s*(?:pub(?:\([^)]*\))?\s+)?mod\s+(\w+)\s*;/gm)) {
      const base = path.endsWith("lib.rs") || path.endsWith("main.rs") || path.endsWith("mod.rs") ? from : path.replace(/\.rs$/, "");
      found.push([join(base, `${module}.rs`), "code"], [join(base, module, "mod.rs"), "code"]);
    }
    for (const [, target] of text.matchAll(/include_str!\(\s*"([^"]+)"/g)) found.push([normalize(join(from, target)), "data"]);
  }
  if (/\.(ts|svelte)$/.test(path)) {
    for (const [, spec] of text.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g)) {
      if (spec === "@tauri-apps/api/core") found.push(["backend", "ipc"]);
      else if (spec.startsWith("$lib/")) found.push([`app/src/lib/${spec.slice(5)}`, "code"]);
      else if (spec.startsWith(".")) found.push([normalize(join(from, spec)), spec.endsWith(".json") ? "data" : "code"]);
    }
  }
  for (const { id, pattern } of dataNames) if (pattern.test(text)) found.push([id, "data"]);
  if (/\browly-server-tests\b/.test(text)) found.push(["server-tests", "code"]);
  for (const [, tool] of text.matchAll(/\b(tools\/[\w./-]+)/g)) found.push([tool, "code"]);
  return found;
}

// --- Dependencias ---------------------------------------------------------

const ids = new Set(model.domains.map((d) => d.id));
const edges = new Map();
for (const path of files) {
  const source = domainOf(path);
  if (!source || !/\.(rs|ts|svelte|mjs|js|sh|py|yml)$/.test(path) || /\.test\.ts$/.test(path)) continue;
  if (path.startsWith("tools/architecture/")) continue;
  const text = code(path, readFileSync(path, "utf8"));
  for (const [target, kind] of references(path, text)) {
    const id = ids.has(target) ? target : domainOf(target);
    if (!id || id === source) continue;
    const key = `${source}->${id}`;
    const edge = edges.get(key) ?? { source, target: id, kinds: new Set(), files: new Set() };
    edge.kinds.add(kind);
    edge.files.add(path);
    edges.set(key, edge);
  }
}

const problems = [];
const debt = new Map((model.debt ?? []).map((d) => [`${d.from}->${d.to}`, d.why]));
for (const edge of edges.values()) {
  const key = `${edge.source}->${edge.target}`;
  if ((model.allowed[edge.source] ?? []).includes(edge.target) || debt.has(key)) continue;
  problems.push(`dependencia no permitida ${key} (${[...edge.files].join(", ")}): permitela en model.json o quitala`);
}
for (const key of debt.keys()) if (!edges.has(key)) problems.push(`deuda ${key} ya no existe: quitala de model.json`);

// --- Flujo del SQL: cada nodo apunta a codigo real ----------------------------

for (const node of model.flow.nodes) {
  if (!node.anchor) continue;
  const [file, symbol] = node.anchor.split("#");
  if (!existsSync(file)) problems.push(`flujo: ${node.id} apunta a ${file}, que no existe`);
  else if (symbol && !readFileSync(file, "utf8").includes(symbol)) problems.push(`flujo: ${node.id}: ${symbol} no esta en ${file}`);
}
const flowIds = new Set(model.flow.nodes.map((n) => n.id));
for (const [from, to] of model.flow.edges) {
  if (!flowIds.has(from) || !flowIds.has(to)) problems.push(`flujo: arista ${from} -> ${to} con un nodo que no existe`);
}

// --- Mermaid ---------------------------------------------------------------

const CLASSES = [
  "classDef common fill:#dbeafe,stroke:#1d4ed8,color:#0f172a",
  "classDef engine fill:#ffedd5,stroke:#c2410c,color:#0f172a",
  "classDef data fill:#dcfce7,stroke:#15803d,color:#0f172a",
  "classDef infra fill:#e5e7eb,stroke:#4b5563,color:#0f172a",
];
const shape = (id, label, kind) => (kind === "data" ? `${id}[("${label}")]` : `${id}["${label}"]`);
const safe = (id) => id.replace(/-/g, "_");

function dependencies() {
  // Producto y datos: las capas que un desarrollador nuevo necesita ver. Las
  // pruebas y herramientas van en una tabla (infrastructure), igual de
  // comprobadas.
  const shown = model.domains.filter((d) => d.kind !== "infra");
  const visible = new Set(shown.map((d) => d.id));
  const lines = ["flowchart TB"];
  const layers = [...new Set(shown.map((d) => d.layer).filter(Boolean))];
  for (const layer of layers) {
    lines.push(`  subgraph ${layer}`);
    for (const d of shown.filter((d) => d.layer === layer)) lines.push(`    ${shape(safe(d.id), d.label, d.kind)}:::${d.kind}`);
    lines.push("  end");
  }
  lines.push("  subgraph Data");
  for (const d of shown.filter((d) => !d.layer)) lines.push(`    ${shape(safe(d.id), d.label, d.kind)}:::${d.kind}`);
  lines.push("  end");
  const ordered = [...edges.values()]
    .filter((e) => visible.has(e.source) && visible.has(e.target))
    .sort((a, b) => `${a.source}${a.target}`.localeCompare(`${b.source}${b.target}`));
  const debtLinks = [];
  ordered.forEach((edge, index) => {
    const key = `${edge.source}->${edge.target}`;
    const reads = edge.kinds.has("data") && !edge.kinds.has("code");
    const label = debt.has(key) ? `DEBT: ${debt.get(key)}` : edge.kinds.has("ipc") ? "IPC" : reads ? "reads" : "";
    lines.push(`  ${safe(edge.source)} ${debt.has(key) || reads ? "-.->" : "-->"}${label ? `|${label}|` : ""} ${safe(edge.target)}`);
    if (debt.has(key)) debtLinks.push(index);
  });
  lines.push(...CLASSES.map((c) => `  ${c}`));
  if (debtLinks.length > 0) lines.push(`  linkStyle ${debtLinks.join(",")} stroke:#dc2626,stroke-width:2px`);
  return "```mermaid\n" + lines.join("\n") + "\n```";
}

function infrastructure() {
  const label = new Map(model.domains.map((d) => [d.id, d.label]));
  const infra = model.domains.filter((d) => d.kind === "infra");
  const rows = infra.map((d) => {
    const targets = [...edges.values()]
      .filter((e) => e.source === d.id)
      .map((e) => label.get(e.target))
      .sort();
    return `| ${d.label} | ${targets.join("; ")} |`;
  });
  return ["| Tests and tooling | Depend on |", "| :--- | :--- |", ...rows].join("\n");
}

function flow() {
  const lines = ["flowchart TB"];
  const node = (n) => `${shape(n.id, n.label, n.kind)}:::${n.kind}`;
  for (const [path, title] of Object.entries(model.flow.paths)) {
    lines.push(`  subgraph path_${path}["${title}"]`);
    for (const n of model.flow.nodes.filter((n) => n.path === path)) lines.push(`    ${node(n)}`);
    lines.push("  end");
  }
  for (const n of model.flow.nodes.filter((n) => !n.path)) lines.push(`  ${node(n)}`);
  const advisory = [];
  const fallback = [];
  model.flow.edges.forEach(([from, to, label, style], index) => {
    lines.push(`  ${from} ${style === "advisory" ? "-.->" : "-->"}${label ? `|"${label}"|` : ""} ${to}`);
    if (style === "advisory") advisory.push(index);
    if (style === "fallback") fallback.push(index);
  });
  lines.push(...CLASSES.map((c) => `  ${c}`));
  if (advisory.length > 0) lines.push(`  linkStyle ${advisory.join(",")} stroke:#6b7280,stroke-dasharray:4`);
  if (fallback.length > 0) lines.push(`  linkStyle ${fallback.join(",")} stroke:#15803d`);
  return "```mermaid\n" + lines.join("\n") + "\n```";
}

const blocks = { dependencies: dependencies(), infrastructure: infrastructure(), "sql-flow": flow() };

function render(text) {
  let out = text;
  for (const [name, body] of Object.entries(blocks)) {
    const pattern = new RegExp(`(<!-- generated: ${name} \\(tools/architecture/graph\\.mjs\\) -->)[\\s\\S]*?(<!-- /generated: ${name} -->)`);
    if (!pattern.test(out)) continue;
    out = out.replace(pattern, (_, open, close) => `${open}\n${body}\n${close}`);
  }
  return out;
}

const mode = process.argv[2];
for (const doc of DOCS) {
  const text = readFileSync(doc, "utf8");
  for (const name of Object.keys(blocks)) {
    if (!text.includes(`<!-- generated: ${name} (tools/architecture/graph.mjs) -->`)) problems.push(`${doc}: falta el bloque ${name}`);
  }
  const rendered = render(text);
  if (mode === "--write") writeFileSync(doc, rendered);
  else if (mode === "--check" && rendered !== text) problems.push(`${doc}: el grafo quedo atras; corre node tools/architecture/graph.mjs --write`);
}

if (!mode) console.log(Object.values(blocks).join("\n\n"));
console.log(`${edges.size} dependencias entre ${ids.size} dominios, ${model.flow.nodes.length} nodos de flujo`);
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
