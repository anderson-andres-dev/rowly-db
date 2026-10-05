#!/usr/bin/env node
// Candidatos a codigo sin consumidor (C0). Es un punto de partida, no un
// veredicto: una clave o un export pueden usarse de forma dinamica, y un
// comando IPC puede tener consumidores futuros. Nada se borra sin revisar.
//
//   node tools/inventory/unused.mjs            informe legible
//   node tools/inventory/unused.mjs --json     el mismo informe en JSON

import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = new URL("../..", import.meta.url).pathname;
const rel = (path) => relative(ROOT, path).split(sep).join("/");

function walk(dir, accept, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "target", ".svelte-kit", "build"].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, accept, out);
    else if (accept(path)) out.push(path);
  }
  return out;
}

const frontFiles = walk(join(ROOT, "app/src"), (p) => /\.(ts|svelte|js)$/.test(p));
const source = new Map(frontFiles.map((p) => [p, readFileSync(p, "utf8")]));
const isTest = (p) => /\.test\.ts$|__test-stubs__/.test(p);
const rustSource = walk(join(ROOT, "app/src-tauri/src"), (p) => p.endsWith(".rs"))
  .concat(walk(join(ROOT, "crates"), (p) => p.endsWith(".rs")))
  .map((p) => readFileSync(p, "utf8"))
  .join("\n");

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 1. Valores exportados (no tipos) que nada usa en produccion: ni otro
//    archivo ni el suyo propio fuera de la declaracion.
const exportsWithoutConsumer = [];
for (const [path, text] of source) {
  if (isTest(path) || !path.endsWith(".ts") || path.includes("/i18n/messages/")) continue;
  for (const match of text.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class|enum)\s+([A-Za-z_$][\w$]*)/gm)) {
    const name = match[1];
    const word = new RegExp(`\\b${escape(name)}\\b`);
    const own = text.match(new RegExp(`\\b${escape(name)}\\b`, "g")).length;
    if (own > 1) continue;
    let production = 0;
    let tests = 0;
    for (const [other, otherText] of source) {
      if (other === path || !word.test(otherText)) continue;
      if (isTest(other)) tests++;
      else production++;
    }
    if (production === 0) exportsWithoutConsumer.push({ file: rel(path), name, onlyTests: tests > 0 });
  }
}

// 2. Dependencias de package.json que ningun archivo importa.
const pkg = JSON.parse(readFileSync(join(ROOT, "app/package.json"), "utf8"));
const configText = ["vite.config.js", "svelte.config.js", "vitest.config.ts"]
  .map((f) => readFileSync(join(ROOT, "app", f), "utf8"))
  .join("\n");
const allFront = [...source.values()].join("\n") + configText;
const dependencies = Object.keys(pkg.dependencies ?? {})
  .filter((name) => !new RegExp(`["'\`]${escape(name)}(/[^"'\`]*)?["'\`]`).test(allFront))
  .map((name) => ({ name, kind: "dependency" }));

// 3. Claves de traduccion sin uso literal.
const messagesDir = join(ROOT, "app/src/lib/i18n/messages");
const translationKeys = [];
const nonI18n = [...source].filter(([p]) => !p.includes("/i18n/")).map(([, t]) => t).join("\n");
for (const file of readdirSync(messagesDir)) {
  if (file === "index.ts") continue;
  const namespace = file.replace(/\.ts$/, "");
  const text = readFileSync(join(messagesDir, file), "utf8");
  const es = text.slice(text.indexOf("es: {"), text.indexOf("\n  en: {"));
  for (const match of es.matchAll(/^\s{4}(?:"([^"]+)"|([\w$]+)):/gm)) {
    const key = match[1] ?? match[2];
    const full = `${namespace}.${key}`;
    const usedInFront = nonI18n.includes(`"${full}"`) || nonI18n.includes(`'${full}'`) || nonI18n.includes(`\`${full}\``);
    const usedInBackend = namespace === "backend" && rustSource.includes(`"${key}"`);
    if (usedInFront || usedInBackend) continue;
    // Prefijo usado en una plantilla (`area.${tipo}`): puede ser dinamica.
    const parts = full.split(".");
    let dynamic = false;
    for (let i = parts.length - 1; i > 0 && !dynamic; i--) {
      const prefix = parts.slice(0, i).join(".");
      dynamic = new RegExp(`[\`"']${escape(prefix)}\\.(\\$\\{|["']\\s*\\+)`).test(nonI18n) ||
        (namespace === "backend" && rustSource.includes(`"${parts.slice(1, i).join(".")}.`));
    }
    translationKeys.push({ key: full, maybeDynamic: dynamic });
  }
}

// 4. Comandos Tauri registrados que el frontend no invoca.
const lib = readFileSync(join(ROOT, "app/src-tauri/src/lib.rs"), "utf8");
const handler = lib.slice(lib.indexOf("generate_handler!["), lib.indexOf("])", lib.indexOf("generate_handler![")));
const commands = [...handler.matchAll(/([\w:]+),?\s*$/gm)]
  .map((m) => m[1].split("::").pop())
  .filter((name) => name && !allFront.includes(`"${name}"`))
  .map((name) => ({ command: name }));

const report = { exportsWithoutConsumer, dependencies, translationKeys, commands };
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Exports sin consumidor de produccion: ${exportsWithoutConsumer.length}`);
  for (const e of exportsWithoutConsumer) console.log(`  ${e.file}  ${e.name}${e.onlyTests ? "  (solo tests)" : ""}`);
  console.log(`Dependencias sin import: ${dependencies.length}`);
  for (const d of dependencies) console.log(`  ${d.name}`);
  const literal = translationKeys.filter((k) => !k.maybeDynamic);
  console.log(`Claves de traduccion sin uso: ${literal.length} (+${translationKeys.length - literal.length} que pueden armarse dinamicamente; --json las lista)`);
  for (const k of literal) console.log(`  ${k.key}`);
  console.log(`Comandos IPC sin invocacion en el frontend: ${commands.length}`);
  for (const c of commands) console.log(`  ${c.command}`);
}
