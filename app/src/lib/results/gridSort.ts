import type { SortKey } from "$lib/types";

// Clic en el encabezado de una columna: ascendente -> descendente -> sin
// orden. Sin Shift, esa columna pasa a ser el unico criterio; con Shift se
// agrega (o cicla) como criterio adicional y los demas se conservan en su
// orden de prioridad.
export function nextSort(current: readonly SortKey[], column: number, additive: boolean): SortKey[] {
  const existing = current.find((key) => key.column === column);
  const cycled: SortKey | null = !existing
    ? { column, descending: false }
    : existing.descending
      ? null
      : { column, descending: true };
  if (!additive) return cycled ? [cycled] : [];
  if (!existing) return [...current, cycled as SortKey];
  return cycled
    ? current.map((key) => (key.column === column ? cycled : key))
    : current.filter((key) => key.column !== column);
}
