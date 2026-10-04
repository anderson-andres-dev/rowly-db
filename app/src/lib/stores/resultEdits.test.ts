import { describe, expect, it } from "vitest";
import { get } from "svelte/store";
import { EMPTY_EDITS, type PendingEdits } from "$lib/results/resultEditing";
import {
  clearResultPendingEdits,
  commitResultEdits,
  editStateFor,
  resetResultEdits,
  resultEdits,
  undoResultEdit,
} from "./resultEdits";

const edited = (row: number): PendingEdits => ({
  updates: new Map([[row, new Map([[0, { kind: "text", value: "x" }]])]]),
  deleted: new Set(),
  inserted: [],
});
const at = (row: number) => ({ minRow: row, maxRow: row, minCol: 0, maxCol: 0 });

describe("resultEdits: historial", () => {
  it("deshace paso a paso y devuelve donde ocurrio cada cambio", () => {
    resetResultEdits("c1", "SELECT * FROM t");
    const first = edited(1);
    const second = edited(2);
    commitResultEdits("c1", first, at(1));
    commitResultEdits("c1", second, at(2));

    expect(undoResultEdit("c1")?.at).toEqual(at(2));
    expect(editStateFor(get(resultEdits), "c1").edits).toBe(first);
    expect(undoResultEdit("c1")?.at).toEqual(at(1));
    expect(editStateFor(get(resultEdits), "c1").edits).toBe(EMPTY_EDITS);
    expect(undoResultEdit("c1")).toBeNull();
  });

  it("descartar, aplicar o un resultado nuevo vacian el historial", () => {
    resetResultEdits("c2", "SELECT * FROM t");
    commitResultEdits("c2", edited(1), at(1));
    clearResultPendingEdits("c2");
    expect(editStateFor(get(resultEdits), "c2").history).toEqual([]);

    commitResultEdits("c2", edited(1), at(1));
    resetResultEdits("c2", "SELECT * FROM t");
    expect(editStateFor(get(resultEdits), "c2").history).toEqual([]);
  });
});
