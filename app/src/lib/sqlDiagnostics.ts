import { EditorSelection, StateEffect, StateField, type EditorState, type Extension } from "@codemirror/state";
import { Decoration, EditorView, WidgetType, type DecorationSet } from "@codemirror/view";

// Diagnosticos de SQL en el editor, al estilo de lsp_lines (diseño en
// docs/specs/v0.2-diagnosticos.md). En reposo, un subrayado ondulado bajo el
// token; con el cursor en su linea, filas debajo con la guia `└─>` que nace
// en la columna exacta de cada error (varios en la misma linea se apilan
// con `│`). F2 / Shift+F2 saltan entre errores.
//
// Dos fuentes: "server" (al ejecutar: Postgres dice la posicion, en MySQL
// se deduce del mensaje, errorRange) y "analysis" (mientras se escribe:
// analyze_sql, sintaxis y catalogo). Si las dos marcan el mismo lugar, se ve
// la del analisis, que explica mejor.

export interface QuickFix {
  label: string;
  from: number;
  to: number;
  insert: string;
}

export interface SqlDiagnostic {
  from: number;
  to: number;
  message: string;
  source: "server" | "analysis";
  code?: string;
  fixes?: QuickFix[];
}

// --- Offsets ---------------------------------------------------------------

const WORD = /[\p{L}\p{N}_$]/u;

// Postgres y sqlparser cuentan caracteres; CodeMirror, unidades UTF-16. Un
// emoji ocupa uno alla y dos aca.
export function charToUtf16(text: string, chars: number): number {
  let offset = 0;
  let count = 0;
  for (const char of text) {
    if (count === chars) break;
    offset += char.length;
    count += 1;
  }
  return offset;
}

function lineStart(text: string, line: number): number {
  let offset = 0;
  for (let current = 1; current < line; current += 1) {
    const next = text.indexOf("\n", offset);
    if (next === -1) return text.length;
    offset = next + 1;
  }
  return offset;
}

// Linea y columna (1-based, en caracteres) a offset dentro de `text`.
export function lineColumnToOffset(text: string, line: number, column: number): number {
  const start = lineStart(text, line);
  const end = text.indexOf("\n", start);
  const lineText = text.slice(start, end === -1 ? text.length : end);
  return start + charToUtf16(lineText, Math.max(0, column - 1));
}

// El token que empieza en `at`: una palabra entera o, si no, un caracter.
function tokenAt(text: string, at: number): { from: number; to: number } {
  if (!WORD.test(text[at] ?? "")) return { from: at, to: Math.min(text.length, at + 1) };
  let to = at;
  while (to < text.length && WORD.test(text[to])) to += 1;
  return { from: at, to };
}

