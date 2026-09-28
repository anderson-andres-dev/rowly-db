import { get } from "svelte/store";
import { describe, expect, it } from "vitest";
import { forgetPinnedTables, isPinned, pinnedTables, togglePinnedTable } from "./pinnedTables";

describe("pinnedTables", () => {
  it("fija y desfija por conexion, en el orden en que se fijaron", () => {
    togglePinnedTable("p1", "core", "b");
    togglePinnedTable("p1", "core", "a");
    togglePinnedTable("p2", "core", "a");
    expect(get(pinnedTables).p1).toEqual([
      { schema: "core", name: "b" },
      { schema: "core", name: "a" },
    ]);
    togglePinnedTable("p1", "core", "b");
    expect(get(pinnedTables).p1).toEqual([{ schema: "core", name: "a" }]);
    expect(isPinned(get(pinnedTables).p2, "core", "a")).toBe(true);
    expect(isPinned(get(pinnedTables).p2, "otro", "a")).toBe(false);
  });

  it("olvida las fijadas de una conexion eliminada", () => {
    togglePinnedTable("p3", "s", "t");
    forgetPinnedTables("p3");
    expect(get(pinnedTables).p3).toBeUndefined();
  });
});
