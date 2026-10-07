import { describe, expect, it } from "vitest";
import { forgetColumnFilters, recallColumnFilters, rememberColumnFilters } from "./columnFilterMemory";

const filters = new Map([[1, new Set(["NULL"])]]);

describe("filtros por columna de cada pestaña", () => {
  it("volver a la pestaña los trae, con las mismas columnas", () => {
    rememberColumnFilters("c1", "a\u0000b", filters);
    expect(recallColumnFilters("c1", "a\u0000b")).toBe(filters);
  });

  it("otro resultado (otras columnas) en la misma pestaña empieza sin filtros", () => {
    rememberColumnFilters("c2", "a", filters);
    expect(recallColumnFilters("c2", "x").size).toBe(0);
  });

  it("sin filtros no guarda nada; cerrar la consola olvida sus pestañas fijadas", () => {
    rememberColumnFilters("c3", "a", filters);
    rememberColumnFilters("c3#pin1", "a", filters);
    rememberColumnFilters("c30", "a", filters);
    forgetColumnFilters("c3");
    expect(recallColumnFilters("c3", "a").size).toBe(0);
    expect(recallColumnFilters("c3#pin1", "a").size).toBe(0);
    expect(recallColumnFilters("c30", "a")).toBe(filters);
    rememberColumnFilters("c30", "a", new Map());
    expect(recallColumnFilters("c30", "a").size).toBe(0);
  });
});
