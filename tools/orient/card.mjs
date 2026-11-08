// La tarjeta: lo que se le entrega a un agente antes de empezar. No es una
// lista de archivos parecidos: dice donde esta la funcionalidad, que rango
// leer, que reutilizar, de que depende y que lo toca, que pruebas correr y si
// con eso basta. La forma cambia segun la tarea; el tamano esta acotado.
import { testsFor } from "./features.mjs";
import { isTestFile } from "./extract.mjs";
import { graphNeighbors } from "./graphify.mjs";
import { PARAMS } from "./retrieve.mjs";
import { tokens } from "./text.mjs";

export const BUDGET = 1200; // tokens, a razon de 4 caracteres por token
export const estimate = (text) => Math.ceil(text.length / 4);

const INTENTS = [
  ["analysis", /^\s*(c[oó]mo|d[oó]nde|qu[eé]|cu[aá]l(es)?|por qu[eé]|how|where|what|why|which|explain|expl[ií]ca)\b|[¿?]/i],
  ["tests", /\b(qu[eé] pruebas|which tests|(correr|ejecutar|run)\s+(las\s+)?(pruebas|tests)|cobertura|coverage)\b|^\s*(pruebas|tests)\b/i],
  ["refactor", /\b(refactor\w*|extraer|extrae|separar|separa|dividir|divide|mover|mueve|reorganiz\w*|simplificar|renombrar|unificar|split|extract|rename|restructure|clean ?up|rewrite)\b/i],
  ["feature", /\b(agregar|agrega|a[nñ]adir|a[nñ]ade|nuevo|nueva|nuevos|nuevas|implementar|implementa|crear|permitir|permite|que pueda|poder|soportar|add|new|implement|support|allow|should be able|create)\b/i],
  ["bug", /\b(error(es)?|falla\w*|no funciona|no deja|no me deja|no hace|no se|queda\w*|se corta|roto|bug|crash\w*|incorrect\w*|mal|fail\w*|broken|wrong|doesn't|does not|cannot|can't|never)\b/i],
];

export function detectIntent(task) {
  return INTENTS.find(([, pattern]) => pattern.test(task))?.[0] ?? "modify";
}

