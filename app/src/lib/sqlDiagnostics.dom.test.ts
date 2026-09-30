// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { setAnalysisIn, sqlDiagnostics, visibleDiagnosticCount, type SqlDiagnostic } from "$lib/sqlDiagnostics";

// Lo que se ve en el editor: cada error marcado, sea de sintaxis o un nombre
// que no existe.

const DOC = "SELECT * FROM clientes WHERE a IN (\n  1,\n  2\n  3\n)";

let view: EditorView;
afterEach(() => view?.destroy());

function show(list: SqlDiagnostic[]) {
  view = new EditorView({ state: EditorState.create({ doc: DOC, extensions: [sqlDiagnostics] }), parent: document.body });
  view.dispatch({ effects: setAnalysisIn.of({ ranges: [{ from: 0, to: DOC.length }], list }) });
}

describe("errores en el editor", () => {
  it("todos llevan el subrayado; lo que no existe, ademas, en rojo", () => {
    const table = DOC.indexOf("clientes");
    const three = DOC.indexOf("3");
    show([
      { from: table, to: table + "clientes".length, message: "La tabla «clientes» no existe.", source: "analysis", unresolved: true },
      { from: three, to: three + 1, message: "Falta una coma entre 2 y 3.", source: "analysis" },
    ]);
    const marked = [...view.contentDOM.querySelectorAll(".cm-diagnostic-error")].map((node) => node.textContent);
    expect(marked).toEqual(["clientes", "3"]);
    const red = [...view.contentDOM.querySelectorAll(".cm-unresolved")].map((node) => node.textContent);
    expect(red).toEqual(["clientes"]);
    const messages = [...view.contentDOM.querySelectorAll(".cm-lensMessage")].map((node) => node.textContent);
    expect(messages).toEqual(["La tabla «clientes» no existe.", "Falta una coma entre 2 y 3."]);
  });

  it("dos errores en la misma linea: los dos subrayados, el mensaje del primero y +1", () => {
    const table = DOC.indexOf("clientes");
    const column = DOC.indexOf(" a ") + 1;
    show([
      { from: table, to: table + "clientes".length, message: "La tabla «clientes» no existe.", source: "analysis", unresolved: true },
      { from: column, to: column + 1, message: "La columna «a» no existe.", source: "analysis", unresolved: true },
    ]);
    expect(view.contentDOM.querySelectorAll(".cm-diagnostic-error")).toHaveLength(2);
    const messages = [...view.contentDOM.querySelectorAll(".cm-lensMessage")].map((node) => node.textContent);
    expect(messages).toEqual(["La tabla «clientes» no existe.+1"]);
  });

  it("el contador cuenta lo que se ve: no lo incompleto de la sentencia que se esta escribiendo", () => {
    const three = DOC.indexOf("3");
    show([
      { from: three, to: three + 1, message: "Falta una coma entre 2 y 3.", source: "analysis" },
      { from: DOC.length - 1, to: DOC.length, message: "Falta cerrar este paréntesis.", source: "analysis", incomplete: true },
    ]);
    expect(visibleDiagnosticCount(view.state)).toBe(2);
    // Escribir al final: lo incompleto de esa sentencia se calla.
    view.dispatch({ changes: { from: DOC.length, insert: " " }, selection: { anchor: DOC.length + 1 }, userEvent: "input.type" });
    expect(visibleDiagnosticCount(view.state)).toBe(1);
  });
});
