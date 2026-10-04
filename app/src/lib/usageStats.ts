import { browser } from "$app/environment";
import { get, writable } from "svelte/store";

// Cuenta cuantas veces se acepto cada sugerencia de autocompletado (tabla o
// columna), persistido igual que connectionProfiles.ts/shortcuts.ts, para
// darle boost a lo que el usuario realmente usa (ver editor/completionSource.ts). No es ML
// como el de DataGrip, pero reordena por el mismo motivo: usar el
// SqlEditor.svelte.

const STORAGE_KEY = "khipu:completion-usage";

function loadUsage(): Record<string, number> {
  if (!browser) return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};

    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return {};

    const usage: Record<string, number> = {};
    for (const [key, count] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof count === "number" && Number.isFinite(count)) usage[key] = count;
    }
    return usage;
  } catch {
    return {};
  }
}

const usage = writable<Record<string, number>>(loadUsage());

if (browser) {
  usage.subscribe((counts) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
    } catch {
      // La falta de almacenamiento no debe impedir usar el autocompletado.
    }
  });
}

export function recordUsage(key: string): void {
  usage.update((counts) => ({ ...counts, [key]: (counts[key] ?? 0) + 1 }));
}

// Logaritmico y con techo: un par de usos no debe dominar ya un buen match
// fuzzy, pero algo genuinamente frecuente sigue flotando hacia arriba.
export function boostFor(key: string): number {
  const count = get(usage)[key] ?? 0;
  return count > 0 ? Math.min(6, Math.round(Math.log2(count + 1))) : 0;
}
