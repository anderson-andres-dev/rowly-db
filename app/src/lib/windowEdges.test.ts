import { expect, it } from "vitest";
import { CORNER, EDGE, WINDOW_EDGES, edgesVisible } from "./windowEdges";

it("cubre los ocho bordes y esquinas, cada uno con su cursor", () => {
  const cursors = Object.fromEntries(WINDOW_EDGES.map((edge) => [edge.direction, edge.cursor]));
  expect(cursors).toEqual({
    North: "ns-resize",
    South: "ns-resize",
    West: "ew-resize",
    East: "ew-resize",
    NorthWest: "nwse-resize",
    SouthEast: "nwse-resize",
    NorthEast: "nesw-resize",
    SouthWest: "nesw-resize",
  });
});

it("los lados dejan libres las esquinas y las franjas son finas", () => {
  expect(EDGE).toBeLessThan(CORNER);
  const north = WINDOW_EDGES.find((edge) => edge.direction === "North");
  expect(north?.style).toContain(`left:${CORNER}px`);
  expect(north?.style).toContain(`height:${EDGE}px`);
});

it("no hay bordes que arrastrar maximizada ni a pantalla completa", () => {
  expect(edgesVisible({ maximized: false, fullscreen: false })).toBe(true);
  expect(edgesVisible({ maximized: true, fullscreen: false })).toBe(false);
  expect(edgesVisible({ maximized: false, fullscreen: true })).toBe(false);
});
