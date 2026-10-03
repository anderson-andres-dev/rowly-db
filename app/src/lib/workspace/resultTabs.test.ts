import { describe, expect, it } from "vitest";
import { get } from "svelte/store";
import { addResultTab, pinnedResults, resultKey } from "$lib/stores/pinnedResults";
import { executionForConsole, finishQueryExecution, queryConsoles } from "$lib/stores/queryConsoles";
import type { QueryExecutionResult } from "$lib/types";
import {
  OUTPUT_TAB,
  createResultTabActions,
  firstFromTable,
  orderTabs,
  pinnedIdOf,
  replaceTabKey,
  visibleTab,
} from "./resultTabs";

const tab = (key: string) => ({ key });

describe("visibleTab", () => {
  it("keeps the chosen tab while it exists", () => {
    expect(visibleTab("c1", "c1#pin1", () => true, true)).toBe("c1#pin1");
  });

  it("falls back to the live result, then to the output, when the chosen tab is gone", () => {
    expect(visibleTab("c1", "c1#pin1", () => false, true)).toBe("c1");
    expect(visibleTab("c1", "c1#pin1", () => false, false)).toBe(OUTPUT_TAB);
    expect(visibleTab("c1", undefined, () => true, false)).toBe(OUTPUT_TAB);
  });
});

describe("orderTabs", () => {
  it("keeps the natural order without a user order", () => {
    const tabs = [tab("c1#pin1"), tab("c1#pin2"), tab("c1")];
    expect(orderTabs(tabs, undefined)).toBe(tabs);
  });

  it("follows the user's order and appends unknown tabs keeping their relative order", () => {
    const tabs = [tab("c1#pin1"), tab("c1#pin2"), tab("c1#pin3"), tab("c1")];
    expect(orderTabs(tabs, ["c1", "c1#pin2"]).map((t) => t.key)).toEqual(["c1", "c1#pin2", "c1#pin1", "c1#pin3"]);
  });
});

describe("replaceTabKey", () => {
  it("pinning keeps the tab in the same position", () => {
    expect(replaceTabKey(["c1#pin1", "c1", "c1#pin2"], [], "c1", "c1#pin3")).toEqual(["c1#pin1", "c1#pin3", "c1#pin2"]);
  });

  it("starts from the visible order when the user never reordered", () => {
    expect(replaceTabKey(undefined, ["c1#pin1", "c1"], "c1", "c1#pin2")).toEqual(["c1#pin1", "c1#pin2"]);
  });

  it("appends a key that was not in the order", () => {
    expect(replaceTabKey(["c1#pin1"], [], "c1", "c1#pin2")).toEqual(["c1#pin1", "c1#pin2"]);
  });

  it("does not mutate the stored order", () => {
    const order = ["c1"];
    replaceTabKey(order, [], "c1", "c1#pin1");
    expect(order).toEqual(["c1"]);
  });
});

describe("firstFromTable", () => {
  it("reads schema and table without quotes", () => {
    expect(firstFromTable("SELECT * FROM `core`.`users` u")).toEqual({ schema: "core", table: "users" });
    expect(firstFromTable('select 1 from "Orders" where x')).toEqual({ table: "Orders" });
  });

  it("returns nothing without FROM", () => {
    expect(firstFromTable("SELECT 1")).toBeUndefined();
  });
});

describe("createResultTabActions", () => {
  const ROWS = { type: "resultSet", columns: [], rows: [], truncated: false, executionTimeMs: 1 } as unknown as QueryExecutionResult;
  let counter = 0;

  function fixture(discard = true) {
    const consoleId = `tabs-${++counter}`;
    const selected: string[] = [];
    const moved: [string, string][] = [];
    const actions = createResultTabActions({
      selectTab: (_id, key) => selected.push(key),
      keepPosition: (_id, from, to) => moved.push([from, to]),
      confirmDiscard: async () => discard,
    });
    const state = (key: string) => executionForConsole(get(queryConsoles), key);
    return { consoleId, actions, selected, moved, state, tabs: () => get(pinnedResults)[consoleId] ?? [] };
  }

  it("pinning moves the normal tab, with its state, to a pinned key in the same place", () => {
    const tabs = fixture();
    finishQueryExecution(tabs.consoleId, "SELECT 1", ROWS);
    tabs.actions.pin(tabs.consoleId);
    const key = resultKey(tabs.consoleId, tabs.tabs()[0].id);
    expect(tabs.state(key).resultSql).toBe("SELECT 1");
    expect(tabs.state(tabs.consoleId).result).toBeNull();
    expect(tabs.moved).toEqual([[tabs.consoleId, key]]);
    expect(tabs.selected).toEqual([key]);
    expect(pinnedIdOf(key)).toBe(tabs.tabs()[0].id);
    expect(pinnedIdOf(tabs.consoleId)).toBeNull();
  });

  it("unpinning without a normal tab makes it the normal one again; with one, it only stops being pinned", () => {
    const alone = fixture();
    finishQueryExecution(alone.consoleId, "SELECT 1", ROWS);
    alone.actions.pin(alone.consoleId);
    const key = resultKey(alone.consoleId, alone.tabs()[0].id);
    alone.actions.unpin(key);
    expect(alone.state(alone.consoleId).resultSql).toBe("SELECT 1");
    expect(alone.tabs()).toEqual([]);

    const beside = fixture();
    finishQueryExecution(beside.consoleId, "SELECT 1", ROWS);
    beside.actions.pin(beside.consoleId);
    finishQueryExecution(beside.consoleId, "SELECT 2", ROWS);
    const pinned = resultKey(beside.consoleId, beside.tabs()[0].id);
    beside.actions.unpin(pinned);
    expect(beside.tabs()).toEqual([{ id: beside.tabs()[0].id, pinned: false }]);
    expect(beside.actions.replaceableKeys(beside.consoleId)).toEqual([beside.consoleId, pinned]);
    beside.actions.dropUnpinned(beside.consoleId);
    expect(beside.tabs()).toEqual([]);
    expect(beside.state(pinned).result).toBeNull();
  });

  it("closing the normal tab empties it; a pinned one disappears; with pending edits kept, nothing closes", async () => {
    const tabs = fixture();
    finishQueryExecution(tabs.consoleId, "SELECT 1", ROWS);
    const pinned = resultKey(tabs.consoleId, addResultTab(tabs.consoleId, true));
    finishQueryExecution(pinned, "SELECT 2", ROWS);
    await tabs.actions.close(tabs.consoleId);
    await tabs.actions.close(pinned);
    expect(tabs.state(tabs.consoleId).result).toBeNull();
    expect(tabs.tabs()).toEqual([]);

    const kept = fixture(false);
    finishQueryExecution(kept.consoleId, "SELECT 1", ROWS);
    await kept.actions.close(kept.consoleId);
    expect(kept.state(kept.consoleId).resultSql).toBe("SELECT 1");
  });

  it("closing the console forgets its pinned tabs and their state", () => {
    const tabs = fixture();
    const pinned = resultKey(tabs.consoleId, addResultTab(tabs.consoleId, true));
    finishQueryExecution(pinned, "SELECT 2", ROWS);
    tabs.actions.forgetConsole(tabs.consoleId);
    expect(tabs.tabs()).toEqual([]);
    expect(tabs.state(pinned).result).toBeNull();
  });
});
