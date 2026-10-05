#!/usr/bin/env node
// Solo versiones publicadas de las dependencias (CONTRIBUTING, Style): ni
// forks, ni ramas o commits sin publicar, ni parches propios. Lo que falta
// upstream queda como hueco documentado en SQL_ENGINE.md §9.
//
// La verdad son los lockfiles: una dependencia git, de otro registro o un
// parche a un repositorio aparece ahi como su fuente. Un `[patch]` hacia una
// ruta local no deja fuente en el lock, asi que tambien se buscan en los
// manifiestos.
//   node tools/inventory/dependencies.mjs
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const CRATES_IO = "registry+https://github.com/rust-lang/crates.io-index";
const NPM = "https://registry.npmjs.org/";

const tracked = (pattern) =>
  execFileSync("git", ["ls-files", pattern], { encoding: "utf8" }).split("\n").filter(Boolean);

const problems = [];

for (const lock of tracked("*Cargo.lock")) {
  let name = "?";
  for (const line of readFileSync(lock, "utf8").split("\n")) {
    const named = line.match(/^name = "(.+)"$/);
    if (named) name = named[1];
    const source = line.match(/^source = "(.+)"$/);
    if (source && source[1] !== CRATES_IO) problems.push(`${lock}: ${name} viene de ${source[1]}`);
  }
}

for (const manifest of tracked("*Cargo.toml")) {
  let table = "";
  readFileSync(manifest, "utf8")
    .split("\n")
    .forEach((line, index) => {
      const code = line.replace(/#.*$/, "");
      const header = code.match(/^\s*\[+\s*([^\]]+?)\s*\]+/);
      if (header) table = header[1];
      const where = `${manifest}:${index + 1}`;
      if (/^patch\b|^replace\b/.test(table) && header) problems.push(`${where}: [${table}]`);
      if (/\b(git|rev|branch|tag)\s*=/.test(code) && /dependencies|^patch|^replace/.test(table)) {
        problems.push(`${where}: ${line.trim()}`);
      }
    });
}

for (const lock of tracked("*package-lock.json")) {
  for (const [path, entry] of Object.entries(JSON.parse(readFileSync(lock, "utf8")).packages ?? {})) {
    if (entry.link) problems.push(`${lock}: ${path} es un enlace local`);
    if (entry.resolved && !entry.resolved.startsWith(NPM)) problems.push(`${lock}: ${path} viene de ${entry.resolved}`);
  }
}

for (const manifest of tracked("*package.json")) {
  const json = JSON.parse(readFileSync(manifest, "utf8"));
  for (const field of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
    for (const [name, spec] of Object.entries(json[field] ?? {})) {
      if (/^(git\+|git:|github:|https?:|file:|link:)|\//.test(spec)) problems.push(`${manifest}: ${name} = ${spec}`);
    }
  }
}

if (problems.length > 0) {
  console.error(`dependencias que no son versiones publicadas:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log("dependencias: solo versiones publicadas (crates.io, registry.npmjs.org)");
