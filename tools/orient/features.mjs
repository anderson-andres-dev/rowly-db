#!/usr/bin/env node
// El catalogo de funcionalidades: lo que una tarea nombra ("la grilla", "el
// explorador", "la terminal") con los archivos que la forman.
//
// Vive en tools/architecture/model.json, clave `features`, junto a los dominios:
// es la unica parte escrita a mano. Todo lo demas se deriva de ahi o del
// codigo (pruebas de tests/inventory.json, vista docs/map/FEATURES.md).
//
//   node tools/orient/features.mjs             valida el catalogo
//   node tools/orient/features.mjs --write     escribe docs/map/FEATURES.md
//   node tools/orient/features.mjs --check     valida y falla si FEATURES.md quedo atras
//   node tools/orient/features.mjs --uncovered lista los archivos de codigo sin funcionalidad
//
// Una funcionalidad:
//   id       kebab-case, unico
//   summary  una linea: que hace
//   domain   dominio de arquitectura donde vive (opcional: la web no tiene)
//   terms    {es: [...], en: [...]} palabras con que la nombra un usuario o la interfaz
//   entry    archivos o carpetas (con `/` al final) que la forman
//   docs     documentos y anclas `ruta.md#ancla` donde se explica
//   related  ids de funcionalidades vecinas
//   tests    pruebas extra que el inventario no atribuye por su `owner` (opcional)
//   untested razon, si de verdad no tiene prueba (opcional; si no, se exige al menos una)
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MODEL = join(ROOT, "tools/architecture/model.json");
const INVENTORY = join(ROOT, "tests/inventory.json");
export const DOC = "docs/map/FEATURES.md";
const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const CODE = /\.(ts|svelte|rs|mjs|js|css|html)$/;
const SUMMARY_MAX = 140;

// Lo que cubre un `entry`: el archivo, o todo lo que cuelga de la carpeta.
export const covers = (entry, path) => (entry.endsWith("/") ? path.startsWith(entry) : path === entry);

// Pruebas, bajo la regla de siempre en este repo: una prueba pertenece a la
// funcionalidad que contiene el codigo que protege (`owner`) o a ella misma.
export function testsFor(feature, inventory) {
  const found = new Set(feature.tests ?? []);
  for (const test of inventory.tests) {
    if (feature.entry.some((entry) => covers(entry, test.owner) || covers(entry, test.path))) found.add(test.path);
  }
  return [...found].sort();
}

// El ancla que GitHub le da a un encabezado.
export function slug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .replace(/ /g, "-");
}

