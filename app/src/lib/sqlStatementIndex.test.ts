import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { splitStatements, statementAt } from "./sqlStatements";
import {
  statementIndexComplete,
  statementIndexField,
  statementIndexStep,
  statementNear,
  statementsIn,
  statementTextAt,
} from "./sqlStatementIndex";

function create(doc: string) {
  return EditorState.create({ doc, extensions: statementIndexField });
}

function indexed(state: EditorState) {
  return statementsIn(state, 0, state.doc.length).map(({ from, to }) => ({
    from,
    to,
  }));
}

// Generador determinista para que un fallo se pueda repetir.
function random(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

const PIECES = [
  "SELECT 1;",
  "\n",
  " ",
  ";",
  "'",
  "''",
  '"',
  "`",
  "--",
  "-- nota; aqui\n",
  "/*",
  "*/",
  "/* x; y */",
  "$$",
  "$tag$",
  "\\",
  "INSERT INTO t VALUES ('a;b', 2);",
  "x",
];

describe("indice de sentencias", () => {
  it("coincide con el escaneo completo tras ediciones al azar", () => {
    const next = random(7);
    let state = create("SELECT 1;\nSELECT 'a;b' FROM t; -- fin\n/* c */ SELECT 2");
    for (let step = 0; step < 3000; step += 1) {
      const length = state.doc.length;
      const from = Math.floor(next() * (length + 1));
      const to = next() < 0.3 ? Math.min(length, from + Math.floor(next() * 12)) : from;
      const insert = next() < 0.8 ? PIECES[Math.floor(next() * PIECES.length)] : "";
      state = state.update({ changes: { from, to, insert } }).state;
      expect(indexed(state)).toEqual(splitStatements(state.doc.toString()));
    }
  });

  it("con documentos grandes termina en segundo plano y sigue exacto", () => {
    const next = random(11);
    const line = "SELECT a, b FROM tabla WHERE c = 'x;y'; -- c;\n";
    let state = create(line.repeat(40_000));
    expect(statementIndexComplete(state)).toBe(false);
    for (let step = 0; step < 40; step += 1) {
      const length = state.doc.length;
      const from = Math.floor(next() * (length + 1));
      // Abrir y cerrar comillas lejos del final obliga a pasar del
      // presupuesto de una tecla.
      const insert = PIECES[Math.floor(next() * PIECES.length)];
      state = state.update({ changes: { from, insert } }).state;
      if (next() < 0.5) state = state.update({ effects: statementIndexStep() }).state;
      expect(indexed(state)).toEqual(splitStatements(state.doc.toString()));
    }
    for (let guard = 0; guard < 100 && !statementIndexComplete(state); guard += 1) {
      state = state.update({ effects: statementIndexStep() }).state;
    }
    expect(statementIndexComplete(state)).toBe(true);
    expect(indexed(state)).toEqual(splitStatements(state.doc.toString()));
  });

  it("elige la misma sentencia que statementAt", () => {
    const text = ["SELECT * FROM a;", "", "", "SELECT * FROM b;", "", "SELECT 3", "  FROM c;   SELECT 4;", ""].join(
      "\n",
    );
    const state = create(text);
    for (let offset = 0; offset <= text.length; offset += 1) {
      expect(statementNear(state, offset)).toEqual(
        statementAt(text, offset) && expect.objectContaining(statementAt(text, offset)),
      );
    }
  });

  it("da el texto de la sentencia que se esta escribiendo", () => {
    const text = "SELECT 1;\nSELECT * FROM t WHERE ;\nSELECT 3";
    const state = create(text);
    const where = text.indexOf("WHERE ") + 6;
    expect(statementTextAt(state, where)).toEqual({ text: "SELECT * FROM t WHERE ;", offset: where - 10 });
    // Justo despues de un ";": ya es la siguiente, todavia vacia.
    expect(statementTextAt(state, 9)).toEqual({ text: "\n", offset: 0 });
    expect(statementTextAt(state, text.length)).toEqual({ text: "SELECT 3", offset: 8 });
  });
});
