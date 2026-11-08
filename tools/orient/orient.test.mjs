import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { BUDGET, card, detectIntent, estimate, expand, impact, pickPrimary, pickTests, testCommand } from "./card.mjs";
import { graphNeighbors, loadGraph } from "./graphify.mjs";
import { buildIndex, extractorSignature, headings } from "./index.mjs";
import { createOrient } from "./orient.mjs";
import { levelOf, PARAMS, prepare, retrieve } from "./retrieve.mjs";
import { loadGold } from "./eval.mjs";

const FILES = {
  "app/src/lib/results/gridScroll.ts": "// Scroll while dragging a selection past the edge.\nexport function edgeStep(a: number) {\n  return a;\n}\n",
  "app/src/lib/components/results/Grid.svelte": '<script>\nimport { edgeStep } from "$lib/results/gridScroll";\nconst label = $t("grid.row.insert");\nfunction save() {\n  invoke("save_rows", {});\n}\n</script>\n',
  "app/src-tauri/src/commands/rows.rs": "#[tauri::command]\npub fn save_rows() {}\n",
  "app/src/lib/i18n/messages/grid.ts": ['export default defineMessages({', '  es: {', '    "row.insert": "Insertar fila",', '  },', '  en: {', '    "row.insert": "Insert row",', '  },', '});'].join("\n"),
  "app/src/lib/terminal.ts": "// Integrated terminal session.\nexport function openTerminal() {}\n",
  "app/src/lib/results/gridScroll.test.ts": "",
  "app-tauri/Cargo.toml": "",
  "app/src-tauri/Cargo.toml": '[package]\nname = "khipu-desktop"\n',
  "docs/ARCHITECTURE.md": "# Architecture\n\n## Scrolling the grid\n\ntext\n\n## Other\n",
};
const tracked = Object.keys(FILES);
const model = {
  domains: [
    { id: "frontend", paths: ["app/src/"] },
    { id: "backend", paths: ["app/src-tauri/src/"] },
  ],
  allowed: { frontend: ["backend"], backend: [] },
  flow: { nodes: [{ id: "n", label: "grid scroll step", anchor: "app/src/lib/results/gridScroll.ts#edgeStep" }] },
  features: {
    roots: ["app/src/"],
    items: [
      { id: "results-grid", summary: "The results grid and its scrolling.", domain: "frontend", terms: { es: ["grilla", "arrastrar"], en: ["grid", "drag"] }, entry: ["app/src/lib/results/", "app/src/lib/components/results/", "app/src-tauri/src/commands/rows.rs"], related: ["terminal"], docs: ["docs/ARCHITECTURE.md#scrolling-the-grid"] },
      { id: "terminal", summary: "The integrated terminal.", domain: "frontend", terms: { es: ["terminal", "consola"], en: ["terminal", "shell"] }, entry: ["app/src/lib/terminal.ts"] },
      { id: "i18n", summary: "Interface texts.", domain: "frontend", terms: { es: ["idioma", "textos"], en: ["language", "strings"] }, entry: ["app/src/lib/i18n/"] },
    ],
  },
};
const inventory = { tests: [{ path: "app/src/lib/results/gridScroll.test.ts", owner: "app/src/lib/results/gridScroll.ts", property: "El scroll al arrastrar la seleccion", gate: "pr", environment: "node" }] };
const clock = { "app/src/lib/results/gridScroll.ts": 1 };
const fs = {
  read: (path) => FILES[path],
  stat: (path) => ({ size: FILES[path].length, mtimeMs: clock[path] ?? 1 }),
};
const build = (cache) => buildIndex({ tracked, model, inventory, fs, cache });

test("el indice enlaza imports, llamadas IPC y textos de interfaz", () => {
  const { index, stats } = build();
  assert.equal(stats.files, 5);
  const grid = index.files.get("app/src/lib/components/results/Grid.svelte");
  assert.deepEqual(grid.deps, ["app/src/lib/results/gridScroll.ts"]);
  assert.deepEqual(grid.calls, ["app/src-tauri/src/commands/rows.rs"]);
  assert.deepEqual(index.files.get("app/src/lib/results/gridScroll.ts").rdeps, [grid.path]);
  assert.deepEqual(index.files.get("app/src-tauri/src/commands/rows.rs").callers, [grid.path]);
  assert.match(grid.ui, /Insertar fila Insert row/);
  assert.equal(index.packages.get("app/src-tauri/"), "khipu-desktop");
  assert.deepEqual(index.docs.map((doc) => doc.anchor), ["architecture", "scrolling-the-grid", "other"]);
  assert.deepEqual([index.docs[1].start, index.docs[1].end], [3, 6]);
});

