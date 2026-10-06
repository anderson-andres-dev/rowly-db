import { browser } from "$app/environment";
import { writable } from "svelte/store";

// Historial de consultas por conexion (Ctrl+H, QueryHistory.svelte). A
// diferencia de la Salida (executionLog.ts), persiste entre sesiones. Se
// guarda al ejecutar desde el editor; se borra junto con el perfil.

export type HistoryOutcome = "ok" | "error" | "cancelled";

export interface HistoryEntry {
  id: string;
  sql: string;
  // Cuando se lanzo (ms desde epoch).
  at: number;
  durationMs: number;
  outcome: HistoryOutcome;
}

export const MAX_HISTORY_ENTRIES = 500;
// Una consulta enorme (un volcado pegado) no entra: llenaria el
// almacenamiento, que es de unos pocos MB para toda la app.
export const MAX_HISTORY_SQL_LENGTH = 20_000;
// Y entre todas, a lo sumo esto por conexion: 500 consultas largas serian
// ~10 MB, mas de lo que admite localStorage, reescritos en cada consulta.
// Pasado el presupuesto salen las mas viejas.
export const MAX_HISTORY_CHARS = 1_000_000;

const STORAGE_KEY = "khipu:query-history:v1";
const OUTCOMES = new Set<HistoryOutcome>(["ok", "error", "cancelled"]);

function isEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.sql === "string" &&
    typeof entry.at === "number" &&
    typeof entry.durationMs === "number" &&
    OUTCOMES.has(entry.outcome as HistoryOutcome)
  );
}

function load(): Record<string, HistoryEntry[]> {
  if (!browser) return {};
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object") return {};
    const result: Record<string, HistoryEntry[]> = {};
    for (const [profileId, list] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(list)) result[profileId] = list.filter(isEntry).slice(0, MAX_HISTORY_ENTRIES);
    }
    return result;
  } catch {
    return {};
  }
}

export const queryHistory = writable<Record<string, HistoryEntry[]>>(load());

// Se guarda a lo sumo una vez por PERSIST_DELAY_MS (y al cerrar la
// ventana): con cientos de consultas por hora, reescribir todo el historial
// en cada una no hace falta.
const PERSIST_DELAY_MS = 1000;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let pendingValue: Record<string, HistoryEntry[]> | null = null;

function writeHistory() {
  persistTimer = null;
  const value = pendingValue;
  pendingValue = null;
  if (!value) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Sin almacenamiento, el historial dura lo que dure la sesion.
  }
}

// Lo pendiente se guarda ya (al cerrar la ventana; en las pruebas).
export function flushQueryHistory(): void {
  if (persistTimer !== null) clearTimeout(persistTimer);
  writeHistory();
}

if (browser) {
  let first = true;
  queryHistory.subscribe((value) => {
    // Lo recien leido no hace falta volver a escribirlo.
    if (first) {
      first = false;
      return;
    }
    pendingValue = value;
    persistTimer ??= setTimeout(writeHistory, PERSIST_DELAY_MS);
  });
  globalThis.addEventListener?.("pagehide", flushQueryHistory);
  globalThis.document?.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushQueryHistory();
  });
}

// La mas reciente primero. Repetir la misma consulta seguida no agrega otra
// entrada: la ultima se actualiza (y queda con el resultado nuevo).
export function withHistoryEntry(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const sql = entry.sql.trim();
  if (sql === "" || sql.length > MAX_HISTORY_SQL_LENGTH) return history;
  const next = { ...entry, sql };
  const rest = history[0]?.sql === sql ? history.slice(1) : history;
  const list = [next, ...rest].slice(0, MAX_HISTORY_ENTRIES);
  let chars = 0;
  for (let index = 0; index < list.length; index++) {
    chars += list[index].sql.length;
    // La recien agregada siempre queda.
    if (chars > MAX_HISTORY_CHARS && index > 0) return list.slice(0, index);
  }
  return list;
}

export function recordQuery(profileId: string, entry: Omit<HistoryEntry, "id">): void {
  queryHistory.update((state) => {
    const current = state[profileId] ?? [];
    const next = withHistoryEntry(current, { ...entry, id: crypto.randomUUID() });
    return next === current ? state : { ...state, [profileId]: next };
  });
}

export function forgetQueryHistory(profileId: string): void {
  queryHistory.update((state) => {
    const { [profileId]: _removed, ...rest } = state;
    return rest;
  });
}

// Cada palabra del filtro tiene que aparecer (en cualquier orden, sin
// distinguir mayusculas).
export function filterHistory(history: HistoryEntry[], query: string): HistoryEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return history;
  return history.filter((entry) => {
    const sql = entry.sql.toLowerCase();
    return words.every((word) => sql.includes(word));
  });
}

export type HistoryDay = "today" | "yesterday" | number;

// Agrupa por dia local, en el orden de la lista. `day` es "today",
// "yesterday" o el inicio de ese dia (ms), para que la vista lo formatee en
// su idioma.
export function groupHistoryByDay(
  history: HistoryEntry[],
  now: number = Date.now(),
): { day: HistoryDay; entries: HistoryEntry[] }[] {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday - 1).setHours(0, 0, 0, 0);
  const groups: { day: HistoryDay; entries: HistoryEntry[] }[] = [];
  for (const entry of history) {
    const start = new Date(entry.at).setHours(0, 0, 0, 0);
    const day: HistoryDay = start >= startOfToday ? "today" : start === startOfYesterday ? "yesterday" : start;
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.entries.push(entry);
    else groups.push({ day, entries: [entry] });
  }
  return groups;
}
