import { originalValue, type CellValue, type PendingEdits } from "$lib/results/resultEditing";
import type { QueryRow } from "$lib/types";

// Busqueda en la pagina del grid (Ctrl+F): recorre las celdas tal como se
// ven (cambios pendientes y filas nuevas incluidos) y devuelve las
// coincidencias en orden de lectura (fila, luego columna).

export interface FindOptions {
  matchCase: boolean;
  regex: boolean;
  wholeWord: boolean;
}

export interface FindMatch {
  row: number;
  col: number;
}

export interface FindResult {
  matches: FindMatch[];
  // Expresion regular invalida (se muestra en la barra).
  error: string | null;
  // Se corto en MAX_MATCHES: el contador lo indica ("5.000+").
  capped: boolean;
}

// Tope de coincidencias: cada una se resalta tocando su <td>; buscar "1" en
// 10.000 x 40 celdas no debe congelar la app por resaltar decenas de miles.
export const MAX_MATCHES = 5000;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildMatcher(query: string, options: FindOptions): { test: (text: string) => boolean } | { error: string } {
  let source = options.regex ? query : escapeRegex(query);
  // "Palabra completa" con letras y digitos Unicode (no solo [A-Za-z0-9_]
  // como \b): "cedeño" no debe cortarse en la ñ.
  if (options.wholeWord) source = `(?<![\\p{L}\\p{N}_])(?:${source})(?![\\p{L}\\p{N}_])`;
  try {
    const pattern = new RegExp(source, options.matchCase ? "u" : "iu");
    return { test: (text) => pattern.test(text) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function cellText(value: CellValue): string | null {
  return value.kind === "text" ? value.value : null;
}

export function findInPage(
  rows: readonly QueryRow[],
  columnCount: number,
  edits: PendingEdits,
  query: string,
  options: FindOptions,
): FindResult {
  if (query === "") return { matches: [], error: null, capped: false };
  const matcher = buildMatcher(query, options);
  if ("error" in matcher) return { matches: [], error: matcher.error, capped: false };

  const matches: FindMatch[] = [];
  const total = rows.length + edits.inserted.length;
  for (let row = 0; row < total; row++) {
    const updates = row < rows.length ? edits.updates.get(row) : undefined;
    for (let col = 0; col < columnCount; col++) {
      const value =
        row >= rows.length
          ? edits.inserted[row - rows.length][col]
          : (updates?.get(col) ?? originalValue(rows[row][col]));
      const text = cellText(value);
      if (text === null || !matcher.test(text)) continue;
      matches.push({ row, col });
      if (matches.length >= MAX_MATCHES) return { matches, error: null, capped: true };
    }
  }
  return { matches, error: null, capped: false };
}
