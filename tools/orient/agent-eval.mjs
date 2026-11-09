#!/usr/bin/env node
// Prueba con agentes reales: ¿la tarjeta ayuda a un agente a localizar donde trabajar?
// No llama a ningun modelo: arma los prompts (sin tarjeta y con tarjeta), y puntua lo que
// los agentes respondieron. Quien lanza a los agentes es una persona o su herramienta; el
// protocolo esta en el README ("Con agentes reales").
//
//   node tools/orient/agent-eval.mjs select [--per 10]          ids de las tareas elegidas
//   node tools/orient/agent-eval.mjs prompts --out <dir> --snapshot <ruta> [--per 10]
//                                                              escribe <id>.A.txt y <id>.B.txt
//   node tools/orient/agent-eval.mjs score --answers <dir> [--usage <usage.json>] [--write]
//                                                              puntua <id>.A.json y <id>.B.json
//
// Mide localizacion, no resolucion: el agente dice que archivos cambiaria y que pruebas
// correria. Se compara con los archivos que toco el commit de la tarea.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createOrient } from "./orient.mjs";
import { loadGold } from "./eval.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RECORD = join(ROOT, "tests/orient/agent-eval.json");
// Las dos particiones mas limpias: la ultima (interfaz) y la mas dificil (guarda y analizador SQL).
export const POOLS = ["validation5", "seen4"];

// Eleccion reproducible: de cada particion, cada k-esima tarea por orden de id.
export function select(tasks, per = 10) {
  const out = [];
  for (const split of POOLS) {
    const pool = tasks.filter((task) => task.split === split).sort((a, b) => a.id.localeCompare(b.id));
    const stride = Math.max(1, Math.floor(pool.length / per));
    out.push(...pool.filter((_, i) => i % stride === 0).slice(0, per));
  }
  return out;
}

export function prompt(task, snapshot, card = null) {
  const lines = [
    `You are helping decide where to start working in a codebase. Its files are in ${snapshot} (a plain copy, with no git history; do not use git and do not look outside that folder).`,
    "",
    `Task: ${task.task}`,
    "",
    "Use Read, Grep and Glob as much as you need. Do not run builds or tests.",
  ];
  if (card) lines.push("", "A tool produced this orientation card for the task. It may be incomplete or wrong: verify what you rely on.", "", card);
  lines.push(
    "",
    'Answer with ONLY a JSON object, nothing else: {"files": [up to 5 repository-relative source files you would change first, most important first], "tests": [up to 3 repository-relative test files you would run or update]}.',
  );
  return `${lines.join("\n")}\n`;
}

const norm = (path) => String(path).replace(/^\.?\//, "").replace(/^.*?(?=(app|crates|tools|tests|site|support|docs)\/)/, "");

// Puntuacion de una respuesta: recall@5 como en eval.mjs, precision y pruebas.
export function scoreAnswer(task, answer) {
  const files = [...new Set((answer?.files ?? []).map(norm))].slice(0, 5);
  const tests = [...new Set((answer?.tests ?? []).map(norm))].slice(0, 3);
  const wanted = new Set(task.files);
  const found = files.filter((path) => wanted.has(path)).length;
  return {
    recall: found / Math.min(5, wanted.size),
    precision: files.length ? found / files.length : 0,
    hit: found > 0 ? 1 : 0,
    tests: task.tests.length ? task.tests.filter((path) => tests.includes(path)).length / task.tests.length : null,
  };
}

const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

export function summarize(rows, condition) {
  const own = rows.filter((row) => row[condition]);
  const pick = (key) => mean(own.map((row) => row[condition].score[key]).filter((v) => v !== null && v !== undefined));
  const usage = (key) => mean(own.map((row) => row[condition].usage?.[key]).filter((v) => typeof v === "number"));
  return { tasks: own.length, recall: pick("recall"), precision: pick("precision"), hit: pick("hit"), tests: pick("tests"), tokens: usage("tokens"), toolUses: usage("toolUses"), seconds: usage("durationMs") === null ? null : usage("durationMs") / 1000 };
}

function arg(args, name, fallback) {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : fallback;
}

function main(args) {
  const [mode] = args;
  const per = Number(arg(args, "--per", 10));
  const tasks = select(loadGold().tasks, per);
  if (mode === "select") {
    console.log(tasks.map((task) => `${task.id}\t${task.split}`).join("\n"));
  } else if (mode === "prompts") {
    const out = arg(args, "--out");
    const snapshot = arg(args, "--snapshot");
    if (!out || !snapshot) throw new Error("falta --out o --snapshot");
    mkdirSync(out, { recursive: true });
    const orient = createOrient({ useCache: false, useGraph: false });
    for (const task of tasks) {
      writeFileSync(join(out, `${task.id}.A.txt`), prompt(task, snapshot));
      writeFileSync(join(out, `${task.id}.B.txt`), prompt(task, snapshot, orient.run(task.task).markdown));
    }
    console.log(`${tasks.length * 2} prompts en ${out}`);
  } else if (mode === "score") {
    const dir = arg(args, "--answers");
    const usage = arg(args, "--usage") ? JSON.parse(readFileSync(arg(args, "--usage"), "utf8")) : {};
    const orient = createOrient({ useCache: false, useGraph: false });
    const rows = tasks.map((task) => {
      const row = { id: task.id, split: task.split, card: scoreAnswer(task, { files: orient.run(task.task).primary }) };
      for (const condition of ["A", "B"]) {
        const path = join(dir, `${task.id}.${condition}.json`);
        if (!existsSync(path)) continue;
        let answer = null;
        try {
          answer = JSON.parse(readFileSync(path, "utf8"));
        } catch {}
        row[condition] = { answer, score: scoreAnswer(task, answer), usage: usage[`${task.id}.${condition}`] ?? null };
      }
      return row;
    });
    const result = { A: summarize(rows, "A"), B: summarize(rows, "B"), cardOnly: { recall: mean(rows.map((row) => row.card.recall)), hit: mean(rows.map((row) => row.card.hit)) } };
    console.log(JSON.stringify(result, null, 2));
    if (args.includes("--write")) writeFileSync(RECORD, `${JSON.stringify({ format: 1, about: "Prueba con agentes reales (tools/orient/README, \"Con agentes reales\"). A = sin tarjeta, B = con tarjeta. Mide localizacion, una corrida por condicion.", model: arg(args, "--model", null), summary: result, tasks: rows }, null, 2)}\n`);
  } else {
    console.error("Uso: agent-eval.mjs select | prompts --out <dir> --snapshot <ruta> | score --answers <dir> [--usage <json>] [--write]");
    process.exit(2);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
