import type { ErrorHelp } from "$lib/sqlErrorHelp";
import {
  EditorSelection,
  RangeSet,
  RangeValue,
  StateEffect,
  StateField,
  type EditorState,
  type Extension,
} from "@codemirror/state";
import { statementContaining, statementIndexField } from "$lib/sqlStatementIndex";
import {
  Decoration,
  EditorView,
  RectangleMarker,
  ViewPlugin,
  WidgetType,
  layer,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";

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
  // Un nombre que no existe (tabla, columna, alias): ademas del subrayado,
  // el nombre en rojo, como DataGrip con lo que no resuelve.
  unresolved?: boolean;
  // Solo dice que la sentencia no esta terminada ("termina antes de
  // tiempo", una coma al final): no se muestra mientras se escribe en ella.
  incomplete?: boolean;
  // La ayuda de la app para el codigo del servidor (segun el motor).
  help?: ErrorHelp;
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

// Donde cayo un error de ejecucion, relativo al inicio de `statement` (el
// texto tal como se mando). null: no se sabe donde; se marca la sentencia
// entera. Cada motor compone las estrategias que valen para sus mensajes
// (lib/engines, `locateError`).
export interface ExecutionError {
  message: string;
  position?: number;
}
export type ErrorLocator = (statement: string, error: ExecutionError) => { from: number; to: number } | null;

// La posicion que manda el servidor (Postgres, en caracteres desde 1).
export const byServerPosition: ErrorLocator = (statement, error) => {
  if (error.position === undefined || error.position <= 0) return null;
  const at = charToUtf16(statement, error.position - 1);
  return at < statement.length ? tokenAt(statement, at) : null;
};

// El analizador de la app (una sentencia que no se pudo analizar), de
// cualquier motor: "... at Line: 1, Column: 8".
export const byAnalyzerLocation: ErrorLocator = (statement, error) => {
  const located = /at Line: (\d+), Column: (\d+)/.exec(error.message);
  if (!located) return null;
  const at = lineColumnToOffset(statement, Number(located[1]), Number(located[2]));
  return at < statement.length ? tokenAt(statement, at) : null;
};

// MySQL, error de sintaxis: "... near 'FROM usuarios' at line 2". El
// fragmento puede venir cortado; con '' el problema es el final.
export const byNearFragment: ErrorLocator = (statement, error) => {
  const near = /near '([\s\S]*?)' at line (\d+)/.exec(error.message);
  if (!near) return null;
  const start = lineStart(statement, Number(near[2]));
  if (near[1].trim() === "") {
    const end = statement.trimEnd().length;
    return end > 0 ? { from: end - 1, to: end } : null;
  }
  const found = statement.indexOf(near[1].slice(0, 40), start);
  return found !== -1 ? tokenAt(statement, found) : null;
};

// Un nombre citado en el mensaje, entre `quote` ("Unknown column 'fcha' in
// 'field list'", "Table 'ventas.usarios' doesn't exist"; en Postgres,
// 'relation "usarios" does not exist'): su ultima parte, en la sentencia.
export function byQuotedName(quote: "'" | '"'): ErrorLocator {
  const pattern = quote === "'" ? /'([^']+)'/ : /"([^"]+)"/;
  return (statement, error) => {
    const quoted = pattern.exec(error.message);
    if (!quoted) return null;
    const name = quoted[1].split(".").pop() ?? "";
    const found = name ? findWord(statement, name) : -1;
    return found !== -1 ? { from: found, to: found + name.length } : null;
  };
}

// La primera estrategia que ubica el error.
export function firstLocated(...locators: ErrorLocator[]): ErrorLocator {
  return (statement, error) => {
    for (const locate of locators) {
      const range = locate(statement, error);
      if (range) return range;
    }
    return null;
  };
}

