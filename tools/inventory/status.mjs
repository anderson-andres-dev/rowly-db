#!/usr/bin/env node
// El estado actual que README y SQL_ENGINE muestran, generado desde sus
// fuentes en vez de copiado a mano:
//   - motores y versiones verificadas (README): tools/test-dbs/lines.json
//   - lineas, sus datos y fechas del fabricante (SQL_ENGINE §5.3):
//     support/<engine>.json, lines.json, tools/support/vendor-support.json
//   - cobertura de cada fila (SQL_ENGINE §14): tests/sql/coverage.json
// La tabla escrita a mano de por que existe cada linea se comprueba contra
// support/: tiene que tener exactamente sus lineas.
//
//   node tools/inventory/status.mjs           comprueba (CI)
//   node tools/inventory/status.mjs --write   escribe los bloques
import { readFileSync, writeFileSync } from "node:fs";

const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const lines = json("tools/test-dbs/lines.json");
const vendor = json("tools/support/vendor-support.json");
const coverage = json("tests/sql/coverage.json");

// Los motores y sus nombres, del registro de conexiones del frontend.
const connections = readFileSync("app/src/lib/connections.ts", "utf8");
const engines = [...connections.matchAll(/id:\s*"(\w+)",\s*name:\s*"([^"]+)"/g)].map(([, id, name]) => ({
  id,
  name,
  lines: json(`support/${id}.json`).lines,
}));

const numbers = (text) => text.split(".").map((part) => Number.parseInt(part, 10) || 0);
const compare = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const order = (a[i] ?? 0) - (b[i] ?? 0);
    if (order !== 0) return order;
  }
  return 0;
};
// La linea de una version: la ultima que empieza en ella o antes (como
// EngineLines::effective, sin lineas desactivadas ni paquetes: lo incluido).
const lineOf = (engine, version) =>
  engine.lines.filter((line) => compare(numbers(line.line), numbers(version)) <= 0).at(-1)?.line;

const TEXT = {
  en: {
    engines: ["Engine", "Verified releases", "Version lines"],
    lines: ["Engine", "Line", "Revision", "Declared by the line (§5.4)", "Vendor releases (EOL of LTS)", "Verified"],
    coverage: ["Row", "Status", "Gap on", "Proven by"],
    status: { covered: "covered", partial: "partial", gap: "gap" },
    capability: "since",
    reserved: "reserved",
    removed: "removed",
    shortTerm: (n) => `${n} short-term`,
  },
  es: {
    engines: ["Motor", "Versiones verificadas", "Líneas de versión"],
    lines: ["Motor", "Línea", "Revisión", "Lo que declara la línea (§5.4)", "Versiones del fabricante (EOL de las LTS)", "Verificadas"],
    coverage: ["Fila", "Estado", "Hueco en", "Lo prueba"],
    status: { covered: "cubierta", partial: "parcial", gap: "hueco" },
    capability: "desde",
    reserved: "reservada",
    removed: "eliminada",
    shortTerm: (n) => `${n} de corta duración`,
  },
};

const table = (header, rows) =>
  [`| ${header.join(" | ")} |`, `|${header.map(() => "---").join("|")}|`, ...rows.map((row) => `| ${row.join(" | ")} |`)].join("\n");

function enginesBlock(t) {
  return table(
    t.engines,
    engines.map((engine) => [
      engine.name,
      lines.verified[engine.id].map((release) => release.version).join(", "),
      engine.lines.map((line) => line.line).join(", "),
    ]),
  );
}