function findWord(text: string, word: string): number {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?<![\\p{L}\\p{N}_$])[\`"]?${escaped}[\`"]?(?![\\p{L}\\p{N}_$])`, "iu").exec(text);
  if (!match) return -1;
  return match.index + (/^[`"]/.test(match[0]) ? 1 : 0);
}

// Rango de un error de ejecucion, relativo al inicio de `statement` (el texto
// tal como se mando). null: no se sabe donde; se marca la sentencia entera.
export function errorRange(
  statement: string,
  error: { message: string; position?: number },
): { from: number; to: number } | null {
  if (error.position !== undefined && error.position > 0) {
    const at = charToUtf16(statement, error.position - 1);
    if (at < statement.length) return tokenAt(statement, at);
  }

  // El analizador de la app (una sentencia que no se pudo analizar):
  // "... at Line: 1, Column: 8".
  const located = /at Line: (\d+), Column: (\d+)/.exec(error.message);
  if (located) {
    const at = lineColumnToOffset(statement, Number(located[1]), Number(located[2]));
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
    const found = statement.indexOf(near[1].slice(0, 40), start);
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

// Errores de ejecucion nuevos, o quitar los de un rango (se vuelve a
// ejecutar esa sentencia).
export const addDiagnostics = StateEffect.define<SqlDiagnostic[]>();
export const clearDiagnosticsIn = StateEffect.define<{ from: number; to: number }>();
// El resultado completo del analisis: reemplaza al anterior.
export const setAnalysis = StateEffect.define<SqlDiagnostic[]>();
// Navegacion con F2: cual se eligio (muestra el contador n/m).
const setNavigated = StateEffect.define<number | null>();

interface DiagnosticsState {
  list: SqlDiagnostic[];
  navigated: number | null;
}

function byPosition(a: SqlDiagnostic, b: SqlDiagnostic): number {
  return a.from - b.from || a.to - b.to;
}

export const diagnosticsField = StateField.define<DiagnosticsState>({
  create: () => ({ list: [], navigated: null }),
  update(value, transaction) {
    let { list, navigated } = value;
    if (transaction.docChanged && list.length > 0) {
      // Editar sobre un error lo deja viejo: se descarta (el analisis vuelve
      // a mirar en cuanto se deja de escribir).
      list = list.flatMap((item) => {
        let touched = false;
        transaction.changes.iterChangedRanges((fromA, toA) => {
          if (fromA <= item.to && toA >= item.from) touched = true;
        });
        if (touched) return [];
        const from = transaction.changes.mapPos(item.from, 1);
        const to = transaction.changes.mapPos(item.to, -1);
        const fixes = item.fixes?.map((fix) => ({
          ...fix,
          from: transaction.changes.mapPos(fix.from, 1),
          to: transaction.changes.mapPos(fix.to, -1),
        }));
        return [{ ...item, from, to, fixes }];
      });
    }
    let navigatedNow = false;
    for (const effect of transaction.effects) {
      if (effect.is(clearDiagnosticsIn)) {
        const range = effect.value;
        list = list.filter((item) => item.source !== "server" || item.to < range.from || item.from > range.to);
      } else if (effect.is(addDiagnostics)) {
        list = [...list, ...effect.value].sort(byPosition);
      } else if (effect.is(setAnalysis)) {
        list = [...list.filter((item) => item.source === "server"), ...effect.value].sort(byPosition);
      } else if (effect.is(setNavigated)) {
        navigated = effect.value;
        navigatedNow = true;
      }
    }
    if (!navigatedNow && (transaction.selection || transaction.docChanged)) navigated = null;
    return list === value.list && navigated === value.navigated ? value : { list, navigated };
  },
});

// Lo que se muestra: sin el error de ejecucion que el analisis ya explica en
// el mismo lugar.
export function visibleDiagnostics(state: EditorState): SqlDiagnostic[] {
  const { list } = state.field(diagnosticsField);
  const analyzed = new Set(list.filter((item) => item.source === "analysis").map((item) => item.from));
  const length = state.doc.length;
  return list.filter(
    (item) => item.to <= length && item.from < item.to && !(item.source === "server" && analyzed.has(item.from)),
  );
}

// El diagnostico bajo el cursor (o, si no hay, el primero de su linea).
export function diagnosticAt(state: EditorState, pos: number): SqlDiagnostic | null {
  const list = visibleDiagnostics(state);
  const inside = list.find((item) => item.from <= pos && pos <= item.to);
  if (inside) return inside;
  const line = state.doc.lineAt(pos);
  return list.find((item) => item.from >= line.from && item.from <= line.to) ?? null;
}

// --- Pintado --------------------------------------------------------------

// Todas las filas de una linea: la de mas a la derecha arriba; las de su
// izquierda bajan con `│` hasta su propia fila.
//
//   SELECT nombre, fcha FROM usarios
//                  │         └─> ✕ La tabla «usarios» no existe.
//                  └─> ✕ La columna «fcha» no existe.
class DiagnosticBlock extends WidgetType {
  constructor(
    readonly items: SqlDiagnostic[],
    readonly counters: (string | null)[],
  ) {
    super();
  }

  eq(other: DiagnosticBlock) {
    return (
      other.items.length === this.items.length &&
      other.items.every(
        (item, index) =>
          item.from === this.items[index].from &&
          item.message === this.items[index].message &&
          item.code === this.items[index].code &&
          other.counters[index] === this.counters[index],
      )
    );
  }

  toDOM(view: EditorView) {
    const block = document.createElement("div");
    block.className = "cm-diagnosticBlock";
    block.setAttribute("role", "status");
    block.setAttribute("aria-live", "polite");
    // Guias y mensajes se ubican en pixeles despues del layout.
    const marks: { element: HTMLElement; index: number }[] = [];
    for (let row = this.items.length - 1; row >= 0; row -= 1) {
      const line = document.createElement("div");
      line.className = "cm-diagnosticRow";
      for (let index = 0; index < row; index += 1) {
        const bar = document.createElement("span");
        bar.className = "cm-diagnosticBar";
        bar.textContent = "│";
        line.append(bar);
        marks.push({ element: bar, index });
      }
      const item = this.items[row];
      const content = document.createElement("span");
      content.className = "cm-diagnosticContent";
      const guide = document.createElement("span");
      guide.className = "cm-diagnosticGuide";
      guide.textContent = "└─> ✕";
      const text = document.createElement("span");
      text.className = "cm-diagnosticText";
      text.textContent = item.message;
      content.append(guide, text);
      for (const extra of [item.code, this.counters[row]]) {
        if (!extra) continue;
        const note = document.createElement("span");
        note.className = "cm-diagnosticNote";
        note.textContent = extra;
        content.append(note);
      }
      line.append(content);
      marks.push({ element: content, index: row });
      block.append(line);
    }
    const froms = this.items.map((item) => item.from);
    view.requestMeasure({
      read: () => {
        const base = block.getBoundingClientRect().left;
        return froms.map((from) => {
          const coords = view.coordsAtPos(from);
          return coords ? Math.max(0, coords.left - base) : 0;
        });
      },
      write: (lefts) => {
        for (const mark of marks) mark.element.style.left = `${lefts[mark.index]}px`;
      },
    });
    return block;
  }

  ignoreEvent() {
    return false;
  }
}

function diagnosticDecorations(state: EditorState): DecorationSet {
  const list = visibleDiagnostics(state);
  if (list.length === 0) return Decoration.none;
  const { navigated } = state.field(diagnosticsField);
  const ranges = list.map((item) => Decoration.mark({ class: "cm-diagnostic-error" }).range(item.from, item.to));
  // Las filas con la flecha, solo en la linea del cursor.
  const line = state.doc.lineAt(state.selection.main.head);
  const onLine = list.filter((item) => item.from >= line.from && item.from <= line.to);
  if (onLine.length > 0) {
    const counters = onLine.map((item) =>
      navigated !== null && list[navigated] === item && list.length > 1 ? `${navigated + 1}/${list.length}` : null,
    );
    ranges.push(Decoration.widget({ widget: new DiagnosticBlock(onLine, counters), block: true, side: 1 }).range(line.to));
  }
  return Decoration.set(ranges, true);
}

// F2 / Shift+F2: al siguiente o anterior error, dando la vuelta. false sin
// errores.
export function jumpToDiagnostic(view: EditorView, direction: 1 | -1): boolean {
  const list = visibleDiagnostics(view.state);
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

export function applyQuickFix(view: EditorView, fix: QuickFix): void {
  view.dispatch({
    changes: { from: fix.from, to: fix.to, insert: fix.insert },
    selection: EditorSelection.cursor(fix.from + fix.insert.length),
    userEvent: "input.quickfix",
  });
  view.focus();
}

const diagnosticsTheme = EditorView.baseTheme({
  ".cm-diagnostic-error": {
    textDecoration: "underline wavy var(--danger)",
    textDecorationSkipInk: "none",
    textUnderlineOffset: "3px",
  },
  ".cm-diagnosticBlock": {
    color: "var(--danger)",
    fontSize: "0.92em",
    animation: "cm-diagnostic-in 120ms ease-out",
  },
  ".cm-diagnosticRow": { position: "relative", height: "1.5em" },
  ".cm-diagnosticBar, .cm-diagnosticContent": { position: "absolute", top: "0", whiteSpace: "nowrap" },
  ".cm-diagnosticBar": { opacity: "0.8" },
  ".cm-diagnosticContent": {
    right: "0",
    display: "flex",
    alignItems: "baseline",
    gap: "0.5ch",
    overflow: "hidden",
  },
  ".cm-diagnosticGuide": { flexShrink: "0", opacity: "0.9" },
  ".cm-diagnosticText": {
    minWidth: "0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontFamily: "var(--font-family)",
  },
  ".cm-diagnosticNote": { flexShrink: "0", color: "var(--text-secondary)", fontSize: "0.9em" },
  "@keyframes cm-diagnostic-in": { from: { opacity: "0" } },
  "@media (prefers-reduced-motion: reduce)": { ".cm-diagnosticBlock": { animation: "none" } },
});

export const sqlDiagnostics: Extension = [
  diagnosticsField,
  EditorView.decorations.compute([diagnosticsField, "selection"], diagnosticDecorations),
  diagnosticsTheme,
];
