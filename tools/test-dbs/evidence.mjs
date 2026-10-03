#!/usr/bin/env node
// Reporte de la compuerta de motor (SQL_ENGINE §7): junta la evidencia de
// cada job de .github/workflows/sql-engine.yml y falla si alguna version
// exacta de `verified` (lines.json) no la tiene completa.
//
//   node tools/test-dbs/evidence.mjs <dir>
//
// <dir> tiene un directorio real-<motor>-<version> por job, con
// evidence.jsonl (lo que escribe ROWLY_EVIDENCE) y real.log (la salida de
// cargo test). Completa quiere decir: el servidor que corrio es el que
// lines.json declara (version y digest) y pasaron todas las pruebas de
// real_server.rs y contract.rs, sin ninguna ignorada. Lo que una version no tiene sale
// como N/A, con su prueba. Con GITHUB_STEP_SUMMARY el resumen va ahi.

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../..", import.meta.url).pathname;
const dir = process.argv[2];
if (!dir) throw new Error("uso: evidence.mjs <dir>");

const lines = JSON.parse(readFileSync(join(ROOT, "tools/test-dbs/lines.json"), "utf8"));
// Las suites que corre cada job de version (sql-engine.yml).
const SUITES = ["real_server", "contract"];
const expected = SUITES.map((suite) => readFileSync(join(ROOT, `crates/server-tests/tests/${suite}.rs`), "utf8"))
  .map((source) => (source.match(/#\[tokio::test\]/g) ?? []).length)
  .reduce((sum, count) => sum + count, 0);
const ENGINE = { mysql: "MySql", mariadb: "MariaDb", postgres: "Postgres" };

const problems = [];
const rows = [];
const na = [];
for (const [engine, servers] of Object.entries(lines.verified)) {
  for (const server of servers) {
    const name = `${engine} ${server.version}`;
    const job = join(dir, `real-${engine}-${server.version}`);
    // upload-artifact conserva la ruta desde la raiz del repositorio.
    const records = (read(join(job, "evidence.jsonl")) || read(join(job, "crates/server-tests/evidence.jsonl")))
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter((record) => record.engine === ENGINE[engine]);
    const ran = records.find((record) => record.digest);
    // Una linea "test result" por suite; se suman.
    const results = [...read(join(job, "real.log")).matchAll(/test result: (\w+)\. (\d+) passed; (\d+) failed; (\d+) ignored/g)];
    const result = results.length === SUITES.length && [
      null,
      results.every((r) => r[1] === "ok") ? "ok" : "FAILED",
      ...[2, 3, 4].map((at) => String(results.reduce((sum, r) => sum + Number(r[at]), 0))),
    ];
    const missing = [];
    if (!ran) missing.push("sin registro del servidor");
    else if (ran.version !== server.version || ran.digest !== server.digest)
      missing.push(`corrio ${ran.version} ${ran.digest}, lines.json declara ${server.digest}`);
    if (!result) missing.push(`sin el resultado de las ${SUITES.length} suites (${results.length})`);
    else if (result[1] !== "ok" || Number(result[2]) !== expected || result[4] !== "0")
      missing.push(`${result[2]} de ${expected} pruebas, ${result[3]} fallidas, ${result[4]} ignoradas`);
    for (const record of records.filter((record) => record.na)) {
      na.push(`| ${name} | ${record.row} | ${record.na} | ${record.since} | \`${record.proof}\` |`);
    }
    rows.push(`| ${name} | ${missing.length ? "**incompleta**: " + missing.join("; ") : `completa (${expected}/${expected})`} |`);
    if (missing.length) problems.push(`${name}: ${missing.join("; ")}`);
  }
}

const summary = [
  "## Evidencia por version exacta",
  "",
  "| Version | Matriz |",
  "|---|---|",
  ...rows,
  "",
  na.length ? "### N/A (el servidor rechazo lo que usa una capacidad que llega despues)" : "Sin N/A.",
  ...(na.length ? ["", "| Version | Fila | Capacidad | Desde | Prueba (D7) |", "|---|---|---|---|---|", ...na] : []),
  "",
].join("\n");
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}
