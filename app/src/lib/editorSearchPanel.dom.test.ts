// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { getSearchQuery, searchPanelOpen } from "@codemirror/search";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { editorSearch, openReplacePanel, toggleSearchPanel } from "./editorSearchPanel";

// El panel real montado en un EditorView real: lo que se ve (que filas
// existen, donde esta el foco, la pastilla de alcance) en cada caso.

const DOC = "select a\nfrom t\nwhere a = 1\n  and b = 1\n  and c = 1;";

let view: EditorView;

function mount(selection?: { anchor: number; head?: number }) {
  view = new EditorView({
    state: EditorState.create({ doc: DOC, selection, extensions: [editorSearch()] }),
    parent: document.body,
  });
  return view;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const panel = () => view.dom.querySelector<HTMLElement>(".kh-search-panel");
const findRow = () => view.dom.querySelector(".kh-search-find");
const replaceRow = () => view.dom.querySelector(".kh-search-replace");
const findArea = () => findRow()!.querySelector("textarea")!;
const replaceArea = () => replaceRow()!.querySelector("textarea")!;
const scopePill = () => view.dom.querySelector<HTMLButtonElement>(".kh-search-scope")!;

async function type(area: HTMLTextAreaElement, text: string) {
  area.value = text;
  area.dispatchEvent(new Event("input"));
  await flush();
}

function click(selector: string) {
  view.dom.querySelector<HTMLElement>(selector)!.click();
}

function key(target: HTMLElement, init: KeyboardEventInit) {
  target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }));
}

// Ocurrencias de "1" en DOC: lineas 3, 4 y 5.
const lineOf = (offset: number) => view.state.doc.lineAt(offset).number;
// Como lo hace el usuario con el mouse: CodeMirror lo marca "select.pointer".
function select(anchor: number, head = anchor) {
  view.dispatch({ selection: EditorSelection.range(anchor, head), userEvent: "select.pointer" });
}
const selectLines = (first: number, last: number) => select(view.state.doc.line(first).from, view.state.doc.line(last).to);
const replaceAll = () => click(".kh-search-replace-all");

afterEach(() => view?.destroy());

describe("Ctrl+F: solo buscar", () => {
  it("abre la barra de buscar sin la de reemplazar", () => {
    mount();
    toggleSearchPanel(view);
    expect(searchPanelOpen(view.state)).toBe(true);
    expect(findRow()).not.toBeNull();
    expect(replaceRow()).toBeNull();
    expect(panel()!.dataset.mode).toBe("find");
    expect(document.activeElement).toBe(findArea());
  });

  it("sin seleccion de varias lineas busca en todo el documento", async () => {
    mount();
    toggleSearchPanel(view);
    await type(findArea(), "= 1");
    expect(scopePill().hidden).toBe(true);
    const cursor = getSearchQuery(view.state).getCursor(view.state);
    const found: number[] = [];
    for (let step = cursor.next(); !step.done; step = cursor.next()) found.push(lineOf(step.value.from));
    expect(found).toEqual([3, 4, 5]);
  });

  it("una palabra seleccionada es el texto a buscar, no un alcance", async () => {
    mount({ anchor: 7, head: 8 }); // "a" de "select a"
    toggleSearchPanel(view);
    await flush();
    expect(findArea().value).toBe("a");
    expect(scopePill().hidden).toBe(true);
  });

  it("con el panel en buscar, Ctrl+F lo cierra", () => {
    mount();
    toggleSearchPanel(view);
    toggleSearchPanel(view);
    expect(searchPanelOpen(view.state)).toBe(false);
    expect(panel()).toBeNull();
  });

  it("con el panel en reemplazar, Ctrl+F quita la barra de reemplazar sin cerrar", () => {
    mount();
    openReplacePanel(view);
    toggleSearchPanel(view);
    expect(searchPanelOpen(view.state)).toBe(true);
    expect(replaceRow()).toBeNull();
    expect(panel()!.dataset.mode).toBe("find");
    expect(document.activeElement).toBe(findArea());
  });
});

