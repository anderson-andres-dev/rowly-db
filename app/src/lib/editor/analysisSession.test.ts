import { describe, expect, it } from "vitest";
import { standardSql, ENGINES } from "$lib/engines";
import { analysisCacheFor, analysisDiagnostics, type AnalysisDiagnostic } from "./analysisSession";

const text = (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key);
const at = (line: number, column: number) => ({ line, column });
const found = (key: string, from: [number, number], to: [number, number], extra: Partial<AnalysisDiagnostic> = {}) =>
  ({ start: at(...from), end: at(...to), message: { key }, ...extra }) as AnalysisDiagnostic;

describe("analysisDiagnostics", () => {
  it("places each diagnostic in the document, from the statement's offset", () => {
    const [diagnostic] = analysisDiagnostics(100, "SELECT a FROM t", [found("diagnostic.unknownColumn", [1, 8], [1, 9])], text);
    expect([diagnostic.from, diagnostic.to]).toEqual([107, 108]);
    expect(diagnostic.source).toBe("analysis");
  });

  it("a missing name is painted, not underlined, and suggests the closest one", () => {
    const [diagnostic] = analysisDiagnostics(
      0,
      "SELECT nmae FROM t",
      [found("diagnostic.unknownColumn", [1, 8], [1, 12], { suggestions: [{ start: at(1, 8), end: at(1, 12), replacement: "name" }] })],
      text,
    );
    expect(diagnostic.unresolved).toBe(true);
    expect(diagnostic.message).toContain('editor.diagnostics.didYouMean {"name":"name"}');
    expect(diagnostic.fixes).toEqual([{ label: 'editor.diagnostics.fix.replace {"text":"name"}', from: 7, to: 11, insert: "name" }]);
  });

  it("insert and delete fixes are labelled as such", () => {
    const [diagnostic] = analysisDiagnostics(
      0,
      "SELECT (1",
      [
        found("diagnostic.unclosedParen", [1, 8], [1, 9], {
          suggestions: [
            { start: at(1, 10), end: at(1, 10), replacement: ")" },
            { start: at(1, 8), end: at(1, 9), replacement: "" },
          ],
        }),
      ],
      text,
    );
    expect(diagnostic.fixes?.map((fix) => fix.label)).toEqual(['editor.diagnostics.fix.insert {"text":")"}', "editor.diagnostics.fix.delete"]);
  });

  it("what is only unfinished is marked incomplete; a trailing comma only at the end of the statement", () => {
    const statement = "SELECT a, FROM t";
    const [unclosed, commaInside, commaAtEnd] = [
      analysisDiagnostics(0, "SELECT (1", [found("diagnostic.unclosedParen", [1, 8], [1, 9])], text)[0],
      analysisDiagnostics(0, statement, [found("diagnostic.trailingComma", [1, 9], [1, 10])], text)[0],
      analysisDiagnostics(0, "SELECT a,", [found("diagnostic.trailingComma", [1, 9], [1, 10])], text)[0],
    ];
    expect([unclosed.incomplete, commaInside.incomplete, commaAtEnd.incomplete]).toEqual([true, false, true]);
  });

  it("generic parser messages are vague; a plain text message too", () => {
    const vague = analysisDiagnostics(0, "SELEC 1", [found("diagnostic.expected", [1, 1], [1, 6])], text)[0];
    const plain = analysisDiagnostics(0, "SELEC 1", [{ start: at(1, 1), end: at(1, 6), message: "Expected SELECT" } as AnalysisDiagnostic], text)[0];
    expect([vague.vague, plain.vague]).toEqual([true, true]);
  });
});

describe("analysisCacheFor", () => {
  it("is shared by every editor with the same connection, catalog, engine and created tables", () => {
    const tables = {};
    const first = analysisCacheFor("p1", tables, ENGINES.mysql, "");
    expect(analysisCacheFor("p1", tables, ENGINES.mysql, "")).toBe(first);
    // Cualquier cambio de contexto empieza de cero.
    expect(analysisCacheFor("p2", tables, ENGINES.mysql, "")).not.toBe(first);
    expect(analysisCacheFor("p1", {}, ENGINES.mysql, "")).not.toBe(first);
    expect(analysisCacheFor("p1", tables, ENGINES.postgres, "")).not.toBe(first);
    expect(analysisCacheFor("p1", tables, standardSql, "t")).not.toBe(first);
  });
});
