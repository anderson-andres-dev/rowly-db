import { describe, expect, it } from "vitest";
import { leaves, place, parseMosaic, rects } from "./mosaic";
import {
  choose,
  cornerGroup,
  emptyGroups,
  groupTabs,
  mergeGroup,
  moveTab,
  normalizeGroups,
  parseGroups,
  renameTab,
  type TabGroups,
} from "./tabGroups";

const KEYS = ["output", "a", "b", "c"];

// g0 | g1, con a y output en g0, b y c en g1.
function two(): TabGroups {
  const base = emptyGroups("g0");
  return normalizeGroups(
    {
      tree: place(base.tree, "g0", "g1", "right"),
      member: { output: "g0", a: "g0", b: "g1", c: "g1" },
      selected: { g0: "a", g1: "c" },
      focus: "g1",
    },
    KEYS,
  );
}

describe("grupos de pestañas", () => {
  it("las nuevas entran en el enfocado y cada grupo tiene una elegida", () => {
    const groups = normalizeGroups(emptyGroups("g0"), ["a", "b"]);
    expect(groupTabs(groups, "g0", ["a", "b"])).toEqual(["a", "b"]);
    expect(groups.selected.g0).toBe("b");
    const more = normalizeGroups(two(), [...KEYS, "d"]);
    expect(more.member.d).toBe("g1");
  });

  it("un grupo que se queda sin pestañas se va y el foco pasa a su hermano", () => {
    const groups = normalizeGroups(two(), ["output", "a"]);
    expect(leaves(groups.tree)).toEqual(["g0"]);
    expect(groups.focus).toBe("g0");
    expect(groups.selected).toEqual({ g0: "a" });
  });

  it("el ultimo grupo queda aunque no tenga pestañas", () => {
    const groups = normalizeGroups(emptyGroups("g0"), []);
    expect(leaves(groups.tree)).toEqual(["g0"]);
  });

  it("las fijas no entran en el mosaico: siempre en su esquina", () => {
    const pinned = { output: "left" as const };
    const moved = normalizeGroups(moveTab(two(), "output", "g1", KEYS), KEYS, pinned);
    expect(moved.member.output).toBe("g0");
    // Un grupo nuevo a la izquierda pasa a ser la esquina: la Salida va ahi.
    const wider = normalizeGroups({ ...two(), tree: place(two().tree, "g0", "g2", "left"), member: { ...two().member, b: "g2" } }, KEYS, pinned);
    expect(wider.member.output).toBe("g2");
  });

  it("la esquina es la de arriba", () => {
    const tree = place(place(emptyGroups("g0").tree, "g0", "g1", "right"), "g1", "g2", "bottom");
    expect(cornerGroup(tree, "left")).toBe("g0");
    expect(cornerGroup(tree, "right")).toBe("g1");
  });

  it("elegir una pestaña enfoca su grupo", () => {
    const groups = choose(two(), "a");
    expect(groups.focus).toBe("g0");
    expect(groups.selected.g0).toBe("a");
    const same = two();
    expect(choose(same, "c")).toBe(same);
  });

  it("mover una pestaña la deja elegida en su destino y otra elegida en el origen", () => {
    const groups = moveTab(two(), "c", "g0", KEYS);
    expect(groups.member.c).toBe("g0");
    expect(groups.selected).toEqual({ g0: "c", g1: "b" });
    expect(groups.focus).toBe("g0");
  });

  it("juntar un grupo con su hermano conserva la que se veia", () => {
    const groups = mergeGroup(two(), "g1")!;
    expect(leaves(groups.tree)).toEqual(["g0"]);
    expect(groupTabs(groups, "g0", KEYS)).toEqual(KEYS);
    expect(groups.selected.g0).toBe("c");
    expect(mergeGroup(groups, "g0")).toBeNull();
  });

  it("renombrar una pestaña la deja en su grupo y elegida", () => {
    const groups = renameTab(two(), "c", "c2");
    expect(groups.member.c2).toBe("g1");
    expect(groups.member.c).toBeUndefined();
    expect(groups.selected.g1).toBe("c2");
  });

  it("lee lo guardado con un arbol valido", () => {
    const stored = JSON.parse(JSON.stringify(two()));
    const groups = parseGroups(stored, parseMosaic)!;
    expect(rects(groups.tree)).toEqual(rects(two().tree));
    expect(groups.member).toEqual(two().member);
    expect(parseGroups({ tree: { kind: "x" } }, parseMosaic)).toBeNull();
    expect(parseGroups({ ...stored, focus: "zz" }, parseMosaic)!.focus).toBe("g0");
  });
});
