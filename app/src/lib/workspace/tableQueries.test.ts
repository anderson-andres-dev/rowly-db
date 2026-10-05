import { describe, expect, it } from "vitest";
import { ENGINES } from "$lib/engines";
import { quoteIdentifier } from "$lib/results/filterBuilder";
import type { CatalogTable, QueryExecutionResult } from "$lib/types";
import { filterColumns, oneQueryAtATime, tableSql } from "./tableQueries";

describe("tableSql", () => {
  it("quotes schema and table with the engine's rules and adds the WHERE", () => {
    const quote = (name: string) => quoteIdentifier(name, ENGINES.postgres);
    expect(tableSql({ schema: "public", name: "Order", where: "  id > 1 " }, quote)).toBe(
      'SELECT * FROM public."Order" WHERE id > 1',
    );
  });

  it("omits an empty WHERE", () => {
    const quote = (name: string) => quoteIdentifier(name, ENGINES.mysql);
    expect(tableSql({ schema: "core", name: "fecha alta", where: " " }, quote)).toBe("SELECT * FROM core.`fecha alta`");
  });
});

describe("filterColumns", () => {
  const catalog: CatalogTable[] = [
    {
      schema: "core",
      name: "users",
      columns: [{ name: "id", dataType: "int", nullable: false, isPrimaryKey: true }],
      foreignKeys: [],
    },
  ];
  const result = {
    type: "resultSet",
    columns: [{ name: "x", type: "text" }],
    rows: [],
    rowCount: 0,
    executionTimeMs: 0,
  } as unknown as QueryExecutionResult;

  it("prefers the catalog, which knows each column type", () => {
    expect(filterColumns({ schema: "core", name: "users" }, catalog, result)).toEqual([{ name: "id", dataType: "int" }]);
  });

  it("falls back to the result columns, and to nothing without a result", () => {
    expect(filterColumns({ schema: "core", name: "other" }, catalog, result)).toEqual([{ name: "x", dataType: "text" }]);
    expect(filterColumns({ schema: "core", name: "other" }, catalog, null)).toEqual([]);
  });
});

describe("oneQueryAtATime", () => {
  it("never runs two queries for the same tab and folds the requests made meanwhile into one more run", async () => {
    let active = 0;
    let maxActive = 0;
    const runs: string[] = [];
    const releases: (() => void)[] = [];
    const request = oneQueryAtATime(async (id) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      runs.push(id);
      await new Promise<void>((resolve) => releases.push(resolve));
      active -= 1;
    });

    const first = request("t1");
    void request("t1");
    void request("t1");
    expect(runs).toEqual(["t1"]);
    releases.shift()!();
    await first;
    await Promise.resolve();
    expect(runs).toEqual(["t1", "t1"]);
    releases.shift()!();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(runs).toEqual(["t1", "t1"]);
    expect(maxActive).toBe(1);
  });

  it("runs different tabs independently", async () => {
    const runs: string[] = [];
    const request = oneQueryAtATime(async (id) => {
      runs.push(id);
    });
    await Promise.all([request("a"), request("b")]);
    expect(runs).toEqual(["a", "b"]);
  });
});
