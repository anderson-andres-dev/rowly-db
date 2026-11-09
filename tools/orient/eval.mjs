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
//   node tools/orient/eval.mjs --report                          tabla de lo registrado: orient frente a graphify
//   node tools/orient/eval.mjs --check                           control de regresiones (CI): compara con tests/orient/orient.json
//   node tools/orient/eval.mjs --runner orient --split train     mide el orientador (solo train mientras se ajusta)
//   node tools/orient/eval.mjs --runner orient --no-terms        sin el vocabulario curado
//   node tools/orient/eval.mjs --runner orient --no-graph        sin graphify
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
//   basta     (solo orient) cuantas veces declara "LIKELY", y de esas cuantas
//             acierto: `ok` = alguno de los 5 primeros es correcto, `fuerte` = al
//             menos la mitad de los esperados
//   ms        latencia por tarea; p95 sobre todas
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createOrient } from "./orient.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GOLD = join(ROOT, "tests/orient/gold.json");
const NEGATIVES = join(ROOT, "tests/orient/negatives.json");
const SHORT = join(ROOT, "tests/orient/short.json");
const OUT = { graphify: join(ROOT, "tests/orient/baseline.json"), orient: join(ROOT, "tests/orient/orient.json") };
const KINDS = ["bug", "feature", "refactor", "analysis", "modify"];
const SPLITS = ["train", "holdout", "seen", "seen2", "seen3", "seen4", "validation5"];
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
export function score(task, { ranked, text, likely, ms, primary }) {
  // Si la herramienta distingue "lo que propone" de "lo demas que nombra", el orden y la
  // precision se miden solo sobre lo que propone; `todo` sigue contando toda la respuesta.
  const proposed = (primary ?? ranked).filter((path) => !isTestPath(path, task.files));
  const source = ranked.filter((path) => !isTestPath(path, task.files));
  const top = proposed.slice(0, TOP);
  const wanted = new Set(task.files);
  const found = top.filter((path) => wanted.has(path)).length;
  const first = proposed.findIndex((path) => wanted.has(path));
  const out = {
    recall: found / Math.min(TOP, wanted.size),
    precision: top.length ? found / top.length : 0,
    shown: top.length,
    hit: found > 0 ? 1 : 0,
    all: task.files.filter((path) => source.includes(path)).length / wanted.size,
    mrr: first < 0 ? 0 : 1 / (first + 1),
    tokens: tokens(text),
  };
  if (likely !== undefined) out.likely = likely;
  if (ms !== undefined) out.ms = ms;
  if (task.tests.length) {
    const all = new Set(ranked);
    out.tests = task.tests.filter((path) => all.has(path)).length / task.tests.length;
  }
  return out;
}

export function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}

