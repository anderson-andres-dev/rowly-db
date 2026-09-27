import { browser } from "$app/environment";
import { writable } from "svelte/store";

// Historial de consultas por conexion (Ctrl+E, QueryHistory.svelte). A
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

if (browser) {
  queryHistory.subscribe((value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // Sin almacenamiento, el historial dura lo que dure la sesion.
    }
  });
}

// La mas reciente primero. Repetir la misma consulta seguida no agrega otra
// entrada: la ultima se actualiza (y queda con el resultado nuevo).
export function withHistoryEntry(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const sql = entry.sql.trim();
  if (sql === "" || sql.length > MAX_HISTORY_SQL_LENGTH) return history;
  const next = { ...entry, sql };
  const rest = history[0]?.sql === sql ? history.slice(1) : history;
  return [next, ...rest].slice(0, MAX_HISTORY_ENTRIES);
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