// `cargo test`, `vitest` o `node --test` segun donde viva la prueba.
export function testCommand(path, index) {
  if (/^app\/tests\/e2e\//.test(path)) return "E2E: see CONTRIBUTING.md (needs WebKitWebDriver; usually CI only)";
  if (/^app\/.*\.test\.ts$/.test(path)) return `cd app && npx vitest run ${path.slice(4)}`;
  if (/\.test\.mjs$/.test(path)) return `node --test ${path}`;
  if (path.endsWith(".rs")) {
    let dir = path;
    while (dir.includes("/")) {
      dir = dir.slice(0, dir.lastIndexOf("/"));
      const name = index.packages.get(`${dir}/`);
      if (name) return `cargo test -p ${name}`;
    }
  }
  return null;
}

// Pruebas que protegen estos archivos: por `owner` en el inventario, o la hermana por nombre.
export function testsOf(index, paths) {
  const found = new Map();
  const wanted = new Set(paths);
  for (const test of index.inventory.tests) {
    if (wanted.has(test.owner) || wanted.has(test.path)) found.set(test.path, test);
  }
  for (const path of paths) {
    const stem = path.replace(/\.[a-z]+$/, "");
    for (const test of index.tests) {
      if (test.startsWith(`${stem}.`) && /\.test\./.test(test) && !found.has(test)) found.set(test, index.inventory.tests.find((item) => item.path === test) ?? { path: test });
    }
  }
  return [...found.values()];
}

// Los mejores archivos, sin dejar que una sola funcionalidad se quede con todos los
// lugares si otra cercana tambien encaja: una tarea suele cruzar dos areas.
export function pickPrimary(files, cap, perFeature = PARAMS.perFeature, keep = PARAMS.keep) {
  const taken = [];
  const skipped = [];
  const count = new Map();
  const floor = (files[0]?.score ?? 0) * keep;
  for (const item of files.filter((file) => file.score > 0 && file.score >= floor).slice(0, 40)) {
    if (taken.length >= cap) break;
    const used = count.get(item.feature) ?? 0;
    if (used >= perFeature) skipped.push(item);
    else {
      taken.push(item);
      count.set(item.feature, used + 1);
    }
  }
  for (const item of skipped) if (taken.length < cap) taken.push(item);
  return taken.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
}

// Pruebas: las de los archivos elegidos, y las que por su nombre o por la propiedad
// que protegen coinciden con la tarea, dentro de las funcionalidades que encajan.
export function pickTests(index, result) {
  const byPath = new Map(index.inventory.tests.map((test) => [test.path, test]));
  const strongest = result.files[0]?.score || 1;
  const strength = new Map(result.files.slice(0, 12).filter((file) => file.score > 0).map((file) => [file.path, file.score / strongest]));
  const near = new Set(result.features.slice(0, 2).map((item) => item.id));
  const inNear = (owner) => index.files.get(owner)?.features.some((id) => near.has(id));
  const top = Math.max(1e-9, ...[...result.testHits.values()].map((hit) => hit.score));
  const candidates = new Map(testsOf(index, [...strength.keys()]).map((test) => [test.path, test]));
  // Pruebas de integracion que el catalogo atribuye a las dos funcionalidades que mejor encajan:
  // su dueno en el inventario es un crate o una carpeta, no el archivo que se cambia.
  const declared = new Map();
  result.features.slice(0, 2).forEach((item, rank) => {
    for (const path of index.featureById.get(item.id)?.tests ?? []) declared.set(path, Math.max(declared.get(path) ?? 0, rank === 0 ? 0.5 : 0.3));
  });
  for (const path of declared.keys()) if (!candidates.has(path)) candidates.set(path, byPath.get(path) ?? { path });
  for (const path of result.testHits.keys()) if (!candidates.has(path) && inNear(byPath.get(path)?.owner)) candidates.set(path, byPath.get(path));
  // Un test vale lo que el archivo que protege, mas su coincidencia con la tarea.
  const ownerStrength = (test) => strength.get(test.owner) ?? [...strength].find(([path]) => test.path.startsWith(path.replace(/\.[a-z]+$/, ".")))?.[1] ?? 0;
  const value = (test) => Math.max(ownerStrength(test), declared.get(test.path) ?? 0) + 0.7 * ((result.testHits.get(test.path)?.score ?? 0) / top) + (inNear(test.owner) ? 0.1 : 0);
  const ranked = [...candidates.values()].sort((a, b) => value(b) - value(a) || a.path.localeCompare(b.path));
  // Cada uno de los primeros archivos aporta su mejor prueba antes de que una sola
  // funcionalidad se quede con todos los lugares.
  const owners = [...strength.keys()].slice(0, 4);
  const protects = (test, path) => test.owner === path || test.path.startsWith(`${path.replace(/\.[a-z]+$/, "")}.`);
  const picked = [];
  for (const path of owners) {
    const own = ranked.find((test) => protects(test, path) && !picked.includes(test));
    if (own) picked.push(own);
  }
  return [...picked, ...ranked.filter((test) => !picked.includes(test))];
}

const short = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
const range = (symbol) => `${symbol.name} L${symbol.start}${symbol.end > symbol.start ? `-${symbol.end}` : ""}`;

function fileLine(prepared, result, item, detail) {
  const { index } = prepared;
  const file = index.files.get(item.path);
  const matched = result.symbolsMatching(item.path).slice(0, detail >= 2 ? 3 : 2);
  const outline = matched.length ? matched : file.rec.symbols.filter((symbol) => symbol.kind !== "const").slice(0, 2);
  const parts = [`\`${item.path}\` (${file.rec.lines} lines)`];
  if (outline.length) parts.push(`${matched.length ? "read" : "outline"}: ${outline.map(range).join(", ")}`);
  if (item.matched.length && detail >= 2) parts.push(`matches: ${item.matched.slice(0, 4).join(", ")}`);
  return `- ${parts.join(" · ")}`;
}

function docsFor(index, result, feature, limit) {
  const query = new Set(result.query);
  const wanted = new Set((feature?.docs ?? []).map((target) => target.split("#")[1]).filter(Boolean));
  return index.docs
    .map((doc) => {
      const own = tokens(doc.heading);
      const hits = own.filter((token) => query.has(token)).length;
      return { doc, score: hits / Math.max(1, own.length) + (wanted.has(doc.anchor) ? 0.6 : 0) + (hits ? 0.2 : 0) };
    })
    .filter((item) => item.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ doc }) => `\`${doc.file}#${doc.anchor}\` (L${doc.start}-${doc.end}): ${doc.heading}`);
}

