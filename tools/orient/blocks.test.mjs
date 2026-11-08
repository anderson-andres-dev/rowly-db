import assert from "node:assert/strict";
import { test } from "node:test";
import { applyBlocks, marks, renderMap, renderRules, validateRules } from "./blocks.mjs";

const model = {
  features: { items: [{ id: "grid", summary: "The results grid: virtual scrolling and more.", entry: ["app/Grid.svelte"] }] },
  rules: [{ id: "one-rule", rule: "Do the thing.", why: "Because.", check: "node tools/x.mjs --check" }, { id: "plain", rule: "Plain.", why: "Short." }],
};
const doc = (a = "x", b = "y") => `intro\n${marks("router").start}\n${marks("router").end}\n${marks("map").start}\n${a}\n${marks("map").end}\nmid\n${marks("rules").start}\n${b}\n${marks("rules").end}\nend\n`;

test("renderMap y renderRules dan una linea por elemento y solo citan el check cuando existe", () => {
  assert.equal(renderMap(model), "- `grid` — The results grid → `app/Grid.svelte`");
  assert.deepEqual(renderRules(model).split("\n"), ["- **one-rule** — Do the thing. *Why:* Because. Check: `node tools/x.mjs --check`.", "- **plain** — Plain. *Why:* Short."]);
});

test("applyBlocks reemplaza solo lo que hay entre las marcas y es idempotente", () => {
  const once = applyBlocks(doc(), model);
  assert.ok(once.startsWith("intro\n") && once.includes("\nmid\n") && once.endsWith("end\n"));
  assert.match(once, /- `grid` — The results grid/);
  assert.match(once, /- \*\*plain\*\*/);
  assert.equal(applyBlocks(once, model), once);
});

test("applyBlocks falla con un mensaje claro si falta una marca", () => {
  assert.throws(() => applyBlocks("sin marcas", model), /faltan las marcas/);
});

test("validateRules senala ids repetidos o mal formados, textos largos, scripts y documentos inexistentes", () => {
  const bad = {
    rules: [
      { id: "Mala_Id", rule: "x", why: "y" },
      { id: "dup", rule: "x", why: "y" },
      { id: "dup", rule: "x".repeat(300), why: "" },
      { id: "scripts", rule: "x", why: "y", check: "node tools/no-existe.mjs --check" },
      { id: "docs", rule: "x", why: "y", docs: ["no.md", "doc.md#no-esta", "doc.md#si"] },
    ],
  };
  const problems = validateRules(bad, { trackedSet: new Set(["doc.md"]), anchors: () => new Set(["si"]), exists: () => false }).join("\n");
  for (const expected of ["kebab-case", "id repetido", "pasa de 200", "`why` falta", "no-existe.mjs", "no.md no existe", "ancla #no-esta"]) assert.ok(problems.includes(expected), expected);
  assert.ok(!problems.includes("#si"));
  assert.deepEqual(validateRules({}, { trackedSet: new Set(), anchors: () => null, exists: () => true }), []);
});
