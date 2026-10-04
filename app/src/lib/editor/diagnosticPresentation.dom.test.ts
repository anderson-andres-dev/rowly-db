// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { get } from "svelte/store";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { ENGINES } from "$lib/engines";
import { addDiagnostics, sqlDiagnostics, type SqlDiagnostic } from "$lib/sqlDiagnostics";
import type { QueryExecutionResult } from "$lib/types";
import { createDiagnosticPopup, serverDiagnostics } from "./diagnosticPresentation";

const text = (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key);
const error = (message: string, code?: string) => ({ type: "error", message, code }) as unknown as QueryExecutionResult;

describe("serverDiagnostics", () => {
  it("places the error in its statement, with the engine's help", () => {
    const [diagnostic] = serverDiagnostics(
      "SELECT * FROM missing",
      10,
      error("Table 'core.missing' doesn't exist", "1146"),
      ENGINES.mysql,
      text,
    );
    expect(diagnostic.source).toBe("server");
    expect(diagnostic.help).toBe("tableMissing");
    expect(diagnostic.unresolved).toBe(true);
    expect([diagnostic.from, diagnostic.to]).toEqual([24, 31]);
  });

  it("without a hint of where, the whole statement", () => {
    const [diagnostic] = serverDiagnostics("SELECT 1", 5, error("Lost connection"), ENGINES.mysql, text);
    expect([diagnostic.from, diagnostic.to]).toEqual([5, 13]);
    expect(diagnostic.fixes).toEqual([]);
  });

  it("a result that is not an error has nothing to show", () => {
    const rows = { type: "resultSet", columns: [], rows: [] } as unknown as QueryExecutionResult;
    expect(serverDiagnostics("SELECT 1", 0, rows, ENGINES.mysql, text)).toEqual([]);
  });
});

describe("createDiagnosticPopup", () => {
  let view: EditorView | undefined;
  afterEach(() => view?.destroy());

  const fix = { label: "fix", from: 7, to: 11, insert: "name" };
  const diagnostic: SqlDiagnostic = { from: 7, to: 11, message: "unknown column", source: "analysis", fixes: [fix] };

  function mounted(cursor: number) {
    view = new EditorView({
      state: EditorState.create({ doc: "SELECT nmae FROM t\nSELECT 1", selection: EditorSelection.cursor(cursor), extensions: [sqlDiagnostics] }),
      parent: document.body,
    });
    view.dispatch({ effects: addDiagnostics.of([diagnostic]) });
    // happy-dom no hace layout: coordenadas fijas para anclar la ventana.
    view.coordsAtPos = () => ({ left: 10, right: 10, top: 20, bottom: 36 });
    return createDiagnosticPopup(() => view);
  }

  it("the details of the diagnostic on the cursor's line open with the focus; on a clean line, nothing", () => {
    const popup = mounted(8);
    expect(popup.showDetails(view!)).toBe(true);
    expect(get(popup.state)).toMatchObject({ diagnostic: { message: "unknown column" }, focused: true });
    popup.close(false);
    view!.dispatch({ selection: EditorSelection.cursor(22) });
    expect(popup.showDetails(view!)).toBe(false);
    expect(get(popup.state)).toBeNull();
  });

  it("the first fix of the diagnostic under the cursor is applied and the details close", () => {
    const popup = mounted(8);
    popup.showDetails(view!);
    expect(popup.applyFirstFix(view!)).toBe(true);
    expect(view!.state.doc.toString()).toBe("SELECT name FROM t\nSELECT 1");
    expect(get(popup.state)).toBeNull();
  });
});
