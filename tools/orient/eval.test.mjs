import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { compareRecords, DEFAULT_TOLERANCE, gold_problems, isTestPath, loadGold, parseGraphify, score, scoreNegatives, summarize } from "./eval.mjs";

const task = { files: ["a/x.ts", "a/y.ts", "a/z.ts"], tests: ["a/x.test.ts"] };

test("recall@5 cuenta los correctos entre los 5 primeros sin contar pruebas", () => {
  const result = score(task, { ranked: ["a/x.test.ts", "b/1.ts", "a/x.ts", "b/2.ts", "b/3.ts", "b/4.ts", "a/y.ts"], text: "" });
  assert.equal(result.recall, 1 / 3);
  assert.equal(result.hit, 1);
  assert.equal(result.all, 2 / 3);
  assert.equal(result.mrr, 1 / 2);
  assert.equal(result.tests, 1);
});

test("una tarea con menos de 5 archivos puede llegar a recall 1", () => {
  const result = score({ files: ["a/x.ts"], tests: [] }, { ranked: ["a/x.ts"], text: "" });
  assert.equal(result.recall, 1);
  assert.equal(result.tests, undefined);
});

test("sin ningun archivo correcto todo vale cero", () => {
  const result = score(task, { ranked: ["b/1.ts"], text: "abcd" });
  assert.deepEqual([result.recall, result.hit, result.all, result.mrr, result.tokens], [0, 0, 0, 0, 1]);
});

test("un archivo esperado dentro de una carpeta tests/ no se descarta como prueba", () => {
  assert.equal(isTestPath("app/tests/e2e/resources.mjs", ["app/tests/e2e/resources.mjs"]), false);
  assert.equal(isTestPath("app/tests/e2e/resources.mjs", []), true);
  assert.equal(isTestPath("app/src/lib/x.dom.test.ts", []), true);
  assert.equal(isTestPath("app/src/lib/x.ts", []), false);
});

test("parseGraphify toma los archivos en el orden del recorrido y sin repetir", () => {
  const text = [
    "Graph: graphify-out/graph.json",
    "NODE uno() [src=a/x.ts loc=L1 community=c]",
    "NODE String [src= loc= community=c]",
    "NODE dos [src=a/y.ts loc=L9 community=c]",
    "NODE tres() [src=a/x.ts loc=L30 community=c]",
  ].join("\n");
  assert.deepEqual(parseGraphify(text).ranked, ["a/x.ts", "a/y.ts"]);
});

test("summarize promedia solo lo que cada fila tiene", () => {
  const summary = summarize([
    { recall: 1, hit: 1, all: 1, mrr: 1, tokens: 100, tests: 1 },
    { recall: 0, hit: 0, all: 0, mrr: 0, tokens: 300 },
  ]);
  assert.deepEqual([summary.tasks, summary.recall, summary.tokens, summary.tests], [2, 0.5, 200, 1]);
});

test("el conjunto de oro esta bien formado y sus rutas existen", () => {
  const tracked = new Set(execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean));
  assert.deepEqual(gold_problems(loadGold(), tracked), []);
});

test("gold_problems senala id repetido, rutas inexistentes y valores fuera de lista", () => {
  const bad = { tasks: [
    { id: "a", kind: "otro", split: "train", task: "x".repeat(30), files: ["no/existe.ts"], tests: [] },
    { id: "a", kind: "bug", split: "mal", task: "corta", files: [], tests: [] },
  ] };
  const problems = gold_problems(bad, new Set()).join("\n");
  for (const expected of ["repetido", "no existe", "kind", "split", "muy corto", "sin archivos"]) assert.match(problems, new RegExp(expected));
});

test("score mide orden y precision solo sobre lo que la herramienta propone, y `todo` sobre toda la respuesta", () => {
  const result = score(task, { ranked: ["b/1.ts", "a/x.ts", "a/y.ts", "a/z.ts"], primary: ["b/1.ts", "a/x.ts"], text: "" });
  assert.equal(result.precision, 1 / 2);
  assert.equal(result.shown, 2);
  assert.equal(result.recall, 1 / 3);
  assert.equal(result.mrr, 1 / 2);
  assert.equal(result.all, 1);
});

test("scoreNegatives cuenta falsa confianza y NO MATCH", () => {
  const rows = [{ sufficient: true, noMatch: false, text: "abcd" }, { sufficient: false, noMatch: true, text: "abcdefgh" }, { sufficient: false, noMatch: false, text: "" }];
  assert.deepEqual(scoreNegatives(rows), { tasks: 3, falseSufficient: 1 / 3, noMatch: 1 / 3, tokens: 1 });
});

const record = (over = {}) => ({ summary: { recall: 0.6, hit: 0.9, tests: 0.5, precision: 0.35, sufficientStrong: 0.9, tokens: 500, ...over.summary }, negatives: { falseSufficient: 0, ...over.negatives } });

test("compareRecords: mejorar o quedar igual no falla; empeorar poco avisa; empeorar mucho falla", () => {
  const before = record();
  assert.deepEqual(compareRecords(before, record({ summary: { recall: 0.7 } }), DEFAULT_TOLERANCE), { failures: [], warnings: [] });
  const small = compareRecords(before, record({ summary: { recall: 0.57 } }), DEFAULT_TOLERANCE);
  assert.equal(small.failures.length, 0);
  assert.match(small.warnings[0], /rec@5/);
  const big = compareRecords(before, record({ summary: { recall: 0.5 }, negatives: { falseSufficient: 0.3 } }), DEFAULT_TOLERANCE);
  assert.equal(big.failures.length, 2);
  assert.match(big.failures.join(" "), /falsa confianza/);
});

test("compareRecords: los tokens fallan por crecimiento relativo y lo que falta en el registro se ignora", () => {
  assert.equal(compareRecords(record(), record({ summary: { tokens: 800 } }), DEFAULT_TOLERANCE).failures.length, 1);
  assert.deepEqual(compareRecords({ summary: {} }, record(), DEFAULT_TOLERANCE), { failures: [], warnings: [] });
});
