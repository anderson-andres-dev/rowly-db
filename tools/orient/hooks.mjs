#!/usr/bin/env node
// Hooks de git opcionales para mantener al dia el indice de orient. Nada en el
// repositorio los instala (ni npm, ni CI, ni otra herramienta): solo existen si
// alguien corre `install`. Y orient no los necesita: cada `orient.mjs` ya refresca
// el indice por su cuenta; esto solo adelanta ese trabajo (~100 ms) a los momentos
// en que cambian los archivos.
//
//   node tools/orient/hooks.mjs status                 dice que hooks hay y de quien son
//   node tools/orient/hooks.mjs install                post-commit, post-merge y post-checkout
//   node tools/orient/hooks.mjs install --graphify     y ademas `graphify update .` en segundo plano, si esta instalado
//   node tools/orient/hooks.mjs uninstall              quita solo lo que puso install
//
// El bloque va entre marcas y se anade al final de un hook que ya exista, sin tocar el
// resto; `uninstall` quita solo ese bloque. Nunca pisa un hook que no sea de shell. El
// bloque no puede hacer fallar un commit: no tiene `set -e`, silencia la salida y termina
// siempre bien, tambien si falta node o si falta tools/orient.
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const HOOKS = ["post-commit", "post-merge", "post-checkout"];
export const BEGIN = "# >>> orient (tools/orient/hooks.mjs) >>>";
export const END = "# <<< orient <<<";

export function hookBlock({ graphify = false } = {}) {
  const lines = [
    BEGIN,
    "# Opcional: refresca el indice de orient. Quitalo con `node tools/orient/hooks.mjs uninstall`.",
    "(",
    '  cd "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || exit 0',
    "  [ -f tools/orient/index.mjs ] || exit 0",
    "  command -v node >/dev/null 2>&1 || exit 0",
    "  node tools/orient/index.mjs --quiet >/dev/null 2>&1",
  ];
  if (graphify) lines.push("  command -v graphify >/dev/null 2>&1 && { graphify update . >/dev/null 2>&1 & }");
  lines.push(") || true", END);
  return lines.join("\n");
}

// Carpeta de hooks de un repositorio: respeta core.hooksPath y los worktrees.
export function hooksDir(cwd) {
  const out = execFileSync("git", ["rev-parse", "--git-path", "hooks"], { cwd, encoding: "utf8" }).trim();
  return resolve(cwd, out);
}

const ours = (text) => text.includes(BEGIN);
const withoutBlock = (text) => text.replace(new RegExp(`\\n?${BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${END}\\n?`), "\n");
const isShell = (text) => !text.startsWith("#!") || /^#!\s*(\/usr\/bin\/env\s+)?(ba|da|z)?sh\b|^#!\/bin\/(ba|da|z)?sh\b/.test(text.split("\n")[0]);

export function status(cwd) {
  const dir = hooksDir(cwd);
  return HOOKS.map((name) => {
    const path = join(dir, name);
    if (!existsSync(path)) return { name, state: "none" };
    const text = readFileSync(path, "utf8");
    return { name, state: ours(text) ? "orient" : "foreign", graphify: text.includes("graphify update") };
  });
}

export function install(cwd, { graphify = false } = {}) {
  const dir = hooksDir(cwd);
  mkdirSync(dir, { recursive: true });
  const done = [];
  const skipped = [];
  for (const name of HOOKS) {
    const path = join(dir, name);
    const existing = existsSync(path) ? readFileSync(path, "utf8") : null;
    if (existing !== null && !isShell(existing)) {
      skipped.push(`${name}: el hook existente no es de shell; no se toca`);
      continue;
    }
    const base = existing === null ? "#!/bin/sh\n" : withoutBlock(existing).replace(/\n*$/, "\n");
    writeFileSync(path, `${base}\n${hookBlock({ graphify })}\n`);
    chmodSync(path, 0o755);
    done.push(name);
  }
  return { dir, done, skipped };
}

export function uninstall(cwd) {
  const dir = hooksDir(cwd);
  const removed = [];
  for (const name of HOOKS) {
    const path = join(dir, name);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    if (!ours(text)) continue;
    const rest = withoutBlock(text);
    // Si el hook era solo nuestro (shebang y nada mas) se borra; si tenia algo mas, se deja.
    if (rest.replace(/^#!.*\n?/, "").trim() === "") unlinkSync(path);
    else writeFileSync(path, rest.replace(/\n*$/, "\n"));
    removed.push(name);
  }
  return { dir, removed };
}

function main(args) {
  const cwd = process.cwd();
  const [command] = args;
  if (command === "status") {
    for (const hook of status(cwd)) console.log(`${hook.name.padEnd(14)} ${hook.state === "none" ? "no existe" : hook.state === "orient" ? `orient${hook.graphify ? " + graphify" : ""}` : "de otra herramienta (orient no lo toco)"}`);
  } else if (command === "install") {
    const { dir, done, skipped } = install(cwd, { graphify: args.includes("--graphify") });
    console.log(`instalado en ${dir}: ${done.join(", ") || "nada"}`);
    for (const line of skipped) console.log(line);
  } else if (command === "uninstall") {
    const { removed } = uninstall(cwd);
    console.log(removed.length ? `quitado de: ${removed.join(", ")}` : "no habia nada de orient que quitar");
  } else {
    console.error("Uso: hooks.mjs status | install [--graphify] | uninstall");
    process.exit(2);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
