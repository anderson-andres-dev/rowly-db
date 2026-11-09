#!/usr/bin/env node
// Prueba de oro del orientador: mide cuanto acierta una herramienta de
// orientacion contra tareas que ya se resolvieron en el historial.
//
// Cada tarea de tests/orient/gold.json sale de un PR o commit real: `files` son
// los archivos de codigo que toco (la respuesta correcta) y `tests` los de
// prueba. Una herramienta (un "runner") recibe el texto de la tarea y devuelve
// los archivos que propone, en orden. Aqui se mide ese orden.
//
//   node tools/orient/eval.mjs --check-gold                 valida el conjunto de oro
//   node tools/orient/eval.mjs --runner graphify            mide `graphify query`
//   node tools/orient/eval.mjs --runner graphify --write    guarda tests/orient/baseline.json
//   node tools/orient/eval.mjs --runner graphify --split holdout --verbose
//
// Metricas (por tarea, luego promedio):
//   recall@5  de los archivos correctos, cuantos estan entre los 5 primeros
//             (sobre min(5, cuantos hay): una tarea de 2 archivos puede dar 1.0)
//   hit@5     1 si al menos uno de los 5 primeros es correcto
//   todo      de los archivos correctos, cuantos aparecen en cualquier parte de la
//             respuesta (lo que veria un agente que la lee entera)
//   MRR       1 / posicion del primer archivo correcto (0 si no sale)
//   tests     de las pruebas correctas, cuantas aparecen en la respuesta
//   tokens    tamano de la respuesta, caracteres / 4
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GOLD = join(ROOT, "tests/orient/gold.json");
const BASELINE = join(ROOT, "tests/orient/baseline.json");
const KINDS = ["bug", "feature", "refactor", "analysis"];
const SPLITS = ["train", "holdout"];
const TOP = 5;

// Un archivo de prueba: por nombre o por carpeta, salvo que la tarea lo cuente
// como parte de la respuesta (`app/tests/e2e/resources.mjs` es un caso asi).
export function isTestPath(path, expected = []) {
  if (expected.includes(path)) return false;
  return /\.test\.[a-z]+$/.test(path) || /(^|\/)tests?\//.test(path);
}

export function tokens(text) {
  return Math.ceil(text.length / 4);
}

// `ranked`: archivos propuestos, sin repetir y en orden. `text`: lo que se le
// entregaria al agente, para medir su tamano.
export function score(task, { ranked, text }) {
  const source = ranked.filter((path) => !isTestPath(path, task.files));
  const top = source.slice(0, TOP);
  const wanted = new Set(task.files);
  const found = top.filter((path) => wanted.has(path)).length;
  const first = source.findIndex((path) => wanted.has(path));
  const out = {
    recall: found / Math.min(TOP, wanted.size),
    hit: found > 0 ? 1 : 0,
    all: task.files.filter((path) => source.includes(path)).length / wanted.size,
    mrr: first < 0 ? 0 : 1 / (first + 1),
    tokens: tokens(text),
  };
  if (task.tests.length) {
    const all = new Set(ranked);
    out.tests = task.tests.filter((path) => all.has(path)).length / task.tests.length;
  }
  return out;
}

export function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function summarize(rows) {
  const pick = (key) => mean(rows.filter((row) => row[key] !== undefined).map((row) => row[key]));
  return {
    tasks: rows.length,
    recall: pick("recall"),
    hit: pick("hit"),
    all: pick("all"),
    mrr: pick("mrr"),
    tests: pick("tests"),
    tokens: pick("tokens"),
  };
}

