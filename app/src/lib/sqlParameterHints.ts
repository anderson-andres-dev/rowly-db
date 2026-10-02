import { Facet, type Extension } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from "@codemirror/view";
import type { SqlProfile } from "$lib/engines";
import { callHints, type RoutineIndex } from "$lib/sqlCallHints";
import { statementsIn } from "$lib/sqlStatementIndex";

// Los hints de parametros en el editor:
// solo las sentencias que tocan lo visible, cada una con el lexer liviano de
// sqlCallHints.ts.

export interface ParameterHintConfig {
  engine: SqlProfile;
  routines: RoutineIndex;
}

// El motor y las rutinas de la conexion; sin valor, no hay hints.
export const parameterHintConfig = Facet.define<ParameterHintConfig, ParameterHintConfig | null>({
  combine: (values) => values[0] ?? null,
});

// Una sentencia mas larga no se mira (un INSERT de varios MB).
const MAX_STATEMENT = 64 * 1024;

class ParameterHint extends WidgetType {
  constructor(readonly label: string) {
    super();
  }

  eq(other: ParameterHint) {
    return other.label === this.label;
  }

  toDOM() {
    const element = document.createElement("span");
    element.className = "cm-parameterHint";
    element.textContent = this.label;
    element.setAttribute("aria-hidden", "true");
    return element;
  }

  ignoreEvent() {
    return true;
  }
}

function hintDecorations(view: EditorView): DecorationSet {
  const config = view.state.facet(parameterHintConfig);
  if (!config || config.routines.byName.size === 0) return Decoration.none;
  const { state } = view;
  const seen = new Set<number>();
  const widgets = [];
  for (const { from, to } of view.visibleRanges) {
    for (const statement of statementsIn(state, from, to)) {
      if (seen.has(statement.from) || statement.to - statement.from > MAX_STATEMENT) continue;
      seen.add(statement.from);
      const text = state.sliceDoc(statement.from, statement.to);
      for (const hint of callHints(text, config.engine, config.routines)) {
        const at = statement.from + hint.at;
        if (at < from || at > to) continue;
        widgets.push(Decoration.widget({ widget: new ParameterHint(hint.label), side: -1 }).range(at));
      }
    }
  }
  return Decoration.set(widgets, true);
}

const hintPainter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = hintDecorations(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.startState.facet(parameterHintConfig) !== update.state.facet(parameterHintConfig)
      ) {
        this.decorations = hintDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

// Discreto: texto secundario sobre un fondo tenue, sin robar espacio a la
// linea.
const hintTheme = EditorView.baseTheme({
  ".cm-parameterHint": {
    display: "inline-block",
    marginRight: "0.5ch",
    padding: "0 0.5ch",
    borderRadius: "4px",
    backgroundColor: "color-mix(in srgb, var(--text-primary) 8%, transparent)",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-family)",
    fontSize: "0.85em",
    lineHeight: "1.35",
    userSelect: "none",
    pointerEvents: "none",
  },
});

export const parameterHints: Extension = [hintPainter, hintTheme];
