// El contrato hacia afuera: el JSON versionado y el registro opcional.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { CARD_KEYS, SCHEMA_VERSION, createOrient, giveFeedback, logEntry, toJson } from "./orient.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cli = (args, env = {}) => spawnSync("node", [join(ROOT, "tools/orient/orient.mjs"), ...args], { cwd: ROOT, encoding: "utf8", env: { ...process.env, ...env } });

test("el JSON de una tarjeta tiene exactamente las claves del contrato v1", () => {
  const orient = createOrient({ useCache: false, useGraph: false });
  const json = toJson("card", orient.run("la grilla no hace scroll al arrastrar la seleccion"));
  assert.deepEqual(Object.keys(json), CARD_KEYS);
  assert.equal(json.schemaVersion, SCHEMA_VERSION);
  assert.equal(json.kind, "card");
  assert.deepEqual(Object.keys(json.confidence), ["level", "margin", "coverage", "evidence"]);
  assert.equal(typeof json.likely, "boolean");
  assert.equal(typeof json.noMatch, "boolean");
  for (const key of ["primary", "files", "tests"]) assert.ok(Array.isArray(json[key]) && json[key].every((item) => typeof item === "string"), key);
  assert.equal(json.markdown, undefined);
  assert.equal(toJson("card", orient.run("la grilla no hace scroll"), { withMarkdown: true }).markdown.startsWith("# orient:"), true);
});

test("expand e impact comparten esquema y no traen claves de tarjeta", () => {
  const orient = createOrient({ useCache: false, useGraph: false });
  for (const [kind, out] of [["expand", orient.expand("results-grid")], ["impact", orient.impact("app/src/lib/results/gridAutoScroll.ts")]]) {
    const json = toJson(kind, out);
    assert.deepEqual(Object.keys(json), ["schemaVersion", "kind", "files", "tests", "tokens"], kind);
    assert.equal(json.kind, kind);
  }
});

test("una tarjeta sin coincidencias en JSON dice noMatch y likely falso", () => {
  const orient = createOrient({ useCache: false, useGraph: false });
  const json = toJson("card", orient.run("zzzz qqqq"));
  assert.equal(json.noMatch, true);
  assert.equal(json.likely, false);
  assert.deepEqual(json.primary, []);
});

test("por la linea de comandos: --json valido, sin `lines` ni `markdown`", () => {
  const run = cli(["la grilla no hace scroll", "--json", "--no-graph"]);
  assert.equal(run.status, 0, run.stderr);
  const json = JSON.parse(run.stdout);
  assert.deepEqual(Object.keys(json), CARD_KEYS);
});

test("el registro es opcional: una consulta normal no escribe nada en .orient/log.jsonl", () => {
  const path = join(ROOT, ".orient/log.jsonl");
  const before = existsSync(path) ? readFileSync(path, "utf8") : null;
  const run = spawnSync("node", [join(ROOT, "tools/orient/orient.mjs"), "la grilla no hace scroll", "--no-graph"], { cwd: ROOT, encoding: "utf8", env: { ...process.env, ORIENT_LOG: "" } });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(existsSync(path) ? readFileSync(path, "utf8") : null, before);
});

test("ORIENT_LOG agrega una linea por consulta y --feedback marca la ultima", () => {
  const dir = mkdtempSync(join(tmpdir(), "orient-log-"));
  const path = join(dir, "sub", "log.jsonl");
  assert.equal(cli(["la grilla no hace scroll", "--no-graph"], { ORIENT_LOG: path }).status, 0);
  assert.equal(cli(["--expand", "results-grid", "--no-graph"], { ORIENT_LOG: path }).status, 0);
  const feedback = cli(["--feedback", "partial", "faltó", "DataGrid"], { ORIENT_LOG: path });
  assert.equal(feedback.status, 0, feedback.stderr);
  const lines = readFileSync(path, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  assert.equal(lines.length, 2);
  assert.equal(lines[0].kind, "card");
  assert.equal(lines[0].feedback, undefined);
  assert.equal(lines[1].kind, "expand");
  assert.equal(lines[1].feedback, "partial");
  assert.equal(lines[1].note, "faltó DataGrid");
  for (const line of lines) assert.match(line.at, /^\d{4}-\d{2}-\d{2}T/);
});

test("logEntry y giveFeedback validan y no inventan registros", () => {
  const dir = mkdtempSync(join(tmpdir(), "orient-log-"));
  const path = join(dir, "log.jsonl");
  assert.throws(() => giveFeedback(path, "good"), /no hay registro/);
  logEntry(path, { kind: "card", task: "x" });
  assert.throws(() => giveFeedback(path, "mal"), /good, partial o bad/);
  assert.equal(giveFeedback(path, "good").task, "x");
  assert.equal(JSON.parse(readFileSync(path, "utf8").trim()).feedback, "good");
});
