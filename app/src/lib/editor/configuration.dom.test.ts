// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { get } from "svelte/store";
import { history, undo } from "@codemirror/commands";
import { EditorSelection } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { ENGINES, standardSql } from "$lib/engines";
import { buildRoutineIndex } from "$lib/editor/callHints";
import { buildCatalogCompletions } from "$lib/editor/catalogCompletions";
import { buildSqlSchema, dialectFor } from "$lib/editor/completionSource";
import { sqlLexical } from "$lib/editor/statementIndex";
import { editorSettings } from "$lib/stores/editorSettings";
import { editorPalette, effectiveScheme } from "$lib/theming/theme";
import { createEditorConfiguration, type LanguageContext } from "./configuration";

// Cambiar un ajuste reconfigura su Compartment: el editor sigue siendo el
// mismo, con su texto, su seleccion y su historial de deshacer.

let view: EditorView | undefined;
afterEach(() => view?.destroy());

function context(engine = standardSql): LanguageContext {
  return {
    engine,
    dialect: dialectFor(engine),
    schema: buildSqlSchema([], { engine }),
    catalogCompletions: buildCatalogCompletions([], engine),
    defaultTable: undefined,
    routines: buildRoutineIndex([]),
  };
}

describe("createEditorConfiguration", () => {
  it("every setting is reconfigured in place: same editor, text, selection and undo history", () => {
    let language = context();
    const configuration = createEditorConfiguration({
      language: () => language,
      settings: () => get(editorSettings),
      onOpenTable: () => {},
    });
    const initial = configuration.initial(get(editorPalette), get(effectiveScheme));
    view = new EditorView({
      doc: "SELECT 1",
      parent: document.body,
      extensions: [history(), ...Object.values(initial)],
    });
    const mounted = view;
    view.dispatch({ changes: { from: 8, insert: " FROM t" }, selection: EditorSelection.cursor(15) });

    language = context(ENGINES.postgres);
    for (const effects of [
      configuration.theme(get(editorPalette), get(effectiveScheme)),
      configuration.phrases(),
      configuration.behavior(true),
      configuration.tabCompletion(true),
      configuration.indentation("spaces", 4),
      configuration.lexical(ENGINES.postgres),
      configuration.hints(),
      ...configuration.completion(),
    ]) {
      view.dispatch({ effects });
    }

    expect(view).toBe(mounted);
    expect(view.state.doc.toString()).toBe("SELECT 1 FROM t");
    expect(view.state.selection.main.head).toBe(15);
    // El motor nuevo llego a las reglas lexicas del indice de sentencias.
    expect(view.state.facet(sqlLexical)).toBe(ENGINES.postgres.lexical);
    undo(view);
    expect(view.state.doc.toString()).toBe("SELECT 1");
  });
});
