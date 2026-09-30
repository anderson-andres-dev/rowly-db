import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import backend from "./messages/backend";

// Cada clave de diagnostico que escribe el motor de Rust tiene su texto: una
// nueva sin traducir llegaria a la pantalla como "diagnostic.x". (Que esten
// en todos los idiomas lo prueba i18n.test.ts.)
const ENGINE_SOURCES = join(__dirname, "../../../../crates/engine/src");

describe("claves del backend", () => {
  it("cada diagnostic.* de crates/engine tiene su mensaje", () => {
    const keys = new Set<string>();
    for (const file of readdirSync(ENGINE_SOURCES).filter((name) => name.endsWith(".rs"))) {
      const source = readFileSync(join(ENGINE_SOURCES, file), "utf8");
      for (const match of source.matchAll(/"(diagnostic\.[A-Za-z]+)"/g)) keys.add(match[1]);
    }
    expect(keys.size).toBeGreaterThan(0);
    const known = new Set(Object.keys(backend.es));
    expect([...keys].filter((key) => !known.has(key))).toEqual([]);
  });
});