test("actualizacion incremental: solo se lee de nuevo lo que cambio", () => {
  const first = build();
  assert.deepEqual([first.stats.parsed, first.stats.reused], [5, 0]);
  const same = build(first.cache);
  assert.deepEqual([same.stats.parsed, same.stats.reused], [0, 5]);
  clock["app/src/lib/results/gridScroll.ts"] = 2;
  const touched = build(same.cache);
  assert.deepEqual([touched.stats.parsed, touched.stats.reused], [1, 4]);
  const gone = buildIndex({ tracked: tracked.filter((path) => path !== "app/src/lib/terminal.ts"), model, inventory, fs, cache: touched.cache });
  assert.equal(gone.stats.removed, 1);
  const stale = buildIndex({ tracked, model, inventory, fs, cache: touched.cache, signature: "otro-extractor" });
  assert.equal(stale.stats.reused, 0);
  clock["app/src/lib/results/gridScroll.ts"] = 1;
});

test("headings da el rango de cada seccion y no cuenta los encabezados de bloques de codigo", () => {
  const found = headings("x.md", "# A\n```\n# no\n```\n## B\ntext\n# C");
  assert.deepEqual(found.map((item) => [item.heading, item.start, item.end]), [["A", 1, 6], ["B", 5, 6], ["C", 7, 7]]);
});

const prepared = () => prepare(build().index);

test("recuperar: por texto del codigo, por vocabulario curado y por el texto que ve el usuario", () => {
  const p = prepared();
  assert.equal(retrieve(p, "el scroll al arrastrar no sigue").files[0].path, "app/src/lib/results/gridScroll.ts");
  assert.equal(retrieve(p, "falla la grilla").features[0].id, "results-grid");
  assert.equal(retrieve(p, "no deja insertar fila").files[0].path, "app/src/lib/components/results/Grid.svelte");
  const sin = prepare(build().index, { useTerms: false });
  assert.notEqual(retrieve(sin, "falla la grilla").features[0]?.id, "results-grid");
});

