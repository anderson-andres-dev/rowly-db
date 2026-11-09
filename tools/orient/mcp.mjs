#!/usr/bin/env node
// Servidor MCP (stdio) del orientador: las mismas herramientas que la linea de comandos,
// para los agentes que descubren servidores MCP por si solos (Claude Code lee .mcp.json
// de la raiz del repositorio). Sin dependencias: JSON-RPC 2.0, un mensaje por linea.
//
//   node tools/orient/mcp.mjs        habla por stdin/stdout; nada mas sale por stdout
//
//   node tools/orient/mcp.mjs --check   comprueba que el servidor responde y mide cada llamada
//
// Herramientas: start, playbook, orient, expand, impact, stack. Todas de solo lectura; el
// resultado es el mismo texto que imprime orient.mjs, solo que aqui el indice vive en
// memoria (session.mjs): la primera llamada lo construye, las siguientes cuestan ~35 ms.
// Detalle: docs/AI.md.
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath, pathToFileURL } from "node:url";
import { playbookFor, startAnswer } from "./orient.mjs";
import { playbookText } from "./playbooks.mjs";
import { createSession } from "./session.mjs";
import { GUIDES, load as loadStack, npmDocsUrl, rustDocsUrl } from "./stack.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const SERVER = { name: "rowly-orient", version: "1" };
export const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];
const TEXT_MAX = 2000;

export const INSTRUCTIONS =
  "Rowly DB agent toolkit. Call `start` first, with the user's request as written, for any change, bug or question about how the code works: one call returns the procedure to follow (what to read, steps, rules, checks) and where it lives (files with line ranges, what to reuse, tests to run). Then `impact` for what else changes before editing something shared, `expand` for one feature's files, and `stack` before using the API of a dependency. It is much cheaper than scanning the repository: open files only to confirm, by line range. The same answers are available from the command line (`node tools/orient/orient.mjs`) if this server is unavailable.";

const string = (description, extra = {}) => ({ type: "string", description, ...extra });
// Claude Code difiere las herramientas MCP detras de ToolSearch; esta marca (documentada en su guia
// de MCP) hace que solo `start` se cargue desde el principio, sin una vuelta extra para encontrarla.
const LOAD_UPFRONT = { "anthropic/alwaysLoad": true };
export const TOOLS = [
  { name: "start", description: "Call this FIRST for any change, bug or question about the code. One call: the procedure for that kind of change (what to read, steps, rules, checks) plus where it lives (files with line ranges, what to reuse, tests to run). Spanish or English.", inputSchema: { type: "object", properties: { request: string("The user's request, as they wrote it"), budget: { type: "number", description: "Token cap of the whole answer (default 2000)" } }, required: ["request"] }, _meta: LOAD_UPFRONT },
  { name: "playbook", description: "The procedure for a kind of change (what to read, steps, rules, checks), found from the user's request in Spanish or English. Falls back to the orientation card when none matches.", inputSchema: { type: "object", properties: { request: string("The user's request, as they wrote it") }, required: ["request"] } },
  { name: "orient", description: "Orientation card for a task: where it lives, line ranges to read, what to reuse, what depends on it, tests to run and whether that is enough.", inputSchema: { type: "object", properties: { task: string("The task or the symptom"), intent: string("Force the kind of task", { enum: ["bug", "feature", "refactor", "analysis", "tests", "modify"] }), budget: { type: "number", description: "Token cap of the card (default 1200)" } }, required: ["task"] } },
  { name: "expand", description: "All the files of one feature with their main symbols and line ranges.", inputSchema: { type: "object", properties: { feature: string("A feature id from the map in AGENTS.md, e.g. results-grid") }, required: ["feature"] } },
  { name: "impact", description: "Who uses a file or feature, whom it uses, and the tests of both. Run it before changing anything shared.", inputSchema: { type: "object", properties: { target: string("A repository path or a feature id") }, required: ["target"] } },
  { name: "stack", description: "The version this repository really resolves for a dependency and where to read the docs of that version. Without a name, lists the key libraries.", inputSchema: { type: "object", properties: { name: string("Part of a crate or npm package name, e.g. tauri, svelte, sqlx") } } },
];

function text(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`\`${name}\` es obligatorio`);
  if (value.length > TEXT_MAX) throw new Error(`\`${name}\` pasa de ${TEXT_MAX} caracteres`);
  return value.trim();
}

