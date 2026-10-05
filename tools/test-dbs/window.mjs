#!/usr/bin/env node
// La ventana de soporte (SQL_ENGINE §5.2) decide que verifica el CI y que se
// anuncia como verificado hoy:
//   - cada linea con alguna version soportada o en gracia tiene una version
//     en `verified` (la compuerta de PR de motor corre en ella);
//   - una version de `verified` cuya ventana cierra en menos de WARN_DAYS
//     dias da un aviso, y una cuya ventana ya cerro da otro: hay que pasarla
//     a `retired` (lines.json) con la evidencia de su ultima verificacion. En
//     Quality eso no falla (el calendario no rompe el CI); con --release, si:
//     no se publica una release que anuncia como verificada una version fuera
//     de soporte.
//   - `retired` guarda lo que fue verificado y ya no se anuncia: cada version
//     con el commit y la corrida de su ultima evidencia, fuera de la ventana y
//     fuera de `verified`. Nunca se borra.
// El piso de compatibilidad de los drivers (desde donde se lee el catalogo)
// es otra cosa y no entra aqui.
//
//   node tools/test-dbs/window.mjs [--today AAAA-MM-DD] [--release] [--lines <lines.json>]
//
// La regla es la de app/src-tauri/src/engine_context.rs (la que llega a la UI
// en el contexto de la conexion): soportada hasta su fin de soporte; las LTS,
// 12 meses mas de gracia.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../..", import.meta.url).pathname;
const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const lines = JSON.parse(readFileSync(option("--lines") ?? join(ROOT, "tools/test-dbs/lines.json"), "utf8"));
const releases = JSON.parse(readFileSync(join(ROOT, "tools/support/vendor-support.json"), "utf8"));
const today = option("--today") ?? new Date().toISOString().slice(0, 10);
const release = args.includes("--release");
// El aviso llega con tiempo para pasar la version a `retired` en un PR normal.
const WARN_DAYS = 90;

const numbers = (text) => text.split(".").map((part) => Number.parseInt(part, 10));
const compare = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
};
const prefix = (version, release) => compare(numbers(version).slice(0, numbers(release).length), numbers(release)) === 0;
const days = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

// El ultimo dia de la ventana de una version del fabricante: su fin de
// soporte, o un ano despues si es LTS. Las fechas AAAA-MM-DD se comparan como texto.
function windowEnd(release) {
  if (!release.lts) return release.eol;
  const [year, rest] = [Number(release.eol.slice(0, 4)), release.eol.slice(4)];
  return `${year + 1}${rest}`;
}
const inWindow = (release) => today <= windowEnd(release);
const vendorRelease = (engine, version) => (releases[engine] ?? []).find((candidate) => prefix(version, candidate.release));

// La linea de una version: la de comienzo mas alto que no la supera.
function lineOf(engine, version) {
  return lines.engines[engine]
    .map((line) => line.line)
    .filter((start) => compare(numbers(start), numbers(version)) <= 0)
    .sort((a, b) => compare(numbers(b), numbers(a)))[0];
}

const problems = [];
const warnings = [];
const report = [];
for (const engine of Object.keys(lines.engines)) {
  const verified = lines.verified[engine] ?? [];
  for (const server of verified) {
    const found = vendorRelease(engine, server.version);
    if (!found) {
      problems.push(`${engine} ${server.version} esta en verified y no tiene fechas en vendor-support.json`);
      continue;
    }
    const end = windowEnd(found);
    const left = days(today, end);
    report.push(`${engine} ${server.version} (linea ${lineOf(engine, server.version)}): verificada, en la ventana hasta ${end}${left >= 0 ? ` (${left} dias)` : ", vencida"}`);
    const retire = `pasala de verified a retired en tools/test-dbs/lines.json, con el commit y la corrida de su ultima evidencia verde (SQL_ENGINE §5.2)`;
    if (left < 0) {
      const message = `${engine} ${server.version} salio de la ventana el ${end} y sigue anunciada como verificada: ${retire}. No se puede publicar una release hasta entonces`;
      if (release) problems.push(message);
      else warnings.push(message);
    } else if (left <= WARN_DAYS) {
      warnings.push(`${engine} ${server.version} sale de la ventana el ${end} (en ${left} dias): antes de esa fecha, ${retire}`);
    }
  }
  for (const server of lines.retired?.[engine] ?? []) {
    const found = vendorRelease(engine, server.version);
    const where = `${engine} ${server.version} (retired)`;
    report.push(`${where}: verificada hasta ${server.until} (commit ${server.evidence?.commit?.slice(0, 12) ?? "?"}), hoy no se anuncia`);
    if (verified.some((other) => other.version === server.version)) problems.push(`${where} tambien esta en verified`);
    if (!/^[0-9a-f]{40}$/.test(server.evidence?.commit ?? "") || !server.evidence?.run)
      problems.push(`${where}: falta evidence.commit (SHA completo) o evidence.run de su ultima verificacion`);
    if (!found) problems.push(`${where}: sin fechas en vendor-support.json`);
    else if (server.until !== windowEnd(found)) problems.push(`${where}: until ${server.until}, su ventana cierra el ${windowEnd(found)}`);
    else if (inWindow(found)) problems.push(`${where}: sigue en la ventana hasta ${windowEnd(found)}; se retira cuando sale`);
  }
  const lineWindow = (releases[engine] ?? []).filter(inWindow);
  for (const line of new Set(lineWindow.map((r) => lineOf(engine, r.release)).filter(Boolean))) {
    if (!verified.some((server) => lineOf(engine, server.version) === line)) {
      const which = lineWindow.filter((r) => lineOf(engine, r.release) === line).map((r) => r.release);
      problems.push(`${engine} linea ${line}: ${which.join(", ")} en la ventana y ninguna version verificada`);
    }
  }
}

console.log(`ventana al ${today}${release ? " (release)" : ""}:\n  ${report.join("\n  ")}`);
for (const warning of warnings) {
  console.log(process.env.GITHUB_ACTIONS ? `::warning title=Ventana de soporte::${warning}` : `aviso: ${warning}`);
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(warnings.length ? `verified coincide con la ventana, con ${warnings.length} aviso(s)` : "verified coincide con la ventana de soporte");