function flowFor(index, result, limit) {
  const query = new Set(result.query);
  return (index.model.flow?.nodes ?? [])
    .map((node) => ({ node, hits: tokens(node.label).filter((token) => query.has(token)).length }))
    .filter((item) => item.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit)
    .map(({ node }) => `\`${node.anchor}\`: ${node.label}`);
}

// `detail` 3 (completa) a 0 (minima): el tamano se ajusta bajando el detalle.
function compose(prepared, result, intent, ctx, detail) {
  const { index } = prepared;
  const cap = [2, 3, 5, 5][detail];
  const top = result.features[0];
  const feature = top ? index.featureById.get(top.id) : null;
  const primary = pickPrimary(result.files, cap);
  const primaryPaths = primary.map((item) => item.path);
  const lines = [];

  lines.push(`# orient: ${intent}`, "", `confidence: ${result.confidence.level} · task: ${short(ctx.task.replace(/\s+/g, " "), 90)}`, "");

  if (!feature || primary.length === 0 || result.confidence.level === "none") {
    lines.push("NO MATCH: nothing in the catalogue or the code uses those words.", "NEXT: rephrase with words from the interface or a file name, or search the code directly.");
    return { lines, files: [], tests: [], primary: [], noMatch: true };
  }

  const where = [`## Where`, `- \`${feature.id}\` (${feature.domain ?? "no domain"}): ${feature.summary}`];
  const alsoF = result.features.slice(1, 3).filter((item) => item.score >= top.score * 0.6);
  if (alsoF.length) where.push(`- also close: ${alsoF.map((item) => `\`${item.id}\``).join(", ")}`);
  if (detail >= 1) for (const doc of docsFor(index, result, feature, detail >= 2 ? 2 : 1)) where.push(`- docs: ${doc}`);
  if (intent === "analysis" && detail >= 1) for (const flow of flowFor(index, result, 2)) where.push(`- SQL flow: ${flow}`);

  const filesTitle = intent === "feature" ? "## Where to change" : intent === "analysis" ? "## Key files" : "## Files";
  const filesBlock = [filesTitle, ...primary.map((item) => fileLine(prepared, result, item, detail))];

  // Reutilizar: lo ya hecho cerca. Las vecinas declaradas y los archivos mas usados de la funcionalidad.
  const reuse = [];
  const extraFiles = []; // solo los que la tarjeta nombra: lo que se cuenta es lo que se lee
  const shown = (list, n) => {
    extraFiles.push(...list.slice(0, n));
    return list.slice(0, n);
  };
  if (intent === "feature" || intent === "refactor") {
    const owned = [...index.files.values()].filter((file) => file.features.includes(feature.id) && !primaryPaths.includes(file.path));
    const helpers = owned.sort((a, b) => index.indegree(b.path) - index.indegree(a.path)).slice(0, detail >= 2 ? 2 : 1);
    reuse.push("## Reuse");
    for (const helper of helpers) {
      reuse.push(`- \`${helper.path}\`: used by ${helper.rdeps.length + helper.callers.length} files${helper.rec.symbols[0] ? ` (e.g. ${helper.rec.symbols.filter((s) => s.kind !== "const")[0]?.name ?? helper.rec.symbols[0].name})` : ""}`);
      extraFiles.push(helper.path);
    }
    for (const id of (feature.related ?? []).slice(0, detail >= 2 ? 3 : 1)) {
      const related = index.featureById.get(id);
      reuse.push(`- neighbour \`${id}\`: ${short(related.summary, 90)} → \`${related.entry[0]}\``);
      if (index.files.has(related.entry[0])) extraFiles.push(related.entry[0]);
    }
  }

  // Dependencias e impacto: quien usa lo que se va a tocar.
  const impact = [intent === "refactor" ? "## Impact" : "## Depends on / touched by"];
  const subjects = primaryPaths.slice(0, intent === "refactor" ? Math.max(3, cap) : 2);
  for (const path of subjects) {
    const file = index.files.get(path);
    const users = [...file.rdeps, ...file.callers];
    const uses = [...file.deps, ...file.calls];
    const label = (list, n) => shown(list, n).map((item) => `\`${item.split("/").pop()}\``).join(", ") + (list.length > n ? ` +${list.length - n}` : "");
    const parts = [];
    if (users.length) parts.push(`used by ${users.length}: ${label(users, detail >= 2 ? 4 : 2)}`);
    if (uses.length && (intent === "refactor" || detail >= 3)) parts.push(`uses ${uses.length}: ${label(uses, 3)}`);
    if (file.calls.length) parts.push(`IPC → ${label(file.calls, 2)}`);
    if (parts.length) impact.push(`- \`${path.split("/").pop()}\`: ${parts.join(" · ")}`);
  }
  const domain = index.model.allowed?.[feature.domain];
  if (domain && (intent === "feature" || intent === "refactor")) {
    impact.push(`- domain \`${feature.domain}\` may depend on: ${domain.length ? domain.map((d) => `\`${d}\``).join(", ") : "nothing else"} (tools/architecture/model.json)`);
  }
  if (ctx.graph && detail >= 2) {
    const near = graphNeighbors(ctx.graph, primaryPaths, { skip: new Set([...primaryPaths, ...extraFiles]), limit: 3 });
    extraFiles.push(...near.map((item) => item.path));
    if (near.length) impact.push(`- graphify (by name, may be off): ${near.map((item) => `\`${item.path}\` (${item.edges})`).join(", ")}`);
  }

  // Pruebas: las que protegen estos archivos, con el comando; en refactor, tambien las de quienes los usan.
  const scope = intent === "refactor" ? [...primaryPaths, ...extraFiles] : primaryPaths;
  const tests = pickTests(index, result);
  const testLines = ["## Tests"];
  const shownTests = tests.slice(0, detail >= 2 ? 5 : 2);
  for (const test of shownTests) {
    const command = testCommand(test.path, index);
    const meta = [test.gate, /server|mysql|postgres/i.test(test.environment ?? "") ? `needs ${test.environment}` : null].filter(Boolean).join(", ");
    testLines.push(`- \`${test.path}\`${meta ? ` (${meta})` : ""}${command ? `: \`${command}\`` : ""}`);
  }
  if (tests.length > shownTests.length) testLines.push(`- +${tests.length - shownTests.length} more in tests/inventory.json`);
  if (tests.length === 0) {
    const all = testsFor(feature, index.inventory);
    testLines.push(all.length ? `- none for these files; the feature has ${all.length}: e.g. \`${all[0]}\`` : "- none found: add one next to the code and list it in tests/inventory.json");
  }

  const next = [];
  if (result.confidence.level === "high") next.push("LIKELY: probably the right area; read the ranges above, then check Impact and the tests. It does not promise every file is listed.");
  else if (result.confidence.level === "medium") next.push(`PARTIAL: if the files above do not hold the behaviour, run \`node tools/orient/orient.mjs --expand ${feature.id}\`.`);
  else next.push(`AMBIGUOUS: candidates ${result.features.slice(0, 3).map((item) => `\`${item.id}\``).join(", ")}. NEXT: \`node tools/orient/orient.mjs --expand ${feature.id}\`, or search the code.`);

  const order = {
    bug: [where, filesBlock, testLines, impact],
    modify: [where, filesBlock, testLines, impact],
    feature: [where, reuse, filesBlock, impact, testLines],
    refactor: [where, filesBlock, impact, testLines],
    analysis: [where, filesBlock, impact],
    tests: [where, testLines, filesBlock],
  }[intent];
  for (const block of order) if (block.length > 1) lines.push(...block, "");
  lines.push("## Next", ...next);
  return { lines, files: [...new Set([...primaryPaths, ...extraFiles])], tests: shownTests.map((test) => test.path), primary: primaryPaths };
}

