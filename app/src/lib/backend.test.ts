import { describe, expect, it } from "vitest";
import { backendText } from "$lib/backend";
import backend from "$lib/i18n/messages/backend";

describe("backendText", () => {
  it("traduce los mensajes de la app y deja tal cual los de la base", () => {
    expect(backendText({ key: "edit.noPrimaryKey", params: { table: "pedidos" } })).toBe(
      "La tabla pedidos no tiene clave primaria: no hay forma segura de identificar cada fila.",
    );
    expect(backendText("Unknown column 'x' in 'field list'")).toBe("Unknown column 'x' in 'field list'");
    expect(backendText({ key: "algo.nuevo" })).toBe("algo.nuevo");
  });
});

// Toda clave que emite el backend (Message::key en Rust) tiene que tener su
// texto; si no, la interfaz mostraria la clave.
const rustFiles = import.meta.glob(["../../../crates/**/src/**/*.rs", "../../src-tauri/src/**/*.rs"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

describe("mensajes del backend", () => {
  it("cada clave que emite Rust tiene texto", () => {
    // Sin los modulos de test, que usan claves de ejemplo.
    const sources = Object.values(rustFiles).map((source) => source.split("#[cfg(test)]")[0]);
    expect(sources.length).toBeGreaterThan(10);
    const keys = new Set<string>();
    for (const source of sources) {
      for (const match of source.matchAll(/Message::key\("([^"]+)"\)/g)) keys.add(match[1]);
      // soft(..., "categoria", warnings) -> introspect.<categoria>
      for (const match of source.matchAll(/soft\([\s\S]*?"(\w+)",\s*warnings,?\s*\)/g)) keys.add(`introspect.${match[1]}`);
      // NotEditable::as_key -> notEditable.<motivo>
      for (const match of source.matchAll(/NotEditable::\w+ => "(\w+)"/g)) keys.add(`notEditable.${match[1]}`);
    }
    expect(keys.size).toBeGreaterThan(40);
    const known = new Set(Object.keys(backend.es));
    expect([...keys].filter((key) => !known.has(key))).toEqual([]);
  });
});
