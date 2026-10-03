#!/usr/bin/env node
// Valida tests/sql/coverage.json contra SQL_ENGINE §6 y el codigo:
// cada fila tiene entrada; cada prueba citada existe (archivo y nombre);
// "partial" y "gap" dicen que falta; un N/A por motor dice por que; y cada
// prueba contra servidores reales (crates/server-tests/tests) prueba alguna
// fila: no hay huerfanas.
//
//   node tools/inventory/coverage.mjs           informe y exit 1 si algo falla

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../..", import.meta.url).pathname;
const ENGINES = new Set(["mysql", "mariadb", "postgres"]);
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
