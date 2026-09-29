import { describe, expect, it } from "vitest";
import { CHUNK_ROWS, GROUP_COLS, chunkWindow, groupCount, groupWindow, rowAtVisual } from "./gridWindow";

function prefix(rowCount: number, hidden: Set<number>): Int32Array {
  const out = new Int32Array(rowCount + 1);
  for (let row = 0; row < rowCount; row++) out[row + 1] = out[row] + (hidden.has(row) ? 1 : 0);
  return out;
}

describe("rowAtVisual", () => {
  it("sin filas ocultas es la identidad", () => {
    expect(rowAtVisual(0, 10, null)).toBe(0);
    expect(rowAtVisual(7, 10, null)).toBe(7);
    expect(rowAtVisual(20, 10, null)).toBe(10);
  });

  it("salta las filas ocultas", () => {
    // Ocultas 1, 2 y 5: visuales 0→0, 1→3, 2→4, 3→6.
    const hidden = prefix(8, new Set([1, 2, 5]));
    expect(rowAtVisual(0, 8, hidden)).toBe(0);
    expect(rowAtVisual(1, 8, hidden)).toBe(1);
    expect([3, 4, 6].map((row) => row - hidden[row])).toEqual([1, 2, 3]);
    expect(rowAtVisual(3, 8, hidden)).toBe(5);
    expect(rowAtVisual(5, 8, hidden)).toBe(8);
  });
});

describe("chunkWindow", () => {
  const base = { rowHeight: 28, hiddenBefore: null, margin: 0, keep: 0 };

  it("sin filas no hay nada que montar", () => {
    expect(chunkWindow({ ...base, top: 0, height: 400, rowCount: 0 })).toBeNull();
  });

  it("arriba del todo: solo el primer tramo es visible", () => {
    const window = chunkWindow({ ...base, top: 0, height: 400, rowCount: 500 })!;
    expect(window.visible).toEqual({ from: 0, to: 0 });
  });

  it("lo visible cruza el borde entre dos tramos", () => {
    const top = (CHUNK_ROWS - 5) * 28;
    const window = chunkWindow({ ...base, top, height: 400, rowCount: 500 })!;
    expect(window.visible).toEqual({ from: 0, to: 1 });
  });

  it("el margen y la conservacion crecen hacia ambos lados, sin pasarse", () => {
    const window = chunkWindow({ ...base, top: 5000, height: 400, rowCount: 500, margin: 800, keep: 1600 })!;
    expect(window.wanted.from).toBeLessThanOrEqual(window.visible.from);
    expect(window.wanted.to).toBeGreaterThanOrEqual(window.visible.to);
    expect(window.kept.from).toBeLessThanOrEqual(window.wanted.from);
    expect(window.kept.to).toBeGreaterThanOrEqual(window.wanted.to);
    expect(window.kept.to).toBeLessThanOrEqual(Math.floor(499 / CHUNK_ROWS));
    expect(window.kept.from).toBeGreaterThanOrEqual(0);
  });

  it("abajo del todo (o mas alla) queda en el ultimo tramo", () => {
    const window = chunkWindow({ ...base, top: 999_999, height: 400, rowCount: 500 })!;
    expect(window.visible).toEqual({ from: 12, to: 12 });
  });

  it("con filas ocultas, la posicion en pantalla es la visual", () => {
    // Las primeras 100 filas ocultas: arriba del todo se ve el tramo de la 100.
    const hidden = prefix(500, new Set(Array.from({ length: 100 }, (_, row) => row)));
    const window = chunkWindow({ ...base, hiddenBefore: hidden, top: 0, height: 400, rowCount: 500 })!;
    expect(window.visible.from).toBe(Math.floor(100 / CHUNK_ROWS));
  });

  it("todas las filas ocultas: nada que montar", () => {
    const hidden = prefix(50, new Set(Array.from({ length: 50 }, (_, row) => row)));
    expect(chunkWindow({ ...base, hiddenBefore: hidden, top: 0, height: 400, rowCount: 50 })).toBeNull();
  });
});

describe("groupWindow", () => {
  // 100 columnas de 100px: grupos de GROUP_COLS columnas (3200px).
  const widths = Array.from({ length: 100 }, () => 100);
  const lefts = widths.map((_, index) => index * 100);
  const base = { lefts, widths, margin: 0, keep: 0 };

  it("sin columnas no hay grupos", () => {
    expect(groupWindow({ ...base, lefts: [], widths: [], left: 0, width: 800 })).toBeNull();
  });

  it("pocas columnas: un solo grupo", () => {
    expect(groupCount(20)).toBe(1);
    const window = groupWindow({ lefts: lefts.slice(0, 20), widths: widths.slice(0, 20), margin: 5000, keep: 9000, left: 0, width: 800 })!;
    expect(window).toEqual({ visible: { from: 0, to: 0 }, wanted: { from: 0, to: 0 }, kept: { from: 0, to: 0 } });
  });

  it("lo visible dentro de un grupo y cruzando el borde", () => {
    expect(groupWindow({ ...base, left: 0, width: 800 })!.visible).toEqual({ from: 0, to: 0 });
    const edge = GROUP_COLS * 100 - 300;
    expect(groupWindow({ ...base, left: edge, width: 800 })!.visible).toEqual({ from: 0, to: 1 });
  });

  it("el margen suma grupos vecinos sin pasarse", () => {
    const window = groupWindow({ ...base, left: GROUP_COLS * 100 + 100, width: 800, margin: 1600, keep: 99_999 })!;
    expect(window.visible).toEqual({ from: 1, to: 1 });
    expect(window.wanted).toEqual({ from: 0, to: 1 });
    expect(window.kept).toEqual({ from: 0, to: groupCount(100) - 1 });
  });

  it("scroll mas alla del final queda en el ultimo grupo", () => {
    const last = groupCount(100) - 1;
    expect(groupWindow({ ...base, left: 999_999, width: 800 })!.visible).toEqual({ from: last, to: last });
  });
});
