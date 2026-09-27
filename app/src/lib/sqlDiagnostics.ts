import { EditorSelection, StateEffect, StateField, type EditorState, type Extension } from "@codemirror/state";
import { Decoration, EditorView, RectangleMarker, WidgetType, layer, type DecorationSet } from "@codemirror/view";

// Diagnosticos de SQL en el editor, al estilo de Error Lens (diseño en
// docs/specs/v0.2-diagnosticos.md): la linea con error queda con un fondo
// rojo tenue y el mensaje al final de la misma linea, siempre a la vista; el
// subrayado ondulado marca el token exacto. F2 / Shift+F2 saltan entre
// errores.
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
  // Un nombre que no existe (tabla, columna, alias): se pinta el nombre en
  // rojo, como DataGrip con lo que no resuelve, en vez de subrayarlo.
  unresolved?: boolean;
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

// Lo que se marca: un error en espacios o en un simbolo suelto se estira
// hasta el token siguiente, para que la onda nunca quede como un "^".
function visibleRange(state: EditorState, item: SqlDiagnostic): { from: number; to: number } {
  const text = state.sliceDoc(item.from, item.to);
  if (text.trim() !== "" && (item.to - item.from > 1 || !/\s/.test(state.sliceDoc(item.to, item.to + 1)))) {
    return item;
  }
  const after = state.sliceDoc(item.from, Math.min(state.doc.length, item.from + 200));
  const match = /\S+/.exec(after);
  if (!match) return item;
  const from = item.from + match.index;
  const word = /^[\p{L}\p{N}_$]+/u.exec(match[0]);
  return { from: text.trim() === "" ? from : item.from, to: from + (word ? word[0].length : 1) };
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

// El mensaje al final de la linea. Con varios errores en la linea, el
// primero y cuantos mas hay ("+1").
class LensMessage extends WidgetType {
  constructor(
    readonly item: SqlDiagnostic,
    readonly more: number,
    readonly counter: string | null,
  ) {
    super();
  }

  eq(other: LensMessage) {
    return (
      other.item.message === this.item.message &&
      other.item.code === this.item.code &&
      other.more === this.more &&
      other.counter === this.counter
    );
  }

  toDOM() {
    const element = document.createElement("span");
    element.className = "cm-lensMessage";
    const icon = document.createElement("span");
    icon.className = "cm-lensIcon";
    icon.textContent = "✕";
    const text = document.createElement("span");
    text.textContent = this.item.message;
    element.append(icon, text);
    const notes = [this.more > 0 ? `+${this.more}` : null, this.item.code, this.counter];
    for (const note of notes) {
      if (!note) continue;
      const extra = document.createElement("span");
      extra.className = "cm-lensNote";
      extra.textContent = note;
      element.append(extra);
    }
    return element;
  }

  ignoreEvent() {
    return false;
  }
}

function diagnosticDecorations(state: EditorState): DecorationSet {
  const list = visibleDiagnostics(state);
  if (list.length === 0) return Decoration.none;
  const { navigated } = state.field(diagnosticsField);
  const ranges = list.map((item) => {
    const range = visibleRange(state, item);
    return Decoration.mark({ class: item.unresolved ? "cm-unresolved" : "cm-diagnostic-error" }).range(range.from, range.to);
  });
  // Por linea: el mensaje del primer error (o del elegido con F2). El fondo
  // lo pinta lensBands.
  const byLine = new Map<number, SqlDiagnostic[]>();
  for (const item of list) {
    const line = state.doc.lineAt(item.from).number;
    byLine.set(line, [...(byLine.get(line) ?? []), item]);
  }
  for (const [number, items] of byLine) {
    const line = state.doc.line(number);
    const chosen = navigated !== null && items.includes(list[navigated]) ? list[navigated] : items[0];
    const counter = navigated !== null && chosen === list[navigated] && list.length > 1 ? `${navigated + 1}/${list.length}` : null;
    ranges.push(Decoration.widget({ widget: new LensMessage(chosen, items.length - 1, counter), side: 1 }).range(line.to));
  }
  return Decoration.set(ranges, true);
}

// El fondo rojo tenue de cada linea con error, de lado a lado. Va en una
// capa (como la seleccion) y no en la linea misma: el recuadro de la
// sentencia activa angosta la linea al ancho del texto, y el fondo no
// llegaria hasta el mensaje.
const lensBands = layer({
  above: false,
  class: "cm-lensLayer",
  update: (update) =>
    update.docChanged ||
    update.viewportChanged ||
    update.geometryChanged ||
    update.startState.field(diagnosticsField) !== update.state.field(diagnosticsField),
  markers(view) {
    const lines = new Set(visibleDiagnostics(view.state).map((item) => view.state.doc.lineAt(item.from).from));
    if (lines.size === 0) return [];
    const scroller = view.scrollDOM.getBoundingClientRect();
    const baseLeft = scroller.left - view.scrollDOM.scrollLeft * view.scaleX;
    const baseTop = scroller.top - view.scrollDOM.scrollTop * view.scaleY;
    const content = view.contentDOM.getBoundingClientRect();
    const left = (content.left - baseLeft) / view.scaleX;
    const width = content.width / view.scaleX;
    return [...lines].map((from) => {
      const block = view.lineBlockAt(from);
      const top = (view.documentTop - baseTop) / view.scaleY + block.top;
      return new RectangleMarker("cm-lensBand", left, top, width, block.height);
    });
  },
});

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

const WAVE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='4' viewBox='0 0 6 4'%3E%3Cpath d='M0 3 Q1.5 0.5 3 2 T6 1' fill='none' stroke='black' stroke-width='1.1'/%3E%3C/svg%3E\")";

const diagnosticsTheme = EditorView.baseTheme({
  // La onda: una mascara SVG pintada con el color del tema, fina y regular
  // (text-decoration: wavy se ve tosca y cambia con cada fuente).
  ".cm-diagnostic-error": { position: "relative" },
  ".cm-diagnostic-error::after": {
    content: '""',
    position: "absolute",
    left: "0",
    right: "0",
    bottom: "-2px",
    height: "4px",
    backgroundColor: "var(--danger)",
    pointerEvents: "none",
    maskImage: WAVE,
    WebkitMaskImage: WAVE,
    maskRepeat: "repeat-x",
    WebkitMaskRepeat: "repeat-x",
    maskSize: "6px 4px",
    WebkitMaskSize: "6px 4px",
  },
  // Lo que no existe, en rojo (como DataGrip).
  "&.cm-editor .cm-unresolved, &.cm-editor .cm-unresolved *": { color: "var(--danger) !important" },
  ".cm-lensBand": { backgroundColor: "color-mix(in srgb, var(--danger) 9%, transparent)" },
  ".cm-lensMessage": {
    marginLeft: "3ch",
    color: "color-mix(in srgb, var(--danger) 85%, var(--text-primary))",
    fontFamily: "var(--font-family)",
    fontSize: "0.9em",
    fontStyle: "italic",
    whiteSpace: "pre",
    animation: "cm-lens-in 120ms ease-out",
  },
  ".cm-lensIcon": { marginRight: "0.6ch", fontStyle: "normal" },
  ".cm-lensNote": { marginLeft: "1ch", color: "var(--text-secondary)", fontStyle: "normal", fontSize: "0.9em" },
  "@keyframes cm-lens-in": { from: { opacity: "0" } },
  "@media (prefers-reduced-motion: reduce)": { ".cm-lensMessage": { animation: "none" } },
});

export const sqlDiagnostics: Extension = [
  diagnosticsField,
  EditorView.decorations.compute([diagnosticsField], diagnosticDecorations),
  lensBands,
  diagnosticsTheme,
];
