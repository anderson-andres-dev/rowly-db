import { writable } from "svelte/store";

// Registro de la pestaña "Salida" de cada consola, al estilo del Output de
// DataGrip: cada sentencia ejecutada ("core> select ...") seguida de su
// resultado ("500 filas obtenidas desde la fila 1 en 429 ms") o su error.
// Transitorio como los resultados: no se persiste.
export type LogKind = "query" | "info" | "error";

export interface LogEntry {
  id: number;
  at: number;
  kind: LogKind;
  // Prefijo del prompt (schema) para las entradas "query".
  schema?: string;
  text: string;
}

// Tope por consola: el registro se muestra entero y crece con cada
// ejecucion; lo mas viejo se descarta. Y el texto de cada entrada, hasta
// MAX_TEXT: un script pegado de varios MB no queda entero en el registro
// (con horas de uso, eso se acumulaba y se volvia a resaltar al mostrarlo).
export const MAX_LOG_ENTRIES = 500;
export const MAX_LOG_TEXT = 4000;

let nextId = 1;

export const executionLog = writable<Record<string, LogEntry[]>>({});

export function appendLog(consoleId: string, entry: Omit<LogEntry, "id" | "at"> & { at?: number }): void {
  const text = entry.text.length > MAX_LOG_TEXT ? `${entry.text.slice(0, MAX_LOG_TEXT)}…` : entry.text;
  const full: LogEntry = { id: nextId++, at: entry.at ?? Date.now(), ...entry, text };
  executionLog.update((state) => {
    const current = state[consoleId] ?? [];
    const next =
      current.length >= MAX_LOG_ENTRIES ? [...current.slice(-(MAX_LOG_ENTRIES - 1)), full] : [...current, full];
    return { ...state, [consoleId]: next };
  });
}

export function forgetLog(consoleId: string): void {
  executionLog.update((state) => {
    const { [consoleId]: _removed, ...rest } = state;
    return rest;
  });
}
