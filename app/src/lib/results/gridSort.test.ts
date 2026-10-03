import { describe, expect, it } from "vitest";
import { nextSort } from "./gridSort";

describe("nextSort", () => {
  it("cicla ascendente, descendente y sin orden", () => {
    let sort = nextSort([], 2, false);
    expect(sort).toEqual([{ column: 2, descending: false }]);
    sort = nextSort(sort, 2, false);
    expect(sort).toEqual([{ column: 2, descending: true }]);
    expect(nextSort(sort, 2, false)).toEqual([]);
  });

  it("sin Shift reemplaza; con Shift agrega y conserva la prioridad", () => {
    const base = [{ column: 1, descending: false }];
    expect(nextSort(base, 3, false)).toEqual([{ column: 3, descending: false }]);
    const two = nextSort(base, 3, true);
    expect(two).toEqual([
      { column: 1, descending: false },
      { column: 3, descending: false },
    ]);
    expect(nextSort(two, 1, true)).toEqual([
      { column: 1, descending: true },
      { column: 3, descending: false },
    ]);
    expect(nextSort(nextSort(two, 1, true), 1, true)).toEqual([{ column: 3, descending: false }]);
  });
});
