import { describe, expect, it } from "vitest";
import {
  filterHistory,
  groupHistoryByDay,
  MAX_HISTORY_CHARS,
  MAX_HISTORY_ENTRIES,
  MAX_HISTORY_SQL_LENGTH,
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

  it("no pasa del presupuesto de caracteres: salen las mas viejas", () => {
    // Consultas largas (pero admitidas): muchas menos que el maximo de
    // entradas ya llenan el presupuesto.
    const long = (index: number) => entry(`SELECT ${index} ${"x".repeat(MAX_HISTORY_SQL_LENGTH - 20)}`);
    let history: HistoryEntry[] = [];
    for (let index = 0; index < 200; index++) history = withHistoryEntry(history, long(index));
    const chars = history.reduce((total, item) => total + item.sql.length, 0);
    expect(chars).toBeLessThanOrEqual(MAX_HISTORY_CHARS);
    expect(history.length).toBeLessThan(MAX_HISTORY_ENTRIES);
    // Quedan las mas recientes, en orden.
    expect(history[0].sql.startsWith("SELECT 199 ")).toBe(true);
    expect(history[1].sql.startsWith("SELECT 198 ")).toBe(true);
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