// --- Estado en el editor --------------------------------------------------
//
// Los diagnosticos viven en un RangeSet (docs/specs/v0.2-documentos-grandes.md,
// 15d): mapearlo en cada tecla no recorre la lista, y lo que se pinta se
// busca solo en lo visible. Cada uno ocupa su "tramo": el rango marcado mas
// el de sus correcciones, con estas guardadas relativas al inicio del tramo.
// Editar dentro del tramo lo deja viejo y se descarta (el analisis vuelve a
// mirar en cuanto se deja de escribir); fuera de el, las posiciones
// relativas siguen valiendo.

// Errores de ejecucion nuevos, o quitar los de un rango (se vuelve a
// ejecutar esa sentencia).
export const addDiagnostics = StateEffect.define<SqlDiagnostic[]>();
export const clearDiagnosticsIn = StateEffect.define<{ from: number; to: number }>();
// El analisis de unas sentencias (`ranges`, en orden): reemplaza lo que el
// analisis habia dicho dentro de ellas; el resto del documento no se toca.
export const setAnalysisIn = StateEffect.define<{ ranges: { from: number; to: number }[]; list: SqlDiagnostic[] }>();

interface Navigated {
  item: SqlDiagnostic;
  index: number;
  total: number;
}
// Navegacion con F2: cual se eligio (muestra el contador n/m).
const setNavigated = StateEffect.define<Navigated | null>();

interface StoredFix {
  label: string;
  from: number;
  to: number;
  insert: string;
}

class DiagnosticMark extends RangeValue {
  constructor(
    readonly base: Omit<SqlDiagnostic, "from" | "to" | "fixes">,
    // El rango marcado, relativo al inicio del tramo.
    readonly offset: number,
    readonly length: number,
    readonly fixes: StoredFix[],
  ) {
    super();
  }

  eq(other: RangeValue): boolean {
    return other === this;
  }
}

function toMark(item: SqlDiagnostic) {
  const fixes = item.fixes ?? [];
  const from = Math.min(item.from, ...fixes.map((fix) => fix.from));
  const to = Math.max(item.to, ...fixes.map((fix) => fix.to));
  const { from: _from, to: _to, fixes: _fixes, ...base } = item;
  const mark = new DiagnosticMark(
    base,
    item.from - from,
    item.to - item.from,
    fixes.map((fix) => ({ ...fix, from: fix.from - from, to: fix.to - from })),
  );
  return mark.range(from, to);
}

// El mismo objeto mientras el tramo no se mueva: la ventana de detalle y
// F2 los comparan por identidad.
const materialized = new WeakMap<DiagnosticMark, { at: number; item: SqlDiagnostic }>();

function toDiagnostic(spanFrom: number, mark: DiagnosticMark): SqlDiagnostic {
  const cached = materialized.get(mark);
  if (cached && cached.at === spanFrom) return cached.item;
  const from = spanFrom + mark.offset;
  const item: SqlDiagnostic = {
    ...mark.base,
    from,
    to: from + mark.length,
    fixes: mark.fixes.map((fix) => ({ ...fix, from: spanFrom + fix.from, to: spanFrom + fix.to })),
  };
  materialized.set(mark, { at: spanFrom, item });
  return item;
}

interface DiagnosticsState {
  set: RangeSet<DiagnosticMark>;
  navigated: Navigated | null;
  // La sentencia en la que se esta escribiendo (ver `typingSpan`).
  typing: { from: number; to: number } | null;
}

// Mientras se escribe, lo que todavia no esta terminado no es un error:
// dentro de la sentencia que se edita no se muestra lo incompleto ni lo que
// cae sobre la palabra del cursor. En cuanto el cursor sale de ella (o el
// editor pierde el foco, stopTyping) se ve todo, al instante: ya estaba
// calculado. El resto del documento no espera nada.
export const stopTyping = StateEffect.define<null>();

function typingSpan(state: EditorState): { from: number; to: number } {
  const head = state.selection.main.head;
  const statement = state.field(statementIndexField, false) ? statementContaining(state, head) : null;
  if (statement) return { from: statement.from, to: Math.max(statement.to, head) };
  const line = state.doc.lineAt(head);
  return { from: line.from, to: line.to };
}

