// Las referencias que el codigo declara entre archivos y dominios. Las usan
// graph.mjs (dependencias entre dominios, comprobadas en CI) y tools/orient
// (dependencias entre archivos, para decir que mas hay que mirar al tocar uno).
import { dirname, join, normalize } from "node:path/posix";

// Codigo sin pruebas ni comentarios de linea: lo que la app ejecuta.
export function code(path, text) {
  let body = text;
  if (path.endsWith(".rs") && !path.startsWith("crates/server-tests/")) body = body.split("#[cfg(test)]")[0];
  const comment = /\.(rs|ts|svelte|mjs|js)$/.test(path) ? /^\s*\/\/.*$/gm : /^\s*#.*$/gm;
  return body.replace(comment, "");
}

// El dominio de una ruta: el de la ruta mas larga que la contiene.
export function createDomainOf(model) {
  return function domainOf(path) {
    let best;
    for (const domain of model.domains) {
      if ((domain.except ?? []).some((prefix) => path === prefix || path.startsWith(prefix))) continue;
      for (const prefix of domain.paths) {
        if ((path === prefix || path.startsWith(prefix)) && (!best || prefix.length > best.length)) {
          best = { id: domain.id, length: prefix.length };
        }
      }
    }
    return best?.id;
  };
}

// `references(path, text)` -> [[destino, tipo]]: el destino es un id de dominio
// o una ruta (sin extension si viene de `$lib/...`).
export function createReferences(model) {
  const crates = new Map(model.domains.filter((d) => d.crate).map((d) => [d.crate, d.id]));
  // Referencias a datos por nombre, de los dominios de datos.
  const dataNames = model.domains
    .filter((d) => d.kind === "data")
    .flatMap((d) => d.paths.map((path) => ({ id: d.id, pattern: new RegExp(`(^|[^\\w/.-])${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) })));

  return function references(path, text) {
    const found = [];
    const from = dirname(path);
    if (path.endsWith(".rs")) {
      for (const [crate, id] of crates) if (new RegExp(`\\b${crate}\\b`).test(text)) found.push([id, "code"]);
      for (const [, module] of text.matchAll(/^\s*(?:pub(?:\([^)]*\))?\s+)?mod\s+(\w+)\s*;/gm)) {
        const base = path.endsWith("lib.rs") || path.endsWith("main.rs") || path.endsWith("mod.rs") ? from : path.replace(/\.rs$/, "");
        found.push([join(base, `${module}.rs`), "code"], [join(base, module, "mod.rs"), "code"]);
      }
      for (const [, target] of text.matchAll(/include_str!\(\s*"([^"]+)"/g)) found.push([normalize(join(from, target)), "data"]);
    }
    if (/\.(ts|svelte)$/.test(path)) {
      for (const [, spec] of text.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g)) {
        if (spec === "@tauri-apps/api/core") found.push(["backend", "ipc"]);
        else if (spec.startsWith("$lib/")) found.push([`app/src/lib/${spec.slice(5)}`, "code"]);
        else if (spec.startsWith(".")) found.push([normalize(join(from, spec)), spec.endsWith(".json") ? "data" : "code"]);
      }
    }
    for (const { id, pattern } of dataNames) if (pattern.test(text)) found.push([id, "data"]);
    if (/\browly-server-tests\b/.test(text)) found.push(["server-tests", "code"]);
    for (const [, tool] of text.matchAll(/\b(tools\/[\w./-]+)/g)) found.push([tool, "code"]);
    return found;
  };
}
