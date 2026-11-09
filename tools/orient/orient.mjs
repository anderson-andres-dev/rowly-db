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
//   --json              la tarjeta como JSON, para otras herramientas
//   --no-graph          ignora graphify-out/graph.json aunque exista
//   --no-terms          sin el vocabulario curado (para medir cuanto aporta)
//   --rebuild           rehace el indice desde cero
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

function main(args) {
  const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const valued = new Set(["--intent", "--budget", "--expand", "--impact"]);
  const task = args.filter((arg, i) => !arg.startsWith("--") && !valued.has(args[i - 1])).join(" ").trim();
  const wantsCard = Boolean(task);
  if (!wantsCard && !flag("--expand") && !flag("--impact")) {
    console.error('Uso: orient.mjs "<tarea>" | --expand <feature> | --impact <ruta|feature>   [--intent T] [--budget N] [--json] [--no-graph] [--no-terms] [--rebuild]');
    process.exit(2);
  }
  const orient = createOrient({ rebuild: args.includes("--rebuild"), useTerms: !args.includes("--no-terms"), useGraph: !args.includes("--no-graph") });
  const budget = flag("--budget") ? Number(flag("--budget")) : undefined;
  const out = flag("--expand") ? orient.expand(flag("--expand"), budget) : flag("--impact") ? orient.impact(flag("--impact"), budget) : orient.run(task, { intent: flag("--intent"), budget });
  if (args.includes("--json")) console.log(JSON.stringify({ ...out, lines: undefined }, null, 2));
  else process.stdout.write(out.markdown);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
