import { ENGINES } from "./engines";
import { describe, expect, it } from "vitest";
import { EditorState, Text } from "@codemirror/state";
import { MySQL } from "@codemirror/lang-sql";
import {
  statementIndexComplete,
  statementIndexField,
  statementIndexStep,
  statementNear,
  statementTextAt,
  statementsFrom,
} from "./sqlStatementIndex";
import { splitStatements } from "./sqlStatements";
import { uppercaseKeywordEdit } from "./sqlEditorBehavior";
import { classifyContext } from "./sqlContext";

// Documentos de 1M lineas (docs/specs/v0.2-documentos-grandes.md, 15f): lo
// que corre en cada tecla no puede depender del tamaño del documento. Los
// umbrales son holgados (una maquina lenta o cargada no debe dar falsos
// fallos) pero atrapan cualquier vuelta a recorrer los 30 MB: eso cuesta
// cientos de ms.

const STATEMENT =
  "SELECT u.id, u.name, o.total\nFROM users u\nJOIN orders o ON o.user_id = u.id\nWHERE o.total > 100 AND u.name LIKE 'a%';\n";
const text = STATEMENT.repeat(250_000);
const doc = Text.of(text.split("\n"));

function averageMs(times: number, run: (index: number) => void): number {
  const start = performance.now();
  for (let index = 0; index < times; index += 1) run(index);
  return (performance.now() - start) / times;
}

function indexedState(): EditorState {
  let state = EditorState.create({ doc, extensions: [statementIndexField, MySQL.language] });
  while (!statementIndexComplete(state)) state = state.update({ effects: statementIndexStep() }).state;
  return state;
}

describe("documentos de 1M lineas", () => {
  const state = indexedState();
  const middle = Math.floor(doc.length / 2);

  it("escanear los 30 MB de una vez (ejecutar todo) no pasa de 1,5 s", () => {
    const start = performance.now();
    expect(splitStatements(text, ENGINES.mysql.lexical).length).toBe(250_000);
    expect(performance.now() - start).toBeLessThan(1500);
  });

  it("una tecla actualiza el indice sin recorrer el documento", () => {
    let current = state;
    const ms = averageMs(50, (index) => {
      current = current.update({ changes: { from: middle + index, insert: "x" } }).state;
    });
    expect(ms).toBeLessThan(10);
  });

  it("la sentencia bajo el cursor y el texto para autocompletar, al instante", () => {
    expect(averageMs(50, (index) => statementNear(state, middle + index * 997))).toBeLessThan(5);
    expect(averageMs(50, (index) => statementTextAt(state, doc.length - 10 - index))).toBeLessThan(5);
    expect(averageMs(20, (index) => statementsFrom(state, middle + index * 997, 200))).toBeLessThan(10);
  });

  it("el autocompletado ve la clausula tambien al final del documento", () => {
    const pos = doc.length - "o.total > 100 AND u.name LIKE 'a%';\n".length;
    const current = statementTextAt(state, pos);
    expect(classifyContext(current.text, current.offset, ENGINES.mysql.lexical).clause).toBe("where");
  });

  it("las mayusculas automaticas miran solo la linea", () => {
    const current = state.update({ changes: { from: doc.length, insert: "select" } }).state;
    const ms = averageMs(50, () => uppercaseKeywordEdit(current, current.doc.length, current.doc.length, " "));
    expect(ms).toBeLessThan(5);
  });
});
