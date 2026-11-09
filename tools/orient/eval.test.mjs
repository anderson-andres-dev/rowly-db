import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { gold_problems, isTestPath, loadGold, parseGraphify, score, summarize } from "./eval.mjs";

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