function stackText(name, root) {
  const { rust, npm } = loadStack(root);
  const needle = (name ?? "").trim().toLowerCase();
  const rows = [...rust.map((row) => ({ ...row, kind: "crate", url: row.resolved && rustDocsUrl(row) })), ...npm.map((row) => ({ ...row, kind: "npm", url: row.resolved && npmDocsUrl(row) }))];
  const picked = needle ? rows.filter((row) => row.name.toLowerCase().includes(needle)) : rows.filter((row) => GUIDES[row.name]);
  if (!picked.length) return `Ninguna dependencia directa se llama como \`${name}\`. Lista completa: docs/map/STACK.md`;
  return `${picked.map((row) => `- ${row.kind} \`${row.name}\` declared \`${row.req}\`, resolved **${row.resolved ?? "none"}**${row.url ? ` · ${row.url}` : ""}${GUIDES[row.name] ? ` · guide ${GUIDES[row.name][1]}` : ""}`).join("\n")}\n\nThe guide usually follows the latest release: check its version selector against the resolved version.\n`;
}

const sessions = new Map();
const sessionFor = (root) => {
  if (!sessions.has(root)) sessions.set(root, createSession({ root }));
  return sessions.get(root);
};
// Calienta el indice en segundo plano para que la primera llamada del agente ya lo encuentre listo.
export function warm(root = ROOT) {
  try {
    sessionFor(root).get();
  } catch {
    // si falla, la primera llamada lo dira con un mensaje claro
  }
}

// Ejecuta una herramienta y devuelve su texto. Lanza si los argumentos no sirven.
export function callTool(name, args = {}, { root = ROOT } = {}) {
  if (name === "stack") return stackText(args.name, root);
  let orient;
  try {
    orient = sessionFor(root).get();
  } catch (error) {
    throw new Error(`orient necesita Node y un repositorio git para indexar (${error.message.split("\n")[0]}). Alternativa sin servidor: leer AGENTS.md.`);
  }
  const model = orient.prepared.index.model;
  if (name === "start" || name === "playbook") {
    const request = text(args.request, "request");
    const found = playbookFor(request, model);
    if (name === "playbook") return found ? playbookText(found.model, found.pb) : `Ningun playbook coincide con la peticion; esta es la tarjeta.\n\n${orient.run(request).markdown}`;
    const budget = args.budget === undefined ? 2000 : Number(args.budget);
    if (!(budget >= 400 && budget <= 8000)) throw new Error("`budget` debe estar entre 400 y 8000");
    return startAnswer(orient, request, { budget });
  }
  if (name === "orient") {
    const task = text(args.task, "task");
    const budget = args.budget === undefined ? undefined : Number(args.budget);
    if (budget !== undefined && !(budget >= 200 && budget <= 8000)) throw new Error("`budget` debe estar entre 200 y 8000");
    return orient.run(task, { intent: args.intent, budget }).markdown;
  }
  if (name === "expand") return orient.expand(text(args.feature, "feature")).markdown;
  if (name === "impact") return orient.impact(text(args.target, "target")).markdown;
  throw new Error(`herramienta desconocida: ${name}`);
}

const ok = (id, result) => ({ jsonrpc: "2.0", id, result });
const fail = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });

// Una peticion JSON-RPC -> su respuesta (o null si era una notificacion).
export function handle(message, options = {}) {
  const { id, method, params } = message ?? {};
  const notification = id === undefined || id === null;
  if (typeof method !== "string") return notification ? null : fail(id, -32600, "Invalid Request");
  if (method === "initialize") {
    const asked = params?.protocolVersion;
    return ok(id, { protocolVersion: SUPPORTED.includes(asked) ? asked : SUPPORTED[0], capabilities: { tools: {} }, serverInfo: SERVER, instructions: INSTRUCTIONS });
  }
  if (notification) {
    if (method === "notifications/initialized" && options.warm !== false) setImmediate(() => warm(options.root));
    return null;
  }
  if (method === "ping") return ok(id, {});
  if (method === "tools/list") return ok(id, { tools: TOOLS });
  if (method === "tools/call") {
    if (!TOOLS.some((tool) => tool.name === params?.name)) return fail(id, -32602, `Unknown tool: ${params?.name}`);
    try {
      return ok(id, { content: [{ type: "text", text: callTool(params.name, params.arguments ?? {}, options) }] });
    } catch (error) {
      return ok(id, { content: [{ type: "text", text: error.message }], isError: true });
    }
  }
  return fail(id, -32601, `Method not found: ${method}`);
}

// `--check`: lo que haria un cliente, sin cliente. Sale con 1 si algo falla.
export function selfCheck(root = ROOT, log = console.log) {
  let failed = false;
  const step = (label, fn) => {
    const started = performance.now();
    try {
      const out = fn();
      log(`ok    ${label.padEnd(34)} ${String(Math.round(performance.now() - started)).padStart(4)} ms  ${out}`);
    } catch (error) {
      failed = true;
      log(`FALLA ${label}: ${error.message}`);
    }
  };
  const rpc = (method, params) => handle({ jsonrpc: "2.0", id: 1, method, params }, { root, warm: false });
  step("initialize", () => `${rpc("initialize", { protocolVersion: SUPPORTED[0] }).result.serverInfo.name}`);
  step("tools/list", () => `${rpc("tools/list").result.tools.map((tool) => tool.name).join(", ")}`);
  const call = (name, args) => () => {
    const reply = rpc("tools/call", { name, arguments: args }).result;
    if (reply.isError) throw new Error(reply.content[0].text);
    return `${reply.content[0].text.split("\n")[0].slice(0, 60)}`;
  };
  step("start (construye el indice)", call("start", { request: "arregla el bug de la grilla" }));
  step("start (indice en memoria)", call("start", { request: "cambiar un texto de la interfaz" }));
  step("impact", call("impact", { target: "app/src/lib/results/gridAutoScroll.ts" }));
  step("stack", call("stack", { name: "tauri" }));
  log(failed ? "\nEl servidor NO esta bien." : "\nEl servidor esta bien: un cliente MCP puede usarlo con `node tools/orient/mcp.mjs`.");
  return failed ? 1 : 0;
}

function main() {
  if (process.argv.includes("--check")) process.exit(selfCheck());
  const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
  createInterface({ input: process.stdin }).on("line", (line) => {
    if (!line.trim()) return;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return send(fail(null, -32700, "Parse error"));
    }
    const reply = handle(message);
    if (reply) send(reply);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