// `graphify query "<tarea>"`: lineas `NODE etiqueta [src=ruta loc=... ]`. Los
// archivos salen en el orden en que el recorrido los nombra por primera vez.
export function parseGraphify(text) {
  const ranked = [];
  for (const match of text.matchAll(/^NODE .*?\[src=(\S+)/gm)) {
    if (!ranked.includes(match[1])) ranked.push(match[1]);
  }
  return { ranked, text };
}

const RUNNERS = {
  graphify(task) {
    const run = spawnSync("graphify", ["query", task.task], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (run.error) throw new Error(`no se pudo ejecutar graphify: ${run.error.message}`);
    if (run.status !== 0) throw new Error(`graphify query fallo (${run.status}): ${run.stderr}`);
    return parseGraphify(run.stdout);
  },
};

export function loadGold() {
  return JSON.parse(readFileSync(GOLD, "utf8"));
}

// Problemas del conjunto de oro; vacio si esta bien formado.
export function gold_problems(gold, tracked) {
  const problems = [];
  const seen = new Set();
  for (const task of gold.tasks) {
    const where = task.id ?? "(sin id)";
    if (!task.id || seen.has(task.id)) problems.push(`${where}: id ausente o repetido`);
    seen.add(task.id);
    if (!KINDS.includes(task.kind)) problems.push(`${where}: kind \`${task.kind}\` no es ${KINDS.join("|")}`);
    if (!SPLITS.includes(task.split)) problems.push(`${where}: split \`${task.split}\` no es ${SPLITS.join("|")}`);
    if (!task.task || task.task.length < 20) problems.push(`${where}: el texto de la tarea falta o es muy corto`);
    if (!Array.isArray(task.files) || task.files.length === 0) problems.push(`${where}: sin archivos esperados`);
    if (!Array.isArray(task.tests)) problems.push(`${where}: \`tests\` debe ser una lista`);
    for (const path of [...(task.files ?? []), ...(task.tests ?? [])]) {
      if (!tracked.has(path)) problems.push(`${where}: ${path} no existe en el repositorio`);
    }
  }
  return problems;
}

function trackedFiles() {
  return new Set(execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean));
}

const pct = (value) => (value === null || value === undefined ? "  -  " : `${(value * 100).toFixed(0).padStart(3)}% `);
const row = (label, s) =>
  `${label.padEnd(10)} ${String(s.tasks).padStart(3)}  ${pct(s.recall)} ${pct(s.hit)} ${pct(s.all)} ${(s.mrr ?? 0).toFixed(2)}  ${pct(s.tests)} ${String(Math.round(s.tokens)).padStart(6)}`;

function main(args) {
  const gold = loadGold();
  if (args.includes("--check-gold")) {
    const problems = gold_problems(gold, trackedFiles());
    if (problems.length) {
      console.error(problems.join("\n"));
      process.exit(1);
    }
    const count = (key, value) => gold.tasks.filter((task) => task[key] === value).length;
    console.log(`Conjunto de oro correcto: ${gold.tasks.length} tareas.`);
    console.log(KINDS.map((kind) => `${kind} ${count("kind", kind)}`).join(" · "));
    console.log(SPLITS.map((split) => `${split} ${count("split", split)}`).join(" · "));
    return;
  }

  const name = args[args.indexOf("--runner") + 1];
  const runner = RUNNERS[name];
  if (!args.includes("--runner") || !runner) {
    console.error(`Uso: eval.mjs --check-gold | --runner <${Object.keys(RUNNERS).join("|")}> [--split train|holdout] [--verbose] [--write]`);
    process.exit(2);
  }
  const split = args.includes("--split") ? args[args.indexOf("--split") + 1] : null;
  const tasks = gold.tasks.filter((task) => !split || task.split === split);

  const results = tasks.map((task) => ({ task, ...score(task, runner(task)) }));
  console.log(`Runner: ${name}${split ? ` · ${split}` : ""}`);
  console.log(`${"".padEnd(10)} ${"n".padStart(3)}  ${`rec@${TOP}`.padEnd(5)} ${`hit@${TOP}`.padEnd(5)} todo  MRR   tests  tokens`);
  console.log(row("todas", summarize(results)));
  for (const kind of KINDS) {
    const rows = results.filter((result) => result.task.kind === kind);
    if (rows.length) console.log(row(kind, summarize(rows)));
  }
  if (!split) {
    for (const part of SPLITS) console.log(row(part, summarize(results.filter((result) => result.task.split === part))));
  }
  if (args.includes("--verbose")) {
    for (const result of results) {
      console.log(`${result.task.id.padEnd(34)} rec ${pct(result.recall)} mrr ${result.mrr.toFixed(2)} tokens ${result.tokens}`);
    }
  }

  if (args.includes("--write")) {
    const graph = JSON.parse(readFileSync(join(ROOT, "graphify-out/graph.json"), "utf8"));
    const record = {
      format: 1,
      about: "Linea de referencia: lo que mide `graphify query` sobre tests/orient/gold.json. Se regenera con `node tools/orient/eval.mjs --runner graphify --write`; el orientador se compara contra esto.",
      runner: name,
      graphBuiltAt: graph.built_at_commit ?? null,
      graphNodes: graph.nodes.length,
      summary: summarize(results),
      byKind: Object.fromEntries(KINDS.map((kind) => [kind, summarize(results.filter((result) => result.task.kind === kind))])),
      bySplit: Object.fromEntries(SPLITS.map((part) => [part, summarize(results.filter((result) => result.task.split === part))])),
      tasks: results.map(({ task, ...metrics }) => ({ id: task.id, ...metrics })),
    };
    writeFileSync(BASELINE, `${JSON.stringify(record, null, 2)}\n`);
    console.log(`Escrito ${BASELINE.replace(`${ROOT}/`, "")}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
