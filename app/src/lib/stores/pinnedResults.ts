import { writable } from "svelte/store";

// Pestañas de resultado fijadas ("Fijar pestaña"), por consola. Fijar es solo
// para no perder la pestaña: cada una tiene su propio estado completo
// (resultado, pagina, total, cambios pendientes, historial) guardado bajo su
// clave (resultKey) en los mismos stores que la pestaña normal, asi que
// funciona igual — recargar, paginar, editar, aplicar. La unica diferencia:
// la proxima ejecucion de la consola NO la reemplaza.
//
// Desfijar no la cierra: queda abierta y la proxima ejecucion la reemplaza.
export interface PinnedTab {
  id: number;
  pinned: boolean;
}

let nextId = 1;

export const pinnedResults = writable<Record<string, PinnedTab[]>>({});

export function resultKey(consoleId: string, pinnedId: number | null): string {
  return pinnedId === null ? consoleId : `${consoleId}#pin${pinnedId}`;
}

// Consola a la que pertenece una clave de pestaña de resultado.
export function consoleOfKey(key: string): string {
  const index = key.indexOf("#pin");
  return index === -1 ? key : key.slice(0, index);
}

export function addPinnedTab(consoleId: string): number {
  return addResultTab(consoleId, true);
}

// Una pestaña mas de la consola. Desfijada (p. ej. los resultados de un
// script), la proxima ejecucion la reemplaza igual que a la normal.
export function addResultTab(consoleId: string, pinned: boolean): number {
  const id = nextId++;
  pinnedResults.update((state) => ({ ...state, [consoleId]: [...(state[consoleId] ?? []), { id, pinned }] }));
  return id;
}

export function setResultPinned(consoleId: string, id: number, pinned: boolean): void {
  pinnedResults.update((state) => ({
    ...state,
    [consoleId]: (state[consoleId] ?? []).map((item) => (item.id === id ? { ...item, pinned } : item)),
  }));
}

export function removePinnedTab(consoleId: string, id: number): void {
  pinnedResults.update((state) => ({
    ...state,
    [consoleId]: (state[consoleId] ?? []).filter((item) => item.id !== id),
  }));
}

// Las desfijadas que una ejecucion nueva va a reemplazar.
export function unpinnedTabs(state: Record<string, PinnedTab[]>, consoleId: string): PinnedTab[] {
  return (state[consoleId] ?? []).filter((item) => !item.pinned);
}

export function forgetPinnedResults(consoleId: string): void {
  pinnedResults.update((state) => {
    const { [consoleId]: _removed, ...rest } = state;
    return rest;
  });
}