function byPosition(a: SqlDiagnostic, b: SqlDiagnostic): number {
  return a.from - b.from || a.to - b.to;
}

function marksOf(list: SqlDiagnostic[]) {
  return list.filter((item) => item.from < item.to).map(toMark);
}

// Si `pos` cae dentro de alguno de `ranges` (ordenados).
function withinRanges(ranges: { from: number; to: number }[], pos: number): boolean {
  let low = 0;
  let high = ranges.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const range = ranges[middle];
    if (pos < range.from) high = middle - 1;
    else if (pos > range.to) low = middle + 1;
    else return true;
  }
  return false;
}

export const diagnosticsField = StateField.define<DiagnosticsState>({
  create: () => ({ set: RangeSet.empty, navigated: null, typing: null }),
  update(value, transaction) {
    let { set, navigated, typing } = value;
    if (typing && transaction.docChanged) {
      typing = { from: transaction.changes.mapPos(typing.from, -1), to: transaction.changes.mapPos(typing.to, 1) };
    }
    if (transaction.isUserEvent("input") || transaction.isUserEvent("delete")) {
      typing = typingSpan(transaction.state);
    } else if (typing && transaction.selection) {
      const head = transaction.state.selection.main.head;
      if (head < typing.from || head > typing.to) typing = null;
    }
    if (transaction.docChanged && set.size > 0) {
      set = set.map(transaction.changes);
      const length = transaction.state.doc.length;
      // Editar sobre un tramo (o justo en su borde) lo deja viejo.
      transaction.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
        set = set.update({
          filterFrom: Math.max(0, fromB - 1),
          filterTo: Math.min(length, toB + 1),
          filter: (from, to) => !(from <= toB && to >= fromB),
        });
      });
    }
    let navigatedNow = false;
    for (const effect of transaction.effects) {
      if (effect.is(clearDiagnosticsIn)) {
        const range = effect.value;
        set = set.update({
          filterFrom: range.from,
          filterTo: range.to,
          filter: (from, _to, mark) => {
            if (mark.base.source !== "server") return true;
            const itemFrom = from + mark.offset;
            return itemFrom + mark.length < range.from || itemFrom > range.to;
          },
        });
      } else if (effect.is(addDiagnostics)) {
        set = set.update({ add: marksOf(effect.value), sort: true });
      } else if (effect.is(setAnalysisIn)) {
        const { ranges, list } = effect.value;
        if (ranges.length > 0) {
          set = set.update({
            filterFrom: ranges[0].from,
            filterTo: ranges[ranges.length - 1].to,
            filter: (from, _to, mark) => mark.base.source !== "analysis" || !withinRanges(ranges, from),
          });
        }
        set = set.update({ add: marksOf(list), sort: true });
      } else if (effect.is(setNavigated)) {
        navigated = effect.value;
        navigatedNow = true;
      } else if (effect.is(stopTyping)) {
        typing = null;
      }
    }
    if (!navigatedNow && (transaction.selection || transaction.docChanged)) navigated = null;
    return set === value.set && navigated === value.navigated && typing === value.typing
      ? value
      : { set, navigated, typing };
  },
});

// Lo que se muestra en [from, to], en orden: sin el error de ejecucion que
// el analisis ya explica en el mismo lugar.
export function diagnosticsIn(state: EditorState, from: number, to: number): SqlDiagnostic[] {
  const { set } = state.field(diagnosticsField);
  const length = state.doc.length;
  const found: SqlDiagnostic[] = [];
  set.between(from, to, (spanFrom, _spanTo, mark) => {
    const item = toDiagnostic(spanFrom, mark);
    if (item.to >= from && item.from <= to && item.to <= length) found.push(item);
  });
  const analyzed = new Set(found.filter((item) => item.source === "analysis").map((item) => item.from));
  const { typing } = state.field(diagnosticsField);
  const head = state.selection.main.head;
  return found
    .filter((item) => !(item.source === "server" && analyzed.has(item.from)) && !whileTyping(item, typing, head))
    .sort(byPosition);
}

