import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { anchors, codeFiles, coverage, covers, render, slug, testsFor, validate } from "./features.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const feature = (over = {}) => ({
  id: "grid",
  summary: "La grilla.",
  domain: "frontend",
  terms: { es: ["grilla", "celdas"], en: ["grid", "cells"] },
  entry: ["app/src/lib/Grid.svelte", "app/src/lib/results/"],
  ...over,
});
const model = (items, extra = {}) => ({
  domains: [{ id: "frontend" }, { id: "engine" }],
  features: { roots: ["app/src/"], items },
  ...extra,
});
const tracked = ["app/src/lib/Grid.svelte", "app/src/lib/Grid.test.ts", "app/src/lib/results/sort.ts", "app/src/lib/Other.ts", "docs/A.md"];
const inventory = { tests: [{ path: "app/src/lib/Grid.test.ts", owner: "app/src/lib/Grid.svelte" }] };
const read = () => "# How it works\n\n## Ancla `rara` (x)\n";
const run = (items, extra) => validate(model(items), { tracked: extra?.tracked ?? tracked, inventory, read });

test("covers: un archivo exacto o todo lo que cuelga de una carpeta", () => {
  assert.ok(covers("a/b.ts", "a/b.ts"));
  assert.ok(!covers("a/b.ts", "a/b.tsx"));
  assert.ok(covers("a/", "a/b/c.ts"));
  assert.ok(!covers("a/", "ab/c.ts"));
});

test("testsFor une las pruebas por owner, por carpeta y las extra", () => {
  assert.deepEqual(testsFor(feature(), inventory), ["app/src/lib/Grid.test.ts"]);
  assert.deepEqual(testsFor(feature({ entry: ["app/src/lib/"] }), inventory), ["app/src/lib/Grid.test.ts"]);
  assert.deepEqual(testsFor(feature({ entry: ["x.ts"], tests: ["z.test.ts"] }), inventory), ["z.test.ts"]);
  assert.deepEqual(testsFor(feature({ entry: ["x.ts"] }), inventory), []);
});

test("slug y anclas siguen la regla de GitHub", () => {
  assert.equal(slug("Tiled tab groups: consoles and results"), "tiled-tab-groups-consoles-and-results");
  assert.equal(slug("`khipu-lsp`"), "khipu-lsp");
  assert.equal(slug("Backend (`app/src-tauri/src`)"), "backend-appsrc-taurisrc");
  assert.deepEqual([...anchors(read())], ["how-it-works", "ancla-rara-x"]);
});

test("codeFiles deja fuera pruebas y lo que no es codigo", () => {
  const files = codeFiles(model([]), ["app/src/a.ts", "app/src/a.test.ts", "app/src/tests/x.ts", "app/src/logo.png", "other/a.ts"]);
  assert.deepEqual(files, ["app/src/a.ts"]);
});

test("coverage lista lo que no tiene funcionalidad y lo que tiene varias", () => {
  const result = coverage(model([feature(), feature({ id: "also", entry: ["app/src/lib/results/"] })]), tracked);
  assert.deepEqual(result.uncovered, ["app/src/lib/Other.ts"]);
  assert.deepEqual(result.shared, ["app/src/lib/results/sort.ts"]);
});

test("un catalogo completo no da problemas", () => {
  const rest = feature({ id: "rest", entry: ["app/src/lib/Other.ts"], untested: "sin pruebas todavia", related: ["grid"] });
  assert.deepEqual(run([feature({ docs: ["docs/A.md#how-it-works"] }), rest]), []);
});

test("validate senala cada tipo de problema", () => {
  const bad = [
    feature({ id: "Mala_Id" }),
    feature({ id: "grid", summary: "" }),
    feature({ id: "grid", domain: "nada", terms: { es: ["a"], en: [] }, entry: ["no/existe.ts", "vacia/"], related: ["fantasma", "grid"], docs: ["docs/A.md#no-esta", "docs/Z.md"], tests: ["no/test.ts"] }),
    feature({ id: "sin-pruebas", entry: ["app/src/lib/Other.ts"] }),
    feature({ id: "razon", entry: ["app/src/lib/Other.ts"], untested: "" }),
  ];
  const text = run(bad).join("\n");
  for (const expected of [
    "kebab-case",
    "id repetido",
    "summary",
    "no existe en model.json",
    "terms.es",
    "terms.en",
    "no/existe.ts no existe",
    "vacia/ no existe",
    "`fantasma`",
    "vecina de si misma",
    "no tiene el ancla #no-esta",
    "documento docs/Z.md no existe",
    "la prueba no/test.ts no existe",
    "ninguna prueba del inventario",
    "necesita la razon",
  ]) {
    assert.match(text, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), expected);
  }
});

test("un archivo de codigo sin funcionalidad es un problema", () => {
  assert.match(run([feature()]).join("\n"), /app\/src\/lib\/Other\.ts: ninguna funcionalidad/);
});

test("un modelo sin features lo dice en vez de romperse", () => {
  assert.match(validate({ domains: [] }, { tracked, inventory, read }).join("\n"), /necesita `roots` e `items`/);
});

test("render es estable, ordenado y no depende del orden del modelo", () => {
  const a = feature({ id: "a-uno", docs: ["docs/A.md#x"], related: ["b-dos"] });
  const b = feature({ id: "b-dos", untested: "razon" });
  const out = render(model([b, a]), inventory);
  assert.equal(out, render(model([a, b]), inventory));
  assert.ok(out.indexOf("## a-uno") < out.indexOf("## b-dos"));
  assert.match(out, /- Tests: `app\/src\/lib\/Grid\.test\.ts`/);
  assert.match(out, /- Tests: none \(razon\)/);
  assert.match(out, /- Related: \[`b-dos`\]\(#b-dos\)/);
  assert.match(out, /\[docs\/A\.md#x\]\(\.\.\/\.\.\/docs\/A\.md#x\)/);
  assert.ok(out.includes("<!-- generated: features"));
});

test("el catalogo real es valido, esta completo y FEATURES.md esta al dia", () => {
  const real = JSON.parse(readFileSync(join(ROOT, "tools/architecture/model.json"), "utf8"));
  const inv = JSON.parse(readFileSync(join(ROOT, "tests/inventory.json"), "utf8"));
  const files = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
  const problems = validate(real, { tracked: files, inventory: inv, read: (path) => readFileSync(join(ROOT, path), "utf8") });
  assert.deepEqual(problems, []);
  assert.equal(readFileSync(join(ROOT, "docs/map/FEATURES.md"), "utf8"), render(real, inv));
});
