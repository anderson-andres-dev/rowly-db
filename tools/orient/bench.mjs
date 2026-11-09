#!/usr/bin/env node
// Cuanto tarda orient en un repositorio mas grande que este. Arma un repositorio sintetico
// (archivos TypeScript con funciones e imports, un catalogo y un inventario proporcionales),
// y mide el indice desde cero, el indice con cache y una tarjeta. No es parte del CI.
//
//   node tools/orient/bench.mjs [--sizes 1000,5000,20000]
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createOrient } from "./orient.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WORDS = ["grid", "scroll", "terminal", "editor", "filter", "export", "session", "cursor", "history", "query", "result", "schema"];

// Un repositorio de `size` archivos agrupados en carpetas, cada carpeta una funcionalidad.
export function synthesize(dir, size) {
  const perGroup = 25;
  const groups = Math.ceil(size / perGroup);
  const write = (path, text) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  };
  for (const file of ["tools/orient/extract.mjs", "tools/architecture/deps.mjs"]) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    copyFileSync(join(ROOT, file), join(dir, file));
  }
  const items = [];
  const tests = [];
  for (let g = 0; g < groups; g += 1) {
    const word = WORDS[g % WORDS.length];
    items.push({ id: `group-${g}`, summary: `The ${word} area number ${g}.`, domain: "frontend", terms: { es: [`${word}${g}`, "area"], en: [`${word}${g}`, "zone"] }, entry: [`app/src/lib/group${g}/`], untested: "synthetic" });
    for (let f = 0; f < perGroup && g * perGroup + f < size; f += 1) {
      const name = `${word}Part${f}`;
      const imports = [1, 2, 3].map((k) => `import { fn${(f + k) % perGroup} } from "./${word}Part${(f + k) % perGroup}";`).join("\n");
      const body = Array.from({ length: 5 }, (_, i) => `export function fn${f}x${i}(value: number) {\n  return value + ${i};\n}`).join("\n");
      write(`app/src/lib/group${g}/${name}.ts`, `// ${word} helper ${f} of group ${g}.\n${imports}\nexport function fn${f}() {}\n${body}\n`);
      if (f % 10 === 0) {
        write(`app/src/lib/group${g}/${name}.test.ts`, "");
        tests.push({ path: `app/src/lib/group${g}/${name}.test.ts`, owner: `app/src/lib/group${g}/${name}.ts`, property: `${word} behaviour ${f}`, gate: "pr", environment: "node" });
      }
    }
  }
  write("tools/architecture/model.json", JSON.stringify({ domains: [{ id: "frontend", paths: ["app/src/"] }], allowed: {}, flow: { nodes: [] }, features: { roots: ["app/src/"], items } }));
  write("tests/inventory.json", JSON.stringify({ tests }));
  execFileSync("git", ["init", "-q"], { cwd: dir });
  return { groups };
}

const ms = (since) => Math.round(performance.now() - since);

export function bench(size) {
  const dir = mkdtempSync(join(tmpdir(), "orient-bench-"));
  try {
    synthesize(dir, size);
    let t = performance.now();
    createOrient({ root: dir, useGraph: false, rebuild: true });
    const cold = ms(t);
    t = performance.now();
    const orient = createOrient({ root: dir, useGraph: false });
    const warm = ms(t);
    t = performance.now();
    const runs = 20;
    for (let i = 0; i < runs; i += 1) orient.run(`el ${WORDS[i % WORDS.length]} no hace scroll en la seccion ${i}`);
    return { size, cold, warm, card: Math.round((performance.now() - t) / runs), files: orient.stats.files };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function main(args) {
  const at = args.indexOf("--sizes");
  const sizes = (at >= 0 ? args[at + 1] : "1000,5000,20000").split(",").map(Number);
  console.log("archivos | indice desde cero | indice con cache | tarjeta (media)");
  for (const size of sizes) {
    const r = bench(size);
    console.log(`${String(r.files).padStart(8)} | ${String(r.cold).padStart(14)} ms | ${String(r.warm).padStart(13)} ms | ${String(r.card).padStart(8)} ms`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