test("la tarjeta dice donde, que leer, que depende y que pruebas correr", () => {
  const p = prepared();
  const task = "la grilla no hace scroll al arrastrar la seleccion";
  const out = card(p, retrieve(p, task), task);
  assert.equal(out.intent, "bug");
  assert.match(out.markdown, /## Where\n- `results-grid` \(frontend\)/);
  assert.match(out.markdown, /`app\/src\/lib\/results\/gridScroll\.ts` .* (read|outline): edgeStep L2-4/);
  assert.match(out.markdown, /used by 1: `Grid\.svelte`/);
  assert.match(out.markdown, /cd app && npx vitest run src\/lib\/results\/gridScroll\.test\.ts/);
  assert.match(out.markdown, /## Next\n(SUFFICIENT|PARTIAL|AMBIGUOUS)/);
  assert.deepEqual(out.tests, ["app/src/lib/results/gridScroll.test.ts"]);
  assert.ok(out.files.includes("app/src/lib/results/gridScroll.ts") && out.primary[0] === "app/src/lib/results/gridScroll.ts");
});

test("cada tipo de tarea da una forma distinta de tarjeta", () => {
  const p = prepared();
  const task = "grilla scroll arrastrar";
  const by = (intent) => card(p, retrieve(p, task), task, { intent }).markdown;
  assert.match(by("feature"), /## Reuse[\s\S]*neighbour `terminal`/);
  assert.match(by("feature"), /## Where to change/);
  assert.match(by("feature"), /domain `frontend` may depend on: `backend`/);
  assert.match(by("refactor"), /## Impact/);
  assert.match(by("analysis"), /## Key files/);
  assert.match(by("analysis"), /SQL flow: `app\/src\/lib\/results\/gridScroll\.ts#edgeStep`/);
  assert.match(by("tests"), /## Tests[\s\S]*## Files/);
  assert.doesNotMatch(by("bug"), /## Reuse/);
});

test("el tamano de la tarjeta respeta el tope bajando el detalle", () => {
  const p = prepared();
  const task = "grilla scroll arrastrar seleccion";
  const full = card(p, retrieve(p, task), task, { budget: 5000 });
  const tight = card(p, retrieve(p, task), task, { budget: 120 });
  assert.ok(tight.detail < full.detail);
  assert.ok(tight.tokens < full.tokens);
  assert.match(tight.markdown, /## Next/);
  assert.equal(estimate("abcd"), 1);
});

test("sin coincidencias lo dice en vez de inventar archivos", () => {
  const p = prepared();
  const out = card(p, retrieve(p, "zzzz qqqq"), "zzzz qqqq");
  assert.match(out.markdown, /NO MATCH/);
  assert.deepEqual(out.files, []);
  assert.equal(out.sufficient, false);
});

test("detectIntent distingue bug, funcionalidad, refactor, analisis y pruebas", () => {
  const cases = [
    ["la grilla no hace scroll", "bug"],
    ["Agregar una terminal conectada a la base", "feature"],
    ["Sacar de Workspace la logica a modulos: dividir el componente", "refactor"],
    ["¿Dónde se decide que una sentencia es destructiva?", "analysis"],
    ["How does the guard work", "analysis"],
    ["qué pruebas debo correr al tocar la paginación", "tests"],
    ["Mover a módulos puros el manejo de archivos, con sus pruebas", "refactor"],
    ["En PostgreSQL abrir la primera consola se cuenta como perder una sesión y avisa de un error", "bug"],
    ["Cambiar el color del boton", "modify"],
  ];
  for (const [task, intent] of cases) assert.equal(detectIntent(task), intent, task);
});

test("pickPrimary reserva lugar a una segunda funcionalidad cercana", () => {
  const files = [..."abcde"].map((n, i) => ({ path: n, feature: "uno", score: 10 - i })).concat([{ path: "z", feature: "dos", score: 3 }]);
  assert.deepEqual(pickPrimary(files, 5, 3, 0).map((item) => item.path), ["a", "b", "c", "d", "z"]);
  assert.deepEqual(pickPrimary(files, 5, 9, 0).map((item) => item.path), ["a", "b", "c", "d", "e"]);
  assert.deepEqual(pickPrimary(files, 3, 3, 0).map((item) => item.path), ["a", "b", "c"]);
});

test("testCommand elige vitest, cargo o node segun la prueba", () => {
  const { index } = build();
  assert.equal(testCommand("app/src/lib/x.test.ts", index), "cd app && npx vitest run src/lib/x.test.ts");
  assert.equal(testCommand("app/src-tauri/src/commands/rows.rs", index), "cargo test -p khipu-desktop");
  assert.equal(testCommand("tools/x/y.test.mjs", index), "node --test tools/x/y.test.mjs");
  assert.match(testCommand("app/tests/e2e/run.mjs", index), /E2E/);
});

test("graphify es opcional: sin grafo no hay nada, con grafo suma vecinos y no repite", () => {
  assert.equal(loadGraph(mkdtempSync(join(tmpdir(), "orient-"))), null);
  const graph = {
    nodes: [{ id: "a", source_file: "x.ts" }, { id: "b", source_file: "y.ts" }, { id: "c", source_file: "y.ts" }, { id: "d", source_file: "z.ts" }],
    links: [{ source: "a", target: "b", relation: "calls" }, { source: "a", target: "c", relation: "references" }, { source: "d", target: "a", relation: "calls" }, { source: "a", target: "d", relation: "contains" }],
  };
  assert.deepEqual(graphNeighbors(graph, ["x.ts"]), [{ path: "y.ts", edges: 2 }, { path: "z.ts", edges: 1 }]);
  assert.deepEqual(graphNeighbors(graph, ["x.ts"], { skip: new Set(["y.ts"]) }), [{ path: "z.ts", edges: 1 }]);
  const p = prepared();
  const withGraph = card(p, retrieve(p, "grilla scroll arrastrar"), "grilla scroll arrastrar", { graph: { nodes: [{ id: "a", source_file: "app/src/lib/results/gridScroll.ts" }, { id: "b", source_file: "app/src/lib/terminal.ts" }], links: [{ source: "a", target: "b", relation: "calls" }] } });
  assert.match(withGraph.markdown, /graphify \(by name, may be off\): `app\/src\/lib\/terminal\.ts` \(1\)/);
  assert.doesNotMatch(card(p, retrieve(p, "grilla scroll arrastrar"), "grilla scroll arrastrar").markdown, /graphify/);
});

// --- Sobre el repositorio real -------------------------------------------

test("sobre el repo real, sin graphify y sin cache: toda tarjeta del oro cabe en el tope y cierra con una indicacion", () => {
  const orient = createOrient({ useCache: false, useGraph: false });
  for (const task of loadGold().tasks) {
    const out = orient.run(task.task);
    assert.ok(out.tokens <= BUDGET, `${task.id}: ${out.tokens} tokens`);
    assert.match(out.markdown, /## Next\n(SUFFICIENT|PARTIAL|AMBIGUOUS|NO MATCH)|NO MATCH/, task.id);
    // NO MATCH es un resultado valido: lo que se exige es que, si propone algo, lo diga.
    if (!/NO MATCH/.test(out.markdown)) assert.ok(out.files.length > 0, task.id);
    assert.doesNotMatch(out.markdown, /graphify \(by name/, task.id);
  }
});

test("sobre el repo real: expand e impact dan el nivel siguiente", () => {
  const orient = createOrient({ useCache: false, useGraph: false });
  const level1 = orient.expand("results-grid");
  assert.match(level1.markdown, /`app\/src\/lib\/components\/results\/DataGrid\.svelte`/);
  assert.ok(level1.tokens <= BUDGET * 2);
  const level2 = orient.impact("app/src/lib/results/gridAutoScroll.ts");
  assert.match(level2.markdown, /DataGrid\.svelte/);
  assert.match(orient.expand("no-existe").markdown, /unknown feature/);
  assert.match(orient.impact("nada.ts").markdown, /neither a feature nor an indexed file/);
});

test("orient no cambia con el orden en que se piden las cosas: mismo texto, misma tarjeta", () => {
  const orient = createOrient({ useCache: false, useGraph: false });
  const task = "El resaltado del editor no sigue la barra invertida";
  assert.equal(orient.run(task).markdown, orient.run(task).markdown);
  assert.deepEqual(expand(orient.prepared, "terminal").files, expand(orient.prepared, "terminal").files);
  assert.equal(impact(orient.prepared, "terminal").markdown, impact(orient.prepared, "terminal").markdown);
});

test("pickPrimary no muestra lo que queda muy por debajo del mejor (corte relativo)", () => {
  const files = [{ path: "a", feature: "uno", score: 10 }, { path: "b", feature: "uno", score: 6 }, { path: "c", feature: "uno", score: 2 }];
  assert.deepEqual(pickPrimary(files, 5, 9, 0.5).map((item) => item.path), ["a", "b"]);
  assert.deepEqual(pickPrimary(files, 5, 9, 0).map((item) => item.path), ["a", "b", "c"]);
  assert.equal(PARAMS.keep, 0.5);
});

test("levelOf: sin evidencia no hay nada, y solo margen, cobertura y evidencia juntos dan high", () => {
  const rule = { margin: 0.2, coverage: 0.35, none: 4, high: 10 };
  assert.equal(levelOf({ margin: 0.9, coverage: 0.9, evidence: 3 }, rule), "none");
  assert.equal(levelOf({ margin: 0.9, coverage: 0.9, evidence: 12 }, rule), "high");
  assert.equal(levelOf({ margin: 0.9, coverage: 0.9, evidence: 6 }, rule), "medium");
  assert.equal(levelOf({ margin: 0.9, coverage: 0.1, evidence: 12 }, rule), "medium");
  assert.equal(levelOf({ margin: 0.1, coverage: 0.1, evidence: 12 }, rule), "low");
});

test("una palabra comun suelta no basta para fingir que sabe: sin evidencia dice NO MATCH", () => {
  const p = prepared();
  const out = card(p, retrieve(p, "cuenta"), "cuenta");
  assert.equal(out.sufficient, false);
  assert.equal(out.noMatch, true);
});

test("pickTests da a cada archivo principal su mejor prueba, aunque el inventario la atribuya a otro dueno", () => {
  const p = prepared();
  const task = "la grilla no hace scroll al arrastrar";
  const tests = pickTests(p.index, retrieve(p, task));
  assert.equal(tests[0].path, "app/src/lib/results/gridScroll.test.ts");
});

test("sobre el repo real las tareas fuera de alcance nunca declaran SUFFICIENT", () => {
  const orient = createOrient({ useCache: false, useGraph: false });
  const negatives = JSON.parse(readFileSync(new URL("../../tests/orient/negatives.json", import.meta.url), "utf8")).tasks;
  assert.ok(negatives.length >= 12);
  for (const task of negatives) {
    const out = orient.run(task.task);
    assert.equal(out.sufficient, false, task.id);
    assert.ok(out.tokens <= BUDGET, task.id);
  }
});

test("el cache se invalida solo cuando cambia el extractor: la firma sale de su codigo", () => {
  const signature = extractorSignature();
  assert.match(signature, /^\d+:[0-9a-f]{16}$/);
  assert.equal(signature, extractorSignature());
});

test("pruebas de integracion declaradas en el catalogo aparecen aunque su dueno sea otro", () => {
  const withIntegration = structuredClone(model);
  withIntegration.features.items[0].tests = ["crates/x/tests/integration.rs"];
  const { index } = buildIndex({ tracked, model: withIntegration, inventory, fs });
  const p = prepare(index);
  const tests = pickTests(index, retrieve(p, "la grilla y su scroll"));
  assert.ok(tests.map((test) => test.path).includes("crates/x/tests/integration.rs"));
  const base = prepared();
  const without = pickTests(base.index, retrieve(base, "la grilla y su scroll"));
  assert.ok(!without.map((test) => test.path).includes("crates/x/tests/integration.rs"));
});
