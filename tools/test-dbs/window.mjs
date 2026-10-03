#!/usr/bin/env node
// La ventana de soporte (SQL_ENGINE §5.2) decide que verifica el CI: las
// versiones de `verified` en lines.json son exactamente las de la ventana.
//   - cada linea con alguna version soportada o en gracia tiene una version
//     verificada (la compuerta de PR de motor corre en ella);
//   - ninguna version verificada esta fuera de la ventana (sin soporte, la
//     linea sigue conectando y D7 la sigue cubriendo, pero no se verifica).
// El piso de compatibilidad de los drivers (desde donde se lee el catalogo)
// es otra cosa y no entra aqui.
//
//   node tools/test-dbs/window.mjs [--today AAAA-MM-DD]
//
// La regla es la de app/src/lib/engines/vendorSupport.ts (la que ve la UI):
// soportada hasta su fin de soporte; las LTS, 12 meses mas de gracia.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../..", import.meta.url).pathname;
const lines = JSON.parse(readFileSync(join(ROOT, "tools/test-dbs/lines.json"), "utf8"));
const releases = JSON.parse(readFileSync(join(ROOT, "app/src/lib/engines/vendorSupport.json"), "utf8"));
const at = process.argv.indexOf("--today");
const today = at >= 0 ? new Date(`${process.argv[at + 1]}T12:00:00Z`) : new Date();

const numbers = (text) => text.split(".").map((part) => Number.parseInt(part, 10));
const compare = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
};
const prefix = (version, release) => compare(numbers(version).slice(0, numbers(release).length), numbers(release)) === 0;

function status(release) {
  const end = new Date(`${release.eol}T23:59:59Z`);
  const grace = new Date(end);
  grace.setUTCFullYear(grace.getUTCFullYear() + 1);
  return today <= end ? "supported" : release.lts && today <= grace ? "grace" : "unsupported";
}

// La linea de una version: la de comienzo mas alto que no la supera.
function lineOf(engine, version) {
  return lines.engines[engine]
    .map((line) => line.line)
    .filter((start) => compare(numbers(start), numbers(version)) <= 0)
    .sort((a, b) => compare(numbers(b), numbers(a)))[0];
}

const problems = [];
const report = [];
for (const engine of Object.keys(lines.engines)) {
  const verified = lines.verified[engine] ?? [];
  const inWindow = (releases[engine] ?? []).filter((release) => status(release) !== "unsupported");
  for (const server of verified) {
    const release = (releases[engine] ?? []).find((candidate) => prefix(server.version, candidate.release));
    const state = release ? status(release) : "sin fechas en vendorSupport.json";
    report.push(`${engine} ${server.version} (linea ${lineOf(engine, server.version)}): ${state}`);
    if (state !== "supported" && state !== "grace")
      problems.push(`${engine} ${server.version} esta en verified pero fuera de la ventana (${state}): sale de verified; la linea sigue conectando y en D7`);
  }
  for (const line of new Set(inWindow.map((release) => lineOf(engine, release.release)).filter(Boolean))) {
    if (!verified.some((server) => lineOf(engine, server.version) === line)) {
      const which = inWindow.filter((release) => lineOf(engine, release.release) === line).map((r) => r.release);
      problems.push(`${engine} linea ${line}: ${which.join(", ")} en la ventana y ninguna version verificada`);
    }
  }
}

console.log(`ventana al ${today.toISOString().slice(0, 10)}:\n  ${report.join("\n  ")}`);
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("verified coincide con la ventana de soporte");
