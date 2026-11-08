import assert from "node:assert/strict";
import { test } from "node:test";
import { extractFile, isTestFile, messagesOf } from "./extract.mjs";

const none = () => [];
const code = (_path, text) => text;
const extract = (path, text) => extractFile(path, text, none, code);

test("simbolos de TypeScript con el rango de lineas de cada bloque", () => {
  const text = [
    "// Desplaza la rejilla al arrastrar.",
    "export const MIN_STEP = 4;",
    "export function edgeScrollStep(a: number) {",
    "  if (a > 1) {",
    "    return 1;",
    "  }",
    "  return 0;",
    "}",
    "export interface Point { x: number }",
    "const run = async (x: number) => {",
    "  return x;",
    "};",
  ].join("\n");
  const { symbols, lead } = extract("a/x.ts", text);
  assert.deepEqual(symbols.map((s) => [s.name, s.kind, s.start, s.end]), [
    ["MIN_STEP", "const", 2, 2],
    ["edgeScrollStep", "fn", 3, 8],
    ["Point", "type", 9, 9],
    ["run", "const", 10, 12],
  ]);
  assert.equal(lead, "Desplaza la rejilla al arrastrar.");
});

test("las llaves dentro de textos no cuentan", () => {
  const text = ['function f() {', '  const s = "}}}";', "  return s;", "}", "function g() {}"].join("\n");
  const symbols = extract("a/x.ts", text).symbols;
  assert.deepEqual(symbols.map((s) => [s.name, s.end]), [["f", 4], ["g", 5]]);
});

test("simbolos de Rust y comandos de Tauri; lo que sigue a cfg(test) se ignora", () => {
  const text = [
    "//! Terminal integrada.",
    "pub struct Session {",
    "    id: u32,",
    "}",
    "impl Session {",
    "    pub fn new() -> Self { Self { id: 1 } }",
    "}",
    "#[tauri::command]",
    "pub async fn create_terminal(x: u32) -> u32 {",
    "    x",
    "}",
    "#[cfg(test)]",
    "mod tests { fn oculto() {} }",
  ].join("\n");
  const rec = extract("app/src-tauri/src/terminal.rs", text);
  assert.deepEqual(rec.symbols.map((s) => [s.name, s.kind]), [["Session", "type"], ["Session", "impl"], ["new", "fn"], ["create_terminal", "fn"]]);
  assert.deepEqual(rec.commands, ["create_terminal"]);
  assert.equal(rec.lead, "Terminal integrada.");
});

test("invocaciones IPC y claves de traduccion usadas", () => {
  const text = 'const a = await invoke<number>("create_terminal", {});\nconst t = $t("explorer.pin") + $t("grid.row.insert");\nconst x = "no.es.clave.con espacio";';
  const rec = extract("app/src/lib/terminal.ts", text);
  assert.deepEqual(rec.invokes, ["create_terminal"]);
  assert.deepEqual(rec.literals.sort(), ["explorer.pin", "grid.row.insert"]);
});

test("messagesOf lee es y en de un archivo de mensajes", () => {
  const text = ['export default defineMessages({', '  es: {', '    pinned: "Fijadas",', '    "open.file": "Abrir archivo…",', '  },', '  en: {', '    pinned: "Pinned",', '    "open.file": "Open file…",', '  },', '});'].join("\n");
  assert.deepEqual(messagesOf(text), { es: { pinned: "Fijadas", "open.file": "Abrir archivo…" }, en: { pinned: "Pinned", "open.file": "Open file…" } });
});

test("isTestFile reconoce pruebas por nombre y por carpeta", () => {
  assert.ok(isTestFile("a/x.test.ts"));
  assert.ok(isTestFile("crates/server-tests/tests/contract.rs"));
  assert.ok(isTestFile("app/src/lib/__test-stubs__/x.ts"));
  assert.ok(!isTestFile("app/src/lib/x.ts"));
});

test("un archivo con finales de linea CRLF da los mismos simbolos y el mismo comentario de apertura", () => {
  const text = ["// Abre el archivo.", "export function f() {", "  return 1;", "}"].join("\n");
  const crlf = text.replace(/\n/g, "\r\n");
  assert.deepEqual(extract("a/x.ts", crlf), extract("a/x.ts", text));
  const messages = 'export default defineMessages({\r\n  es: {\r\n    a: "A",\r\n  },\r\n  en: {\r\n    a: "B",\r\n  },\r\n});';
  assert.deepEqual(messagesOf(messages), { es: { a: "A" }, en: { a: "B" } });
});
