#!/usr/bin/env node
// Inventario de tests (tests/inventory.json).
//
// Los campos mecanicos (cuantos tests, ignorados, duracion, dependencias) se
// recalculan; los que decide una persona (dominio, dueno, propiedad, riesgo,
// compuerta, decision) se conservan del inventario existente.
//
//   node tools/inventory/tests.mjs                     reescribe el inventario
//   node tools/inventory/tests.mjs --check             falla si falta un test o un campo
//   node tools/inventory/tests.mjs --vitest <json>     duraciones de `vitest --reporter=json`
//   node tools/inventory/tests.mjs --cargo <log>       duraciones de `cargo test` por binario
//
// Solo usa la biblioteca estandar de Node 20.

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = new URL("../..", import.meta.url).pathname;
const OUT = join(ROOT, "tests/inventory.json");

const MANUAL = ["domain", "owner", "property", "risk", "gate", "decision"];
const OPTIONAL_MANUAL = ["target", "reason", "sqlEngineRows", "replaces"];
const RISKS = new Set(["P0", "P1", "P2", "P3"]);
const GATES = new Set(["pr", "engine-pr", "manual", "release"]);
const DECISIONS = new Set(["keep", "move", "rewrite", "remove"]);

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const check = args.includes("--check");

function walk(dir, accept, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "target", ".svelte-kit", "build", "data"].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, accept, out);
    else if (accept(path)) out.push(relative(ROOT, path).split(sep).join("/"));
  }
  return out;
}

