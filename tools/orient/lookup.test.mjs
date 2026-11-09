import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { findText, hintsBlock, hintsOf, listCommands } from "./lookup.mjs";
import { createOrient } from "./orient.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const orient = createOrient({ root: ROOT, useGraph: false });

test("findText encuentra un texto por su valor en espanol o en ingles, con linea y archivos que lo usan", () => {
  for (const query of ["Ejecutar", "ejecutar", "Run"]) {
    const out = findText(orient, ROOT, query);
    assert.match(out, /`workspace\.guard\.run` — es "Ejecutar" · en "Run"/, query);
    assert.match(out, /defined: `app\/src\/lib\/i18n\/messages\/workspace\.ts` \(es L\d+, en L\d+\)/, query);
    assert.match(out, /used by: .*ExecutionGuard\.svelte/, query);
  }
});

test("las lineas que da findText apuntan de verdad a la clave en cada idioma", async () => {
  const { readFileSync } = await import("node:fs");
  const out = findText(orient, ROOT, "Ejecutar en producción");
  const [, es, en] = /workspace\.ts` \(es L(\d+), en L(\d+)\)/.exec(out);
  const lines = readFileSync(join(ROOT, "app/src/lib/i18n/messages/workspace.ts"), "utf8").split("\n");
  assert.match(lines[es - 1], /"guard\.runInProduction": "Ejecutar en producción"/);
  assert.match(lines[en - 1], /"guard\.runInProduction": "Run in production"/);
});

test("findText: una clave, una parte de la clave, sin acentos y sin resultados", () => {
  assert.match(findText(orient, ROOT, "guard.runInProduction"), /workspace\.guard\.runInProduction/);
  assert.match(findText(orient, ROOT, "ejecutar en produccion"), /workspace\.guard\.runInProduction/);
  assert.match(findText(orient, ROOT, "zzzz-no-existe-xyz"), /No interface text or key contains/);
  assert.throws(() => findText(orient, ROOT, "a"), /al menos 2/);
  const many = findText(orient, ROOT, "ar", { limit: 2 });
  assert.match(many, /more: narrow the text/);
});

test("la coincidencia exacta con las mismas mayusculas va antes que la que solo coincide sin ellas", () => {
  const out = findText(orient, ROOT, "Ejecutar");
  assert.ok(out.indexOf("workspace.guard.run") < out.indexOf("history.execute") || !out.includes("history.execute"));
});

test("listCommands da Rust, registro, dueno e invocador de un comando real", () => {
  const out = listCommands(orient, ROOT, "export_query_to_file");
  assert.match(out, /## export_query_to_file/);
  assert.match(out, /Rust: `app\/src-tauri\/src\/commands\/results\.rs:\d+`/);
  assert.match(out, /Registered: `app\/src-tauri\/src\/lib\.rs:\d+`/);
  assert.match(out, /Owner \(app\/src\/lib\/backend\.test\.ts:\d+\): `app\/src\/lib\/components\/results\/ExportDialog\.svelte`/);
  assert.match(out, /Invoked by: `app\/src\/lib\/components\/results\/ExportDialog\.svelte`/);
});

test("listCommands sin filtro resume por dueno, con filtro de ruta filtra, y el repositorio esta consistente", () => {
  const all = listCommands(orient, ROOT);
  assert.match(all, /\d+ commands, one owner module each/);
  assert.match(all, /`lib\/queryExecution\.ts`: .*execute_query/);
  assert.match(all, /Registration and owners are consistent/);
  assert.match(listCommands(orient, ROOT, "results.rs"), /## export_query_to_file/);
  assert.match(listCommands(orient, ROOT, "comando_inventado_xyz"), /No IPC command matches/);
});

test("hintsOf toma textos entre comillas y solo los comandos IPC que existen", () => {
  assert.deepEqual(hintsOf("Cambia el botón «Ejecutar» por \"Run now\"", orient).texts, ["Ejecutar", "Run now"]);
  assert.deepEqual(hintsOf("Dónde está export_query_to_file y variable_cualquiera", orient).commands, ["export_query_to_file"]);
  assert.deepEqual(hintsOf("sin nada especial", orient), { texts: [], commands: [] });
  assert.equal(hintsBlock(orient, ROOT, "sin nada especial"), "");
});

test("el bloque de hints de start cabe en unos 300 tokens", () => {
  const block = hintsBlock(orient, ROOT, "Cambia «Ejecutar» y mira export_query_to_file");
  assert.match(block, /## Interface text `Ejecutar`/);
  assert.match(block, /## export_query_to_file/);
  assert.ok(block.length / 4 < 450, `${Math.ceil(block.length / 4)} tokens`);
});
