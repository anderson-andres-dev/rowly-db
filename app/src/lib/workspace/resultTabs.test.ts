import { describe, expect, it } from "vitest";
import { OUTPUT_TAB, firstFromTable, orderTabs, replaceTabKey, visibleTab } from "./resultTabs";

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
