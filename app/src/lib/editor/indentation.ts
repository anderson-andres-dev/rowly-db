import { indentLess, indentMore } from "@codemirror/commands";
import { acceptCompletion, currentCompletions, moveCompletionSelection, nextSnippetField, prevSnippetField } from "@codemirror/autocomplete";
import { indentUnit } from "@codemirror/language";
import { EditorSelection, EditorState, Prec } from "@codemirror/state";
import { keymap, type EditorView, type KeyBinding } from "@codemirror/view";
import { indentationUnit, type IndentSize, type IndentStyle } from "$lib/sqlIndentationConfig";

export function indentationExtension(style: IndentStyle, size: IndentSize) {
  return [indentUnit.of(indentationUnit(style, size)), EditorState.tabSize.of(size)];
}

export function tabIndent(view: EditorView): boolean {
  if (view.state.selection.ranges.some((range) => !range.empty)) return indentMore(view);
  if (view.state.readOnly) return false;
  view.dispatch(view.state.update(view.state.replaceSelection(view.state.facet(indentUnit)), {
    scrollIntoView: true,
    userEvent: "input.indent",
  }));
  return true;
}

export function backspaceIndent(view: EditorView): boolean {
  const { state } = view;
  if (state.readOnly || state.facet(indentUnit) === "\t") return false;
  const size = state.facet(indentUnit).length;
  if (state.selection.ranges.some((range) => {
    if (!range.empty) return true;
    const line = state.doc.lineAt(range.head);
    return range.head === line.from || !/^ *$/.test(state.sliceDoc(line.from, range.head));
  })) return false;
  const changes = state.changeByRange((range) => {
    const line = state.doc.lineAt(range.head);
    const column = range.head - line.from;
    // Hasta el multiplo anterior de la unidad: desde la columna 3 con
    // unidad 2 borra uno, no dos.
    const count = Math.min(column, column % size || size);
    return { changes: { from: range.head - count, to: range.head }, range: EditorSelection.cursor(range.head - count) };
  });
  view.dispatch(state.update(changes, { userEvent: "delete.backward" }));
  return true;
}

export function tabCompletionBinding(navigates: boolean): KeyBinding {
  const popupOpen = (view: EditorView) => currentCompletions(view.state).length > 0;
  return {
    key: "Tab",
    // Con el popup abierto manda el popup; si no, los argumentos de un CALL
    // recien completado (editor/catalogCompletions.ts); si no, la sangria.
    run: (view) => (navigates ? moveCompletionSelection(true)(view) : acceptCompletion(view)) ||
      (popupOpen(view) || nextSnippetField(view) || tabIndent(view)),
    shift: (view) => (navigates && moveCompletionSelection(false)(view)) ||
      (navigates && popupOpen(view)) || prevSnippetField(view) || indentLess(view),
  };
}

export function buildTabCompletionKeymap(navigates: boolean) {
  return Prec.highest(keymap.of([tabCompletionBinding(navigates), { key: "Backspace", run: backspaceIndent }]));
}
