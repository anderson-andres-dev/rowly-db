// Bordes de la ventana sin marco (decorations: false). El toolkit la deja
// redimensionable, pero el webview cubre todo y WebKit pisa el cursor: sin
// estas franjas el borde funciona sin avisar que se puede arrastrar.

export type ResizeDirection =
  | "North"
  | "South"
  | "East"
  | "West"
  | "NorthEast"
  | "NorthWest"
  | "SouthEast"
  | "SouthWest";

export type WindowEdge = {
  direction: ResizeDirection;
  cursor: string;
  // Posicion de la franja dentro de la ventana, en CSS.
  style: string;
};

// Grosor de la franja de los lados y lado del cuadrado de las esquinas.
export const EDGE = 4;
export const CORNER = 10;

export const WINDOW_EDGES: readonly WindowEdge[] = [
  { direction: "North", cursor: "ns-resize", style: `top:0;left:${CORNER}px;right:${CORNER}px;height:${EDGE}px` },
  { direction: "South", cursor: "ns-resize", style: `bottom:0;left:${CORNER}px;right:${CORNER}px;height:${EDGE}px` },
  { direction: "West", cursor: "ew-resize", style: `left:0;top:${CORNER}px;bottom:${CORNER}px;width:${EDGE}px` },
  { direction: "East", cursor: "ew-resize", style: `right:0;top:${CORNER}px;bottom:${CORNER}px;width:${EDGE}px` },
  { direction: "NorthWest", cursor: "nwse-resize", style: `top:0;left:0;width:${CORNER}px;height:${CORNER}px` },
  { direction: "NorthEast", cursor: "nesw-resize", style: `top:0;right:0;width:${CORNER}px;height:${CORNER}px` },
  { direction: "SouthWest", cursor: "nesw-resize", style: `bottom:0;left:0;width:${CORNER}px;height:${CORNER}px` },
  { direction: "SouthEast", cursor: "nwse-resize", style: `bottom:0;right:0;width:${CORNER}px;height:${CORNER}px` },
];

// Maximizada o a pantalla completa no hay borde que arrastrar.
export function edgesVisible(state: { maximized: boolean; fullscreen: boolean }): boolean {
  return !state.maximized && !state.fullscreen;
}