// Cuantos errores se ven en el documento: los mismos que recorre F2.
export function visibleDiagnosticCount(state: EditorState): number {
  return diagnosticsIn(state, 0, state.doc.length).length;
}

// Lo que no se muestra mientras se escribe en `typing` (ver typingSpan).
function whileTyping(item: SqlDiagnostic, typing: DiagnosticsState["typing"], head: number): boolean {
  if (!typing || item.source !== "analysis" || item.to < typing.from || item.from > typing.to) return false;
  return !!item.incomplete || (item.from <= head && head <= item.to);
}

// Lo marcado de un punto: un error en espacios o en un simbolo suelto se
// estira hasta el token siguiente, para que la onda nunca quede como un "^".
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
  const inside = diagnosticsIn(state, pos, pos).find((item) => item.from <= pos && pos <= item.to);
  if (inside) return inside;
  const line = state.doc.lineAt(pos);
  return diagnosticsIn(state, line.from, line.to).find((item) => item.from >= line.from && item.from <= line.to) ?? null;
}

// Bajo el mouse (sin incluir el borde final).
export function diagnosticUnder(state: EditorState, pos: number): SqlDiagnostic | null {
  return diagnosticsIn(state, pos, pos).find((item) => item.from <= pos && pos < item.to) ?? null;
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
    icon.setAttribute("aria-hidden", "true");
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

// Solo lo visible: con decenas de miles de errores en el documento, cada
// tecla pinta las lineas que se ven y nada mas.
function diagnosticDecorations(view: EditorView): DecorationSet {
  const { state } = view;
  const { navigated } = state.field(diagnosticsField);
  const seen = new Set<SqlDiagnostic>();
  const ranges = [];
  const byLine = new Map<number, SqlDiagnostic[]>();
  for (const visible of view.visibleRanges) {
    const from = state.doc.lineAt(visible.from).from;
    const to = state.doc.lineAt(visible.to).to;
    for (const item of diagnosticsIn(state, from, to)) {
      if (seen.has(item)) continue;
      seen.add(item);
      const range = visibleRange(state, item);
      // Todo error lleva la onda; lo que no existe, ademas, en rojo.
      ranges.push(
        Decoration.mark({ class: item.unresolved ? "cm-diagnostic-error cm-unresolved" : "cm-diagnostic-error" }).range(
          range.from,
          range.to,
        ),
      );
      // Por linea: el mensaje del primer error (o del elegido con F2). El
      // fondo lo pinta lensBands.
      const line = state.doc.lineAt(item.from).number;
      byLine.set(line, [...(byLine.get(line) ?? []), item]);
    }
  }
  for (const [number, items] of byLine) {
    const line = state.doc.line(number);
    const chosen = navigated && items.includes(navigated.item) ? navigated.item : items[0];
    const counter =
      navigated && chosen === navigated.item && navigated.total > 1 ? `${navigated.index + 1}/${navigated.total}` : null;
    ranges.push(Decoration.widget({ widget: new LensMessage(chosen, items.length - 1, counter), side: 1 }).range(line.to));
  }
  return Decoration.set(ranges, true);
}

const diagnosticPainter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = diagnosticDecorations(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        update.startState.field(diagnosticsField) !== update.state.field(diagnosticsField)
      ) {
        this.decorations = diagnosticDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

// El fondo rojo tenue de cada linea con error, de lado a lado. Va en una
// capa (como la seleccion) y no en la linea misma: el recuadro de la
// sentencia activa angosta la linea al ancho del texto, y el fondo no
// llegaria hasta el mensaje. Solo las lineas del viewport.
const lensBands = layer({
  above: false,
  class: "cm-lensLayer",
  update: (update) =>
    update.docChanged ||
    update.viewportChanged ||
    update.geometryChanged ||
    update.selectionSet ||
    update.startState.field(diagnosticsField) !== update.state.field(diagnosticsField),
  markers(view) {
    const { from, to } = view.viewport;
    const lines = new Set(
      diagnosticsIn(view.state, from, to)
        .filter((item) => item.from >= from && item.from <= to)
        .map((item) => view.state.doc.lineAt(item.from).from),
    );
    if (lines.size === 0) return [];
    const scroller = view.scrollDOM.getBoundingClientRect();
    const baseLeft = scroller.left - view.scrollDOM.scrollLeft * view.scaleX;
    const baseTop = scroller.top - view.scrollDOM.scrollTop * view.scaleY;
    const content = view.contentDOM.getBoundingClientRect();
    const left = (content.left - baseLeft) / view.scaleX;
    const width = content.width / view.scaleX;
    return [...lines].map((lineFrom) => {
      const block = view.lineBlockAt(lineFrom);
      const top = (view.documentTop - baseTop) / view.scaleY + block.top;
      return new RectangleMarker("cm-lensBand", left, top, width, block.height);
    });
  },
});

// F2 / Shift+F2: al siguiente o anterior error, dando la vuelta. false sin
// errores.
export function jumpToDiagnostic(view: EditorView, direction: 1 | -1): boolean {
  // Buscar errores a proposito: se ven todos, tambien los de la sentencia que
  // se estaba escribiendo.
  if (view.state.field(diagnosticsField).typing) view.dispatch({ effects: stopTyping.of(null) });
  // Una vez por pulsacion se recorre la lista entera (para el contador n/m).
  const list = diagnosticsIn(view.state, 0, view.state.doc.length);
  if (list.length === 0) return false;
  const head = view.state.selection.main.head;
  let index =
    direction === 1 ? list.findIndex((item) => item.from > head) : list.findLastIndex((item) => item.from < head);
  if (index === -1) index = direction === 1 ? 0 : list.length - 1;
  const item = list[index];
  view.dispatch({
    selection: EditorSelection.cursor(item.from),
    effects: [setNavigated.of({ item, index, total: list.length }), EditorView.scrollIntoView(item.from)],
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

const CIRCLE_X =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='m15 9-6 6'/%3E%3Cpath d='m9 9 6 6'/%3E%3C/svg%3E\")";

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
  // Lo que no existe, ademas de la onda, en rojo (como DataGrip).
  "&.cm-editor .cm-unresolved, &.cm-editor .cm-unresolved *": { color: "var(--danger) !important" },
  ".cm-lensBand": { backgroundColor: "color-mix(in srgb, var(--danger) 9%, transparent)" },
  // Relleno y no margen: CodeMirror dibuja el cursor del final de la linea
  // en el borde del widget, y con margen quedaba separado del texto.
  ".cm-lensMessage": {
    paddingLeft: "3ch",
    color: "color-mix(in srgb, var(--danger) 85%, var(--text-primary))",
    fontFamily: "var(--font-family)",
    fontSize: "0.9em",
    fontStyle: "italic",
    whiteSpace: "pre",
    animation: "cm-lens-in 120ms ease-out",
  },
  // circle-x de lucide (el mismo del margen al fallar una ejecucion), en el
  // color del mensaje.
  ".cm-lensIcon": {
    display: "inline-block",
    width: "0.95em",
    height: "0.95em",
    marginRight: "0.6ch",
    verticalAlign: "-0.12em",
    backgroundColor: "currentColor",
    maskImage: CIRCLE_X,
    WebkitMaskImage: CIRCLE_X,
    maskSize: "contain",
    WebkitMaskSize: "contain",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
  },
  ".cm-lensNote": { marginLeft: "1ch", color: "var(--text-secondary)", fontStyle: "normal", fontSize: "0.9em" },
  "@keyframes cm-lens-in": { from: { opacity: "0" } },
  "@media (prefers-reduced-motion: reduce)": { ".cm-lensMessage": { animation: "none" } },
});

export const sqlDiagnostics: Extension = [
  diagnosticsField,
  diagnosticPainter,
  lensBands,
  diagnosticsTheme,
];
