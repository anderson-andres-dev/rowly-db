import { browser } from "$app/environment";
import { writable } from "svelte/store";

// Tablas (y vistas) fijadas arriba del explorador, por conexion. Se
// identifican por schema y nombre; si una deja de existir o su schema no
// esta visible, simplemente no se muestra (queda guardada por si vuelve).
export interface PinnedTable {
  schema: string;
  name: string;
}

const STORAGE_KEY = "khipu:pinned-tables:v1";

function load(): Record<string, PinnedTable[]> {
  if (!browser) return {};
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object") return {};
    const result: Record<string, PinnedTable[]> = {};
    for (const [profileId, list] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(list)) continue;
      result[profileId] = list.filter(
        (item): item is PinnedTable =>
          !!item && typeof item.schema === "string" && typeof item.name === "string",
      );
    }
    return result;
  } catch {
    return {};
  }
}

export const pinnedTables = writable<Record<string, PinnedTable[]>>(load());

if (browser) {
  pinnedTables.subscribe((value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // Sin almacenamiento, las fijadas duran lo que dure la sesion.
    }
  });
}

export function isPinned(list: PinnedTable[] | undefined, schema: string, name: string): boolean {
  return !!list?.some((item) => item.schema === schema && item.name === name);
}

// Fija o desfija; las nuevas van al final, en el orden en que se fijaron.
export function togglePinnedTable(profileId: string, schema: string, name: string): void {
  pinnedTables.update((all) => {
    const list = all[profileId] ?? [];
    const next = isPinned(list, schema, name)
      ? list.filter((item) => !(item.schema === schema && item.name === name))
      : [...list, { schema, name }];
    return { ...all, [profileId]: next };
  });
}

export function forgetPinnedTables(profileId: string): void {
  pinnedTables.update((all) => {
    const { [profileId]: _removed, ...rest } = all;
    return rest;
  });
}
