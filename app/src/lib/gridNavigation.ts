// Navegacion con el teclado en el grid, como en una planilla: flechas,
// Inicio/Fin, RePag/AvPag y, con Ctrl, hasta el borde. Las filas ocultas
// por "Filtrar filas" se saltan. Shift (extender la seleccion) lo resuelve
// el grid: aca solo sale a que celda se llega.

export interface GridCell {
  row: number;
  col: number;
}

export interface GridBounds {
  rows: number;
  cols: number;
  // Filas visibles por pagina (RePag/AvPag).
  pageRows: number;
  isHidden: (row: number) => boolean;
}

export const NAVIGATION_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

// `steps` filas visibles hacia arriba (<0) o abajo (>0); se queda en la
// ultima visible si se acaban.
function stepRows(bounds: GridBounds, row: number, steps: number): number {
  const direction = Math.sign(steps);
  let remaining = Math.abs(steps);
  let current = row;
  for (let next = row + direction; remaining > 0 && next >= 0 && next < bounds.rows; next += direction) {
    if (bounds.isHidden(next)) continue;
    current = next;
    remaining -= 1;
  }
  return current;
}

function edgeRow(bounds: GridBounds, direction: -1 | 1): number {
  const start = direction === 1 ? bounds.rows - 1 : 0;
  for (let row = start; row >= 0 && row < bounds.rows; row -= direction) {
    if (!bounds.isHidden(row)) return row;
  }
  return start;
}

// null: la tecla no es de navegacion.
export function navigationTarget(from: GridCell, key: string, ctrl: boolean, bounds: GridBounds): GridCell | null {
  if (bounds.rows === 0 || bounds.cols === 0) return null;
  const lastCol = bounds.cols - 1;
  switch (key) {
    case "ArrowUp":
      return { row: ctrl ? edgeRow(bounds, -1) : stepRows(bounds, from.row, -1), col: from.col };
    case "ArrowDown":
      return { row: ctrl ? edgeRow(bounds, 1) : stepRows(bounds, from.row, 1), col: from.col };
    case "ArrowLeft":
      return { row: from.row, col: ctrl ? 0 : Math.max(0, from.col - 1) };
    case "ArrowRight":
      return { row: from.row, col: ctrl ? lastCol : Math.min(lastCol, from.col + 1) };
    case "Home":
      return ctrl ? { row: edgeRow(bounds, -1), col: 0 } : { row: from.row, col: 0 };
    case "End":
      return ctrl ? { row: edgeRow(bounds, 1), col: lastCol } : { row: from.row, col: lastCol };
    case "PageUp":
      return { row: stepRows(bounds, from.row, -Math.max(1, bounds.pageRows)), col: from.col };
    case "PageDown":
      return { row: stepRows(bounds, from.row, Math.max(1, bounds.pageRows)), col: from.col };
    default:
      return null;
  }
}
