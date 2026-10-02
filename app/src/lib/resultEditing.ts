import { invoke } from "$lib/backend";
import type { QueryRow } from "$lib/types";

// Edicion del resultado desde el grid. Los cambios se acumulan como
// pendientes (nada toca la base) hasta que el usuario los aplica; el
// backend genera y ejecuta el SQL a partir de estos cambios estructurados,
// validandolos contra el catalogo (ver result_editing.rs).

export type CellValue = { kind: "null" } | { kind: "default" } | { kind: "text"; value: string };

export interface EditTarget {
  schema: string;
  table: string;
}

export interface EditableColumn {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  defaultValue: string | null;
  generated: boolean;
}

export interface ResultEditInfo {
  target: EditTarget;
  // Una entrada por columna del resultado; null = solo lectura.
  columns: (EditableColumn | null)[];
  keyColumns: string[];
}

// Cambios pendientes sobre la pagina visible. Se reemplazan enteros en cada
// cambio (inmutables) para que Svelte los vea; son pocos, copiarlos es
// barato.
export interface PendingEdits {
  // fila de la pagina -> columna -> valor nuevo
  updates: ReadonlyMap<number, ReadonlyMap<number, CellValue>>;
  deleted: ReadonlySet<number>;
  // Filas nuevas (van despues de las de la pagina): un valor por columna.
  inserted: readonly (readonly CellValue[])[];
}

export const EMPTY_EDITS: PendingEdits = { updates: new Map(), deleted: new Set(), inserted: [] };

export function pendingCount(edits: PendingEdits): number {
  let count = edits.deleted.size + edits.inserted.length;
  for (const [row] of edits.updates) if (!edits.deleted.has(row)) count++;
  return count;
}

export function sameValue(a: CellValue, b: CellValue): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind !== "text" || a.value === (b as { value: string }).value;
}

export function originalValue(raw: string | null): CellValue {
  return raw === null ? { kind: "null" } : { kind: "text", value: raw };
}

// Fija el valor de una celda. Volver al valor original la saca de los
// pendientes; en una fila nueva simplemente se reemplaza.
export function setCellValue(
  edits: PendingEdits,
  rows: readonly QueryRow[],
  row: number,
  col: number,
  value: CellValue,
): PendingEdits {
  if (row >= rows.length) {
    const index = row - rows.length;
    const inserted = edits.inserted.map((values, i) =>
      i === index ? values.map((current, c) => (c === col ? value : current)) : values,
    );
    return { ...edits, inserted };
  }
  const updates = new Map(edits.updates);
  const rowUpdates = new Map(updates.get(row) ?? []);
  if (sameValue(value, originalValue(rows[row][col]))) rowUpdates.delete(col);
  else rowUpdates.set(col, value);
  if (rowUpdates.size === 0) updates.delete(row);
  else updates.set(row, rowUpdates);
  return { ...edits, updates };
}

// Escribir con varias celdas seleccionadas: el mismo valor en todas, en un
// solo paso de deshacer. Se saltan las columnas de solo lectura o generadas,
// las filas marcadas para eliminar (como al pegar) y las `hidden` (ocultas
// por "Filtrar filas": como al copiar, lo que no se ve no se toca).
export function fillCells(
  edits: PendingEdits,
  info: ResultEditInfo,
  rows: readonly QueryRow[],
  ranges: readonly RowRange[],
  value: CellValue,
  hidden: ReadonlySet<number> | null = null,
): PendingEdits {
  const updates = new Map<number, Map<number, CellValue>>(
    [...edits.updates].map(([row, cols]) => [row, new Map(cols)]),
  );
  const inserted = edits.inserted.map((values) => [...values]);
  const base = rows.length;
  const total = base + inserted.length;
  for (const range of ranges) {
    for (let row = range.minRow; row <= Math.min(range.maxRow, total - 1); row++) {
      if (row < base && (edits.deleted.has(row) || hidden?.has(row))) continue;
      for (let col = range.minCol; col <= Math.min(range.maxCol, info.columns.length - 1); col++) {
        const column = info.columns[col];
        if (!column || column.generated) continue;
        if (row >= base) {
          inserted[row - base][col] = value;
          continue;
        }
        const rowUpdates = updates.get(row) ?? new Map<number, CellValue>();
        if (sameValue(value, originalValue(rows[row][col]))) rowUpdates.delete(col);
        else rowUpdates.set(col, value);
        if (rowUpdates.size === 0) updates.delete(row);
        else updates.set(row, rowUpdates);
      }
    }
  }
  return { updates, deleted: edits.deleted, inserted };
}