function linesBlock(t) {
  const rows = [];
  for (const engine of engines) {
    engine.lines.forEach((line, index) => {
      const declared = [
        ...Object.entries(line.capabilities ?? {}).map(([name, since]) => `\`${name}\` ${t.capability} ${since}`),
        ...(line.reservedWords ?? []).map((word) => `${t.reserved} \`${word}\``),
        // `^` y `$` anclan al inicio y al final de la sentencia (§5.4).
        ...(line.removedSyntax ?? []).map((r) => {
          const words = r.words.filter((w) => w !== "^" && w !== "$").join(" ");
          const shown = `${r.words[0] === "^" ? "" : "… "}${words}${r.words.at(-1) === "$" ? "" : " …"}`;
          return `${t.removed} \`${shown}\``;
        }),
      ];
      const releases = vendor[engine.id].filter((r) => lineOf(engine, r.release) === line.line).sort((a, b) => compare(numbers(a.release), numbers(b.release)));
      const lts = releases.filter((r) => r.lts).map((r) => `${r.release} (${r.eol})`);
      const short = releases.filter((r) => !r.lts).length;
      const range = releases.length > 1 ? `${releases[0].release}–${releases.at(-1).release}` : (releases[0]?.release ?? "—");
      const vendorText = [range, ...lts, ...(short > 0 ? [t.shortTerm(short)] : [])].join("; ");
      const verified = lines.verified[engine.id].filter((r) => lineOf(engine, r.version) === line.line).map((r) => r.version);
      rows.push([index === 0 ? engine.name : "", line.line, String(line.revision), declared.join("<br>") || "—", vendorText, verified.join(", ") || "—"]);
    });
  }
  return table(t.lines, rows);
}

function coverageBlock(t) {
  return table(
    t.coverage,
    Object.entries(coverage.rows).map(([row, entry]) => [
      row,
      t.status[entry.status],
      (entry.gapEngines ?? []).join(", ") || "—",
      entry.tests.map((test) => `${test.scope}: \`${test.name}\` (${test.file.split("/").at(-1)})`).join("<br>") || "—",
    ]),
  );
}

const DOCS = [
  ["README.md", "en"],
  ["README.es.md", "es"],
  ["SQL_ENGINE.md", "en"],
  ["SQL_ENGINE.es.md", "es"],
];
const problems = [];
const write = process.argv[2] === "--write";

for (const [doc, language] of DOCS) {
  const t = TEXT[language];
  const blocks = { engines: enginesBlock(t), lines: linesBlock(t), coverage: coverageBlock(t) };
  const text = readFileSync(doc, "utf8");
  let out = text;
  for (const [name, body] of Object.entries(blocks)) {
    const pattern = new RegExp(`(<!-- generated: ${name} \\(tools/inventory/status\\.mjs\\) -->)[\\s\\S]*?(<!-- /generated: ${name} -->)`);
    out = out.replace(pattern, (_, open, close) => `${open}\n${body}\n${close}`);
  }
  // La tabla escrita a mano de por que existe cada linea: exactamente las
  // lineas de support/, en el mismo orden.
  const required = doc.startsWith("README") ? ["engines"] : ["lines", "coverage"];
  for (const name of required) {
    if (!out.includes(`<!-- generated: ${name} (tools/inventory/status.mjs) -->`)) problems.push(`${doc}: falta el bloque ${name}`);
  }
  const reasons = out.match(/<!-- checked: line-reasons -->([\s\S]*?)<!-- \/checked: line-reasons -->/);
  if (doc.startsWith("SQL_ENGINE") && !reasons) problems.push(`${doc}: falta la tabla line-reasons`);
  if (reasons) {
    let current = "";
    const found = reasons[1]
      .split("\n")
      .filter((row) => row.startsWith("|") && !/^\|\s*-/.test(row))
      .slice(1)
      .map((row) => row.split("|").map((cell) => cell.trim()))
      .map(([, engine, line]) => {
        current = engine || current;
        return `${current} ${line}`;
      });
    const expected = engines.flatMap((engine) => engine.lines.map((line) => `${engine.name} ${line.line}`));
    if (found.join("\n") !== expected.join("\n")) {
      problems.push(`${doc}: la tabla de por que existe cada linea no coincide con support/:\n  tiene    ${found.join(", ")}\n  esperaba ${expected.join(", ")}`);
    }
  }
  if (write) writeFileSync(doc, out);
  else if (out !== text) problems.push(`${doc}: el estado generado quedo atras; corre node tools/inventory/status.mjs --write`);
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`estado al dia: ${engines.length} motores, ${engines.reduce((n, e) => n + e.lines.length, 0)} lineas, ${Object.keys(coverage.rows).length} filas`);
