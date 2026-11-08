import assert from "node:assert/strict";
import { test } from "node:test";
import { POOLS, prompt, scoreAnswer, select, summarize } from "./agent-eval.mjs";
import { loadGold } from "./eval.mjs";

test("select es reproducible, toma de las dos particiones y respeta --per", () => {
  const gold = loadGold().tasks;
  const a = select(gold, 10);
  assert.deepEqual(a.map((task) => task.id), select(gold, 10).map((task) => task.id));
  for (const split of POOLS) assert.equal(a.filter((task) => task.split === split).length, 10);
  assert.equal(select(gold, 3).length, 6);
});

test("el prompt sin tarjeta no la lleva y el de con tarjeta si, y ambos piden solo JSON", () => {
  const task = { task: "Hacer algo" };
  const a = prompt(task, "/snap");
  const b = prompt(task, "/snap", "# orient: bug\nCARD");
  assert.doesNotMatch(a, /orient|CARD/);
  assert.match(b, /# orient: bug\nCARD/);
  for (const text of [a, b]) {
    assert.match(text, /\/snap/);
    assert.match(text, /ONLY a JSON object/);
    assert.match(text, /do not use git/);
  }
});

test("scoreAnswer normaliza rutas, limita a 5 archivos y 3 pruebas y calcula recall, precision y pruebas", () => {
  const task = { files: ["app/src/a.ts", "app/src/b.ts"], tests: ["app/src/a.test.ts", "app/src/b.test.ts"] };
  const score = scoreAnswer(task, { files: ["/snap/app/src/a.ts", "./app/src/x.ts", "app/src/a.ts"], tests: ["app/src/a.test.ts", "otro.test.ts"] });
  assert.deepEqual(score, { recall: 0.5, precision: 0.5, hit: 1, tests: 0.5 });
  assert.deepEqual(scoreAnswer(task, null), { recall: 0, precision: 0, hit: 0, tests: 0 });
  assert.equal(scoreAnswer({ files: ["a"], tests: [] }, { files: ["a"] }).tests, null);
});

test("summarize promedia puntajes y uso solo de lo que existe", () => {
  const row = (recall, tokens) => ({ A: { score: { recall, precision: 0.2, hit: 1, tests: null }, usage: { tokens, toolUses: 10, durationMs: 4000 } } });
  const s = summarize([row(0.5, 100), row(1, 300), { B: {} }], "A");
  assert.deepEqual([s.tasks, s.recall, s.tokens, s.toolUses, s.seconds, s.tests], [2, 0.75, 200, 10, 4, null]);
});
