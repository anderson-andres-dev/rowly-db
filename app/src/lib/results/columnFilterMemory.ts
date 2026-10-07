import type { ColumnFilters } from "./columnFilters";

// Los filtros por columna de cada pestaña del resultado, para que no se
// pierdan al ir a otra y volver: el panel de un grupo muestra una pestaña a
// la vez y, al cambiar de columnas, empezaba de cero. Se guardan junto a las
// columnas a las que pertenecen (la firma): otro resultado en la misma
// pestaña (otras columnas) empieza sin filtros; otra pagina o el mismo
// resultado otra vez, los conserva.

interface Saved {
  signature: string;
  filters: ColumnFilters;
}

const saved = new Map<string, Saved>();

export function recallColumnFilters(key: string, signature: string): ColumnFilters {
  const entry = saved.get(key);
  return entry && entry.signature === signature ? entry.filters : new Map();
}

export function rememberColumnFilters(key: string, signature: string, filters: ColumnFilters): void {
  if (filters.size === 0) saved.delete(key);
  else saved.set(key, { signature, filters });
}

// Al cerrar una pestaña o su consola (las fijadas son "<consola>#pin<n>").
export function forgetColumnFilters(key: string): void {
  for (const stored of [...saved.keys()]) {
    if (stored === key || stored.startsWith(`${key}#`)) saved.delete(stored);
  }
}