function tsEntry(path) {
  const src = readFileSync(join(ROOT, path), "utf8");
  const tests = (src.match(/^\s*(it|test)(\.each\([^)]*\))?\s*\(/gm) ?? []).length;
  const ignored = (src.match(/\b(it|test|describe)\.(skip|skipIf|todo)\b/g) ?? []).length;
  const imports = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
  const dependencies = [
    ...new Set(
      imports
        .filter((spec) => spec.startsWith("$lib/") || spec.startsWith("./") || spec.startsWith("../"))
        .map((spec) => spec.replace(/^\$lib\//, "").replace(/^\.\//, "")),
    ),
  ].sort();
  const external = [...new Set(imports.filter((spec) => !/^(\$lib|\.)/.test(spec)).map((spec) => spec.split("/").slice(0, spec.startsWith("@") ? 2 : 1).join("/")))].sort();
  const environment = /@vitest-environment\s+(\S+)/.exec(src)?.[1] ?? "node";
  return { kind: "ts", tests, ignored, environment, dependencies, external };
}

function rustEntry(path) {
  const src = readFileSync(join(ROOT, path), "utf8");
  const tests = (src.match(/#\[(tokio::)?test/g) ?? []).length;
  const ignored = (src.match(/^\s*#\[ignore/gm) ?? []).length;
  const env = [...new Set([...src.matchAll(/"(ROWLY_[A-Z_]*)/g)].map((m) => m[1]))].sort();
  const crate = path.startsWith("app/src-tauri") ? "app/src-tauri" : path.split("/").slice(0, path.startsWith("crates/drivers") ? 3 : 2).join("/");
  return { kind: "rust", crate, tests, ignored, environment: ignored > 0 ? "real-server" : "none", env };
}

function vitestDurations(file) {
  if (!file) return new Map();
  const report = JSON.parse(readFileSync(file, "utf8"));
  return new Map(
    report.testResults.map((r) => [
      relative(ROOT, r.name).split(sep).join("/"),
      { durationMs: Math.round(r.endTime - r.startTime), tests: r.assertionResults.length },
    ]),
  );
}

// `cargo test` informa la duracion por binario, no por archivo: cada archivo
// lleva la de su binario (unittests del crate o un test de integracion).
function cargoDurations(file) {
  if (!file) return new Map();
  const out = new Map();
  let current = null;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const running = /Running (.+?) \((\S+)\)/.exec(line);
    if (running) current = `${running[1]} (${running[2]})`;
    const done = /test result: .* finished in ([\d.]+)s/.exec(line);
    if (done && current) out.set(current, Math.round(Number(done[1]) * 1000));
  }
  return out;
}

// Binario de cargo que corre un archivo: `unittests src/...` del crate
// (con el nombre de su [lib] o del paquete) o `tests/<archivo>.rs`.
function cargoBinary(crate, path) {
  const manifest = readFileSync(join(ROOT, crate, "Cargo.toml"), "utf8");
  const lib = /\[lib\][^[]*?name\s*=\s*"([^"]+)"/s.exec(manifest)?.[1];
  const name = (lib ?? /^name\s*=\s*"([^"]+)"/m.exec(manifest)[1]).replace(/-/g, "_");
  const integration = path.slice(crate.length + 1).startsWith("tests/");
  return integration
    ? (running) => running.startsWith(`tests/${path.split("/tests/")[1]} `)
    : (running) => running.startsWith("unittests src/lib.rs") && running.includes(`/deps/${name}-`);
}

const tsFiles = walk(join(ROOT, "app/src"), (p) => p.endsWith(".test.ts"));
// Recorridos E2E: cada flow(...) de run.mjs y cycle(...) de resources.mjs
// en app/tests/e2e es un test de la app real.
const E2E_TEST = /^(flow|cycle)\(["`]/gm;
const e2eFiles = existsSync(join(ROOT, "app/tests/e2e"))
  ? walk(join(ROOT, "app/tests/e2e"), (p) => p.endsWith(".mjs") && new RegExp(E2E_TEST.source, "m").test(readFileSync(p, "utf8")))
  : [];
const rustFiles = [
  ...walk(join(ROOT, "crates"), (p) => p.endsWith(".rs")),
  ...walk(join(ROOT, "app/src-tauri/src"), (p) => p.endsWith(".rs")),
].filter((path) => /#\[(tokio::)?test/.test(readFileSync(join(ROOT, path), "utf8")));

const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { tests: [] };
const byPath = new Map(previous.tests.map((entry) => [entry.path, entry]));
const vitest = vitestDurations(flag("--vitest"));
const cargo = cargoDurations(flag("--cargo"));

// Filas S/A/G/D de la matriz de SQL_ENGINE §6.
const sqlEngine = readFileSync(join(ROOT, "SQL_ENGINE.md"), "utf8");
const matrix = sqlEngine.slice(sqlEngine.indexOf("## 6."), sqlEngine.indexOf("## 7."));
const ROWS = new Set([...matrix.matchAll(/^\| ([SAGD]\d+) \|/gm)].map((m) => m[1]));

const problems = [];
function e2eEntry(path) {
  const src = readFileSync(join(ROOT, path), "utf8");
  // resources.mjs no usa WebDriver: abre la app con el inspector de WebKit.
  const environment = /^cycle\(/m.test(src) ? "app+inspector+mysql+postgres" : "app+webdriver+mysql";
  return { kind: "e2e", tests: (src.match(E2E_TEST) ?? []).length, ignored: 0, environment };
}

const tests = [...tsFiles, ...rustFiles, ...e2eFiles].sort().map((path) => {
  const mechanical = path.endsWith(".ts") ? tsEntry(path) : path.endsWith(".mjs") ? e2eEntry(path) : rustEntry(path);
  const old = byPath.get(path) ?? {};
  let durationMs = old.durationMs ?? null;
  // El conteo estatico no ve it.each ni bucles: con un reporte de vitest se
  // usa el numero real; sin el, se conserva el ultimo medido.
  if (mechanical.kind === "ts") {
    const measured = vitest.get(path);
    if (measured) ({ durationMs, tests: mechanical.tests } = { durationMs: measured.durationMs, tests: measured.tests });
    else if (old.tests !== undefined) mechanical.tests = old.tests;
  }
  if (mechanical.kind === "rust") {
    const match = [...cargo.keys()].find(cargoBinary(mechanical.crate, path));
    if (match !== undefined) durationMs = cargo.get(match);
  }
  const entry = { path };
  for (const field of MANUAL) entry[field] = old[field] ?? null;
  for (const field of OPTIONAL_MANUAL) if (old[field] !== undefined) entry[field] = old[field];
  Object.assign(entry, mechanical, { durationMs });
  for (const field of MANUAL) if (entry[field] === null) problems.push(`${path}: falta "${field}"`);
  if (entry.risk && !RISKS.has(entry.risk)) problems.push(`${path}: riesgo "${entry.risk}" desconocido`);
  if (entry.gate && !GATES.has(entry.gate)) problems.push(`${path}: compuerta "${entry.gate}" desconocida`);
  if (entry.decision && !DECISIONS.has(entry.decision)) problems.push(`${path}: decision "${entry.decision}" desconocida`);
  if (["move", "rewrite"].includes(entry.decision) && !entry.target) problems.push(`${path}: "${entry.decision}" sin "target"`);
  if (["rewrite", "remove"].includes(entry.decision) && !entry.reason) problems.push(`${path}: "${entry.decision}" sin "reason"`);
  for (const row of entry.sqlEngineRows ?? []) if (!ROWS.has(row)) problems.push(`${path}: fila "${row}" no existe en SQL_ENGINE §6`);
  if (entry.decision === "remove" && !entry.replaces) problems.push(`${path}: "remove" sin el test que lo sustituye ("replaces")`);
  return entry;
});

for (const path of byPath.keys()) {
  if (!tests.some((entry) => entry.path === path)) problems.push(`${path}: esta en el inventario pero ya no existe`);
}

const inventory = {
  format: 1,
  about: "Inventario de tests de Rowly DB. Ver tools/inventory/tests.mjs; los campos manuales se editan aqui.",
  summary: {
    files: tests.length,
    tests: tests.reduce((n, entry) => n + entry.tests, 0),
    ignored: tests.reduce((n, entry) => n + entry.ignored, 0),
    byDecision: Object.fromEntries([...DECISIONS].map((d) => [d, tests.filter((entry) => entry.decision === d).length])),
    byGate: Object.fromEntries([...GATES].map((g) => [g, tests.filter((entry) => entry.gate === g).length])),
    // Filas de §6 sin ningun archivo de test asignado: huecos, no aciertos.
    sqlEngineRowsWithoutTest: [...ROWS].filter((row) => !tests.some((entry) => entry.sqlEngineRows?.includes(row))),
  },
  tests,
};

if (check) {
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log(`inventario al dia: ${inventory.summary.files} archivos, ${inventory.summary.tests} tests`);
} else {
  writeFileSync(OUT, `${JSON.stringify(inventory, null, 2)}\n`);
  if (problems.length > 0) console.warn(problems.join("\n"));
  console.log(`tests/inventory.json: ${inventory.summary.files} archivos, ${inventory.summary.tests} tests`);
}