export function anchors(markdown) {
  return new Set([...markdown.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map((match) => slug(match[1])));
}

// Archivos de codigo que la app compila o empaqueta y que no son pruebas.
export function codeFiles(model, tracked) {
  const roots = model.features.roots;
  return tracked.filter(
    (path) =>
      roots.some((root) => path.startsWith(root)) &&
      CODE.test(path) &&
      !/\.test\.[a-z]+$/.test(path) &&
      !/(^|\/)(tests|__test-stubs__)\//.test(path),
  );
}

export function coverage(model, tracked) {
  const files = codeFiles(model, tracked);
  const owners = new Map(files.map((path) => [path, []]));
  for (const feature of model.features.items) {
    for (const path of files) if (feature.entry.some((entry) => covers(entry, path))) owners.get(path).push(feature.id);
  }
  return {
    total: files.length,
    uncovered: files.filter((path) => owners.get(path).length === 0),
    shared: files.filter((path) => owners.get(path).length > 1),
  };
}

// Problemas del catalogo; vacio si esta bien. `read` lee un archivo versionado.
export function validate(model, { tracked, inventory, read }) {
  const problems = [];
  const items = model.features?.items;
  if (!Array.isArray(items) || !Array.isArray(model.features?.roots)) return ["model.json: `features` necesita `roots` e `items`"];
  const ids = new Set();
  const domains = new Set(model.domains.map((domain) => domain.id));
  const trackedSet = new Set(tracked);
  const exists = (entry) => (entry.endsWith("/") ? tracked.some((path) => path.startsWith(entry)) : trackedSet.has(entry));

  for (const feature of items) {
    const where = `features.${feature.id ?? "(sin id)"}`;
    if (!ID.test(feature.id ?? "")) problems.push(`${where}: el id debe ser kebab-case`);
    if (ids.has(feature.id)) problems.push(`${where}: id repetido`);
    ids.add(feature.id);
    if (!feature.summary || feature.summary.length > SUMMARY_MAX) problems.push(`${where}: \`summary\` falta o pasa de ${SUMMARY_MAX} caracteres`);
    if (feature.domain !== undefined && !domains.has(feature.domain)) problems.push(`${where}: el dominio \`${feature.domain}\` no existe en model.json`);
    for (const lang of ["es", "en"]) {
      if (!Array.isArray(feature.terms?.[lang]) || feature.terms[lang].length < 2) problems.push(`${where}: \`terms.${lang}\` necesita al menos 2 palabras`);
    }
    if (!Array.isArray(feature.entry) || feature.entry.length === 0) problems.push(`${where}: \`entry\` vacio`);
    for (const entry of feature.entry ?? []) if (!exists(entry)) problems.push(`${where}: ${entry} no existe en el repositorio`);
    for (const target of feature.docs ?? []) {
      const [file, anchor] = target.split("#");
      if (!trackedSet.has(file)) problems.push(`${where}: el documento ${file} no existe`);
      else if (anchor && file.endsWith(".md") && !anchors(read(file)).has(anchor)) problems.push(`${where}: ${file} no tiene el ancla #${anchor}`);
    }
    for (const path of feature.tests ?? []) if (!trackedSet.has(path)) problems.push(`${where}: la prueba ${path} no existe`);
    if (feature.untested !== undefined && !feature.untested) problems.push(`${where}: \`untested\` necesita la razon`);
    if (feature.untested === undefined && feature.entry && testsFor(feature, inventory).length === 0) {
      problems.push(`${where}: ninguna prueba del inventario protege estos archivos (anade \`tests\` o \`untested\` con la razon)`);
    }
  }
  for (const feature of items) {
    for (const related of feature.related ?? []) {
      if (!ids.has(related)) problems.push(`features.${feature.id}: \`related\` apunta a \`${related}\`, que no existe`);
      if (related === feature.id) problems.push(`features.${feature.id}: no puede ser vecina de si misma`);
    }
  }
  for (const path of coverage(model, tracked).uncovered) problems.push(`${path}: ninguna funcionalidad lo incluye; anadelo al \`entry\` de la que corresponda`);
  return problems;
}

const list = (paths) => paths.map((path) => `\`${path}\``).join(", ");

// FEATURES.md: una vista para leer, generada; nadie la edita.
export function render(model, inventory) {
  const items = [...model.features.items].sort((a, b) => a.id.localeCompare(b.id));
  const lines = [
    "# Features",
    "",
    "<!-- generated: features (tools/orient/features.mjs) -->",
    "",
    "Where each thing a user or a task can name lives: its files, the tests that protect it and its neighbours. Generated from the `features` key of `tools/architecture/model.json` and `tests/inventory.json`; to change it, edit the model and run `node tools/orient/features.mjs --write`. Never edit this file by hand.",
    "",
    "A trailing `/` is a folder. The terms are what a user or the interface calls it, in Spanish and English.",
    "",
    "## Index",
    "",
    ...items.map((feature) => `- [\`${feature.id}\`](#${feature.id}): ${feature.summary}`),
    "",
  ];
  for (const feature of items) {
    const tests = testsFor(feature, inventory);
    lines.push(`## ${feature.id}`, "", feature.summary, "");
    if (feature.domain) lines.push(`- Domain: \`${feature.domain}\``);
    lines.push(`- Terms (es): ${feature.terms.es.join(", ")}`, `- Terms (en): ${feature.terms.en.join(", ")}`);
    lines.push(`- Files: ${list(feature.entry)}`);
    lines.push(feature.untested ? `- Tests: none (${feature.untested})` : `- Tests: ${list(tests)}`);
    if (feature.related?.length) lines.push(`- Related: ${feature.related.map((id) => `[\`${id}\`](#${id})`).join(", ")}`);
    if (feature.docs?.length) lines.push(`- Docs: ${feature.docs.map((target) => `[${target}](../../${target})`).join(", ")}`);
    lines.push("");
  }
  lines.push("<!-- /generated -->", "");
  return lines.join("\n");
}

function loadAll() {
  const model = JSON.parse(readFileSync(MODEL, "utf8"));
  const inventory = JSON.parse(readFileSync(INVENTORY, "utf8"));
  const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
  const read = (path) => readFileSync(join(ROOT, path), "utf8");
  return { model, inventory, tracked, read };
}

function main(args) {
  const { model, inventory, tracked, read } = loadAll();
  if (args.includes("--uncovered")) {
    const { uncovered, total } = coverage(model, tracked);
    console.log(uncovered.join("\n"));
    console.error(`${uncovered.length} de ${total} archivos de codigo sin funcionalidad`);
    return;
  }
  const problems = validate(model, { tracked, inventory, read });
  const rendered = render(model, inventory);
  const path = join(ROOT, DOC);
  if (args.includes("--write")) writeFileSync(path, rendered);
  else if (args.includes("--check") && (!existsSync(path) || readFileSync(path, "utf8") !== rendered)) {
    problems.push(`${DOC} quedo atras; corre node tools/orient/features.mjs --write`);
  }
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  const { total, shared } = coverage(model, tracked);
  console.log(`${model.features.items.length} funcionalidades; ${total} archivos de codigo, todos con dueno (${shared.length} compartidos)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