export function card(prepared, result, task, { intent = detectIntent(task), budget = BUDGET, graph = null } = {}) {
  for (let detail = 3; detail >= 0; detail -= 1) {
    const out = compose(prepared, result, intent, { task, graph }, detail);
    const markdown = `${out.lines.join("\n")}\n`;
    if (estimate(markdown) <= budget || detail === 0) {
      // Si la tarjeta termina en NO MATCH, la confianza es `none` aunque las senales dieran otra cosa.
      const confidence = out.noMatch ? { ...result.confidence, level: "none" } : result.confidence;
      return { markdown, tokens: estimate(markdown), intent, confidence, detail, ...out, likely: confidence.level === "high" };
    }
  }
}

// Nivel 1: todos los archivos de una funcionalidad con sus simbolos principales.
export function expand(prepared, id, budget = BUDGET * 2) {
  const { index } = prepared;
  const feature = index.featureById.get(id);
  if (!feature) return { markdown: `unknown feature \`${id}\`; see docs/map/FEATURES.md\n`, files: [], tests: [] };
  const files = [...index.files.values()].filter((file) => file.features.includes(id)).sort((a, b) => index.indegree(b.path) - index.indegree(a.path) || a.path.localeCompare(b.path));
  const build = (symbols) => {
    const lines = [`# orient: ${id}`, "", `${feature.summary}`, `domain: ${feature.domain ?? "none"} · files: ${files.length} (most used first)`, ""];
    for (const file of files) {
      const outline = file.rec.symbols.filter((symbol) => symbol.kind !== "const" || symbols > 3).slice(0, symbols).map(range).join(", ");
      lines.push(`- \`${file.path}\` (${file.rec.lines})${outline ? `: ${outline}` : ""}`);
    }
    const tests = testsFor(feature, index.inventory);
    lines.push("", `tests (${tests.length}): ${tests.slice(0, 6).map((test) => `\`${test}\``).join(", ")}${tests.length > 6 ? " …" : ""}`);
    return `${lines.join("\n")}\n`;
  };
  let markdown = build(6);
  for (const symbols of [4, 2, 0]) if (estimate(markdown) > budget) markdown = build(symbols);
  return { markdown, tokens: estimate(markdown), files: files.map((file) => file.path), tests: testsFor(feature, index.inventory) };
}

// Nivel 2: todo lo que usa y todo lo que usa a un archivo o a los de una funcionalidad.
export function impact(prepared, target, budget = BUDGET * 2) {
  const { index } = prepared;
  const feature = index.featureById.get(target);
  const paths = feature ? [...index.files.values()].filter((file) => file.features.includes(target)).map((file) => file.path) : [target];
  const known = paths.filter((path) => index.files.has(path));
  if (known.length === 0) return { markdown: `\`${target}\` is neither a feature nor an indexed file\n`, files: [], tests: [] };
  const inside = new Set(known);
  const lines = [`# orient: impact of ${feature ? `feature \`${target}\`` : `\`${target}\``}`, ""];
  const used = new Map();
  const uses = new Map();
  for (const path of known) {
    const file = index.files.get(path);
    for (const other of [...file.rdeps, ...file.callers]) if (!inside.has(other)) used.set(other, [...(used.get(other) ?? []), path]);
    for (const other of [...file.deps, ...file.calls]) if (!inside.has(other)) uses.set(other, [...(uses.get(other) ?? []), path]);
  }
  const show = (title, map) => {
    lines.push(`## ${title} (${map.size})`);
    for (const [path, via] of [...map.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))) {
      lines.push(`- \`${path}\` ← ${via.slice(0, 3).map((item) => item.split("/").pop()).join(", ")}${via.length > 3 ? ` +${via.length - 3}` : ""}`);
    }
    lines.push("");
  };
  show("Used by (outside)", used);
  show("Uses (outside)", uses);
  const tests = testsOf(index, [...known, ...used.keys()]);
  lines.push(`## Tests (${tests.length})`);
  for (const test of tests.slice(0, 12)) lines.push(`- \`${test.path}\`${testCommand(test.path, index) ? `: \`${testCommand(test.path, index)}\`` : ""}`);
  let markdown = `${lines.join("\n")}\n`;
  if (estimate(markdown) > budget) markdown = `${markdown.slice(0, budget * 4)}\n…(cut at the budget; narrow to a file)\n`;
  return { markdown, tokens: estimate(markdown), files: [...used.keys(), ...uses.keys()], tests: tests.map((test) => test.path) };
}

export { isTestFile };
