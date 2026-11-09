import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { INSTRUCTIONS, SERVER, SUPPORTED, TOOLS, callTool, handle, selfCheck } from "./mcp.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const call = (name, args) => handle({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } });

test("initialize devuelve la version pedida si la soporta, y la mas nueva si no, con instrucciones", () => {
  const init = (protocolVersion) => handle({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion } }).result;
  assert.equal(init("2024-11-05").protocolVersion, "2024-11-05");
  assert.equal(init("1999-01-01").protocolVersion, SUPPORTED[0]);
  assert.deepEqual(init(SUPPORTED[0]).serverInfo, SERVER);
  assert.equal(init(SUPPORTED[0]).instructions, INSTRUCTIONS);
  assert.deepEqual(init(SUPPORTED[0]).capabilities, { tools: {} });
});

test("las notificaciones no se contestan; ping, metodo desconocido y mensaje invalido si", () => {
  assert.equal(handle({ jsonrpc: "2.0", method: "notifications/initialized" }), null);
  assert.deepEqual(handle({ jsonrpc: "2.0", id: 7, method: "ping" }).result, {});
  assert.equal(handle({ jsonrpc: "2.0", id: 8, method: "nope" }).error.code, -32601);
  assert.equal(handle({ jsonrpc: "2.0", id: 9 }).error.code, -32600);
  assert.equal(handle({ jsonrpc: "2.0", method: "nope" }), null);
});

test("tools/list expone las seis herramientas con esquema, `start` la primera, y las obligatorias existen", () => {
  const { tools } = handle({ jsonrpc: "2.0", id: 1, method: "tools/list" }).result;
  assert.deepEqual(tools.map((tool) => tool.name), ["start", "playbook", "orient", "expand", "impact", "stack"]);
  for (const tool of tools) {
    assert.equal(tool.inputSchema.type, "object");
    assert.ok(tool.description.length > 20);
    for (const key of tool.inputSchema.required ?? []) assert.ok(tool.inputSchema.properties[key], `${tool.name}.${key}`);
  }
  assert.equal(TOOLS.length, 6);
  assert.match(INSTRUCTIONS, /Call `start` first/);
  assert.deepEqual(tools.filter((tool) => tool._meta?.["anthropic/alwaysLoad"]).map((tool) => tool.name), ["start", "stack"]);
});

test("playbook, orient, expand, impact y stack devuelven lo mismo que la linea de comandos", () => {
  assert.match(callTool("playbook", { request: "arregla el bug de la grilla" }), /^# Playbook: fix-bug/);
  assert.match(callTool("playbook", { request: "xyzzy plugh" }), /Ningun playbook coincide/);
  assert.match(callTool("orient", { task: "la grilla no hace scroll al arrastrar la seleccion" }), /results-grid/);
  assert.match(callTool("expand", { feature: "results-grid" }), /DataGrid\.svelte/);
  assert.match(callTool("impact", { target: "app/src/lib/results/gridAutoScroll.ts" }), /gridAutoScroll/);
  const stack = callTool("stack", { name: "tauri" });
  assert.match(stack, /resolved \*\*\d+\.\d+\.\d+\*\*/);
  assert.match(stack, /docs\.rs\/tauri\/\d/);
  assert.match(callTool("stack", {}), /svelte/);
  assert.match(callTool("stack", { name: "no-existe-xyz" }), /Ninguna dependencia/);
});

test("start junta el procedimiento y la tarjeta en una llamada, y sin procedimiento da solo la tarjeta", () => {
  const both = callTool("start", { request: "arregla el bug de la grilla que no hace scroll" });
  assert.match(both, /^# Playbook: fix-bug/);
  assert.match(both, /# orient:/);
  assert.ok(both.length / 4 < 2600, "cabe en el presupuesto de start");
  assert.match(both, /Stop rule:/);
  assert.match(callTool("playbook", { request: "arregla el bug de la grilla" }), /^(?![\s\S]*Stop rule)/, "el playbook solo no lleva la regla");
  const card = callTool("start", { request: "xyzzy plugh" });
  assert.match(card, /^# orient:/);
  assert.doesNotMatch(card, /# Playbook:/);
});

test("la tarjeta del servidor es la de la linea de comandos, palabra por palabra", () => {
  for (const task of ["la grilla no hace scroll al arrastrar la seleccion", "cambiar el texto de un boton de la interfaz"]) {
    const cli = execFileSync("node", [join(ROOT, "tools/orient/orient.mjs"), task], { cwd: ROOT, encoding: "utf8" });
    assert.ok(cli.startsWith(callTool("orient", { task })), task);
  }
});

test("argumentos invalidos dan un resultado con isError, no una caida", () => {
  for (const [name, args] of [["playbook", {}], ["orient", { task: "" }], ["orient", { task: "x".repeat(3000) }], ["orient", { task: "algo", budget: 5 }], ["expand", { feature: 3 }], ["start", { request: "algo" , budget: 10 }]]) {
    const reply = call(name, args);
    assert.equal(reply.result.isError, true, `${name} ${JSON.stringify(args).slice(0, 30)}`);
    assert.ok(reply.result.content[0].text.length > 5);
  }
  assert.equal(call("herramienta-falsa", {}).error.code, -32602);
});

test("el proceso habla JSON-RPC por stdio, una linea por mensaje, y no escribe nada mas en stdout", async () => {
  const child = spawn("node", [join(ROOT, "tools/orient/mcp.mjs")], { cwd: ROOT, stdio: ["pipe", "pipe", "inherit"] });
  const lines = [];
  let buffer = "";
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    const parts = buffer.split("\n");
    buffer = parts.pop();
    lines.push(...parts);
  });
  const send = (message) => child.stdin.write(`${JSON.stringify(message)}\n`);
  send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: SUPPORTED[0] } });
  send({ jsonrpc: "2.0", method: "notifications/initialized" });
  send({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "stack", arguments: { name: "svelte" } } });
  child.stdin.write("esto no es json\n");
  for (let waited = 0; lines.length < 3 && waited < 5000; waited += 50) await new Promise((resolve) => setTimeout(resolve, 50));
  child.kill();
  const replies = lines.map((line) => JSON.parse(line));
  assert.deepEqual(replies.map((reply) => reply.id), [1, 2, null]);
  assert.equal(replies[2].error.code, -32700);
});

test("--check recorre lo que haria un cliente y avisa cuando algo falla", () => {
  const lines = [];
  assert.equal(selfCheck(ROOT, (line) => lines.push(line)), 0);
  assert.ok(lines.filter((line) => line.startsWith("ok")).length >= 6);
  assert.match(lines.at(-1), /esta bien/);
  const broken = [];
  assert.equal(selfCheck(join(ROOT, "tools"), (line) => broken.push(line)), 1);
  assert.match(broken.join("\n"), /FALLA/);
  assert.match(broken.at(-1), /NO esta bien/);
});

test(".mcp.json apunta a este servidor con un script que existe y ningun secreto", () => {
  const raw = readFileSync(join(ROOT, ".mcp.json"), "utf8");
  const config = JSON.parse(raw);
  const server = config.mcpServers["rowly-orient"];
  assert.equal(server.command, "node");
  assert.ok(existsSync(join(ROOT, server.args[0])));
  assert.equal(Object.keys(config.mcpServers).length, 1);
  assert.doesNotMatch(raw, /token|key|secret|password/i);
});
