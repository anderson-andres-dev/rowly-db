import { describe, expect, it, vi } from "vitest";
import { EditorState, type TransactionSpec } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { standardSql, ENGINES } from "$lib/engines";
import { diagnosticsField, diagnosticsIn } from "$lib/editor/diagnostics";
import { statementIndexField } from "$lib/editor/statementIndex";
import {
  analysisCacheFor,
  analysisDiagnostics,
  createAnalysisSession,
  type AnalysisContext,
  type AnalysisDiagnostic,
} from "./analysisSession";

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
  it("is shared by every editor with the same connection context, engine and created tables", () => {
    const context = { generation: 1, schemaEpoch: 0 };
    const first = analysisCacheFor(context, ENGINES.mysql, "");
    // Otro objeto con el mismo contexto: la misma cache.
    expect(analysisCacheFor({ generation: 1, schemaEpoch: 0 }, ENGINES.mysql, "")).toBe(first);
    // Cualquier cambio de contexto empieza de cero.
    expect(analysisCacheFor({ generation: 2, schemaEpoch: 0 }, ENGINES.mysql, "")).not.toBe(first);
    expect(analysisCacheFor({ generation: 1, schemaEpoch: 1 }, ENGINES.mysql, "")).not.toBe(first);
    expect(analysisCacheFor(context, ENGINES.postgres, "")).not.toBe(first);
    expect(analysisCacheFor(context, standardSql, "t")).not.toBe(first);
    expect(analysisCacheFor(null, ENGINES.mysql, "")).not.toBe(first);
  });

  it("only one is kept: reconnecting lets the previous one go", () => {
    const caches = Array.from({ length: 300 }, (_, generation) => {
      const cache = analysisCacheFor<string>({ generation, schemaEpoch: 0 }, ENGINES.mysql, "");
      cache.set("SELECT 1", "ok");
      return cache;
    });
    // La vigente es la ultima; las anteriores no se vuelven a dar.
    expect(analysisCacheFor({ generation: 299, schemaEpoch: 0 }, ENGINES.mysql, "")).toBe(caches[299]);
    expect(analysisCacheFor({ generation: 0, schemaEpoch: 0 }, ENGINES.mysql, "")).not.toBe(caches[0]);
  });
});

// Lo justo de EditorView que usa el analisis.
function fakeView(doc: string) {
  let state = EditorState.create({ doc, extensions: [statementIndexField, diagnosticsField] });
  return {
    get state() {
      return state;
    },
    viewport: { from: 0, to: 2000 },
    dispatch(spec: TransactionSpec) {
      state = state.update(spec).state;
    },
  } as unknown as EditorView;
}

describe("createAnalysisSession", () => {
  // R5 (docs/specs/mapa-c0.md): lo que se pidio con una conexion no se aplica
  // despues de reconectar, aunque la respuesta llegue tarde.
  it("an answer asked for with the previous connection is not applied after reconnecting", async () => {
    vi.useFakeTimers();
    const view = fakeView("SELECT * FROM gone;");
    const pending: ((found: AnalysisDiagnostic[][]) => void)[] = [];
    const analyze = vi.fn(
      (_statements: string[], _created: string[], _context: AnalysisContext | null) =>
        new Promise<AnalysisDiagnostic[][]>((resolve) => pending.push(resolve)),
    );
    const session = createAnalysisSession({ view: () => view, text, analyze });
    try {
      session.setContext({ generation: 1, schemaEpoch: 0 }, ENGINES.mysql);
      await vi.advanceTimersByTimeAsync(500);
      expect(analyze).toHaveBeenCalledTimes(1);
      expect(analyze.mock.calls[0][2]).toEqual({ generation: 1, schemaEpoch: 0 });

      // Se reconecta (a otra base) antes de que llegue la respuesta.
      session.setContext({ generation: 2, schemaEpoch: 0 }, ENGINES.mysql);
      pending[0]([[found("diagnostic.unknownTable", [1, 15], [1, 19])]]);
      await vi.advanceTimersByTimeAsync(500);
      expect(analyze).toHaveBeenCalledTimes(2);
      expect(analyze.mock.calls[1][2]).toEqual({ generation: 2, schemaEpoch: 0 });

      pending[1]([[]]);
      await vi.advanceTimersByTimeAsync(0);
      expect(diagnosticsIn(view.state, 0, view.state.doc.length)).toEqual([]);
    } finally {
      session.destroy();
      vi.useRealTimers();
    }
  });

  it("the same context again does not ask the backend again", async () => {
    vi.useFakeTimers();
    const view = fakeView("SELECT 1;");
    const analyze = vi.fn(async (statements: string[]) => statements.map(() => []));
    const session = createAnalysisSession({ view: () => view, text, analyze });
    try {
      session.setContext({ generation: 5, schemaEpoch: 2 }, ENGINES.postgres);
      await vi.advanceTimersByTimeAsync(500);
      session.setContext({ generation: 5, schemaEpoch: 2 }, ENGINES.postgres);
      await vi.advanceTimersByTimeAsync(500);
      expect(analyze).toHaveBeenCalledTimes(1);
      // Otros schemas cargados (un refresco tras un DDL): se revisa de nuevo.
      session.setContext({ generation: 5, schemaEpoch: 3 }, ENGINES.postgres);
      await vi.advanceTimersByTimeAsync(500);
      expect(analyze).toHaveBeenCalledTimes(2);
    } finally {
      session.destroy();
      vi.useRealTimers();
    }
  });
});