export function summarize(rows) {
  const pick = (key) => mean(rows.filter((row) => row[key] !== undefined).map((row) => row[key]));
  const claimed = rows.filter((row) => row.likely === true);
  const extra = {};
  if (rows.some((row) => row.likely !== undefined)) {
    extra.likelyRate = claimed.length / rows.length;
    extra.likelyOk = claimed.length ? mean(claimed.map((row) => row.hit)) : null;
    extra.likelyStrong = claimed.length ? mean(claimed.map((row) => (row.recall >= 0.5 ? 1 : 0))) : null;
  }
  const times = rows.filter((row) => row.ms !== undefined).map((row) => row.ms);
  if (times.length) extra.p95ms = percentile(times, 0.95);
  return {
    ...extra,
    tasks: rows.length,
    recall: pick("recall"),
    hit: pick("hit"),
    precision: pick("precision"),
    shown: pick("shown"),
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

// Cada runner es una fabrica: recibe las banderas y devuelve `(tarea) -> { ranked, text, ... }`.
const RUNNERS = {
  graphify() {
    return (task) => {
      const run = spawnSync("graphify", ["query", task.task], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
      if (run.error) throw new Error(`no se pudo ejecutar graphify: ${run.error.message}`);
      if (run.status !== 0) throw new Error(`graphify query fallo (${run.status}): ${run.stderr}`);
      return parseGraphify(run.stdout);
    };
  },
  orient(flags) {
    const orient = createOrient({ useCache: false, useTerms: !flags.includes("--no-terms"), useGraph: !flags.includes("--no-graph") });
    return (task) => {
      const started = performance.now();
      const out = orient.run(task.task);
      const ms = performance.now() - started;
      const rest = [...out.files, ...out.tests].filter((path) => !out.primary?.includes(path));
      return { ranked: [...new Set([...(out.primary ?? []), ...rest])], primary: out.primary ?? [], text: out.markdown, likely: out.likely, noMatch: Boolean(out.noMatch), ms };
    };
  },
};

export function loadNegatives() {
  return JSON.parse(readFileSync(NEGATIVES, "utf8")).tasks;
}

// Tareas fuera del alcance: no hay nada correcto que encontrar. Lo que importa es que no
// declare LIKELY; `noMatch` es lo ideal.
export function scoreNegatives(rows) {
  const n = rows.length || 1;
  return {
    tasks: rows.length,
    falseLikely: rows.filter((row) => row.likely).length / n,
    noMatch: rows.filter((row) => row.noMatch).length / n,
    tokens: mean(rows.map((row) => tokens(row.text))),
  };
}

// Compara una medicion con la registrada. Falla solo si algo empeora mas que la tolerancia
// de `fail`; entre `warn` y `fail` avisa. Mejorar nunca falla. Mira los totales, no tarea
// por tarea: renombrar un archivo no debe romper el CI por una tarea.
export function compareRecords(recorded, current, tolerance) {
  const failures = [];
  const warnings = [];
  const rules = [
    ["recall", "rec@5", current.summary.recall, recorded.summary.recall, "down"],
    ["hit", "hit@5", current.summary.hit, recorded.summary.hit, "down"],
    ["tests", "pruebas", current.summary.tests, recorded.summary.tests, "down"],
    ["precision", "precision", current.summary.precision, recorded.summary.precision, "down"],
    ["likelyStrong", "LIKELY fuerte", current.summary.likelyStrong, recorded.summary.likelyStrong, "down"],
    ["falseLikely", "falsa confianza", current.negatives?.falseLikely, recorded.negatives?.falseLikely, "up"],
    ["tokens", "tokens", current.summary.tokens, recorded.summary.tokens, "up-relative"],
    ["short", "consultas cortas hit@5", current.short?.hit, recorded.short?.hit, "down"],
  ];
  for (const [key, label, now, before, direction] of rules) {
    if (now === undefined || now === null || before === undefined || before === null) continue;
    const tol = tolerance[key];
    if (!tol) continue;
    const worse = direction === "down" ? before - now : direction === "up" ? now - before : (now - before) / before;
    const text = `${label}: ${(before * (direction === "up-relative" ? 1 : 100)).toFixed(direction === "up-relative" ? 0 : 1)}${direction === "up-relative" ? "" : " %"} -> ${(now * (direction === "up-relative" ? 1 : 100)).toFixed(direction === "up-relative" ? 0 : 1)}${direction === "up-relative" ? "" : " %"}`;
    if (worse > tol.fail) failures.push(text);
    else if (worse > tol.warn) warnings.push(text);
  }
  return { failures, warnings };
}

// Tabla de Markdown con lo registrado: orient frente a la linea de graphify, por particion.
// Sale de los registros, asi que lo que se cite nunca se escribe a mano.
export function report(orient, baseline) {
  const p = (value) => (value === null || value === undefined ? "-" : `${(value * 100).toFixed(0)} %`);
  const lines = ["| | n | rec@5 | prec | hit@5 | tests | tokens | LIKELY: rate / correct |", "|---|---|---|---|---|---|---|---|"];
  const row = (label, o, g) => {
    lines.push(`| orient ${label} | ${o.tasks} | ${p(o.recall)} | ${p(o.precision)} | ${p(o.hit)} | ${p(o.tests)} | ${Math.round(o.tokens)} | ${p(o.likelyRate)} / ${p(o.likelyStrong)} |`);
    lines.push(`| graphify ${label} | ${g.tasks} | ${p(g.recall)} | - | ${p(g.hit)} | ${p(g.tests)} | ${Math.round(g.tokens)} | - |`);
  };
  for (const part of SPLITS) row(part, orient.bySplit[part], baseline.bySplit[part]);
  row("all", orient.summary, baseline.summary);
  const n = orient.negatives;
  if (n) lines.push("", `Out-of-scope tasks (${n.tasks}): false LIKELY ${p(n.falseLikely)}, NO MATCH ${p(n.noMatch)}.`);
  return `${lines.join("\n")}\n`;
}

export function loadShort() {
  return JSON.parse(readFileSync(SHORT, "utf8")).tasks;
}

// Consultas de una o dos palabras: lo que importa es que no acaben en NO MATCH y que algun
// archivo correcto este entre los propuestos.
export function scoreShort(rows) {
  const n = rows.length || 1;
  return { tasks: rows.length, hit: rows.filter((row) => row.hit).length / n, noMatch: rows.filter((row) => row.noMatch).length / n };
}

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
  `${label.padEnd(10)} ${String(s.tasks).padStart(3)}  ${pct(s.recall)} ${pct(s.precision)} ${pct(s.hit)} ${pct(s.all)} ${(s.mrr ?? 0).toFixed(2)}  ${pct(s.tests)} ${String(Math.round(s.tokens)).padStart(6)}${s.shown === undefined || s.shown === null ? "" : `  ${s.shown.toFixed(1)}`}`;

// Tolerancias del control de regresiones: caer mas que `warn` avisa; mas que `fail` falla.
export const DEFAULT_TOLERANCE = {
  recall: { warn: 0.02, fail: 0.06 },
  hit: { warn: 0.03, fail: 0.08 },
  tests: { warn: 0.04, fail: 0.1 },
  precision: { warn: 0.03, fail: 0.08 },
  likelyStrong: { warn: 0.05, fail: 0.12 },
  falseLikely: { warn: 0.05, fail: 0.15 },
  tokens: { warn: 0.15, fail: 0.5 },
  short: { warn: 0.1, fail: 0.25 },
};

const NEGATIVE_SPLITS = ["train", "seen", "seen2", "seen3", "seen4"];

function measure(name, run, tasks, only = null) {
  const results = tasks.map((task) => ({ task, ...score(task, run(task)) }));
  let negatives = null;
  if (name === "orient") {
    // Con `--split` solo se miden las negativas de esa particion: nada de la validacion se
    // mira mientras se ajusta.
    const rows = loadNegatives().filter((task) => !only || task.split === only).map((task) => ({ split: task.split, ...run(task) }));
    negatives = { ...scoreNegatives(rows), bySplit: Object.fromEntries(NEGATIVE_SPLITS.filter((part) => rows.some((row) => row.split === part)).map((part) => [part, scoreNegatives(rows.filter((row) => row.split === part))])) };
  }
  let short = null;
  if (name === "orient") {
    const rows = loadShort()
      .filter((task) => !only || task.split === only)
      .map((task) => {
        const out = run(task);
        return { hit: task.files.some((path) => (out.primary ?? []).includes(path)), noMatch: Boolean(out.noMatch) };
      });
    short = scoreShort(rows);
  }
  return { results, negatives, short };
}

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

  // Control de regresiones: mide el orientador (sin graphify, reproducible) y lo compara con
  // lo registrado en tests/orient/orient.json. Mejorar nunca falla; empeorar mas que la
  // tolerancia del registro, si. Tras un cambio intencional: --runner orient --no-graph --write.
  if (args.includes("--check")) {
    const recorded = JSON.parse(readFileSync(OUT.orient, "utf8"));
    const run = RUNNERS.orient(["--no-graph"]);
    const { results, negatives, short } = measure("orient", run, gold.tasks);
    const current = { summary: summarize(results), negatives, short };
    const { failures, warnings } = compareRecords(recorded, current, recorded.tolerance ?? DEFAULT_TOLERANCE);
    const annotate = process.env.GITHUB_ACTIONS ? (kind, text) => `::${kind}::orient ${text}` : (kind, text) => `${kind === "error" ? "FALLA" : "aviso"}: ${text}`;
    for (const text of warnings) console.log(annotate("warning", text));
    for (const text of failures) console.error(annotate("error", text));
    console.log(`orient: rec@5 ${pct(current.summary.recall).trim()} · hit@5 ${pct(current.summary.hit).trim()} · pruebas ${pct(current.summary.tests).trim()} · precision ${pct(current.summary.precision).trim()} · falsa confianza ${pct(negatives.falseLikely).trim()} (registrado ${pct(recorded.summary.recall).trim()} rec@5)`);
    if (failures.length) {
      console.error("Empeoro mas que la tolerancia de tests/orient/orient.json. Si es intencional: node tools/orient/eval.mjs --runner orient --no-graph --write");
      process.exit(1);
    }
    return;
  }

  if (args.includes("--report")) {
    process.stdout.write(report(JSON.parse(readFileSync(OUT.orient, "utf8")), JSON.parse(readFileSync(OUT.graphify, "utf8"))));
    return;
  }

  const name = args[args.indexOf("--runner") + 1];
  const runner = RUNNERS[name];
  if (!args.includes("--runner") || !runner) {
    console.error(`Uso: eval.mjs --check-gold | --check | --report | --runner <${Object.keys(RUNNERS).join("|")}> [--split train|holdout|seen|seen2|seen3|seen4|validation5] [--verbose] [--write]`);
    process.exit(2);
  }
  const split = args.includes("--split") ? args[args.indexOf("--split") + 1] : null;
  const tasks = gold.tasks.filter((task) => !split || task.split === split);

  const { results, negatives, short } = measure(name, runner(args), tasks, split);
  console.log(`Runner: ${name}${split ? ` · ${split}` : ""}`);
  console.log(`${"".padEnd(10)} ${"n".padStart(3)}  ${`rec@${TOP}`.padEnd(5)} prec  ${`hit@${TOP}`.padEnd(5)} todo  MRR   tests  tokens  shown`);
  console.log(row("todas", summarize(results)));
  for (const kind of KINDS) {
    const rows = results.filter((result) => result.task.kind === kind);
    if (rows.length) console.log(row(kind, summarize(rows)));
  }
  if (!split) {
    for (const part of SPLITS) console.log(row(part, summarize(results.filter((result) => result.task.split === part))));
  }
  const total = summarize(results);
  if (total.likelyRate !== undefined) {
    console.log(`basta: lo declara en ${pct(total.likelyRate).trim()} de las tareas; de esas, ok ${pct(total.likelyOk).trim()} · fuerte ${pct(total.likelyStrong).trim()} · p95 ${Math.round(total.p95ms)} ms`);
  }
  if (negatives) {
    const part = (name) => (negatives.bySplit[name] ? ` · ${name} ${pct(negatives.bySplit[name].falseLikely).trim()}/${pct(negatives.bySplit[name].noMatch).trim()}` : "");
    console.log(`negativas (${negatives.tasks}): falsa confianza ${pct(negatives.falseLikely).trim()} · NO MATCH ${pct(negatives.noMatch).trim()} · ${Math.round(negatives.tokens)} tokens · (falsa confianza/NO MATCH)${NEGATIVE_SPLITS.map(part).join("")}`);
  }
  if (short) console.log(`cortas (${short.tasks}): hit@5 ${pct(short.hit).trim()} · NO MATCH ${pct(short.noMatch).trim()}`);
  if (args.includes("--verbose")) {
    for (const result of results) {
      console.log(`${result.task.id.padEnd(34)} rec ${pct(result.recall)} prec ${pct(result.precision)} mrr ${result.mrr.toFixed(2)} tokens ${result.tokens}${result.likely === undefined ? "" : result.likely ? " basta" : ""}`);
    }
  }

  if (args.includes("--write")) {
    const graph = name === "graphify" ? JSON.parse(readFileSync(join(ROOT, "graphify-out/graph.json"), "utf8")) : null;
    let tolerance = DEFAULT_TOLERANCE;
    try {
      tolerance = JSON.parse(readFileSync(OUT[name], "utf8")).tolerance ?? DEFAULT_TOLERANCE;
    } catch {}
    const record = {
      format: 2,
      about:
        name === "graphify"
          ? "Linea de referencia: lo que mide `graphify query` sobre tests/orient/gold.json. Se regenera con `node tools/orient/eval.mjs --runner graphify --write`; el orientador se compara contra esto."
          : "Lo que mide el orientador sobre tests/orient/gold.json y negatives.json. Se regenera con `node tools/orient/eval.mjs --runner orient --no-graph --write`; `eval.mjs --check` (CI) compara contra esto con `tolerance`. Los pesos de tools/orient/retrieve.mjs se ajustaron solo contra `train`.",
      runner: name,
      ...(graph ? { graphBuiltAt: graph.built_at_commit ?? null, graphNodes: graph.nodes.length } : { variant: args.filter((arg) => arg.startsWith("--no-")), tolerance }),
      summary: summarize(results),
      ...(negatives ? { negatives } : {}),
      ...(short ? { short } : {}),
      byKind: Object.fromEntries(KINDS.map((kind) => [kind, summarize(results.filter((result) => result.task.kind === kind))])),
      bySplit: Object.fromEntries(SPLITS.map((part) => [part, summarize(results.filter((result) => result.task.split === part))])),
      tasks: results.map(({ task, ...metrics }) => ({ id: task.id, ...metrics })),
    };
    writeFileSync(OUT[name], `${JSON.stringify(record, null, 2)}\n`);
    console.log(`Escrito ${OUT[name].replace(`${ROOT}/`, "")}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
