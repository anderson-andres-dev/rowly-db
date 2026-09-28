import { describe, expect, it } from "vitest";
import {
  filterHistory,
  groupHistoryByDay,
  MAX_HISTORY_ENTRIES,
  withHistoryEntry,
  type HistoryEntry,
} from "./queryHistory";

function entry(sql: string, at = 0, id = sql): HistoryEntry {
  return { id, sql, at, durationMs: 5, outcome: "ok" };
}

describe("withHistoryEntry", () => {
  it("pone la mas reciente primero", () => {
    const history = withHistoryEntry([entry("SELECT 1")], entry("SELECT 2"));
    expect(history.map((item) => item.sql)).toEqual(["SELECT 2", "SELECT 1"]);
  });

  it("una repeticion seguida actualiza la ultima en vez de agregar otra", () => {
    const history = withHistoryEntry([entry("SELECT 1", 1)], { ...entry(" SELECT 1 ", 2, "b"), outcome: "error" });
    expect(history).toEqual([{ id: "b", sql: "SELECT 1", at: 2, durationMs: 5, outcome: "error" }]);
  });

  it("no pasa del maximo y descarta lo vacio", () => {
    const full = Array.from({ length: MAX_HISTORY_ENTRIES }, (_, index) => entry(`SELECT ${index}`));
    expect(withHistoryEntry(full, entry("SELECT x"))).toHaveLength(MAX_HISTORY_ENTRIES);
    const same = [entry("SELECT 1")];
    expect(withHistoryEntry(same, entry("   "))).toBe(same);
  });
});

describe("filterHistory", () => {
  it("exige todas las palabras, en cualquier orden y sin distinguir mayusculas", () => {
    const history = [entry("SELECT * FROM pedidos"), entry("select nombre from clientes")];
    expect(filterHistory(history, "FROM clientes").map((item) => item.sql)).toEqual(["select nombre from clientes"]);
    expect(filterHistory(history, "pedidos select")).toHaveLength(1);
    expect(filterHistory(history, "  ")).toBe(history);
  });
});

describe("groupHistoryByDay", () => {
  it("agrupa en hoy, ayer y el resto por dia", () => {
    const now = new Date(2026, 8, 27, 15, 0).getTime();
    const history = [
      entry("a", new Date(2026, 8, 27, 9, 0).getTime()),
      entry("b", new Date(2026, 8, 26, 23, 0).getTime()),
      entry("c", new Date(2026, 8, 20, 10, 0).getTime()),
      entry("d", new Date(2026, 8, 20, 8, 0).getTime()),
    ];
    expect(groupHistoryByDay(history, now).map((group) => [group.day, group.entries.length])).toEqual([
      ["today", 1],
      ["yesterday", 1],
      [new Date(2026, 8, 20).getTime(), 2],
    ]);
  });
});
