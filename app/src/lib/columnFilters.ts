import type { QueryRow } from "$lib/types";

// Filtro local por columna, como el "Local Filter" de DataGrip: sobre las
// filas ya cargadas, sin volver a consultar. Por cada columna se guardan los
// valores DESMARCADOS (lo normal es quitar unos pocos de muchos). Una fila se
// oculta si alguno de sus valores esta desmarcado en su columna.
//
// Todo es una pasada lineal sobre las filas de la pagina: los conteos se
// calculan al abrir el filtro de una columna, no en cada cambio.

// NULL y el texto vacio son valores distintos de cualquier texto.
export const NULL_KEY = "\u0000null";

export type ColumnFilters = ReadonlyMap<number, ReadonlySet<string>>;

export function valueKey(value: string | null): string {
  return value === null ? NULL_KEY : value;
}

export interface ValueCount {
  key: string;
  value: string | null;
  // Filas con este valor que pasan los filtros de las OTRAS columnas (y la
  // busqueda con "Filtrar filas"): lo que quedaria al marcarlo.
  count: number;
}

// Filas que ocultan los filtros, sin mirar la columna `except` (para contar
// los valores de esa columna como si su propio filtro no estuviera).
export function rowsHiddenByFilters(rows: readonly QueryRow[], filters: ColumnFilters, except = -1): Set<number> {
  const active = [...filters].filter(([column, excluded]) => column !== except && excluded.size > 0);
  const hidden = new Set<number>();
  if (active.length === 0) return hidden;
  for (let row = 0; row < rows.length; row++) {
    for (const [column, excluded] of active) {
      if (excluded.has(valueKey(rows[row][column] ?? null))) {
        hidden.add(row);
        break;
      }
    }
  }
  return hidden;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

// Todos los valores distintos de la columna (NULL y vacio primero, el resto
// en orden natural: 2 antes que 10), cada uno con cuantas filas quedan.
// `alsoHidden`: filas que ya oculta otra cosa (la busqueda).
export function columnValueCounts(
  rows: readonly QueryRow[],
  column: number,
  filters: ColumnFilters,
  alsoHidden: ReadonlySet<number> | null = null,
): ValueCount[] {
  const hiddenByOthers = rowsHiddenByFilters(rows, filters, column);
  const counts = new Map<string, ValueCount>();
  for (let row = 0; row < rows.length; row++) {
    const value = rows[row][column] ?? null;
    const key = valueKey(value);
    let entry = counts.get(key);
    if (!entry) {
      entry = { key, value, count: 0 };
      counts.set(key, entry);
    }
    if (!hiddenByOthers.has(row) && !alsoHidden?.has(row)) entry.count += 1;
  }
  const rank = (value: string | null) => (value === null ? 0 : value === "" ? 1 : 2);
  return [...counts.values()].sort(
    (a, b) => rank(a.value) - rank(b.value) || collator.compare(a.value ?? "", b.value ?? ""),
  );
}

// Filtros sin la columna, o con sus valores desmarcados reemplazados.
export function withColumnFilter(filters: ColumnFilters, column: number, excluded: ReadonlySet<string>): ColumnFilters {
  const next = new Map(filters);
  if (excluded.size === 0) next.delete(column);
  else next.set(column, excluded);
  return next;
}
