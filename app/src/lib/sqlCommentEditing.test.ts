// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView, runScopeHandlers } from "@codemirror/view";
import { ENGINES } from "./engines";
import { commentEditing } from "./sqlCommentEditing";
import { dialectFor } from "./sqlSchema";

let views: EditorView[] = [];
afterEach(() => {
  for (const view of views) view.destroy();
  views = [];
});

// `doc` con "|" donde va el cursor.
function editor(doc: string, driver: "mysql" | "postgres" = "mysql") {
  const at = doc.indexOf("|");
  const view = new EditorView({
    state: EditorState.create({
      doc: doc.replace("|", ""),
      selection: EditorSelection.cursor(at),
      extensions: [dialectFor(ENGINES[driver]).language, commentEditing],
    }),
    parent: document.body,
  });
  views.push(view);
  return view;
}

// Teclea como el usuario: cada caracter pasa por los inputHandler del editor.
function type(view: EditorView, text: string) {
  for (const char of text) {
    const { from, to } = view.state.selection.main;
    const handled = view.state.facet(EditorView.inputHandler).some((handler) =>
      handler(view, from, to, char, () => view.state.update({ changes: { from, to, insert: char } })),
    );
    if (!handled) view.dispatch({ changes: { from, to, insert: char }, selection: { anchor: from + 1 } });
  }
}

function press(view: EditorView, key: string) {
  return runScopeHandlers(view, new KeyboardEvent("keydown", { key }), "editor");
}

function shown(view: EditorView): string {
  const { head } = view.state.selection.main;
  const doc = view.state.doc.toString();
  return doc.slice(0, head) + "|" + doc.slice(head);
}

describe("cierre automatico de /* */", () => {
  it("/* escribe /*|*/ y el cierre se salta al escribirlo", () => {
    const view = editor("SELECT 1 |");
    type(view, "/*");
    expect(shown(view)).toBe("SELECT 1 /*|*/");
    type(view, " nota ");
    expect(shown(view)).toBe("SELECT 1 /* nota |*/");
    type(view, "*/");
    expect(shown(view)).toBe("SELECT 1 /* nota */|");
  });

  it("Enter entre /* y */ abre el bloque en tres lineas y sigue con *", () => {
    const view = editor("  |");
    type(view, "/*");
    expect(press(view, "Enter")).toBe(true);
    expect(shown(view)).toBe("  /*\n   * |\n   */");
    type(view, "uno");
    press(view, "Enter");
    expect(shown(view)).toBe("  /*\n   * uno\n   * |\n   */");
  });

  it("Backspace tras /* en un /**/ vacio borra el par", () => {
    const view = editor("SELECT |");
    type(view, "/*");
    expect(press(view, "Backspace")).toBe(true);
    expect(shown(view)).toBe("SELECT |");
  });

  it("no actua dentro de un texto, un identificador ni otro comentario", () => {
    for (const doc of ["SELECT '|'", "SELECT `|`", "SELECT 1 -- |", "SELECT 1 /* |*/"]) {
      const view = editor(doc);
      type(view, "/*");
      expect(shown(view), doc).toBe(doc.replace("|", "/*|"));
    }
  });

  it("no cierra si lo que sigue es texto pegado (al comentar algo existente)", () => {
    const view = editor("SELECT |a FROM t");
    type(view, "/*");
    expect(shown(view)).toBe("SELECT /*|a FROM t");
  });

  it("tambien en Postgres, que anida", () => {
    const view = editor("SELECT 1 |", "postgres");
    type(view, "/*");
    expect(shown(view)).toBe("SELECT 1 /*|*/");
  });
});
