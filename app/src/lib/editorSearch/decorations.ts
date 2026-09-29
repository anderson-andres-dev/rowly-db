import { getSearchQuery, searchPanelOpen, setSearchQuery } from "@codemirror/search";
import { Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from "@codemirror/view";
import { exclusionField } from "./state";

// Tachado sobre lo excluido del reemplazo.
export const exclusionMarks = EditorView.decorations.compute([exclusionField], (state) => {
  const ranges = state.field(exclusionField);
  return Decoration.set(
    ranges.map((range) => Decoration.mark({ class: "kh-search-excluded" }).range(range.from, range.to)),
    true,
  );
});

// Una flecha de retorno al final de cada linea cuyo salto forma parte de una
// coincidencia: se ve que se reemplaza tambien el salto. La dibuja el CSS.
class NewlineMarker extends WidgetType {
  toDOM() {
    const span = document.createElement("span");
    span.className = "kh-search-newline";
    span.setAttribute("aria-hidden", "true");
    return span;
  }
  eq() {
    return true;
  }
  ignoreEvent() {
    return true;
  }
}

const newlineMarker = Decoration.widget({ widget: new NewlineMarker(), side: 1 });

// Solo lo visible: recorrer el documento entero en cada tecla no escala.
function newlineDecorations(view: EditorView): DecorationSet {
  if (!searchPanelOpen(view.state)) return Decoration.none;
  const query = getSearchQuery(view.state);
  if (!query.search || !query.valid || !/\n|\\n|\\s/.test(query.search)) return Decoration.none;
  const marks: { pos: number }[] = [];
  for (const { from, to } of view.visibleRanges) {
    const cursor = query.getCursor(view.state, Math.max(0, from - 500), Math.min(view.state.doc.length, to + 500));
    for (let step = cursor.next(); !step.done && marks.length < 2000; step = cursor.next()) {
      const text = view.state.sliceDoc(step.value.from, step.value.to);
      for (let index = text.indexOf("\n"); index !== -1; index = text.indexOf("\n", index + 1)) {
        marks.push({ pos: step.value.from + index });
      }
    }
  }
  return Decoration.set(
    marks.map((mark) => newlineMarker.range(mark.pos)),
    true,
  );
}

export const newlineMarkers = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = newlineDecorations(view);
    }
    update(update: ViewUpdate) {
      const queryChanged = update.transactions.some((transaction) =>
        transaction.effects.some((effect) => effect.is(setSearchQuery)),
      );
      const panelToggled = searchPanelOpen(update.startState) !== searchPanelOpen(update.state);
      if (update.docChanged || update.viewportChanged || queryChanged || panelToggled || update.selectionSet) {
        this.decorations = newlineDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);
