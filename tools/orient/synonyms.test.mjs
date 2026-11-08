import assert from "node:assert/strict";
import { test } from "node:test";
import { expand, SYNONYMS } from "./synonyms.mjs";
import { stem, tokens } from "./text.mjs";

test("expand suma los equivalentes es/en de lo dicho y conserva lo dicho primero", () => {
  const out = expand(tokens("desplazar la grilla"));
  assert.deepEqual(out.slice(0, 2), tokens("desplazar la grilla"));
  assert.ok(out.includes(stem("scroll")));
  assert.ok(out.includes(stem("grid")));
});

test("las equivalencias son simetricas y ninguna palabra se lista como su propio sinonimo", () => {
  for (const [word, others] of SYNONYMS) {
    assert.ok(!others.includes(word), word);
    for (const other of others) assert.ok(SYNONYMS.get(other)?.includes(word), `${other} -> ${word}`);
  }
});

test("una palabra sin equivalente queda igual", () => {
  assert.deepEqual(expand(["zzzz"]), ["zzzz"]);
});