describe("Ctrl+R: buscar y reemplazar", () => {
  it("abre con las dos barras y el foco en reemplazar", () => {
    mount();
    openReplacePanel(view);
    expect(findRow()).not.toBeNull();
    expect(replaceRow()).not.toBeNull();
    expect(panel()!.dataset.mode).toBe("replace");
    expect(document.activeElement).toBe(replaceArea());
  });

  it("con el panel en buscar, agrega la barra de reemplazar", () => {
    mount();
    toggleSearchPanel(view);
    openReplacePanel(view);
    expect(replaceRow()).not.toBeNull();
    expect(document.activeElement).toBe(replaceArea());
  });

  it("Aa se conserva al pasar a buscar y volver", () => {
    mount();
    openReplacePanel(view);
    click(".kh-search-preserve-case");
    toggleSearchPanel(view);
    openReplacePanel(view);
    const caseKeep = view.dom.querySelector(".kh-search-preserve-case")!;
    expect(caseKeep.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("buscar: siempre en todo el documento", () => {
  const foundLines = () => {
    const cursor = getSearchQuery(view.state).getCursor(view.state);
    const found: number[] = [];
    for (let step = cursor.next(); !step.done; step = cursor.next()) found.push(lineOf(step.value.from));
    return found;
  };

  it("abrir con varias lineas seleccionadas no limita la busqueda", async () => {
    mount();
    selectLines(4, 5);
    toggleSearchPanel(view);
    await type(findArea(), "1");
    expect(scopePill().hidden).toBe(true);
    expect(foundLines()).toEqual([3, 4, 5]);
  });

  it("seleccionar varias lineas con buscar abierto no limita la busqueda", async () => {
    mount();
    toggleSearchPanel(view);
    await type(findArea(), "1");
    selectLines(4, 5);
    await flush();
    expect(scopePill().hidden).toBe(true);
    expect(foundLines()).toEqual([3, 4, 5]);
  });

  it("pasar de reemplazar con alcance a buscar quita el alcance", async () => {
    mount();
    openReplacePanel(view);
    await type(findArea(), "1");
    selectLines(4, 5);
    toggleSearchPanel(view);
    await flush();
    expect(scopePill().hidden).toBe(true);
    expect(foundLines()).toEqual([3, 4, 5]);
  });
});

describe("reemplazar: el alcance sigue a la seleccion", () => {
  it("Ctrl+R con varias lineas seleccionadas: solo dentro, y la seleccion no es el texto a buscar", async () => {
    mount();
    selectLines(4, 5);
    openReplacePanel(view);
    await flush();
    expect(scopePill().hidden).toBe(false);
    expect(findArea().value).toBe("");
    await type(findArea(), "1");
    await type(replaceArea(), "2");
    replaceAll();
    expect(view.state.doc.toString()).toBe("select a\nfrom t\nwhere a = 1\n  and b = 2\n  and c = 2;");
  });

  it("abierto sin seleccion, seleccionar varias lineas limita la busqueda sin tocar atajos", async () => {
    mount();
    openReplacePanel(view);
    await type(findArea(), "1");
    expect(scopePill().hidden).toBe(true);
    selectLines(3, 4);
    await flush();
    expect(scopePill().hidden).toBe(false);
    await type(replaceArea(), "9");
    replaceAll();
    expect(view.state.doc.toString()).toBe("select a\nfrom t\nwhere a = 9\n  and b = 9\n  and c = 1;");
  });

  it("seleccionar otras lineas mueve el alcance", async () => {
    mount();
    openReplacePanel(view);
    await type(findArea(), "1");
    selectLines(3, 4);
    selectLines(4, 5);
    await flush();
    await type(replaceArea(), "7");
    replaceAll();
    expect(view.state.doc.toString()).toBe("select a\nfrom t\nwhere a = 1\n  and b = 7\n  and c = 7;");
  });

  it("de varias lineas a ninguna: vuelve a todo el documento", async () => {
    mount();
    openReplacePanel(view);
    await type(findArea(), "1");
    selectLines(4, 5);
    select(0);
    await flush();
    expect(scopePill().hidden).toBe(true);
    await type(replaceArea(), "0");
    replaceAll();
    expect(view.state.doc.toString()).toBe("select a\nfrom t\nwhere a = 0\n  and b = 0\n  and c = 0;");
  });

  it("de varias lineas a una sola: una linea no es alcance, todo el documento", async () => {
    mount();
    openReplacePanel(view);
    await type(findArea(), "1");
    selectLines(4, 5);
    const line = view.state.doc.line(4);
    select(line.from, line.to);
    await flush();
    expect(scopePill().hidden).toBe(true);
    await type(replaceArea(), "0");
    replaceAll();
    expect(view.state.doc.toString()).toBe("select a\nfrom t\nwhere a = 0\n  and b = 0\n  and c = 0;");
  });

  it("ninguna, varias, una, varias: el alcance acompana cada paso", async () => {
    mount();
    openReplacePanel(view);
    const steps: boolean[] = [];
    const pill = async () => {
      await flush();
      steps.push(!scopePill().hidden);
    };
    await pill();
    selectLines(1, 2);
    await pill();
    select(view.state.doc.line(3).from, view.state.doc.line(3).to);
    await pill();
    selectLines(3, 5);
    await pill();
    expect(steps).toEqual([false, true, false, true]);
  });

  it("siguiente y reemplazar seleccionan coincidencias sin mover el alcance", async () => {
    mount();
    openReplacePanel(view);
    await type(findArea(), "1");
    selectLines(4, 5);
    key(findArea(), { key: "Enter" });
    expect(lineOf(view.state.selection.main.from)).toBe(4);
    await flush();
    expect(scopePill().hidden).toBe(false);
    await type(replaceArea(), "5");
    click(".kh-search-replace-one");
    await flush();
    expect(scopePill().hidden).toBe(false);
    replaceAll();
    expect(view.state.doc.toString()).toBe("select a\nfrom t\nwhere a = 1\n  and b = 5\n  and c = 5;");
  });

  it("la pastilla vuelve a todo el documento", async () => {
    mount();
    selectLines(4, 5);
    openReplacePanel(view);
    await type(findArea(), "1");
    scopePill().click();
    await flush();
    expect(scopePill().hidden).toBe(true);
    await type(replaceArea(), "0");
    replaceAll();
    expect(view.state.doc.toString()).toBe("select a\nfrom t\nwhere a = 0\n  and b = 0\n  and c = 0;");
  });

  it("al volver a reemplazar desde buscar, toma la seleccion vigente", async () => {
    mount();
    openReplacePanel(view);
    selectLines(4, 5);
    toggleSearchPanel(view);
    openReplacePanel(view);
    await flush();
    expect(scopePill().hidden).toBe(false);
  });

  it("con el panel cerrado, seleccionar no fija alcance", () => {
    mount();
    selectLines(4, 5);
    select(0);
    toggleSearchPanel(view);
    expect(scopePill().hidden).toBe(true);
  });
});

describe("teclado dentro del panel", () => {
  it("Ctrl+F y Ctrl+R en los campos hacen lo mismo que los atajos", () => {
    mount();
    toggleSearchPanel(view);
    key(findArea(), { key: "r", ctrlKey: true });
    expect(replaceRow()).not.toBeNull();
    key(replaceArea(), { key: "f", ctrlKey: true });
    expect(replaceRow()).toBeNull();
    key(findArea(), { key: "f", ctrlKey: true });
    expect(searchPanelOpen(view.state)).toBe(false);
  });

  it("Esc cierra y devuelve el foco al editor", () => {
    mount();
    openReplacePanel(view);
    key(replaceArea(), { key: "Escape" });
    expect(searchPanelOpen(view.state)).toBe(false);
    expect(view.hasFocus).toBe(true);
  });

  it("el chevron alterna entre buscar y reemplazar", () => {
    mount();
    toggleSearchPanel(view);
    click(".kh-search-expand");
    expect(replaceRow()).not.toBeNull();
    click(".kh-search-expand");
    expect(replaceRow()).toBeNull();
    expect(searchPanelOpen(view.state)).toBe(true);
  });
});

describe("cerrar termina la busqueda", () => {
  for (const [how, close] of [
    ["Esc", () => key(findArea(), { key: "Escape" })],
    ["el boton cerrar", () => click(".kh-search-close")],
    ["Ctrl+F", () => toggleSearchPanel(view)],
  ] as const) {
    it(`con ${how}: sin marcadores de salto, sin resaltado y el campo vacio al reabrir`, async () => {
      mount();
      toggleSearchPanel(view);
      await type(findArea(), "1\n");
      expect(view.dom.querySelectorAll(".kh-search-newline").length).toBeGreaterThan(0);
      close();
      await flush();
      expect(view.dom.querySelectorAll(".kh-search-newline").length).toBe(0);
      expect(view.dom.querySelectorAll(".cm-searchMatch").length).toBe(0);
      expect(getSearchQuery(view.state).search).toBe("");
      toggleSearchPanel(view);
      await flush();
      expect(findArea().value).toBe("");
    });
  }
});
