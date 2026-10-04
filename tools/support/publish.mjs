#!/usr/bin/env node
// Paquetes de soporte de version (SQL_ENGINE §11): un paquete por linea,
// derivado de support/<motor>.json, mas el indice que los lista. Todo firmado
// con la clave de las actualizaciones de la app, con el mismo
// `tauri signer sign` que usa el release (TAURI_SIGNING_PRIVATE_KEY o
// TAURI_SIGNING_PRIVATE_KEY_PATH, y su _PASSWORD).
//
//   node tools/support/publish.mjs --out <dir> --evidence <dir> [--requires-app <x.y.z>]
//
// Se niega a producir algo si:
// - el arbol de support/, tests/sql o tools/test-dbs tiene cambios sin commit
//   (el indice nombra el commit del que sale);
// - las lineas de support/ y las de tools/test-dbs/lines.json no coinciden;
// - la evidencia de la matriz (--evidence, los artefactos real-* de
//   sql-engine.yml) no esta completa para cada version verificada: la decide
//   tools/test-dbs/evidence.mjs, sin copia;
// - un dato de linea no tiene su fixture (crates/engine/tests/lines.rs);
// - no hay clave para firmar.
//
// No sube nada: deja los archivos en --out para adjuntarlos a mano al release
// `support-packages`. Mismo origen, mismos bytes de paquetes e indice (las
// firmas llevan la hora).

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const ROOT = new URL("../..", import.meta.url).pathname;
export const PACKAGE_FORMAT = 1;
export const INDEX_FORMAT = 1;

const read = (path) => JSON.parse(readFileSync(join(ROOT, path), "utf8"));

// Los motores registrados (tests/engines/contract.json) y sus lineas.
export function sources() {
  return read("tests/engines/contract.json").engines.map(({ id }) => read(`support/${id}.json`));
}

// La version de la app que publica: lo minimo que un paquete exige por
// defecto, porque es la primera que conoce su formato y sus campos.
export function appVersion() {
  const cargo = readFileSync(join(ROOT, "Cargo.toml"), "utf8");
  const match = cargo.match(/\[workspace\.package\][^[]*?\nversion = "([^"]+)"/);
  if (!match) throw new Error("Cargo.toml: sin version en [workspace.package]");
  return match[1];
}

// Un paquete: la linea tal como esta en support/, sin tocarla.
export function packageText(engine, line, requiresApp) {
  return `${JSON.stringify({ format: PACKAGE_FORMAT, engine, requiresApp, line }, null, 2)}\n`;
}

export function fileName(engine, line) {
  return `${engine}-${line.line}-r${line.revision}.json`;
}

export function indexEntry(engine, line, requiresApp, file, text) {
  const bytes = Buffer.from(text, "utf8");
  return {
    engine,
    line: line.line,
    revision: line.revision,
    requiresApp,
    file,
    size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

export function indexText(commit, entries) {
  return `${JSON.stringify({ format: INDEX_FORMAT, commit, packages: entries }, null, 2)}\n`;
}

// Firma `path` y deja `path.sig`, como el release.
export function sign(path, env = process.env) {
  if (!env.TAURI_SIGNING_PRIVATE_KEY && !env.TAURI_SIGNING_PRIVATE_KEY_PATH) {
    throw new Error("sin clave: TAURI_SIGNING_PRIVATE_KEY o TAURI_SIGNING_PRIVATE_KEY_PATH");
  }
  const local = join(ROOT, "app/node_modules/.bin/tauri");
  const [command, args] = existsSync(local)
    ? [local, ["signer", "sign", path]]
    : ["npx", ["--yes", "@tauri-apps/cli@2", "signer", "sign", path]];
  const signed = spawnSync(command, args, { env: { TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "", ...env }, encoding: "utf8" });
  if (signed.status !== 0 || !existsSync(`${path}.sig`)) {
    throw new Error(`no se pudo firmar ${path}: ${signed.stderr || signed.stdout}`);
  }
}

function git(...args) {
  const run = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  if (run.status !== 0) throw new Error(`git ${args.join(" ")}: ${run.stderr}`);
  return run.stdout.trim();
}

function publish({ out, evidence, requiresApp }) {
  const fail = (message) => {
    console.error(`publish: ${message}`);
    process.exit(1);
  };
  if (!out || !evidence) fail("uso: publish.mjs --out <dir> --evidence <dir> [--requires-app <x.y.z>]");

  const dirty = git("status", "--porcelain", "--", "support", "tests/sql", "tools/test-dbs");
  if (dirty) fail(`cambios sin commit en la fuente:\n${dirty}`);
  const commit = git("rev-parse", "HEAD");

  const registry = read("tools/test-dbs/lines.json");
  for (const source of sources()) {
    const ours = source.lines.map((line) => line.line).join(", ");
    const tested = (registry.engines[source.engine] ?? []).map((line) => line.line).join(", ");
    if (ours !== tested) fail(`${source.engine}: support/ tiene [${ours}] y lines.json [${tested}]`);
  }

  const check = spawnSync(process.execPath, [join(ROOT, "tools/test-dbs/evidence.mjs"), evidence], { encoding: "utf8" });
  if (check.status !== 0) fail(`la evidencia no esta completa:\n${check.stderr || check.stdout}`);
  // Cada dato de linea con su fixture, y las lineas validas (SQL_ENGINE §5.4).
  const data = spawnSync("cargo", ["test", "--locked", "-p", "khipu-engine", "--test", "lines"], { cwd: ROOT, encoding: "utf8" });
  if (data.status !== 0) fail(`los datos de linea no pasan crates/engine/tests/lines.rs:\n${data.stdout}${data.stderr}`);

  mkdirSync(out, { recursive: true });
  const entries = [];
  for (const source of sources()) {
    for (const line of source.lines) {
      const file = fileName(source.engine, line);
      const text = packageText(source.engine, line, requiresApp);
      writeFileSync(join(out, file), text);
      sign(join(out, file));
      entries.push(indexEntry(source.engine, line, requiresApp, file, text));
    }
  }
  writeFileSync(join(out, "index.json"), indexText(commit, entries));
  sign(join(out, "index.json"));
  console.log(`${entries.length} paquetes e index.json en ${out} (commit ${commit.slice(0, 12)})`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  try {
    publish({ out: flag("--out"), evidence: flag("--evidence"), requiresApp: flag("--requires-app") ?? appVersion() });
  } catch (error) {
    console.error(`publish: ${error.message}`);
    process.exit(1);
  }
}
