import type { QueryColumn, QueryRow, ResultPage } from "$lib/types";

// Filtro por columna (el embudo del encabezado). Por cada columna se guardan
// los valores DESMARCADOS (lo normal es quitar unos pocos de muchos). Una
// fila se va si alguno de sus valores esta desmarcado en su columna.
//
// Si la consulta se puede paginar, se filtra en la base
// (pagination::filter_sql): la paginacion y el total son los de las filas
// filtradas y los valores del embudo salen de todo el resultado. Si no (un
// SHOW, nombres de columna repetidos, un error), sobre las filas cargadas:
// una pasada lineal por la pagina, con los conteos al abrir el embudo.

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
  return sortValueCounts([...counts.values()]);
}

function sortValueCounts(values: ValueCount[]): ValueCount[] {
  const rank = (value: string | null) => (value === null ? 0 : value === "" ? 1 : 2);
  return values.sort((a, b) => rank(a.value) - rank(b.value) || collator.compare(a.value ?? "", b.value ?? ""));
}

// Filtros sin la columna, o con sus valores desmarcados reemplazados.
export function withColumnFilter(filters: ColumnFilters, column: number, excluded: ReadonlySet<string>): ColumnFilters {
  const next = new Map(filters);
  if (excluded.size === 0) next.delete(column);
  else next.set(column, excluded);
  return next;
}

// Un filtro como lo pide el backend: la columna por su nombre (y su tipo,
// que decide como se compara) y sus valores desmarcados, null el NULL.
export interface ColumnFilterRequest {
  name: string;
  dataType: string;
  excluded: (string | null)[];
}

// Se filtra en la base si la consulta se pagina ahi y cada columna se
// nombra sin ambiguedad (sin distinguir mayusculas: asi las compara MySQL).
export function canFilterOnServer(columns: readonly QueryColumn[], page: ResultPage | null | undefined): boolean {
  if (!page?.pageable) return false;
  const names = new Set(columns.map((column) => column.name.toLowerCase()));
  return names.size === columns.length;
}

export function filterRequests(columns: readonly QueryColumn[], filters: ColumnFilters): ColumnFilterRequest[] {
  const requests: ColumnFilterRequest[] = [];
  for (const [column, excluded] of filters) {
    const info = columns[column];
    if (!info || excluded.size === 0) continue;
    requests.push({
      name: info.name,
      dataType: info.type,
      excluded: [...excluded].map((key) => (key === NULL_KEY ? null : key)),
    });
  }
  return requests;
}

// Lo que devuelve la base para el embudo (backend column_values).
export interface ServerColumnValues {
  values: { value: string | null; remaining: number; rows: number }[];
  truncated: boolean;
}

// Los valores de la base en el orden del embudo. Uno desmarcado que no vino
// (fuera de los mas frecuentes) se agrega igual, para poder volver a marcarlo.
export function serverValueCounts(server: ServerColumnValues, excluded: ReadonlySet<string>): ValueCount[] {
  const counts = new Map<string, ValueCount>();
  for (const item of server.values) {
    const key = valueKey(item.value);
    counts.set(key, { key, value: item.value, count: item.remaining });
  }
  for (const key of excluded) {
    if (!counts.has(key)) counts.set(key, { key, value: key === NULL_KEY ? null : key, count: 0 });
  }
  return sortValueCounts([...counts.values()]);
}
