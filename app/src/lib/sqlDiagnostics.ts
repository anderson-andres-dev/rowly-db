import { EditorSelection, StateEffect, StateField, type EditorState, type Extension } from "@codemirror/state";
import { Decoration, EditorView, WidgetType, type DecorationSet } from "@codemirror/view";

// Diagnosticos de SQL en el editor, al estilo de lsp_lines (diseño en
// docs/specs/v0.2-diagnosticos.md). En reposo, un subrayado ondulado bajo el
// token; con el cursor en su linea, una fila debajo con la guia `└─>` que
// nace en la columna exacta del error. F2 / Shift+F2 saltan entre errores.
//
// Por ahora (4a) los errores salen de ejecutar: Postgres dice la posicion;
// MySQL no, y se deduce del mensaje (errorRange).

export interface SqlDiagnostic {
  from: number;
  to: number;
  message: string;
  code?: string;
}

// --- Donde esta el error dentro de la sentencia ----------------------------

const WORD = /[\p{L}\p{N}_$]/u;

// `position` de Postgres cuenta caracteres (1-based); CodeMirror, unidades
// UTF-16. Un emoji ocupa uno en Postgres y dos aca.
function charToUtf16(text: string, chars: number): number {
  let offset = 0;
  let count = 0;
  for (const char of text) {
    if (count === chars) break;
    offset += char.length;
    count += 1;
  }
  return offset;
}

// El token que empieza en `at`: una palabra entera o, si no, un caracter.
function tokenAt(text: string, at: number): { from: number; to: number } {
  if (!WORD.test(text[at] ?? "")) return { from: at, to: Math.min(text.length, at + 1) };
  let to = at;
  while (to < text.length && WORD.test(text[to])) to += 1;
  return { from: at, to };
}

function lineStart(text: string, line: number): number {
  let offset = 0;
  for (let current = 1; current < line; current += 1) {
    const next = text.indexOf("\n", offset);
    if (next === -1) return offset;
    offset = next + 1;
  }
  return offset;
}

