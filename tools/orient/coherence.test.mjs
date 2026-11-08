// El conjunto, no cada pieza: que AGENTS.md, el catalogo, el orientador, las evaluaciones y
// el indice cuenten lo mismo y no se contradigan.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { isTestPath, loadGold, loadNegatives } from "./eval.mjs";
import { covers } from "./features.mjs";
import { createOrient } from "./orient.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (path) => readFileSync(join(ROOT, path), "utf8");
const json = (path) => JSON.parse(read(path));

test("AGENTS.md solo nombra archivos, comandos y enlaces que existen", () => {
  const text = read("AGENTS.md");
  const missing = [];
  for (const [, path] of text.matchAll(/`((?:tools|docs|tests|app|crates)\/[\w./-]+?)(?:#[\w-]+)?`/g)) if (!existsSync(join(ROOT, path))) missing.push(path);
  for (const [, command] of text.matchAll(/`node (tools\/[\w./-]+\.mjs)/g)) if (!existsSync(join(ROOT, command))) missing.push(command);
  for (const [, link] of text.matchAll(/\]\((?!https?:)([^)#]+)(?:#[^)]*)?\)/g)) if (!existsSync(join(ROOT, link))) missing.push(link);
  assert.deepEqual([...new Set(missing)], []);
});

test("CONTRIBUTING en espanol e ingles listan los mismos comandos de orient", () => {
  const commands = (path) => [...read(path).matchAll(/^(node tools\/orient\/[\w.]+ [^\s#]+)/gm)].map((match) => match[1]);
  assert.ok(commands("CONTRIBUTING.md").length >= 2);
  assert.deepEqual(commands("CONTRIBUTING.es.md"), commands("CONTRIBUTING.md"));
});

test("los registros de medicion corresponden al conjunto de oro actual", () => {
  const ids = loadGold().tasks.map((task) => task.id).sort();
  for (const path of ["tests/orient/orient.json", "tests/orient/baseline.json"]) {
    assert.deepEqual(json(path).tasks.map((task) => task.id).sort(), ids, `${path} quedo atras del oro: regeneralo con node tools/orient/eval.mjs --runner <orient --no-graph|graphify> --write`);
  }
});

const everything = () => [...loadGold().tasks, ...loadNegatives()];

test("LIKELY sale solo de la confianza alta, y PARTIAL, AMBIGUOUS y NO MATCH nunca se disfrazan de el", () => {
  const orient = createOrient({ useCache: false, useGraph: false });
  const seen = new Set();
  for (const task of everything()) {
    const out = orient.run(task.task);
    const level = out.confidence.level;
    seen.add(level);
    assert.equal(out.likely, level === "high", task.id);
    const next = out.markdown.split("## Next\n")[1] ?? "";
    if (level === "high") assert.match(next, /^LIKELY:/, task.id);
    else if (level === "medium") assert.match(next, /^PARTIAL:/, task.id);
    else if (level === "low") assert.match(next, /^AMBIGUOUS:/, task.id);
    else assert.match(out.markdown, /NO MATCH/, task.id);
    if (level !== "high") assert.doesNotMatch(out.markdown, /LIKELY:/, task.id);
  }
  assert.deepEqual([...seen].sort(), ["high", "low", "medium", "none"]);
});

test("el tipo de tarea cambia la forma de la tarjeta, nunca la confianza", () => {
  const orient = createOrient({ useCache: false, useGraph: false });
  for (const task of loadGold().tasks.slice(0, 12)) {
    const levels = new Set(["bug", "feature", "refactor", "analysis", "tests", "modify"].map((intent) => `${orient.run(task.task, { intent }).confidence.level}/${orient.run(task.task, { intent }).likely}`));
    assert.equal(levels.size, 1, task.id);
  }
});

test("graphify solo agrega lineas: no cambia la confianza, ni lo que se propone, ni LIKELY", () => {
  const without = createOrient({ useCache: false, useGraph: false });
  const files = [...without.prepared.index.files.keys()];
  const graph = {
    nodes: files.map((path) => ({ id: path, source_file: path })),
    links: files.slice(1).map((path, i) => ({ source: files[i], target: path, relation: "calls" })),
  };
  const withGraph = createOrient({ useCache: false, graph });
  assert.equal(withGraph.graph, true);
  let extra = 0;
  for (const task of loadGold().tasks) {
    const a = without.run(task.task);
    const b = withGraph.run(task.task);
    if (b.markdown.includes("graphify (by name")) extra += 1;
    assert.equal(b.likely, a.likely, task.id);
    assert.deepEqual(b.confidence, a.confidence, task.id);
    assert.deepEqual(b.primary, a.primary, task.id);
  }
  assert.ok(extra > 0, "el grafo de prueba debe notarse en alguna tarjeta, o la prueba no prueba nada");
});

test("el indice con cache y sin cache da exactamente las mismas tarjetas, y la segunda vez no relee nada", () => {
  createOrient({ useCache: true });
  const cached = createOrient({ useCache: true });
  const fresh = createOrient({ useCache: false });
  assert.equal(cached.stats.parsed, 0);
  assert.equal(cached.stats.reused, fresh.stats.files);
  for (const task of loadGold().tasks) assert.equal(cached.run(task.task).markdown, fresh.run(task.task).markdown, task.id);
});

test("cada archivo del oro que el catalogo cubre y que no es una prueba esta indexado: el orientador puede, en principio, encontrarlo", () => {
  const orient = createOrient({ useCache: false, useGraph: false });
  const { files, model } = orient.prepared.index;
  const entries = model.features.items.flatMap((feature) => feature.entry);
  const outside = [];
  // Un archivo que ninguna funcionalidad cubre (p. ej. `app/vitest.config.ts`) queda fuera del
  // alcance del catalogo por diseno; el oro lo trae porque sale tal cual de lo que toco un commit.
  for (const task of loadGold().tasks) {
    for (const path of task.files) {
      if (/\.(ts|svelte|rs|mjs|js)$/.test(path) && !isTestPath(path, []) && entries.some((entry) => covers(entry, path)) && !files.has(path)) outside.push(`${task.id}: ${path}`);
    }
  }
  assert.deepEqual(outside, []);
});

test("los limites que documenta el README coinciden con lo registrado", () => {
  const record = json("tests/orient/orient.json");
  const strong = Math.round(record.summary.likelyStrong * 100);
  const none = record.tasks.filter((task) => task.hit === 0).length;
  for (const [path, strongText, noneText] of [
    ["tools/orient/README.md", `${strong} %`, `${none} of ${record.tasks.length}`],
    ["tools/orient/README.es.md", `${strong} %`, `${none} de ${record.tasks.length}`],
  ]) {
    const text = read(path);
    assert.ok(text.includes(strongText), `${path}: LIKELY ${strongText}; actualiza los limites`);
    assert.ok(text.includes(noneText), `${path}: ${noneText} tareas sin archivo correcto; actualiza los limites`);
  }
});

test("los archivos puntero de cada agente remiten a AGENTS.md y no llevan instrucciones propias", () => {
  for (const path of ["CLAUDE.md", "GEMINI.md"]) {
    const text = read(path).trim();
    assert.ok(text.includes("AGENTS.md"), path);
    assert.ok(text.split("\n").length <= 2, `${path}: un puntero no lleva instrucciones propias`);
  }
});

test("AGENTS.md es el mapa: cabe en un presupuesto, trae el protocolo para peticiones genericas y una linea por funcionalidad", () => {
  const text = read("AGENTS.md");
  assert.ok(text.length <= 14000, `AGENTS.md pesa ${text.length} caracteres: se carga en cada sesion, mantenlo corto`);
  for (const phrase of ["Analyze / explain the repo", "How could I make this change", "Fix this bug", "Where is X", "Refactor / review", "Budget:"]) assert.ok(text.includes(phrase), phrase);
  const model = json("tools/architecture/model.json");
  for (const feature of model.features.items) assert.ok(text.includes(`\`${feature.id}\``), `falta ${feature.id} en el mapa`);
});

