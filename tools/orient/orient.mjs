#!/usr/bin/env node
// Orientacion para cualquier tarea: bug, funcionalidad nueva, cambio,
// refactor, pruebas o una pregunta sobre el proyecto. Recibe la descripcion y
// devuelve una tarjeta pequena: donde esta, que rango leer, que reutilizar, que
// lo toca, que pruebas correr y si con eso basta. Sin servicios ni modelos: el
// indice sale del repositorio y graphify es un extra opcional.
//
//   node tools/orient/orient.mjs "<tarea>"            tarjeta (nivel 0)
//   node tools/orient/orient.mjs --expand <feature>   sus archivos con simbolos (nivel 1)
//   node tools/orient/orient.mjs --impact <ruta|feature>   quien la usa y a quien usa (nivel 2)
//
//   --intent bug|feature|refactor|analysis|tests|modify   fuerza el tipo de tarea
//   --budget <tokens>   tope de la tarjeta (1200 por defecto)
//   --json              JSON con esquema versionado (README, "El contrato --json"); --with-markdown suma el texto
//   --log               agrega la consulta a .orient/log.jsonl (o ORIENT_LOG=<ruta>); solo local
//   --feedback good|partial|bad [nota]   marca la ultima consulta registrada
//   --no-graph          ignora graphify-out/graph.json aunque exista
//   --no-terms          sin el vocabulario curado (para medir cuanto aporta)
//   --rebuild           rehace el indice desde cero
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { BUDGET, card, expand, impact } from "./card.mjs";
import { loadGraph } from "./graphify.mjs";
import { loadIndex } from "./index.mjs";
import { prepare, retrieve } from "./retrieve.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function createOrient({ root = ROOT, useCache = true, rebuild = false, useTerms = true, useGraph = true, params, graph: injected } = {}) {
  const { index, stats } = loadIndex({ root, useCache, rebuild });
  const prepared = prepare(index, { useTerms });
  const graph = injected ?? (useGraph ? loadGraph(root) : null);
  return {
    stats,
    prepared,
    graph: Boolean(graph),
    run(task, { intent, budget = BUDGET } = {}) {
      return card(prepared, retrieve(prepared, task, params), task, { intent, budget, graph });
    },
    expand: (id, budget) => expand(prepared, id, budget),
    impact: (target, budget) => impact(prepared, target, budget),
  };
}

// El contrato `--json` (version 1): estas claves y no otras. Cambiarlas es subir `schemaVersion`.
export const SCHEMA_VERSION = 1;
export const CARD_KEYS = ["schemaVersion", "kind", "intent", "confidence", "likely", "noMatch", "primary", "files", "tests", "tokens"];
export const LEVEL_KEYS = ["expand", "impact"];

export function toJson(kind, out, { withMarkdown = false } = {}) {
  const json =
    kind === "card"
      ? {
          schemaVersion: SCHEMA_VERSION,
          kind,
          intent: out.intent,
          confidence: { level: out.confidence.level, margin: out.confidence.margin, coverage: out.confidence.coverage, evidence: out.confidence.evidence },
          likely: Boolean(out.likely),
          noMatch: Boolean(out.noMatch),
          primary: out.primary ?? [],
          files: out.files ?? [],
          tests: out.tests ?? [],
          tokens: out.tokens ?? null,
        }
      : { schemaVersion: SCHEMA_VERSION, kind, files: out.files ?? [], tests: out.tests ?? [], tokens: out.tokens ?? null };
  return withMarkdown ? { ...json, markdown: out.markdown } : json;
}

// Registro opcional y local: una linea JSON por consulta. Nunca sale de la maquina.
export function logEntry(path, entry) {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
}

// Marca la ultima consulta registrada: good | partial | bad, con una nota opcional.
export function giveFeedback(path, verdict, note = "") {
  if (!["good", "partial", "bad"].includes(verdict)) throw new Error("el veredicto debe ser good, partial o bad");
  if (!existsSync(path)) throw new Error("no hay registro: consulta antes con --log");
  const lines = readFileSync(path, "utf8").split("\n").filter(Boolean);
  const last = JSON.parse(lines.pop());
  lines.push(JSON.stringify({ ...last, feedback: verdict, ...(note ? { note } : {}) }));
  writeFileSync(path, `${lines.join("\n")}\n`);
  return last;
}

function main(args) {
  const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const logPath = process.env.ORIENT_LOG && process.env.ORIENT_LOG !== "1" ? process.env.ORIENT_LOG : join(ROOT, ".orient/log.jsonl");
  const logging = args.includes("--log") || Boolean(process.env.ORIENT_LOG);
  if (args.includes("--feedback")) {
    const at = args.indexOf("--feedback");
    try {
      giveFeedback(logPath, args[at + 1], args.slice(at + 2).join(" "));
      console.log(`registrado: ${args[at + 1]}`);
    } catch (error) {
      console.error(error.message);
      process.exit(2);
    }
    return;
  }
  const valued = new Set(["--intent", "--budget", "--expand", "--impact"]);
  const task = args.filter((arg, i) => !arg.startsWith("--") && !valued.has(args[i - 1])).join(" ").trim();
  const wantsCard = Boolean(task);
  if (!wantsCard && !flag("--expand") && !flag("--impact")) {
    console.error('Uso: orient.mjs "<tarea>" | --expand <feature> | --impact <ruta|feature>   [--intent T] [--budget N] [--json [--with-markdown]] [--log] [--no-graph] [--no-terms] [--rebuild]\n     orient.mjs --feedback good|partial|bad [nota]');
    process.exit(2);
  }
  const orient = createOrient({ rebuild: args.includes("--rebuild"), useTerms: !args.includes("--no-terms"), useGraph: !args.includes("--no-graph") });
  const budget = flag("--budget") ? Number(flag("--budget")) : undefined;
  const kind = flag("--expand") ? "expand" : flag("--impact") ? "impact" : "card";
  const out = kind === "expand" ? orient.expand(flag("--expand"), budget) : kind === "impact" ? orient.impact(flag("--impact"), budget) : orient.run(task, { intent: flag("--intent"), budget });
  if (logging) {
    logEntry(logPath, { kind, task: kind === "card" ? task : flag("--expand") ?? flag("--impact"), level: out.confidence?.level ?? null, likely: Boolean(out.likely), primary: out.primary ?? out.files?.slice(0, 5) ?? [], tests: out.tests ?? [] });
  }
  if (args.includes("--json")) console.log(JSON.stringify(toJson(kind, out, { withMarkdown: args.includes("--with-markdown") }), null, 2));
  else process.stdout.write(out.markdown);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
