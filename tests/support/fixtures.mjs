#!/usr/bin/env node
// Fixtures de los paquetes de soporte (app/src-tauri/src/support.rs): firmados
// con tests/support/test-key, una clave SOLO de prueba que ninguna app
// publicada acepta. Salen de support/ con las mismas funciones que
// tools/support/publish.mjs; cada variante cambia una sola cosa.
//
//   node tests/support/fixtures.mjs     reescribe tests/support/fixtures/

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileName, indexEntry, indexText, packageText, ROOT, sign } from "../../tools/support/publish.mjs";

const out = join(ROOT, "tests/support/fixtures");
const env = { ...process.env, TAURI_SIGNING_PRIVATE_KEY_PATH: join(ROOT, "tests/support/test-key"), TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "" };
const mysql = JSON.parse(readFileSync(join(ROOT, "support/mysql.json"), "utf8"));
const base = mysql.lines.find((line) => line.line === "8.4");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const write = (name, text) => {
  writeFileSync(join(out, name), text);
  sign(join(out, name), env);
  return text;
};

// Validos: una revision nueva de 8.4 y una linea que la app no trae.
const r2 = { ...base, revision: 2, reservedWords: ["qualify"], removedSyntax: [...base.removedSyntax, { words: ["^", "SHOW", "SLAVE", "HOSTS"], instead: "SHOW REPLICAS" }] };
const ten = { line: "10", revision: 1 };
const valid = [
  [r2, write(fileName("mysql", r2), packageText("mysql", r2, "0.3.0"))],
  [ten, write(fileName("mysql", ten), packageText("mysql", ten, "0.3.0"))],
];
write("index.json", indexText("0".repeat(40), valid.map(([line, text]) => indexEntry("mysql", line, "0.3.0", fileName("mysql", line), text))));

// Validos por su firma, rechazados por lo que dicen.
write("requires-newer-app.json", packageText("mysql", { ...base, revision: 3 }, "99.0.0"));
write("format-2.json", packageText("mysql", { ...base, revision: 3 }, "0.3.0").replace('"format": 1', '"format": 2'));
write("unknown-field.json", packageText("mysql", { ...base, revision: 3, destructiveKeywords: [] }, "0.3.0"));
write("guard-field.json", packageText("mysql", { ...base, revision: 3 }, "0.3.0").replace('"format": 1,', '"format": 1,\n  "guard": { "safe": ["DROP"] },'));
write("capability-twice.json", packageText("mysql", { ...base, revision: 3, capabilities: { checkConstraints: "8.4" } }, "0.3.0"));
console.log(`fixtures en ${out}`);
