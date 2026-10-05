// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { ENGINES } from "$lib/engines";
import { executionMarkerField, executionMarker } from "$lib/editor/executionMarker";
import { sqlLexical, statementIndex, statementIndexComplete, statementIndexStep } from "$lib/editor/statementIndex";
import { createEditorCommands, currentSqlRange, executionRequest, mappedCursorOffset } from "./commands";

let view: EditorView | undefined;
afterEach(() => view?.destroy());

const lexical = ENGINES.mysql.lexical;

type Selection = EditorSelection | { anchor: number; head?: number };

function state(doc: string, selection: Selection) {
  let current = EditorState.create({ doc, selection, extensions: [statementIndex, sqlLexical.of(lexical), executionMarker] });
  while (!statementIndexComplete(current)) current = current.update({ effects: statementIndexStep() }).state;
  return current;
}

describe("currentSqlRange", () => {
  it("is the selection when there is one, else the statement under the cursor, never the whole document", () => {
    const doc = "SELECT 1;\nSELECT 2;";
    expect(currentSqlRange(state(doc, EditorSelection.single(0, 6)))).toEqual({ from: 0, to: 6, selected: true });
    const near = currentSqlRange(state(doc, EditorSelection.cursor(12)));
    expect(near?.selected).toBe(false);
    expect(doc.slice(near!.from, near!.to)).toContain("SELECT 2");
    expect(currentSqlRange(state("   ", EditorSelection.cursor(1)))).toBeNull();
  });
});

describe("mappedCursorOffset", () => {
  it("keeps the cursor after the same characters once formatted", () => {
    expect(mappedCursorOffset("select a,b", 9, "SELECT\n  a,\n  b")).toBe(11);
    expect(mappedCursorOffset("  select", 1, "SELECT")).toBe(0);
    expect(mappedCursorOffset("select a", 8, "SELECT a")).toBe(8);
  });
});

describe("executionRequest", () => {
  it("one statement: its text without surrounding spaces and a single marker", () => {
    const current = state("  SELECT 1  ", EditorSelection.cursor(0));
    const request = executionRequest(current, { from: 0, to: 12 }, lexical)!;
    expect(request.sql).toBe("SELECT 1");
    const marker = current.update({ effects: request.effects }).state.field(executionMarkerField);
    expect([marker?.from, marker?.to, marker?.parts]).toEqual([2, 10, null]);
  });

  it("several statements: one part per statement, for the script", () => {
    const doc = "SELECT 1; SELECT 2";
    const current = state(doc, EditorSelection.cursor(0));
    const request = executionRequest(current, { from: 0, to: doc.length }, lexical)!;
    const marker = current.update({ effects: request.effects }).state.field(executionMarkerField);
    expect(marker?.parts?.size).toBe(2);
  });

  it("nothing to run in blank text or a lone comment", () => {
    const current = state("  -- nota\n", EditorSelection.cursor(0));
    expect(executionRequest(current, { from: 0, to: 2 }, lexical)).toBeNull();
    expect(executionRequest(current, { from: 0, to: 10 }, lexical)).toBeNull();
  });
});

describe("createEditorCommands", () => {
  function mounted(doc: string, selection: Selection, read = "") {
    view = new EditorView({ state: state(doc, selection), parent: document.body });
    const written: string[] = [];
    const commands = createEditorCommands({
      view: () => view,
      engine: () => ENGINES.mysql,
      formatSettings: () => ({ formatterLineWidth: 60, formatterAlignColumns: false, indentStyle: "spaces", indentSize: 2 }),
      text: (key) => key,
      notifyError: () => {},
      writeClipboard: async (text) => {
        written.push(text);
        return true;
      },
      readClipboard: async () => read,
    });
    return { commands, written };
  }

  it("cut copies the selection and removes it; copy leaves it", async () => {
    const { commands, written } = mounted("SELECT 1", EditorSelection.single(0, 6));
    await commands.copy();
    expect(view!.state.doc.toString()).toBe("SELECT 1");
    await commands.cut();
    expect(written).toEqual(["SELECT", "SELECT"]);
    expect(view!.state.doc.toString()).toBe(" 1");
  });

  it("paste goes through the same filter as Ctrl+V", async () => {
    const { commands } = mounted("", EditorSelection.cursor(0), "SELECT 1");
    await commands.paste();
    expect(view!.state.doc.toString()).toBe("SELECT 1");
  });

  it("execute marks what it sends and returns its text", () => {
    const { commands } = mounted("SELECT 1", EditorSelection.cursor(0));
    expect(commands.execute({ from: 0, to: 8 })).toBe("SELECT 1");
    expect(view!.state.field(executionMarkerField)?.status).toBe("pending");
  });
});