// Valor inicial de cada columna en una fila nueva: lo que DataGrip muestra
// como <generated>, <default> o <null>.
export function newRowValues(info: ResultEditInfo): CellValue[] {
  return info.columns.map((column) =>
    column && (column.generated || column.defaultValue !== null) ? { kind: "default" } : { kind: "null" },
  );
}

export function addRow(edits: PendingEdits, info: ResultEditInfo): PendingEdits {
  return { ...edits, inserted: [...edits.inserted, newRowValues(info)] };
}

export interface RowRange {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

// Marca como eliminadas las filas del rango. Las nuevas, directamente se
// quitan (nunca existieron en la base).
export function deleteRows(edits: PendingEdits, rowCount: number, range: RowRange): PendingEdits {
  const deleted = new Set(edits.deleted);
  for (let row = range.minRow; row <= Math.min(range.maxRow, rowCount - 1); row++) deleted.add(row);
  const inserted = edits.inserted.filter((_, index) => {
    const row = rowCount + index;
    return row < range.minRow || row > range.maxRow;
  });
  return { ...edits, deleted, inserted };
}

// Deshace lo pendiente dentro del rango: celdas editadas, filas marcadas
// para eliminar y filas nuevas. Sin rango, deshace todo.
export function revert(edits: PendingEdits, rowCount: number, range: RowRange | null): PendingEdits {
  if (!range) return EMPTY_EDITS;
  const updates = new Map(edits.updates);
  for (const [row, cols] of edits.updates) {
    if (row < range.minRow || row > range.maxRow) continue;
    const remaining = new Map([...cols].filter(([col]) => col < range.minCol || col > range.maxCol));
    if (remaining.size === 0) updates.delete(row);
    else updates.set(row, remaining);
  }
  const deleted = new Set([...edits.deleted].filter((row) => row < range.minRow || row > range.maxRow));
  const inserted = edits.inserted.filter((_, index) => {
    const row = rowCount + index;
    return row < range.minRow || row > range.maxRow;
  });
  return { updates, deleted, inserted };
}

// --- Hacia el backend ---------------------------------------------------

interface ColumnValue {
  column: string;
  value: CellValue;
}

export interface ResultChanges {
  deletes: ColumnValue[][];
  updates: { key: ColumnValue[]; set: ColumnValue[] }[];
  inserts: ColumnValue[][];
}

export function buildChanges(edits: PendingEdits, info: ResultEditInfo, rows: readonly QueryRow[]): ResultChanges {
  const keyIndexes = info.keyColumns.map((key) =>
    info.columns.findIndex((column) => column?.name.toLowerCase() === key.toLowerCase()),
  );
  const keyOf = (row: number): ColumnValue[] =>
    info.keyColumns.map((key, i) => ({ column: key, value: originalValue(rows[row][keyIndexes[i]]) }));

  const deletes = [...edits.deleted].sort((a, b) => a - b).map(keyOf);
  const updates = [...edits.updates]
    .filter(([row]) => !edits.deleted.has(row))
    .sort(([a], [b]) => a - b)
    .map(([row, cols]) => ({
      key: keyOf(row),
      set: [...cols]
        .sort(([a], [b]) => a - b)
        .flatMap(([col, value]) => {
          const column = info.columns[col];
          return column ? [{ column: column.name, value }] : [];
        }),
    }));
  const inserts = edits.inserted.map((values) =>
    values.flatMap((value, col) => {
      const column = info.columns[col];
      // Las generadas nunca se escriben; las demas van aunque sean DEFAULT
      // (el backend omite las DEFAULT del INSERT).
      return column && !column.generated ? [{ column: column.name, value }] : [];
    }),
  );
  return { deletes, updates, inserts };
}

export interface ChangeError {
  statementIndex: number | null;
  message: string;
  code: string | null;
}

export async function fetchEditInfo(sql: string, columnNames: string[]): Promise<ResultEditInfo> {
  return await invoke<ResultEditInfo>("result_edit_info", { sql, columnNames });
}

export async function previewChanges(target: EditTarget, changes: ResultChanges): Promise<string[]> {
  return await invoke<string[]>("preview_result_changes", { target, changes });
}

// Resuelve con las filas afectadas; rechaza con un ChangeError (todo se
// revirtio: nada quedo aplicado). En produccion el backend exige
// `confirmed`: que el usuario confirmo estos cambios en la vista previa.
export async function applyChanges(target: EditTarget, changes: ResultChanges, confirmed: boolean): Promise<number> {
  return await invoke<number>("apply_result_changes", { target, changes, confirmed });
}

// --- Pegar --------------------------------------------------------------

export interface PasteResult {
  edits: PendingEdits;
  // Area que cubrio el pegado (para deshacer, animar y seleccionar).
  range: RowRange;
  // Primera fila nueva creada para que entrara todo (null si no hizo falta).
  firstNewRow: number | null;
}

// Pega un bloque de valores desde (anchorRow, anchorCol). Las filas que no
// existen se crean al final (copiar 3 filas con espacio para 1 agrega las 2
// que faltan). Se saltan las columnas de solo lectura, las generadas por el
// servidor y las filas marcadas para eliminar. `undefined` en el bloque =
// no tocar esa celda.
//
// Con un solo valor y `fill` (varias celdas seleccionadas), ese valor se
// copia en todas, como en una planilla.
//
// En lote: los Maps se construyen una vez aunque se peguen miles de celdas.
export function pasteBlock(
  edits: PendingEdits,
  info: ResultEditInfo,
  rows: readonly QueryRow[],
  anchorRow: number,
  anchorCol: number,
  block: readonly (readonly (CellValue | undefined)[])[],
  fill: RowRange | null = null,
): PasteResult | null {
  if (block.length === 0) return null;
  const single = block.length === 1 && block[0].length === 1 && block[0][0] !== undefined;
  const area: RowRange =
    single && fill
      ? fill
      : {
          minRow: anchorRow,
          maxRow: anchorRow + block.length - 1,
          minCol: anchorCol,
          maxCol: anchorCol + Math.max(...block.map((row) => row.length)) - 1,
        };
  const valueFor = (row: number, col: number): CellValue | undefined =>
    single && fill ? block[0][0] : block[row - area.minRow]?.[col - area.minCol];

  const updates = new Map<number, Map<number, CellValue>>(
    [...edits.updates].map(([row, cols]) => [row, new Map(cols)]),
  );
  const inserted = edits.inserted.map((values) => [...values]);
  const base = rows.length;
  let firstNewRow: number | null = null;
  while (base + inserted.length <= area.maxRow) {
    if (firstNewRow === null) firstNewRow = base + inserted.length;
    inserted.push(newRowValues(info));
  }

  const lastCol = Math.min(area.maxCol, info.columns.length - 1);
  for (let row = area.minRow; row <= area.maxRow; row++) {
    if (row < base && edits.deleted.has(row)) continue;
    for (let col = area.minCol; col <= lastCol; col++) {
      const column = info.columns[col];
      const value = valueFor(row, col);
      if (!column || column.generated || value === undefined) continue;
      if (row >= base) {
        inserted[row - base][col] = value;
        continue;
      }
      const rowUpdates = updates.get(row) ?? new Map<number, CellValue>();
      if (sameValue(value, originalValue(rows[row][col]))) rowUpdates.delete(col);
      else rowUpdates.set(col, value);
      if (rowUpdates.size === 0) updates.delete(row);
      else updates.set(row, rowUpdates);
    }
  }

  return {
    edits: { updates, deleted: edits.deleted, inserted },
    range: { ...area, maxCol: Math.max(area.minCol, lastCol) },
    firstNewRow,
  };
}
