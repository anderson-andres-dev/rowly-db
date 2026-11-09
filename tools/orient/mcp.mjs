#!/usr/bin/env node
// Servidor MCP (stdio) del orientador: las mismas herramientas que la linea de comandos,
// para los agentes que descubren servidores MCP por si solos (Claude Code lee .mcp.json
// de la raiz del repositorio). Sin dependencias: JSON-RPC 2.0, un mensaje por linea.
//
//   node tools/orient/mcp.mjs        habla por stdin/stdout; nada mas sale por stdout
//
// Herramientas: playbook, orient, expand, impact, stack. Todas de solo lectura; el
// resultado es el mismo texto que imprime orient.mjs. Detalle: docs/AI.md.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createOrient, playbookFor } from "./orient.mjs";
import { playbookText } from "./playbooks.mjs";
import { GUIDES, load as loadStack, npmDocsUrl, rustDocsUrl } from "./stack.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const SERVER = { name: "rowly-orient", version: "1" };
export const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];
const TEXT_MAX = 2000;

export const INSTRUCTIONS =
  "Rowly DB agent toolkit. For any change or question about how to change something, call `playbook` first with the user's request: it returns the procedure (what to read, steps, rules, checks) or says none matches. Then `orient` for where it lives, which line ranges to read and which tests to run; `expand` for one feature's files, `impact` for what else changes. Call `stack` before using the API of a dependency. Open files only to confirm, by line range.";

const string = (description, extra = {}) => ({ type: "string", description, ...extra });
export const TOOLS = [
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

// Ejecuta una herramienta y devuelve su texto. Lanza si los argumentos no sirven.
export function callTool(name, args = {}, { root = ROOT } = {}) {
  if (name === "stack") return stackText(args.name, root);
  const orient = createOrient({ root });
  if (name === "playbook") {
    const request = text(args.request, "request");
    const found = playbookFor(request, JSON.parse(readFileSync(join(root, "tools/architecture/model.json"), "utf8")));
    return found ? playbookText(found.model, found.pb) : `Ningun playbook coincide con la peticion; esta es la tarjeta.\n\n${orient.run(request).markdown}`;
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
  if (notification) return null;
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

function main() {
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
