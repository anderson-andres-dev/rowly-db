// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { basicSetup, EditorView } from "codemirror";
import { sql } from "@codemirror/lang-sql";
import { autocompletion, completionStatus, startCompletion } from "@codemirror/autocomplete";
import { insertNewlineAndIndent } from "@codemirror/commands";
import { indentUnit } from "@codemirror/language";
import { Compartment, EditorSelection } from "@codemirror/state";
import { backspaceIndent, buildTabCompletionKeymap, indentationExtension, tabCompletionBinding } from "./sqlIndentation";

let views: EditorView[] = [];
afterEach(() => {
  for (const view of views) view.destroy();
  views = [];
  document.body.replaceChildren();
});

function editor(text: string, navigates: boolean, style: "spaces" | "tabs" = "spaces", size: 2 | 4 | 8 = 2, from = 0) {
  const indent = new Compartment();
  const parent = document.createElement("div");
  document.body.append(parent);
  const view = new EditorView({
    doc: text,
    parent,
    extensions: [basicSetup, sql(), autocompletion({ override: [() => ({ from, options: [
      { label: "SELECT" }, { label: "SET" },
    ] })] }), indent.of(indentationExtension(style, size)), buildTabCompletionKeymap(navigates)],
  });
  views.push(view);
  return { view, indent, tab: tabCompletionBinding(navigates) };
}

async function popup(view: EditorView) {
  startCompletion(view);
  for (let i = 0; i < 20 && completionStatus(view.state) !== "active"; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  expect(completionStatus(view.state)).toBe("active");
  await new Promise((resolve) => setTimeout(resolve, 90));
}

describe("Tab en el editor SQL", () => {
  for (const size of [2, 4, 8] as const) {
    it(`inserta ${size} espacios y usa ese ancho para tabs existentes`, () => {
      const { view, tab } = editor("\tx", false, "spaces", size);
      view.dispatch({ selection: EditorSelection.cursor(2) });
      tab.run!(view);
      expect(view.state.doc.toString()).toBe(`\tx${" ".repeat(size)}`);
      expect(view.state.tabSize).toBe(size);
    });
  }

  for (const navigates of [true, false]) {
    for (const style of ["spaces", "tabs"] as const) {
      const unit = style === "tabs" ? "\t" : "  ";
      it(`sin popup, ${navigates}, ${style}: cursor y seleccion`, () => {
        const { view, tab } = editor("a\nb\nc", navigates, style);
        view.dispatch({ selection: EditorSelection.cursor(1) });
        tab.run!(view);
        expect(view.state.doc.toString()).toBe(`a${unit}\nb\nc`);
        view.dispatch({ selection: EditorSelection.range(0, 5) });
        tab.run!(view);
        expect(view.state.doc.toString()).toBe(`${unit}a${unit}\n${unit}b\nc`);
        tab.shift!(view);
        expect(view.state.doc.toString()).toBe(`a${unit}\nb\nc`);
        view.dispatch({ selection: EditorSelection.range(0, 1) });
        tab.run!(view);
        expect(view.state.doc.toString()).toBe(`${unit}a${unit}\nb\nc`);
        tab.shift!(view);
        expect(view.state.doc.toString()).toBe(`a${unit}\nb\nc`);
        const current = editor(`${unit}z`, navigates, style);
        current.view.dispatch({ selection: EditorSelection.cursor(unit.length + 1) });
        current.tab.shift!(current.view);
        expect(current.view.state.doc.toString()).toBe("z");
      });

      for (const selection of ["empty", "line", "multi"] as const) {
        it(`con popup, ${navigates}, ${style}, ${selection}: conserva la sugerencia`, async () => {
          const { view, tab } = editor("S\nT", navigates, style);
          view.dispatch({ selection: selection === "empty" ? EditorSelection.cursor(1) :
            selection === "line" ? EditorSelection.range(0, 1) : EditorSelection.range(0, 3) });
          await popup(view);
          tab.run!(view);
          if (navigates) {
            expect(view.state.doc.toString()).toBe("S\nT");
            tab.shift!(view);
            expect(view.state.doc.toString()).toBe("S\nT");
          } else {
            expect(view.state.doc.toString()).toMatch(selection === "multi" ? /^(SELECT|SET)$/ : /^(SELECT|SET)\nT$/);
          }
        });
      }
    }
  }

  for (const style of ["spaces", "tabs"] as const) {
    it(`Shift+Tab con popup y navegacion apagada des-sangra ${style}`, async () => {
      const unit = style === "tabs" ? "\t" : "  ";
      const { view, tab } = editor(`${unit}S`, false, style, 2, unit.length);
      view.dispatch({ selection: EditorSelection.cursor(unit.length + 1) });
      await popup(view);
      expect(tab.shift!(view)).toBe(true);
      expect(view.state.doc.toString()).toBe("S");
    });
  }

  it("Backspace borra una unidad de espacios y el ajuste cambia en vivo", () => {
    const { view, indent, tab } = editor("    x", false);
    view.dispatch({ effects: indent.reconfigure(indentationExtension("spaces", 4)), selection: EditorSelection.cursor(4) });
    expect(view.state.facet(indentUnit)).toBe("    ");
    expect(view.state.tabSize).toBe(4);
    backspaceIndent(view);
    expect(view.state.doc.toString()).toBe("x");
    view.dispatch({ effects: indent.reconfigure(indentationExtension("tabs", 8)), selection: EditorSelection.cursor(0) });
    tab.run!(view);
    expect(view.state.doc.toString()).toBe("\tx");
    expect(view.state.tabSize).toBe(8);
  });

  it("Enter usa la sangria elegida", () => {
    for (const style of ["spaces", "tabs"] as const) {
      const { view } = editor("SELECT (", false, style, 4);
      view.dispatch({ selection: EditorSelection.cursor(view.state.doc.length) });
      insertNewlineAndIndent(view);
      expect(view.state.doc.toString()).toBe(`SELECT (\n${style === "tabs" ? "\t" : "    "}`);
    }
  });

  it("tras pegar SQL, Enter y Tab mantienen la unidad elegida", () => {
    for (const style of ["spaces", "tabs"] as const) {
      const { view, tab } = editor("", false, style, 4);
      const unit = style === "tabs" ? "\t" : "    ";
      view.dispatch({ changes: { from: 0, insert: `${unit}SELECT (` }, selection: EditorSelection.cursor(unit.length + 8), userEvent: "input.paste" });
      insertNewlineAndIndent(view);
      expect(view.state.doc.toString()).toBe(`${unit}SELECT (\n${unit}${unit}`);
      tab.run!(view);
      expect(view.state.doc.toString()).toBe(`${unit}SELECT (\n${unit}${unit}${unit}`);
    }
  });
});
