import { describe, expect, it, vi } from "vitest";
import { EditorState, type TransactionSpec } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { AnalysisRunner } from "./sqlAnalysis";
import {
  addDiagnostics,
  diagnosticAt,
  diagnosticsField,
  diagnosticsIn,
  setAnalysisIn,
  type SqlDiagnostic,
} from "./sqlDiagnostics";
import { statementIndexField, statementsChangedIn } from "./sqlStatementIndex";

function create(doc: string) {
  return EditorState.create({ doc, extensions: [statementIndexField, diagnosticsField] });
}

// Lo justo de EditorView que usa el runner.
function fakeView(initial: EditorState) {
  let state = initial;
  const view = {
    get state() {
      return state;
    },
    viewport: { from: 0, to: 2000 },
    dispatch(spec: TransactionSpec) {
      state = state.update(spec).state;
    },
  };
  return view as unknown as EditorView & { state: EditorState };
}

function analysisError(state: EditorState, text: string): SqlDiagnostic {
  const from = state.doc.toString().indexOf(text);
  return { from, to: from + text.length, message: text, source: "analysis" };
}

describe("diagnosticos en el RangeSet", () => {
  it("editar lejos mueve el diagnostico y sus correcciones; editar encima lo quita", () => {
    let state = create("SELECT fcha FROM t;\nSELECT x FROM u;");
    const item = { ...analysisError(state, "fcha"), fixes: [{ label: "fecha", from: 7, to: 11, insert: "fecha" }] };
    state = state.update({ effects: addDiagnostics.of([item]) }).state;

    state = state.update({ changes: { from: 0, insert: "-- nota\n" } }).state;
    const moved = diagnosticAt(state, 15)!;
    expect(state.sliceDoc(moved.from, moved.to)).toBe("fcha");
    expect(moved.fixes).toEqual([{ label: "fecha", from: 15, to: 19, insert: "fecha" }]);

    state = state.update({ changes: { from: 19, insert: "x" } }).state;
    expect(diagnosticsIn(state, 0, state.doc.length)).toEqual([]);
  });

  it("setAnalysisIn reemplaza solo dentro de su tramo", () => {
    let state = create("SELECT a;\nSELECT b;\nSELECT c;");
    state = state.update({
      effects: setAnalysisIn.of({
        ranges: [{ from: 0, to: state.doc.length }],
        list: ["a", "b", "c"].map((name) => analysisError(state, name)),
      }),
    }).state;
    state = state.update({
      effects: setAnalysisIn.of({ ranges: [{ from: 10, to: 19 }], list: [] }),
    }).state;
    expect(diagnosticsIn(state, 0, state.doc.length).map((item) => item.message)).toEqual(["a", "c"]);
  });

  it("un error de ejecucion no se ve si el analisis marca el mismo lugar", () => {
    let state = create("SELECT fcha FROM t;");
    const analysis = analysisError(state, "fcha");
    state = state.update({
      effects: [
        addDiagnostics.of([{ ...analysis, source: "server", message: "server" }]),
        setAnalysisIn.of({ ranges: [{ from: 0, to: 19 }], list: [analysis] }),
      ],
    }).state;
    expect(diagnosticsIn(state, 0, 19).map((item) => item.source)).toEqual(["analysis"]);
  });

  it("con 50 000 errores, una tecla no recorre la lista", () => {
    const line = "SELECT fcha FROM t;\n";
    let state = create(line.repeat(50_000));
    const list = Array.from({ length: 50_000 }, (_, index) => ({
      from: index * line.length + 7,
      to: index * line.length + 11,
      message: "fcha",
      source: "analysis" as const,
    }));
    state = state.update({ effects: setAnalysisIn.of({ ranges: [{ from: 0, to: state.doc.length }], list }) }).state;
    const start = performance.now();
    for (let index = 0; index < 20; index += 1) {
      state = state.update({ changes: { from: state.doc.length / 2 + index, insert: "x" } }).state;
    }
    expect((performance.now() - start) / 20).toBeLessThan(5);
    expect(diagnosticsIn(state, 0, 100).length).toBe(5);
  });
});

describe("AnalysisRunner", () => {
  const found = (text: string) => (text.includes("bad") ? [text] : []);

  function runner(view: EditorView, analyze = vi.fn(async (statements: string[]) => statements.map(found))) {
    const instance = new AnalysisRunner<string[]>({
      view: () => view,
      analyze,
      toDiagnostics: (from, statement, raw) =>
        raw.map((message) => ({ from, to: from + statement.length, message, source: "analysis" as const })),
      delayMs: 0,
    });
    return { instance, analyze };
  }

  it("revisa todo el documento por lotes y despues solo lo que cambia", async () => {
    const statements = Array.from({ length: 1000 }, (_, index) =>
      index % 100 === 0 ? `SELECT bad${index};` : `SELECT ${index};`,
    );
    const view = fakeView(create(statements.join("\n")));
    const { instance, analyze } = runner(view);
    instance.markAllDirty();
    await instance.run();

    expect(instance.pending()).toEqual([]);
    // Cada sentencia se manda una vez (los lotes se tocan en una, que ya
    // esta en la cache).
    const sent = analyze.mock.calls.flatMap(([batch]) => batch);
    expect(sent.length).toBe(1000);
    expect(new Set(sent).size).toBe(1000);
    const calls = analyze.mock.calls.length;
    expect(diagnosticsIn(view.state, 0, view.state.doc.length).length).toBe(10);

    // Una tecla en la sentencia 501: solo esa vuelve al backend.
    const at = view.state.doc.toString().indexOf("SELECT 501;") + 7;
    const before = view.state;
    view.dispatch({ changes: { from: at, insert: "bad" } });
    const transaction = before.update({ changes: { from: at, insert: "bad" } });
    instance.noteChanges(transaction.changes, statementsChangedIn(transaction.state));
    await instance.run();

    expect(analyze.mock.calls.length).toBe(calls + 1);
    expect(analyze.mock.calls[calls][0]).toEqual(["SELECT bad501;"]);
    expect(diagnosticsIn(view.state, 0, view.state.doc.length).length).toBe(11);
  });

  it("si cambia el texto mientras el backend responde, no aplica posiciones viejas", async () => {
    const view = fakeView(create("SELECT bad1;\nSELECT 2;"));
    let release: () => void = () => {};
    const analyze = vi.fn(
      (statements: string[]) => new Promise<string[][]>((resolve) => (release = () => resolve(statements.map(found)))),
    );
    const { instance } = runner(view, analyze);
    instance.markAllDirty();
    const running = instance.run();
    await Promise.resolve();

    const before = view.state;
    view.dispatch({ changes: { from: 0, insert: "-- x\n" } });
    instance.noteChanges(before.update({ changes: { from: 0, insert: "-- x\n" } }).changes, null);
    release();
    await running;
    await instance.run();

    const [item] = diagnosticsIn(view.state, 0, view.state.doc.length);
    expect(view.state.sliceDoc(item.from, item.to)).toBe("SELECT bad1;");
    // Lo pedido quedo guardado: no se volvio a preguntar.
    expect(analyze).toHaveBeenCalledTimes(1);
  });
});
