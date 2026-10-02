// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { setAnalysisIn, sqlDiagnostics, stopTyping, visibleDiagnosticCount, type SqlDiagnostic } from "$lib/sqlDiagnostics";

// Lo que se ve en el editor: cada error marcado, sea de sintaxis o un nombre
// que no existe.

const DOC = "SELECT * FROM clientes WHERE a IN (\n  1,\n  2\n  3\n)";

let view: EditorView;
afterEach(() => view?.destroy());

function show(list: SqlDiagnostic[], doc = DOC) {
  view = new EditorView({ state: EditorState.create({ doc, extensions: [sqlDiagnostics] }), parent: document.body });
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

  // Lo que encontro la simulacion de escribir SQL real letra por letra
  // (crates/server-tests, typing_real_sql_shows_nothing_that_is_only_unfinished).
  it("a medio escribir no se ve lo de la ultima palabra ni un nombre que aun puede definirse", () => {
    for (const [doc, item] of [
      // Un alias antes de escribir el FROM.
      ["SELECT a.f", { from: 7, to: 8, message: "No se encontró «a».", source: "analysis", unresolved: true }],
      // Lo ultimo escrito, ya con el espacio detras.
      ["SELECT * FROM ", { from: 9, to: 13, message: "Falta la tabla después de FROM.", source: "analysis" }],
      // Un mensaje generico mal ubicado mientras se escribe al final.
      ["SELECT CASE WHEN a.b", { from: 17, to: 18, message: "No se esperaba «a».", source: "analysis", vague: true }],
    ] as const) {
      // Se teclea la ultima letra y despues llega el analisis, como en la app.
      const typed = doc.slice(0, -1);
      show([], typed);
      view.dispatch({ changes: { from: typed.length, insert: doc.slice(-1) }, selection: { anchor: doc.length }, userEvent: "input.type" });
      view.dispatch({ effects: setAnalysisIn.of({ ranges: [{ from: 0, to: doc.length }], list: [item] }) });
      expect(visibleDiagnosticCount(view.state), doc).toBe(0);
      // Al dejar de escribir (salir de la sentencia o perder el foco), se ve.
      view.dispatch({ effects: stopTyping.of(null) });
      expect(visibleDiagnosticCount(view.state), doc).toBe(1);
      view.destroy();
    }
  });
});
