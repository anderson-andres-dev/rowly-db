#!/usr/bin/env node
// Valida tests/sql/coverage.json contra SQL_ENGINE §6 y el codigo:
// cada fila tiene entrada; cada prueba citada existe (archivo y nombre);
// "partial" y "gap" dicen que falta; un N/A por motor dice por que; y cada
// prueba contra servidores reales (crates/server-tests/tests) prueba alguna
// fila: no hay huerfanas. Cada fila responde por cada motor de
// tests/engines/contract.json (prueba, N/A con motivo o `gapEngines`), y un
// motor marcado `pending` (tools/engine/new.mjs) falla con lo que le falta.
//
//   node tools/inventory/coverage.mjs           informe y exit 1 si algo falla

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../..", import.meta.url).pathname;
const contract = JSON.parse(readFileSync(join(ROOT, "tests/engines/contract.json"), "utf8"));
const ENGINES = new Set(contract.engines.map((engine) => engine.id));
const STATUS = new Set(["covered", "partial", "gap"]);

const coverage = JSON.parse(readFileSync(join(ROOT, "tests/sql/coverage.json"), "utf8"));
const sqlEngine = readFileSync(join(ROOT, "SQL_ENGINE.md"), "utf8");
const matrix = sqlEngine.slice(sqlEngine.indexOf("## 6."), sqlEngine.indexOf("## 7."));
const rows = [...matrix.matchAll(/^\| ([SAGD]\d+) \|/gm)].map((m) => m[1]);

const problems = [];
for (const row of rows) if (!coverage.rows[row]) problems.push(`${row}: falta en coverage.json`);
for (const [row, entry] of Object.entries(coverage.rows)) {
  if (!rows.includes(row)) problems.push(`${row}: no existe en SQL_ENGINE §6`);
  if (!STATUS.has(entry.status)) problems.push(`${row}: estado "${entry.status}" desconocido`);
  if (entry.status !== "covered" && !entry.gap) problems.push(`${row}: "${entry.status}" sin decir que falta (gap)`);
  if (entry.status !== "gap" && entry.tests.length === 0) problems.push(`${row}: "${entry.status}" sin pruebas`);
  for (const [engine, why] of Object.entries(entry.na ?? {})) {
    if (!ENGINES.has(engine)) problems.push(`${row}: N/A de un motor desconocido (${engine})`);
    if (!why?.trim()) problems.push(`${row}: N/A en ${engine} sin motivo`);
  }
  for (const test of entry.tests) {
    if (!coverage.scopes[test.scope]) problems.push(`${row}: ambito "${test.scope}" desconocido`);
    for (const engine of test.engines) if (!ENGINES.has(engine)) problems.push(`${row}: motor desconocido ${engine}`);
    const path = join(ROOT, test.file);
    if (!existsSync(path)) {
      problems.push(`${row}: ${test.file} no existe`);
      continue;
    }
    if (!readFileSync(path, "utf8").includes(test.name)) problems.push(`${row}: "${test.name}" no aparece en ${test.file}`);
  }
}

// Cada motor tiene una respuesta en cada fila que no es un hueco entero.
const unanswered = new Map([...ENGINES].map((engine) => [engine, []]));
for (const [row, entry] of Object.entries(coverage.rows)) {
  if (entry.status === "gap") continue;
  const answered = new Set([
    ...entry.tests.flatMap((test) => test.engines),
    ...Object.keys(entry.na ?? {}),
    ...(entry.gapEngines ?? []),
  ]);
  for (const engine of entry.gapEngines ?? []) {
    if (!ENGINES.has(engine)) problems.push(`${row}: gapEngines con un motor desconocido (${engine})`);
    if (!entry.gap) problems.push(`${row}: gapEngines sin decir que falta (gap)`);
  }
  for (const engine of ENGINES) if (!answered.has(engine)) unanswered.get(engine).push(row);
}
for (const engine of contract.engines) {
  const rows = unanswered.get(engine.id);
  if (engine.pending)
    problems.push(
      `motor ${engine.id} pendiente (tools/engine/new.mjs): ${rows.length ? `filas sin respuesta: ${rows.join(", ")}` : "quitar \"pending\" de tests/engines/contract.json"}`,
    );
  else if (rows.length) problems.push(`${engine.id}: sin respuesta en ${rows.join(", ")} (prueba, N/A con motivo o gapEngines)`);
}

// Cada motor tiene sus lineas de version y las fechas de su fabricante: sin
// ellas no hay servidores que probar ni ventana de soporte (SQL_ENGINE §5).
const lines = JSON.parse(readFileSync(join(ROOT, "tools/test-dbs/lines.json"), "utf8"));
const vendor = JSON.parse(readFileSync(join(ROOT, "app/src/lib/engines/vendorSupport.json"), "utf8"));
for (const engine of ENGINES) {
  if (!lines.engines?.[engine]?.length) problems.push(`${engine}: sin lineas en tools/test-dbs/lines.json (engines)`);
  if (!vendor[engine]?.length) problems.push(`${engine}: sin fechas en app/src/lib/engines/vendorSupport.json`);
}

// Huerfanas: una prueba real que no prueba ninguna fila.
const SERVER_TESTS = "crates/server-tests/tests";
const cited = new Set(
  Object.values(coverage.rows).flatMap((entry) => entry.tests.map((test) => `${test.file}#${test.name}`)),
);
for (const name of readdirSync(join(ROOT, SERVER_TESTS)).filter((file) => file.endsWith(".rs"))) {
  const file = `${SERVER_TESTS}/${name}`;
  const source = readFileSync(join(ROOT, file), "utf8");
  for (const [, test] of source.matchAll(/#\[(?:tokio::)?test\]\s*(?:#\[[^\]]*\]\s*)*(?:async\s+)?fn\s+(\w+)/g)) {
    if (!cited.has(`${file}#${test}`)) problems.push(`${file}: ${test} no prueba ninguna fila (huerfana)`);
  }
}

const count = (status) => Object.values(coverage.rows).filter((entry) => entry.status === status).length;
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`coverage.json al dia: ${rows.length} filas (${count("covered")} cubiertas, ${count("partial")} parciales, ${count("gap")} huecos)`);
