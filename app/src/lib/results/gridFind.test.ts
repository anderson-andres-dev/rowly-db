import { describe, expect, it } from "vitest";
import { EMPTY_EDITS } from "./resultEditing";
import { MAX_MATCHES, findInPage } from "./gridFind";

const rows = [
  ["1", "Carmelo-Cedeño", null],
  ["2", "carlos lopez", "cedeño"],
  ["3", "Pedro", "x.y"],
];
const base = { matchCase: false, regex: false, wholeWord: false };

describe("findInPage", () => {
  it("sin distinguir mayusculas, en orden de lectura y sin mirar NULL", () => {
    expect(findInPage(rows, 3, EMPTY_EDITS, "cedeño", base).matches).toEqual([
      { row: 0, col: 1 },
      { row: 1, col: 2 },
    ]);
  });

  it("respeta mayusculas, palabra completa (Unicode) y regex", () => {
    expect(findInPage(rows, 3, EMPTY_EDITS, "Car", { ...base, matchCase: true }).matches).toEqual([{ row: 0, col: 1 }]);
    expect(findInPage(rows, 3, EMPTY_EDITS, "cede", { ...base, wholeWord: true }).matches).toEqual([]);
    expect(findInPage(rows, 3, EMPTY_EDITS, "cedeño", { ...base, wholeWord: true }).matches).toHaveLength(2);
    expect(findInPage(rows, 3, EMPTY_EDITS, "^c.r", { ...base, regex: true }).matches).toEqual([
      { row: 0, col: 1 },
      { row: 1, col: 1 },
    ]);
    // Sin regex, el punto es literal.
    expect(findInPage(rows, 3, EMPTY_EDITS, "x.y", base).matches).toEqual([{ row: 2, col: 2 }]);
    expect(findInPage(rows, 3, EMPTY_EDITS, "(", { ...base, regex: true }).error).not.toBeNull();
  });

  it("busca en los cambios pendientes y en las filas nuevas", () => {
    const edits = {
      updates: new Map([[2, new Map([[1, { kind: "text" as const, value: "Zeta" }]])]]),
      deleted: new Set<number>(),
      inserted: [[{ kind: "null" as const }, { kind: "text" as const, value: "zeta nueva" }, { kind: "null" as const }]],
    };
    expect(findInPage(rows, 3, edits, "zeta", base).matches).toEqual([
      { row: 2, col: 1 },
      { row: 3, col: 1 },
    ]);
  });

  it("corta en el tope de coincidencias", () => {
    const many = Array.from({ length: MAX_MATCHES + 10 }, () => ["a"]);
    const result = findInPage(many, 1, EMPTY_EDITS, "a", base);
    expect(result.capped).toBe(true);
    expect(result.matches).toHaveLength(MAX_MATCHES);
  });
});
