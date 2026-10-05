// Pestañas de resultado de una consola: identidad, orden, seleccion, fijar,
// desfijar y cerrar. Las funciones de arriba son puras: el orden y la pestaña
// elegida viven en Workspace. Las acciones de createResultTabActions mueven
// el estado entre claves en los stores que ya son sus dueños (pinnedResults,
// queryConsoles y resultEdits).
//
// Claves: la pestaña normal usa el id de la consola; cada fijada,
// "<consola>#pin<n>" (resultKey de stores/pinnedResults). "output" es la
// Salida, que siempre existe.

import { get } from "svelte/store";
import {
  addPinnedTab,
  consoleOfKey,
  forgetPinnedResults,
  pinnedResults,
  removePinnedTab,
  resultKey,
  setResultPinned,
  unpinnedTabs,
} from "$lib/stores/pinnedResults";
import {
  clearQueryResult,
  executionForConsole,
  forgetExecutionState,
  moveExecutionState,
  queryConsoles,
} from "$lib/stores/queryConsoles";
import { forgetResultEdits, moveResultEdits } from "$lib/stores/resultEdits";

export const OUTPUT_TAB = "output";

export interface ResultTab {
  key: string;
  label: string;
  pinned: boolean;
}

// La pestaña que se ve: la elegida si sigue existiendo; si no, la normal
// cuando hay un resultado y, sin el, la Salida.
export function visibleTab(
  consoleId: string,
  chosen: string | undefined,
  exists: (tab: string) => boolean,
  liveHasResult: boolean,
): string {
  if (chosen && exists(chosen)) return chosen;
  return liveHasResult ? consoleId : OUTPUT_TAB;
}

// Fijadas primero (en el orden en que se fijaron) y la normal al final,
// salvo que el usuario las haya reordenado: entonces manda su orden, y lo
// que no aparece en el va al final conservando su posicion relativa.
export function orderTabs<T extends { key: string }>(tabs: T[], order: string[] | undefined): T[] {
  if (!order) return tabs;
  const rank = (key: string) => {
    const index = order.indexOf(key);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  return tabs
    .map((tab, index) => ({ tab, index }))
    .sort((a, b) => rank(a.tab.key) - rank(b.tab.key) || a.index - b.index)
    .map(({ tab }) => tab);
}

// Cuando una pestaña cambia de clave (fijar: la normal pasa a ser una
// fijada; desfijar sin otra normal: al reves) conserva su lugar: se
// reemplaza una clave por la otra en la misma posicion. Nada se reacomoda
// solo; lo nuevo va al final.
export function replaceTabKey(order: string[] | undefined, current: string[], fromKey: string, toKey: string): string[] {
  const next = (order ?? current).map((key) => (key === fromKey ? toKey : key));
  if (!next.includes(toKey)) next.push(toKey);
  return next;
}

// Primera tabla despues de FROM, tal como esta escrita (con su schema si lo
// trae), sin comillas. Solo resuelve el caso simple: con varias tablas se
// toma la primera.
export function firstFromTable(sql: string): { schema?: string; table: string } | undefined {
  const match = /\bfrom\s+((?:[`"]?[\w$]+[`"]?\s*\.\s*)?[`"]?[\w$]+[`"]?)/i.exec(sql);
  if (!match) return undefined;
  const parts = match[1].split(".").map((part) => part.trim().replace(/^[`"]|[`"]$/g, ""));
  return parts.length === 2 ? { schema: parts[0], table: parts[1] } : { table: parts[0] };
}

// El numero de una pestaña fijada ("<consola>#pin<n>"); null en la normal.
export function pinnedIdOf(key: string): number | null {
  const match = /#pin(\d+)$/.exec(key);
  return match ? Number(match[1]) : null;
}

export interface TabsView {
  selectTab(consoleId: string, key: string): void;
  // Cambio de clave de una pestaña: conserva su lugar (replaceTabKey).
  keepPosition(consoleId: string, fromKey: string, toKey: string): void;
  // Pregunta antes de descartar cambios del grid; false = no seguir.
  confirmDiscard(key: string): Promise<boolean>;
}

export interface ResultTabActions {
  pin(consoleId: string): void;
  unpin(key: string): void;
  forget(key: string): void;
  // Las que una ejecucion nueva reemplaza: la normal y las desfijadas.
  replaceableKeys(consoleId: string): string[];
  dropUnpinned(consoleId: string): void;
  forgetConsole(consoleId: string): void;
  close(key: string): Promise<void>;
}

export function createResultTabActions(view: TabsView): ResultTabActions {
  const hasRows = (key: string) => executionForConsole(get(queryConsoles), key).result?.type === "resultSet";

  function forget(key: string) {
    forgetExecutionState(key);
    forgetResultEdits(key);
    const id = pinnedIdOf(key);
    if (id !== null) removePinnedTab(consoleOfKey(key), id);
  }

  return {
    forget,

    // Fijar: la pestaña normal pasa a ser una fijada CON TODO su estado
    // (pagina, total, cambios pendientes, historial): sigue funcionando
    // igual, solo que la proxima ejecucion ya no la reemplaza.
    pin(consoleId) {
      if (!hasRows(consoleId)) return;
      const key = resultKey(consoleId, addPinnedTab(consoleId));
      view.keepPosition(consoleId, consoleId, key);
      moveExecutionState(consoleId, key);
      moveResultEdits(consoleId, key);
      view.selectTab(consoleId, key);
    },

    // Desfijar NO cierra ni reemplaza nada: la pestaña sigue abierta tal
    // cual y la proxima ejecucion es la que la reemplaza. Si no hay una
    // pestaña normal abierta, pasa directamente a serlo, en su mismo lugar.
    unpin(key) {
      const consoleId = consoleOfKey(key);
      const id = pinnedIdOf(key);
      if (id === null) return;
      if (hasRows(consoleId)) {
        setResultPinned(consoleId, id, false);
        return;
      }
      view.keepPosition(consoleId, key, consoleId);
      moveExecutionState(key, consoleId);
      moveResultEdits(key, consoleId);
      removePinnedTab(consoleId, id);
      view.selectTab(consoleId, consoleId);
    },

    replaceableKeys(consoleId) {
      return [consoleId, ...unpinnedTabs(get(pinnedResults), consoleId).map((item) => resultKey(consoleId, item.id))];
    },

    dropUnpinned(consoleId) {
      for (const item of unpinnedTabs(get(pinnedResults), consoleId)) forget(resultKey(consoleId, item.id));
    },

    // Al cerrar la consola, sus pestañas fijadas (y su estado) se van con ella.
    forgetConsole(consoleId) {
      for (const item of get(pinnedResults)[consoleId] ?? []) {
        const key = resultKey(consoleId, item.id);
        forgetExecutionState(key);
        forgetResultEdits(key);
      }
      forgetPinnedResults(consoleId);
    },

    // × de una pestaña de resultado: la quita (con cambios pendientes
    // pregunta antes). La normal queda vacia; una fijada desaparece.
    async close(key) {
      if (!(await view.confirmDiscard(key))) return;
      if (key === consoleOfKey(key)) {
        clearQueryResult(key);
        forgetResultEdits(key);
      } else {
        forget(key);
      }
    },
  };
}
