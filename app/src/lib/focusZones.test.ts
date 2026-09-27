import { describe, expect, it } from "vitest";
import { neighborZone } from "./focusZones";

describe("neighborZone", () => {
  it("cruza entre el sidebar y el lado derecho volviendo a la ultima zona de cada lado", () => {
    expect(neighborZone("editor", "left", "explorer", "editor")).toBe("explorer");
    expect(neighborZone("results", "left", "files", "results")).toBe("files");
    expect(neighborZone("explorer", "right", "explorer", "results")).toBe("results");
    expect(neighborZone("files", "right", "files", "editor")).toBe("editor");
  });

  it("sube y baja dentro de cada lado", () => {
    expect(neighborZone("editor", "down", "explorer", "editor")).toBe("results");
    expect(neighborZone("results", "up", "explorer", "results")).toBe("editor");
    expect(neighborZone("explorer", "down", "explorer", "editor")).toBe("files");
    expect(neighborZone("files", "up", "files", "editor")).toBe("explorer");
  });

  it("no hay vecino hacia el borde de la ventana", () => {
    expect(neighborZone("explorer", "left", "explorer", "editor")).toBeNull();
    expect(neighborZone("editor", "right", "explorer", "editor")).toBeNull();
    expect(neighborZone("editor", "up", "explorer", "editor")).toBeNull();
    expect(neighborZone("results", "down", "explorer", "results")).toBeNull();
  });
});
