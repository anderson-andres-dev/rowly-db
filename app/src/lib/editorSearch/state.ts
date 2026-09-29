import { SearchQuery, getSearchQuery, searchPanelOpen, setSearchQuery } from "@codemirror/search";
import { StateEffect, StateField, type EditorState, type Text, type Transaction } from "@codemirror/state";

// Estado de buscar/reemplazar que vive en el editor (no en el DOM del
// panel): los atajos lo cambian aunque el panel ya este abierto, y el panel
// solo lo refleja.

export type SearchMode = "find" | "replace";

export const setSearchMode = StateEffect.define<SearchMode>();

export const searchModeField = StateField.define<SearchMode>({
  create: () => "find",
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setSearchMode)) value = effect.value;
    }
    return value;
  },
});

export function searchMode(state: EditorState): SearchMode {
  return state.field(searchModeField, false) ?? "find";
}

// --- Alcance: todo el documento (null) o un rango (DataGrip) ---------------

export interface Range {
  from: number;
  to: number;
}

export const setSearchScope = StateEffect.define<Range | null>();

// El alcance es solo de reemplazar: buscar es siempre en todo el documento.
// En reemplazar, con el panel abierto, sigue a la seleccion que hace el
// usuario (mouse, teclado, Ctrl+A): varias lineas son el alcance; una linea
// o ninguna, todo el documento. Las selecciones de la propia busqueda
// (siguiente/anterior, "select.search") y de los reemplazos no lo mueven.
function modeAfter(transaction: Transaction): SearchMode {
  let mode = searchMode(transaction.startState);
  for (const effect of transaction.effects) {
    if (effect.is(setSearchMode)) mode = effect.value;
  }
  return mode;
}

function isUserSelection(transaction: Transaction): boolean {
  return (
    transaction.selection !== undefined &&
    transaction.isUserEvent("select") &&
    !transaction.isUserEvent("select.search") &&
    searchPanelOpen(transaction.startState)
  );
}

export const searchScopeField = StateField.define<Range | null>({
  create: () => null,
  update(value, transaction) {
    if (modeAfter(transaction) === "find") return null;
    if (isUserSelection(transaction)) {
      value = scopeOf(transaction.newDoc, transaction.newSelection.main);
    } else if (value && transaction.docChanged) {
      // Lo insertado justo en los bordes queda dentro: un reemplazo que toca
      // el borde no achica el alcance.
      const from = transaction.changes.mapPos(value.from, -1);
      const to = transaction.changes.mapPos(value.to, 1);
      value = to > from ? { from, to } : null;
    }
    for (const effect of transaction.effects) {
      if (effect.is(setSearchScope)) value = effect.value;
    }
    return value;
  },
});

// Solo una seleccion de varias lineas es alcance: una palabra seleccionada
// es lo que se quiere buscar en todo el documento.
function scopeOf(doc: Text, { from, to }: Range): Range | null {
  return from < to && doc.lineAt(from).number !== doc.lineAt(to).number ? { from, to } : null;
}

export function scopeFromSelection(state: EditorState): Range | null {
  return scopeOf(state.doc, state.selection.main);
}

// Al entrar a reemplazar: la seleccion del usuario, no la coincidencia que
// dejo seleccionada "siguiente" (una busqueda con saltos de linea).
export function scopeForReplace(state: EditorState): Range | null {
  const scope = scopeFromSelection(state);
  return scope && !currentMatch(state, getSearchQuery(state)) ? scope : null;
}

export function inScope(state: EditorState, from: number, to: number): boolean {
  const scope = state.field(searchScopeField, false);
  return !scope || (from >= scope.from && to <= scope.to);
}

// --- Coincidencias excluidas del reemplazo ---------------------------------
// Se mapean con cada cambio (siguen marcando el mismo texto) y se vacian al
// cambiar el texto buscado.

export const addExclusion = StateEffect.define<Range>();
export const clearExclusions = StateEffect.define<null>();

export const exclusionField = StateField.define<Range[]>({
  create: () => [],
  update(value, transaction) {
    let next = value;
    if (transaction.docChanged) {
      next = next
        .map((range) => ({
          from: transaction.changes.mapPos(range.from, 1),
          to: transaction.changes.mapPos(range.to, -1),
        }))
        .filter((range) => range.to > range.from);
    }
    for (const effect of transaction.effects) {
      if (effect.is(addExclusion)) next = [...next, effect.value];
      if (effect.is(clearExclusions)) next = [];
      if (effect.is(setSearchQuery) && effect.value.search !== getSearchQuery(transaction.startState).search) next = [];
    }
    return next;
  },
});

export function isExcluded(state: EditorState, from: number, to: number): boolean {
  return state.field(exclusionField, false)?.some((range) => range.from === from && range.to === to) ?? false;
}

// --- Consulta --------------------------------------------------------------

export interface QuerySpec {
  search: string;
  caseSensitive: boolean;
  regexp: boolean;
  wholeWord: boolean;
  replace: string;
}

// CodeMirror aplica `test` en todos sus cursores, incluido el del
// resaltado: con esto, conteo, resaltado y reemplazos respetan exclusiones
// y alcance sin filtrar en cada lugar. Una sola funcion: SearchQuery.eq
// compara `test` por identidad.
function matchFilter(_match: string, state: EditorState, from: number, to: number): boolean {
  return !isExcluded(state, from, to) && inScope(state, from, to);
}

export function filteredQuery(spec: QuerySpec): SearchQuery {
  return new SearchQuery({
    ...spec,
    // Lo que se escribe es lo que se busca: un salto de linea real en el
    // campo es un salto de linea (sin interpretar "\n" escrito a mano,
    // salvo con expresion regular).
    literal: true,
    test: matchFilter,
  });
}

export function specOf(query: SearchQuery): QuerySpec {
  return {
    search: query.search,
    caseSensitive: query.caseSensitive,
    regexp: query.regexp,
    wholeWord: query.wholeWord,
    replace: query.replace,
  };
}

export function matchesIn(state: EditorState, query: SearchQuery): Range[] {
  const result: Range[] = [];
  const cursor = query.getCursor(state);
  for (let step = cursor.next(); !step.done; step = cursor.next()) result.push(step.value);
  return result;
}

// La coincidencia sobre la que esta la seleccion (la "actual"), si hay.
export function currentMatch(state: EditorState, query: SearchQuery): Range | null {
  const selection = state.selection.main;
  if (selection.empty) return null;
  const cursor = query.getCursor(state, selection.from, selection.to);
  for (let step = cursor.next(); !step.done; step = cursor.next()) {
    if (step.value.from === selection.from && step.value.to === selection.to) return step.value;
  }
  return null;
}
