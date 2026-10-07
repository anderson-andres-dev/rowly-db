import { describe, expect, it } from "vitest";
import {
  dividers,
  dropSide,
  leaf,
  leaves,
  neighbor,
  parseMosaic,
  place,
  prune,
  rects,
  remove,
  replace,
  reveal,
  setRatio,
  siblingOf,
  type Mosaic,
} from "./mosaic";

//   ┌───┬───┐
//   │ a │ b │
//   │   ├───┤
//   │   │ c │
//   └───┴───┘
const abc = (): Mosaic => place(place(leaf("a"), "a", "b", "right"), "b", "c", "bottom");

describe("mosaico: poner y sacar", () => {
  it("partir a la derecha y abajo arma el arbol como i3", () => {
    const tree = abc();
    expect(leaves(tree)).toEqual(["a", "b", "c"]);
    const boxes = rects(tree);
    expect(boxes.get("a")).toEqual({ x: 0, y: 0, width: 0.5, height: 1 });
    expect(boxes.get("b")).toEqual({ x: 0.5, y: 0, width: 0.5, height: 0.5 });
    expect(boxes.get("c")).toEqual({ x: 0.5, y: 0.5, width: 0.5, height: 0.5 });
  });

  it("izquierda y arriba ponen la nueva antes", () => {
    expect(leaves(place(leaf("a"), "a", "b", "left"))).toEqual(["b", "a"]);
    expect(leaves(place(leaf("a"), "a", "b", "top"))).toEqual(["b", "a"]);
  });

  it("poner una que ya esta la mueve: nunca queda dos veces", () => {
    const tree = place(abc(), "a", "c", "bottom");
    expect(leaves(tree)).toEqual(["a", "c", "b"]);
    expect(rects(tree).get("b")).toEqual({ x: 0.5, y: 0, width: 0.5, height: 1 });
  });

  it("poner junto a si misma no cambia nada", () => {
    const tree = abc();
    expect(place(tree, "b", "b", "left")).toBe(tree);
  });

  it("sin la hoja de destino, parte la raiz; sin mosaico, queda sola", () => {
    expect(leaves(place(abc(), "zz", "d", "right"))).toEqual(["a", "b", "c", "d"]);
    expect(place(null, "a", "b", "right")).toEqual(leaf("b"));
  });

  it("sacar una hoja deja que su hermana ocupe el lugar", () => {
    const tree = remove(abc(), "b");
    expect(leaves(tree)).toEqual(["a", "c"]);
    expect(rects(tree).get("c")).toEqual({ x: 0.5, y: 0, width: 0.5, height: 1 });
    expect(remove(remove(tree, "a"), "c")).toBeNull();
    expect(remove(tree, "zz")).toBe(tree);
  });

  it("la hermana de la que se saca es la que se enfoca", () => {
    expect(siblingOf(abc(), "a")).toBe("b");
    expect(siblingOf(abc(), "c")).toBe("b");
    expect(siblingOf(abc(), "b")).toBe("c");
    expect(siblingOf(leaf("a"), "a")).toBeNull();
  });

  it("reemplazar muestra otra en esa hoja; si ya estaba en otra, se intercambian", () => {
    expect(leaves(replace(abc(), "b", "d"))).toEqual(["a", "d", "c"]);
    expect(leaves(replace(abc(), "a", "c"))).toEqual(["c", "b", "a"]);
    expect(replace(null, "a", "d")).toEqual(leaf("d"));
  });

  it("revelar una que no se ve la pone en la hoja enfocada", () => {
    expect(leaves(reveal(abc(), "d", "c"))).toEqual(["a", "b", "d"]);
    expect(leaves(reveal(abc(), "d", "zz"))).toEqual(["d", "b", "c"]);
    const tree = abc();
    expect(reveal(tree, "b", "c")).toBe(tree);
    expect(reveal(null, "d", null)).toEqual(leaf("d"));
  });

  it("podar quita las que ya no existen", () => {
    expect(leaves(prune(abc(), (id) => id !== "b"))).toEqual(["a", "c"]);
    expect(prune(abc(), () => false)).toBeNull();
  });
});

describe("mosaico: tamaños", () => {
  it("cada nodo interno es un divisor, con su camino", () => {
    const list = dividers(abc());
    expect(list.map((divider) => [divider.path, divider.axis])).toEqual([
      ["", "row"],
      ["1", "column"],
    ]);
    expect(list[1].area).toEqual({ x: 0.5, y: 0, width: 0.5, height: 1 });
  });

  it("mover un divisor cambia su fraccion, acotada", () => {
    const tree = setRatio(abc(), "", 0.7);
    expect(rects(tree).get("a")?.width).toBeCloseTo(0.7);
    expect(rects(setRatio(abc(), "1", 0.99)).get("b")?.height).toBeCloseTo(0.9);
    expect(rects(setRatio(abc(), "", 0)).get("a")?.width).toBeCloseTo(0.1);
    const same = abc();
    expect(setRatio(same, "0", 0.3)).toBe(same);
  });
});

describe("mosaico: vecinos con el teclado", () => {
  it("por geometria, como i3", () => {
    const tree = abc();
    expect(neighbor(tree, "a", "right")).toBe("b");
    expect(neighbor(tree, "b", "bottom")).toBe("c");
    expect(neighbor(tree, "c", "top")).toBe("b");
    expect(neighbor(tree, "c", "left")).toBe("a");
    expect(neighbor(tree, "a", "left")).toBeNull();
    expect(neighbor(tree, "a", "top")).toBeNull();
  });

  it("entre dos que se solapan igual, la mas cercana al centro", () => {
    // a a la izquierda, a toda la altura; b y c a la derecha, mitad cada una.
    const tree = setRatio(abc(), "1", 0.7);
    expect(neighbor(tree, "a", "right")).toBe("b");
  });
});

describe("mosaico: soltar y guardar", () => {
  it("cerca de un borde, ese lado; en el centro, la hoja", () => {
    expect(dropSide(0.1, 0.5)).toBe("left");
    expect(dropSide(0.95, 0.5)).toBe("right");
    expect(dropSide(0.5, 0.05)).toBe("top");
    expect(dropSide(0.5, 0.9)).toBe("bottom");
    expect(dropSide(0.5, 0.5)).toBe("center");
  });

  it("lee lo guardado solo si esta bien formado", () => {
    const tree = abc();
    expect(parseMosaic(JSON.parse(JSON.stringify(tree)))).toEqual(tree);
    expect(parseMosaic(null)).toBeNull();
    expect(parseMosaic({ kind: "split", axis: "row", ratio: 2, first: leaf("a"), second: leaf("b") })).toBeNull();
    expect(parseMosaic({ kind: "split", axis: "row", ratio: 0.5, first: leaf("a"), second: leaf("a") })).toBeNull();
    expect(parseMosaic({ kind: "leaf", id: 3 })).toBeNull();
  });
});
