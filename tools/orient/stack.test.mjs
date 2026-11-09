import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { load, npmDependencies, parseCargoLock, parseManifest, render, rustDependencies, satisfies, validate } from "./stack.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const root = `[workspace]
members = ["a"]
[workspace.dependencies]
local = { path = "crates/local" }
serde = { version = "1", features = ["derive"] }
sqlx = { version = "0.8", default-features = false }
`;
const member = `[package]
name = "demo"
[dependencies]
serde.workspace = true
local.workspace = true
sqlx = { workspace = true, features = ["mysql"] }
keyring = "4.2.0"
tauri = { version = "2", features = [] } # comentario
[dev-dependencies]
tokio = "=1.0.0"
[build-dependencies]
tauri-build = "2"
`;

test("parseManifest toma nombre, dependencias heredadas o propias y descarta las locales", () => {
  assert.deepEqual(parseManifest(root).workspace, [{ name: "serde", req: "1" }, { name: "sqlx", req: "0.8" }]);
  const parsed = parseManifest(member);
  assert.equal(parsed.name, "demo");
  assert.deepEqual(parsed.deps.map((dep) => [dep.name, dep.req, dep.kind, dep.inherited]), [
    ["serde", null, "normal", true],
    ["local", null, "normal", true],
    ["sqlx", null, "normal", true],
    ["keyring", "4.2.0", "normal", false],
    ["tauri", "2", "normal", false],
    ["tokio", "=1.0.0", "dev", false],
    ["tauri-build", "2", "build", false],
  ]);
});

test("satisfies sigue las reglas de Cargo para ^, ~, = y 0.x", () => {
  const cases = [
    ["1.0.229", "1", true], ["2.0.0", "1", false], ["0.8.6", "0.8", true], ["0.9.0", "0.8", false], ["0.56.0", "0.56", true],
    ["2.4.3", "~2.4.1", true], ["2.5.0", "~2.4.1", false], ["2.4.0", "~2.4.1", false], ["0.9.0", "=0.9.0", true], ["0.9.1", "=0.9.0", false], ["4.2.1", "^4.2.0", true],
  ];
  for (const [version, req, expected] of cases) assert.equal(satisfies(version, req), expected, `${version} ${req}`);
});

test("rustDependencies resuelve con el lock, elige la version que cumple y junta quien la usa", () => {
  const lock = `[[package]]\nname = "serde"\nversion = "1.0.5"\n\n[[package]]\nname = "sqlx"\nversion = "0.7.9"\n\n[[package]]\nname = "sqlx"\nversion = "0.8.6"\n\n[[package]]\nname = "keyring"\nversion = "4.2.0"\n`;
  assert.deepEqual(parseCargoLock(lock).get("sqlx"), ["0.7.9", "0.8.6"]);
  const rows = rustDependencies([{ text: root }, { text: member }], lock);
  const by = Object.fromEntries(rows.map((row) => [row.name, row]));
  assert.equal(by.sqlx.resolved, "0.8.6");
  assert.deepEqual(by.serde.usedBy, ["demo"]);
  assert.equal(by.tauri.resolved, null);
  assert.equal(by.local, undefined);
  assert.equal(validate({ rust: rows, npm: [] }).length, 3);
});

test("npmDependencies lee la version resuelta del lockfile", () => {
  const rows = npmDependencies({ dependencies: { a: "^1" }, devDependencies: { b: "~2" } }, { packages: { "node_modules/a": { version: "1.4.0" } } });
  assert.deepEqual(rows, [{ name: "a", req: "^1", kind: "normal", resolved: "1.4.0" }, { name: "b", req: "~2", kind: "dev", resolved: null }]);
});

test("render usa la version resuelta en los enlaces y no inventa guias", () => {
  const text = render({ rust: [{ name: "tauri", req: "2", resolved: "2.11.6", usedBy: ["x"], kinds: ["normal"] }], npm: [{ name: "svelte", req: "^5", kind: "dev", resolved: "5.57.1" }, { name: "zzz", req: "1", kind: "normal", resolved: "1.0.0" }] });
  assert.match(text, /docs\.rs\/tauri\/2\.11\.6\) · \[Tauri guide\]/);
  assert.match(text, /npmjs\.com\/package\/svelte\/v\/5\.57\.1\) · \[Svelte guide\]/);
  assert.match(text, /\| `zzz` \| `1` \| \*\*1\.0\.0\*\* \| normal \| \[npm\]\([^)]*\) \|$/m);
});

test("el repositorio: toda dependencia directa se resuelve y STACK.md esta al dia", () => {
  const data = load(ROOT);
  assert.deepEqual(validate(data), []);
  assert.ok(data.rust.some((row) => row.name === "tauri") && data.npm.some((row) => row.name === "svelte"));
  assert.equal(readFileSync(join(ROOT, "docs/map/STACK.md"), "utf8"), render(data));
});