test("CLAUDE.md importa AGENTS.md con la sintaxis oficial de Claude Code", () => {
  assert.equal(read("CLAUDE.md").trim(), "@AGENTS.md");
});

test("cada regla del catalogo esta en AGENTS.md y el catalogo valido no tiene problemas de reglas", () => {
  const text = read("AGENTS.md");
  const model = json("tools/architecture/model.json");
  assert.ok(model.rules.length >= 10);
  for (const rule of model.rules) assert.ok(text.includes(`**${rule.id}**`), `falta la regla ${rule.id}`);
});

test("docs/AI.md y su par en espanol tienen la misma estructura y sus enlaces y anclas existen", async () => {
  const { anchors } = await import("./features.mjs");
  const headings = (text) => [...text.matchAll(/^## /gm)].length;
  const en = read("docs/AI.md");
  const es = read("docs/AI.es.md");
  assert.equal(headings(es), headings(en));
  assert.equal([...es.matchAll(/^\| /gm)].length, [...en.matchAll(/^\| /gm)].length);
  const broken = [];
  for (const [path, text] of [["docs/AI.md", en], ["docs/AI.es.md", es]]) {
    for (const [, target, anchor] of text.matchAll(/\]\((?!https?:)([^)#]+)(?:#([^)]+))?\)/g)) {
      const file = join(dirname(join(ROOT, path)), target);
      if (!existsSync(file)) broken.push(`${path}: ${target}`);
      else if (anchor && file.endsWith(".md") && !anchors(readFileSync(file, "utf8")).has(anchor)) broken.push(`${path}: ${target}#${anchor}`);
    }
  }
  assert.deepEqual(broken, []);
  for (const path of ["AGENTS.md", "README.md", "README.es.md"]) assert.match(read(path), /docs\/AI(\.es)?\.md/, path);
});

test("el registro de la prueba con agentes suma lo que dice su resumen", () => {
  const trial = json("tests/orient/toolkit-trial.json");
  const sum = (side, key) => trial.requests.reduce((total, request) => total + request[side][key], 0);
  assert.equal(trial.summary.tokensA, sum("a", "tokens"));
  assert.equal(trial.summary.tokensB, sum("b", "tokens"));
  assert.equal(trial.summary.callsA, sum("a", "calls"));
  assert.equal(trial.summary.callsB, sum("b", "calls"));
  assert.equal(trial.summary.tokenChange, `${Math.round(((trial.summary.tokensB - trial.summary.tokensA) / trial.summary.tokensA) * 100)} %`);
});
