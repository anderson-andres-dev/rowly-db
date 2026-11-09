import assert from "node:assert/strict";
import { test } from "node:test";
import { Bm25, stem, tokens, words } from "./text.mjs";

test("words parte camelCase, snake_case, rutas y quita acentos", () => {
  assert.deepEqual(words("gridAutoScroll"), ["grid", "auto", "scroll"]);
  assert.deepEqual(words("create_terminal"), ["create", "terminal"]);
  assert.deepEqual(words("app/src/lib/SqlEditor.svelte"), ["app", "src", "lib", "sql", "editor", "svelte"]);
  assert.deepEqual(words("Selección de celdas"), ["seleccion", "de", "celdas"]);
  assert.deepEqual(words("HTMLParser"), ["html", "parser"]);
});

test("stem junta plurales y familias de palabras sin inventar", () => {
  assert.equal(stem("schemas"), stem("schema"));
  assert.equal(stem("seleccion"), stem("seleccionar"));
  assert.equal(stem("terminales"), stem("terminal"));
  assert.equal(stem("class"), "class");
  assert.equal(stem("ve"), "ve");
});

test("tokens descarta palabras vacias en espanol e ingles", () => {
  assert.deepEqual(tokens("Cómo se ordena la grilla de resultados"), ["ordena", "grilla", "result"]);
  assert.deepEqual(tokens("where is the grid"), ["grid"]);
});

test("Bm25 ordena por rareza del termino y respeta el peso de cada campo", () => {
  const docs = [
    { id: "a", fields: { name: ["grid"], body: ["common", "common"] } },
    { id: "b", fields: { name: ["other"], body: ["grid", "common"] } },
    { id: "c", fields: { name: ["x"], body: ["common"] } },
  ];
  const heavyName = new Bm25(docs, { name: 3, body: 1 }).score(["grid"]);
  assert.ok(heavyName.get("a").score > heavyName.get("b").score);
  const heavyBody = new Bm25(docs, { name: 1, body: 3 }).score(["grid"]);
  assert.ok(heavyBody.get("b").score > heavyBody.get("a").score);
  assert.equal(heavyName.has("c"), false);
  const rare = new Bm25(docs, { name: 1, body: 1 }).score(["grid", "common"]);
  assert.deepEqual(rare.get("a").matched.sort(), ["common", "grid"]);
});

test("Bm25 sin documentos o sin coincidencias no falla", () => {
  assert.equal(new Bm25([], {}).score(["x"]).size, 0);
  assert.equal(new Bm25([{ id: "a", fields: { f: ["x"] } }], { f: 1 }).score(["y"]).size, 0);
});
