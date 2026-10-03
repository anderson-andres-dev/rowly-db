import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { MySQL } from "@codemirror/lang-sql";
import { uppercaseKeywordEdit } from "./behavior";

function editFor(doc: string, text = " ") {
  const state = EditorState.create({ doc, extensions: [MySQL.language] });
  return uppercaseKeywordEdit(state, doc.length, doc.length, text);
}

describe("uppercaseKeywordEdit", () => {
  it("uppercases a recognized SQL keyword when its word ends", () => {
    expect(editFor("select")).toEqual({ from: 0, to: 6, insert: "SELECT ", cursor: 7 });
    expect(editFor("select", "*")).toEqual({ from: 0, to: 6, insert: "SELECT*", cursor: 7 });
  });

  it("does not alter identifiers", () => {
    expect(editFor("customers")).toBeNull();
  });

  it("does not alter keywords inside comments or strings", () => {
    expect(editFor("-- select")).toBeNull();
    expect(editFor("'select")).toBeNull();
  });

  it("does not intercept keywords that are already uppercase", () => {
    expect(editFor("SELECT")).toBeNull();
  });
});
