import { get, writable } from "svelte/store";
import { EMPTY_EDITS, type PendingEdits, type ResultEditInfo, type RowRange } from "$lib/results/resultEditing";

// Un paso deshacible: como estaban los cambios ANTES, y donde ocurrio el
// cambio (para llevar el grid hasta ahi al deshacerlo).
export interface EditStep {
  edits: PendingEdits;
  at: RowRange | null;
}

// Tope de pasos guardados: cada uno es una copia chica (Maps de cambios),
// pero no tiene sentido guardar miles.
const MAX_HISTORY = 200;

// Estado de edicion del resultado, por consola. Transitorio (como el
// resultado mismo): nunca se persiste.
export interface ResultEditState {
  // SQL al que corresponde `info` (es el mismo en todas sus paginas).
  sql: string | null;
  info: ResultEditInfo | null;
  // Por que no se puede editar (null mientras se analiza o si se puede).
  blockedReason: string | null;
  edits: PendingEdits;
  history: EditStep[];
}

const EMPTY_STATE: ResultEditState = { sql: null, info: null, blockedReason: null, edits: EMPTY_EDITS, history: [] };

export const resultEdits = writable<Record<string, ResultEditState>>({});

export function editStateFor(state: Record<string, ResultEditState>, consoleId: string): ResultEditState {
  return state[consoleId] ?? EMPTY_STATE;
}

function patch(consoleId: string, update: (current: ResultEditState) => ResultEditState) {
  resultEdits.update((state) => ({ ...state, [consoleId]: update(editStateFor(state, consoleId)) }));
}

// Resultado nuevo (otra pagina o re-ejecucion): los cambios pendientes eran
// sobre las filas anteriores y se descartan. El analisis de editabilidad se
// conserva si es la misma consulta.
export function resetResultEdits(consoleId: string, sql: string): boolean {
  const current = editStateFor(get(resultEdits), consoleId);
  const sameSql = current.sql === sql;
  patch(consoleId, () => ({
    sql,
    info: sameSql ? current.info : null,
    blockedReason: sameSql ? current.blockedReason : null,
    edits: EMPTY_EDITS,
    history: [],
  }));
  return sameSql && (current.info !== null || current.blockedReason !== null);
}

export function setResultEditInfo(consoleId: string, sql: string, info: ResultEditInfo | null, reason: string | null) {
  patch(consoleId, (current) => (current.sql === sql ? { ...current, info, blockedReason: reason } : current));
}

// Cambio hecho por el usuario: queda en el historial para deshacerlo.
export function commitResultEdits(consoleId: string, edits: PendingEdits, at: RowRange | null) {
  patch(consoleId, (current) => {
    if (edits === current.edits) return current;
    const history = [...current.history, { edits: current.edits, at }];
    return { ...current, edits, history: history.slice(-MAX_HISTORY) };
  });
}

// Deshace el ultimo paso; devuelve el paso deshecho (o null si no habia).
export function undoResultEdit(consoleId: string): EditStep | null {
  const current = editStateFor(get(resultEdits), consoleId);
  const step = current.history.at(-1);
  if (!step) return null;
  patch(consoleId, (state) => ({ ...state, edits: step.edits, history: state.history.slice(0, -1) }));
  return step;
}

// Descartar o aplicar: se vacia todo, historial incluido.
export function clearResultPendingEdits(consoleId: string) {
  patch(consoleId, (current) => ({ ...current, edits: EMPTY_EDITS, history: [] }));
}

export function forgetResultEdits(consoleId: string) {
  resultEdits.update((state) => {
    const { [consoleId]: _removed, ...rest } = state;
    return rest;
  });
}

// Fijar mueve tambien la edicion (cambios pendientes, historial, analisis)
// con la pestaña: nada se pierde al fijar.
export function moveResultEdits(fromKey: string, toKey: string) {
  resultEdits.update((state) => {
    const moved = state[fromKey];
    if (!moved) return state;
    const { [fromKey]: _from, ...rest } = state;
    return { ...rest, [toKey]: moved };
  });
}
