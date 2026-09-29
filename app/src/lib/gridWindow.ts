// Que tramos del cuerpo del grid tienen que estar montados (ver la
// virtualizacion en DataGrid.svelte, y docs/specs/v0.2-rendimiento.md, 21a).
//
// El cuerpo se divide en tramos de CHUNK_ROWS filas. Con "Filtrar filas"
// algunas filas no ocupan lugar: la posicion en pantalla es la fila
// "visual" (sin contar las ocultas), y `hiddenBefore[r]` dice cuantas
// ocultas hay antes de la fila r.

export const CHUNK_ROWS = 40;

// La primera fila real cuya posicion visual es >= `visual`.
export function rowAtVisual(visual: number, rowCount: number, hiddenBefore: Int32Array | null): number {
  if (!hiddenBefore) return Math.min(Math.max(visual, 0), rowCount);
  let low = 0;
  let high = rowCount;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (mid - hiddenBefore[mid] < visual) low = mid + 1;
    else high = mid;
  }
  return low;
}

export interface ChunkWindow {
  // Tramos que tocan lo visible: se montan ya, antes de pintar.
  visible: { from: number; to: number };
  // Con el margen: se completan en los frames siguientes.
  wanted: { from: number; to: number };
  // Fuera de esto se desmonta (histeresis: nunca en el borde de la vista).
  kept: { from: number; to: number };
}

// `top`/`height`: lo visible del cuerpo, en px desde su primera fila.
// `margin` y `keep`: cuanto mas alla de lo visible montar y conservar, en
// px. Tramos [from, to] inclusivos; null si no hay filas.
export function chunkWindow(options: {
  top: number;
  height: number;
  rowHeight: number;
  rowCount: number;
  hiddenBefore: Int32Array | null;
  margin: number;
  keep: number;
}): ChunkWindow | null {
  const { top, height, rowHeight, rowCount, hiddenBefore, margin, keep } = options;
  if (rowCount === 0 || rowHeight <= 0) return null;
  const visibleCount = hiddenBefore ? rowCount - hiddenBefore[rowCount] : rowCount;
  if (visibleCount <= 0) return null;
  const lastChunk = Math.floor((rowCount - 1) / CHUNK_ROWS);

  const range = (fromPx: number, toPx: number) => {
    const firstVisual = Math.min(visibleCount - 1, Math.max(0, Math.floor(fromPx / rowHeight)));
    const lastVisual = Math.min(visibleCount - 1, Math.max(firstVisual, Math.ceil(toPx / rowHeight)));
    // La fila (no oculta) que ocupa un lugar visual: la anterior a la
    // primera del lugar siguiente.
    const rowIn = (visual: number) =>
      Math.min(rowCount - 1, Math.max(0, rowAtVisual(visual + 1, rowCount, hiddenBefore) - 1));
    const firstRow = rowIn(firstVisual);
    const lastRow = Math.max(firstRow, rowIn(lastVisual));
    return {
      from: Math.min(lastChunk, Math.floor(firstRow / CHUNK_ROWS)),
      to: Math.min(lastChunk, Math.floor(lastRow / CHUNK_ROWS)),
    };
  };

  return {
    visible: range(top, top + height),
    wanted: range(top - margin, top + height + margin),
    kept: range(top - keep, top + height + keep),
  };
}

// Columnas: el mismo esquema en horizontal. Cada tramo de filas se divide
// en grupos de GROUP_COLS columnas; se montan los grupos que tocan lo
// visible (mas un margen). Con pocas columnas hay un solo grupo y todo es
// como una tabla por tramo.
export const GROUP_COLS = 32;

export function groupCount(columnCount: number): number {
  return Math.ceil(columnCount / GROUP_COLS);
}

// `left`/`width`: lo visible de las columnas, en px desde la primera.
// `lefts`/`widths`: posicion y ancho de cada columna. Grupos [from, to]
// inclusivos; null si no hay columnas.
export function groupWindow(options: {
  left: number;
  width: number;
  lefts: readonly number[];
  widths: readonly number[];
  margin: number;
  keep: number;
}): ChunkWindow | null {
  const { left, width, lefts, widths, margin, keep } = options;
  const groups = groupCount(lefts.length);
  if (groups === 0) return null;
  const start = (group: number) => lefts[group * GROUP_COLS];
  const end = (group: number) => {
    const last = Math.min(lefts.length, (group + 1) * GROUP_COLS) - 1;
    return lefts[last] + widths[last];
  };

  const range = (fromPx: number, toPx: number) => {
    let from = 0;
    while (from < groups - 1 && end(from) <= fromPx) from++;
    let to = from;
    while (to < groups - 1 && start(to + 1) < toPx) to++;
    return { from, to };
  };

  return {
    visible: range(left, left + width),
    wanted: range(left - margin, left + width + margin),
    kept: range(left - keep, left + width + keep),
  };
}
