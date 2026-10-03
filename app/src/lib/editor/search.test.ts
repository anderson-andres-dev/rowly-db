import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { __test } from "./search";

describe("preservar mayusculas al reemplazar", () => {
  it("copia el formato de lo encontrado", () => {
    expect(__test.preserveCase("insert", "SELECT")).toBe("INSERT");
    expect(__test.preserveCase("insert", "Select")).toBe("Insert");
    expect(__test.preserveCase("INSERT", "select")).toBe("insert");
    // Formato mixto: tal cual.
    expect(__test.preserveCase("nuevoNombre", "viejoNombre")).toBe("nuevoNombre");
    // Sin letras: tal cual.
    expect(__test.preserveCase("x", "123")).toBe("x");
  });
});

describe("modo del panel: buscar vs. reemplazar", () => {
  it("es un modo explicito del editor, no un toggle", () => {
    let state = EditorState.create({ doc: "select 1", extensions: [__test.searchModeField] });
    expect(state.field(__test.searchModeField)).toBe("find");
    state = state.update({ effects: __test.setSearchMode.of("replace") }).state;
    expect(state.field(__test.searchModeField)).toBe("replace");
    state = state.update({ effects: __test.setSearchMode.of("find") }).state;
    expect(state.field(__test.searchModeField)).toBe("find");
  });
});

// El alcance es solo de reemplazar.
function inReplace(doc: string, selection?: { anchor: number; head: number }) {
  return EditorState.create({ doc, selection, extensions: [__test.searchModeField, __test.searchScopeField] }).update({
    effects: __test.setSearchMode.of("replace"),
  }).state;
}

describe("alcance de la busqueda: documento entero o solo la seleccion", () => {
  it("en modo buscar no hay alcance, aunque se pida uno", () => {
    let state = EditorState.create({ doc: "select 1\nfrom t", extensions: [__test.searchModeField, __test.searchScopeField] });
    state = state.update({ effects: __test.setSearchScope.of({ from: 0, to: 11 }) }).state;
    expect(state.field(__test.searchScopeField)).toBeNull();
  });

  it("sin seleccion, no hay alcance (busca todo el documento)", () => {
    const state = EditorState.create({ doc: "select 1 from t" });
    expect(__test.scopeFromSelection(state)).toBeNull();
  });

  it("una seleccion dentro de una linea no es alcance: es lo que se busca en todo el documento", () => {
    const state = EditorState.create({
      doc: "select 1 from t",
      selection: { anchor: 7, head: 8 },
    });
    expect(__test.scopeFromSelection(state)).toBeNull();
  });

  it("con una seleccion de varias lineas, el alcance es esa seleccion", () => {
    const state = EditorState.create({
      doc: "select 1\nfrom t",
      selection: { anchor: 7, head: 11 },
    });
    expect(__test.scopeFromSelection(state)).toEqual({ from: 7, to: 11 });
  });

  it("sin alcance activo, cualquier rango esta dentro", () => {
    const state = EditorState.create({ doc: "select 1 from t", extensions: [__test.searchScopeField] });
    expect(__test.inScope(state, 0, 6)).toBe(true);
    expect(__test.inScope(state, 10, 16)).toBe(true);
  });

  it("con alcance activo, solo lo que cae dentro de la seleccion cuenta", () => {
    let state = inReplace("select 1 from t union select 1 from t");
    // Alcance: solo la primera mitad (el primer "select 1 from t").
    state = state.update({ effects: __test.setSearchScope.of({ from: 0, to: 16 }) }).state;
    expect(__test.inScope(state, 0, 6)).toBe(true);
    expect(__test.inScope(state, 22, 28)).toBe(false);
  });

  it("el alcance se sigue con el texto y desaparece si se borra por completo", () => {
    let state = inReplace("select 1 from t");
    state = state.update({ effects: __test.setSearchScope.of({ from: 7, to: 8 }) }).state;
    // Insertar antes del alcance lo corre, sin cambiar su tamano.
    state = state.update({ changes: { from: 0, to: 0, insert: "-- \n" } }).state;
    expect(state.field(__test.searchScopeField)).toEqual({ from: 11, to: 12 });
    // Borrar justo el texto del alcance lo deja sin alcance (todo el documento).
    state = state.update({ changes: { from: 11, to: 12, insert: "" } }).state;
    expect(state.field(__test.searchScopeField)).toBeNull();
  });

  it("un clic en el indicador (setSearchScope null) vuelve a todo el documento", () => {
    let state = inReplace("select 1\nfrom t", { anchor: 0, head: 11 });
    state = state.update({ effects: __test.setSearchScope.of(__test.scopeFromSelection(state)) }).state;
    expect(state.field(__test.searchScopeField)).toEqual({ from: 0, to: 11 });
    state = state.update({ effects: __test.setSearchScope.of(null) }).state;
    expect(state.field(__test.searchScopeField)).toBeNull();
  });
});
