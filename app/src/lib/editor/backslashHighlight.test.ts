import { describe, expect, it } from "vitest";
import { classHighlighter, highlightTree } from "@lezer/highlight";
import { engineForContext } from "$lib/engines";
import type { ConnectionDriver } from "$lib/connections";
import type { ConnectionEngineContext } from "$lib/types";
import { dialectFor } from "$lib/editor/completionSource";
import { sqlTokens } from "$lib/editor/context";

// #63: el resaltado lee la barra invertida con el modo de la sesion, como el
// analisis. Sin NO_BACKSLASH_ESCAPES, en MySQL/MariaDB `'C:\'` no cierra
// (el analizador de Rust dice "Cadena sin cerrar"); con el modo, cierra en la
// segunda comilla y `AS v` es codigo.

const context = (engineId: ConnectionDriver, noBackslashEscapes: boolean): ConnectionEngineContext => ({
  generation: 1,
  engineId,
  server: { engine: engineId, version: [8, 4, 0], label: engineId },
  sessionMode: { noBackslashEscapes },
  line: { id: "8.4", revision: 1, origin: "included" },
  reservedWords: [],
  schemaEpoch: 0,
  support: null,
  verification: "verified",
});

// Los tramos pintados como cadena por el resaltador del editor.
function highlightedStrings(engineId: ConnectionDriver, noBackslashEscapes: boolean, text: string): string[] {
  const parser = dialectFor(engineForContext(context(engineId, noBackslashEscapes))).language.parser;
  const strings: string[] = [];
  highlightTree(parser.parse(text), classHighlighter, (from, to, classes) => {
    if (classes.split(" ").includes("tok-string")) strings.push(text.slice(from, to));
  });
  return strings;
}

function highlightedKeywords(engineId: ConnectionDriver, noBackslashEscapes: boolean, text: string): string[] {
  const parser = dialectFor(engineForContext(context(engineId, noBackslashEscapes))).language.parser;
  const keywords: string[] = [];
  highlightTree(parser.parse(text), classHighlighter, (from, to, classes) => {
    if (classes.split(" ").includes("tok-keyword")) keywords.push(text.slice(from, to));
  });
  return keywords;
}

// Lo que queda fuera de cadenas para el lexer del analisis en el frontend
// (mismo `lexical` del perfil): las cadenas no son tokens.
function analyzedWords(engineId: ConnectionDriver, noBackslashEscapes: boolean, text: string): string[] {
  const { lexical } = engineForContext(context(engineId, noBackslashEscapes));
  return sqlTokens(text, lexical).map((token) => token.raw);
}

const SQL = "SELECT 'C:\\' AS v";

describe("resaltado y barra invertida (#63)", () => {
  for (const engine of ["mysql", "mariadb"] as const) {
    it(`${engine} sin NO_BACKSLASH_ESCAPES: la cadena no cierra y AS v queda dentro`, () => {
      expect(highlightedStrings(engine, false, SQL)).toEqual(["'C:\\' AS v"]);
      expect(highlightedKeywords(engine, false, SQL)).toEqual(["SELECT"]);
      expect(analyzedWords(engine, false, SQL)).toEqual(["SELECT"]);
    });

    it(`${engine} con NO_BACKSLASH_ESCAPES: la cadena cierra y AS es palabra clave`, () => {
      expect(highlightedStrings(engine, true, SQL)).toEqual(["'C:\\'"]);
      expect(highlightedKeywords(engine, true, SQL)).toEqual(["SELECT", "AS"]);
      expect(analyzedWords(engine, true, SQL)).toEqual(["SELECT", "AS", "v"]);
    });
  }

  it("postgres no cambia: la barra invertida no escapa en '...' con o sin el modo", () => {
    expect(engineForContext(context("postgres", true))).toBe(engineForContext(context("postgres", false)));
    expect(highlightedStrings("postgres", false, SQL)).toEqual(["'C:\\'"]);
    expect(highlightedKeywords("postgres", false, SQL)).toEqual(["SELECT", "AS"]);
    expect(analyzedWords("postgres", false, SQL)).toEqual(["SELECT", "AS", "v"]);
  });

  it("el modo de sesion arma un perfil y un dialecto una sola vez", () => {
    const plain = engineForContext(context("mysql", true));
    expect(engineForContext(context("mysql", true))).toBe(plain);
    expect(dialectFor(plain)).toBe(dialectFor(engineForContext(context("mysql", true))));
    expect(!!dialectFor(plain).spec.backslashEscapes).toBe(false);
    expect(dialectFor(engineForContext(context("mysql", false))).spec.backslashEscapes).toBe(true);
  });
});
