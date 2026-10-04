import { describe, expect, it } from "vitest";
import { navigationTarget, type GridBounds } from "./gridNavigation";

const bounds = (hidden: number[] = []): GridBounds => ({
  rows: 10,
  cols: 5,
  pageRows: 3,
  isHidden: (row) => hidden.includes(row),
});

describe("navigationTarget", () => {
  it("mueve una celda con las flechas y se detiene en los bordes", () => {
    expect(navigationTarget({ row: 2, col: 2 }, "ArrowDown", false, bounds())).toEqual({ row: 3, col: 2 });
    expect(navigationTarget({ row: 2, col: 2 }, "ArrowRight", false, bounds())).toEqual({ row: 2, col: 3 });
    expect(navigationTarget({ row: 0, col: 0 }, "ArrowUp", false, bounds())).toEqual({ row: 0, col: 0 });
    expect(navigationTarget({ row: 0, col: 4 }, "ArrowRight", false, bounds())).toEqual({ row: 0, col: 4 });
  });

  it("con Ctrl va hasta el borde", () => {
    expect(navigationTarget({ row: 4, col: 2 }, "ArrowDown", true, bounds())).toEqual({ row: 9, col: 2 });
    expect(navigationTarget({ row: 4, col: 2 }, "ArrowLeft", true, bounds())).toEqual({ row: 4, col: 0 });
    expect(navigationTarget({ row: 4, col: 2 }, "End", true, bounds())).toEqual({ row: 9, col: 4 });
    expect(navigationTarget({ row: 4, col: 2 }, "Home", true, bounds())).toEqual({ row: 0, col: 0 });
  });

  it("Inicio y Fin van al principio y al final de la fila", () => {
    expect(navigationTarget({ row: 4, col: 2 }, "Home", false, bounds())).toEqual({ row: 4, col: 0 });
    expect(navigationTarget({ row: 4, col: 2 }, "End", false, bounds())).toEqual({ row: 4, col: 4 });
  });

  it("RePag y AvPag saltan una pagina de filas visibles", () => {
    expect(navigationTarget({ row: 1, col: 0 }, "PageDown", false, bounds())).toEqual({ row: 4, col: 0 });
    expect(navigationTarget({ row: 8, col: 0 }, "PageDown", false, bounds())).toEqual({ row: 9, col: 0 });
    expect(navigationTarget({ row: 1, col: 0 }, "PageUp", false, bounds())).toEqual({ row: 0, col: 0 });
  });

  it("salta las filas ocultas", () => {
    const filtered = bounds([3, 4, 9]);
    expect(navigationTarget({ row: 2, col: 0 }, "ArrowDown", false, filtered)).toEqual({ row: 5, col: 0 });
    expect(navigationTarget({ row: 5, col: 0 }, "ArrowUp", false, filtered)).toEqual({ row: 2, col: 0 });
    expect(navigationTarget({ row: 0, col: 0 }, "ArrowDown", true, filtered)).toEqual({ row: 8, col: 0 });
    expect(navigationTarget({ row: 1, col: 0 }, "PageDown", false, filtered)).toEqual({ row: 6, col: 0 });
  });

  it("ignora las demas teclas", () => {
    expect(navigationTarget({ row: 0, col: 0 }, "a", false, bounds())).toBeNull();
  });
});

describe("navigationTarget: bordes", () => {
  it("un grid vacio no navega", () => {
    expect(navigationTarget({ row: 0, col: 0 }, "ArrowDown", false, { ...bounds(), rows: 0 })).toBeNull();
    expect(navigationTarget({ row: 0, col: 0 }, "ArrowDown", false, { ...bounds(), cols: 0 })).toBeNull();
  });

  it("una pagina de 0 filas avanza al menos una", () => {
    expect(navigationTarget({ row: 2, col: 0 }, "PageDown", false, { ...bounds(), pageRows: 0 })).toEqual({ row: 3, col: 0 });
  });

  it("si todas las de abajo estan ocultas, se queda donde esta", () => {
    const filtered = bounds([5, 6, 7, 8, 9]);
    expect(navigationTarget({ row: 4, col: 1 }, "ArrowDown", false, filtered)).toEqual({ row: 4, col: 1 });
    expect(navigationTarget({ row: 4, col: 1 }, "End", true, filtered)).toEqual({ row: 4, col: 4 });
  });

  it("Ctrl+Arriba salta a la primera visible aunque la 0 este oculta", () => {
    expect(navigationTarget({ row: 7, col: 2 }, "ArrowUp", true, bounds([0, 1]))).toEqual({ row: 2, col: 2 });
  });
});