function findWord(text: string, word: string, from = 0): number {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?<![\\p{L}\\p{N}_$])[\`"]?${escaped}[\`"]?(?![\\p{L}\\p{N}_$])`, "iu").exec(
    text.slice(from),
  );
  if (!match) return -1;
  const quote = /^[`"]/.test(match[0]) ? 1 : 0;
  return from + match.index + quote;
}

// Rango del error, relativo al inicio de `statement` (el texto tal como se
// mando). null: no se sabe donde; se marca la sentencia entera.
export function errorRange(
  statement: string,
  error: { message: string; position?: number },
): { from: number; to: number } | null {
  if (error.position !== undefined && error.position > 0) {
    const at = charToUtf16(statement, error.position - 1);
    if (at < statement.length) return tokenAt(statement, at);
  }

  // MySQL, error de sintaxis: "... near 'FROM usuarios' at line 2". El
  // fragmento puede venir cortado; con '' el problema es el final.
  const near = /near '([\s\S]*?)' at line (\d+)/.exec(error.message);
  if (near) {
    const start = lineStart(statement, Number(near[2]));
    if (near[1].trim() === "") {
      const end = statement.trimEnd().length;
      return end > 0 ? { from: end - 1, to: end } : null;
    }
    const fragment = near[1].slice(0, 40);
    const found = statement.indexOf(fragment, start);
    if (found !== -1) return tokenAt(statement, found);
  }

  // MySQL, nombres: "Unknown column 'fcha' in 'field list'", "Table
  // 'ventas.usarios' doesn't exist", "... column 'ventas.pedidos.total' ...".
  const quoted = /'([^']+)'/.exec(error.message);
  if (quoted) {
    const name = quoted[1].split(".").pop() ?? "";
    const found = name ? findWord(statement, name) : -1;
    if (found !== -1) return { from: found, to: found + name.length };
  }
  return null;
}

// --- Estado en el editor --------------------------------------------------

// Agrega diagnosticos, o quita los que caen dentro de un rango (una
// ejecucion nueva de esa sentencia).
export const addDiagnostics = StateEffect.define<SqlDiagnostic[]>();
export const clearDiagnosticsIn = StateEffect.define<{ from: number; to: number }>();
// Navegacion con F2: cual se eligio (muestra el contador n/m).
const setNavigated = StateEffect.define<number | null>();

interface DiagnosticsState {
  list: SqlDiagnostic[];
  navigated: number | null;
}

export const diagnosticsField = StateField.define<DiagnosticsState>({
  create: () => ({ list: [], navigated: null }),
  update(value, transaction) {
    let { list, navigated } = value;
    if (transaction.docChanged) {
      // Editar la sentencia del error lo deja viejo: se descarta.
      list = list.flatMap((item) => {
        let touched = false;
        transaction.changes.iterChangedRanges((fromA, toA) => {
          if (fromA <= item.to && toA >= item.from) touched = true;
        });
        if (touched) return [];
        return [{ ...item, from: transaction.changes.mapPos(item.from, 1), to: transaction.changes.mapPos(item.to, -1) }];
      });
    }
    let navigatedNow = false;
    for (const effect of transaction.effects) {
      if (effect.is(clearDiagnosticsIn)) {
        const range = effect.value;
        list = list.filter((item) => item.to < range.from || item.from > range.to);
      } else if (effect.is(addDiagnostics)) {
        list = [...list, ...effect.value].sort((a, b) => a.from - b.from);
      } else if (effect.is(setNavigated)) {
        navigated = effect.value;
        navigatedNow = true;
      }
    }
    if (!navigatedNow && (transaction.selection || transaction.docChanged)) navigated = null;
    return list === value.list && navigated === value.navigated ? value : { list, navigated };
  },
});

// --- Pintado --------------------------------------------------------------

class DiagnosticRow extends WidgetType {
  constructor(
    readonly diagnostic: SqlDiagnostic,
    readonly counter: string | null,
  ) {
    super();
  }

  eq(other: DiagnosticRow) {
    return (
      other.diagnostic.from === this.diagnostic.from &&
      other.diagnostic.message === this.diagnostic.message &&
      other.diagnostic.code === this.diagnostic.code &&
      other.counter === this.counter
    );
  }

  toDOM(view: EditorView) {
    const row = document.createElement("div");
    row.className = "cm-diagnosticRow";
    row.setAttribute("role", "status");
    row.setAttribute("aria-live", "polite");
    const guide = document.createElement("span");
    guide.className = "cm-diagnosticGuide";
    guide.textContent = "└─>";
    const icon = document.createElement("span");
    icon.className = "cm-diagnosticIcon";
    icon.textContent = "✕";
    const text = document.createElement("span");
    text.className = "cm-diagnosticText";
    text.textContent = this.diagnostic.message;
    row.append(guide, icon, text);
    if (this.diagnostic.code) {
      const code = document.createElement("span");
      code.className = "cm-diagnosticCode";
      code.textContent = this.diagnostic.code;
      row.append(code);
    }
    if (this.counter) {
      const counter = document.createElement("span");
      counter.className = "cm-diagnosticCounter";
      counter.textContent = this.counter;
      row.append(counter);
    }
    // La guia nace bajo el primer caracter del error: se mide en pixeles
    // (tabulaciones, acentos y cualquier fuente), despues del layout.
    const from = this.diagnostic.from;
    view.requestMeasure({
      read: () => {
        const coords = view.coordsAtPos(from);
        return coords ? coords.left - row.getBoundingClientRect().left : null;
      },
      write: (left) => {
        if (left !== null && left >= 0) row.style.paddingLeft = `${left}px`;
      },
    });
    return row;
  }

  ignoreEvent() {
    return false;
  }
}

function diagnosticDecorations(state: EditorState): DecorationSet {
  const { list, navigated } = state.field(diagnosticsField);
  if (list.length === 0) return Decoration.none;
  const length = state.doc.length;
  const ranges = [];
  for (const item of list) {
    if (item.to > length || item.from >= item.to) continue;
    ranges.push(Decoration.mark({ class: "cm-diagnostic-error" }).range(item.from, item.to));
  }
  // La fila con la flecha, solo en la linea del cursor.
  const cursorLine = state.doc.lineAt(state.selection.main.head).number;
  list.forEach((item, index) => {
    if (item.from > length) return;
    const line = state.doc.lineAt(item.from);
    if (line.number !== cursorLine) return;
    const counter = navigated === index && list.length > 1 ? `${index + 1}/${list.length}` : null;
    ranges.push(Decoration.widget({ widget: new DiagnosticRow(item, counter), block: true, side: 1 }).range(line.to));
  });
  return Decoration.set(ranges, true);
}

// F2 / Shift+F2: al siguiente o anterior error, dando la vuelta. false sin
// errores (la tecla sigue su camino).
export function jumpToDiagnostic(view: EditorView, direction: 1 | -1): boolean {
  const { list } = view.state.field(diagnosticsField);
  if (list.length === 0) return false;
  const head = view.state.selection.main.head;
  let index =
    direction === 1 ? list.findIndex((item) => item.from > head) : list.findLastIndex((item) => item.from < head);
  if (index === -1) index = direction === 1 ? 0 : list.length - 1;
  view.dispatch({
    selection: EditorSelection.cursor(list[index].from),
    effects: [setNavigated.of(index), EditorView.scrollIntoView(list[index].from)],
  });
  return true;
}

const diagnosticsTheme = EditorView.baseTheme({
  ".cm-diagnostic-error": {
    textDecoration: "underline wavy var(--danger)",
    textDecorationSkipInk: "none",
    textUnderlineOffset: "3px",
  },
  ".cm-diagnosticRow": {
    display: "flex",
    alignItems: "baseline",
    gap: "0.5ch",
    overflow: "hidden",
    whiteSpace: "nowrap",
    color: "var(--danger)",
    fontSize: "0.92em",
    lineHeight: "1.5",
    animation: "cm-diagnostic-in 120ms ease-out",
  },
  ".cm-diagnosticGuide": { flexShrink: "0", opacity: "0.8" },
  ".cm-diagnosticIcon": { flexShrink: "0" },
  ".cm-diagnosticText": {
    minWidth: "0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontFamily: "var(--font-family)",
  },
  ".cm-diagnosticCode, .cm-diagnosticCounter": {
    flexShrink: "0",
    color: "var(--text-secondary)",
    fontSize: "0.9em",
  },
  "@keyframes cm-diagnostic-in": { from: { opacity: "0" } },
  "@media (prefers-reduced-motion: reduce)": { ".cm-diagnosticRow": { animation: "none" } },
});

export const sqlDiagnostics: Extension = [
  diagnosticsField,
  EditorView.decorations.compute([diagnosticsField, "selection"], diagnosticDecorations),
  diagnosticsTheme,
];
