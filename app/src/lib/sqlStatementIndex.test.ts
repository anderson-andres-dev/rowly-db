import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { splitStatements, statementAt, type SqlLexical } from "./sqlStatements";
import { ENGINES, standardSql } from "./engines";
import mysqlFixture from "../../../crates/engine/tests/corpus/mixed/mysql.json";
import {
  statementIndexComplete,
  statementIndexField,
  statementIndexStep,
  sqlLexical,
  statementNear,
  statementsIn,
  statementTextAt,
} from "./sqlStatementIndex";

// Las pruebas del indice corren con las reglas de cada motor (y las del SQL
// estandar, sin conexion): el mecanismo incremental tiene que coincidir con
// el escaneo completo en todos.
const LEXICALS: [string, SqlLexical][] = [
  ...Object.entries(ENGINES).map(([name, engine]) => [name, engine.lexical] as [string, SqlLexical]),
  ["standard", standardSql.lexical],
];
let lexical: SqlLexical = ENGINES.mysql.lexical;

function create(doc: string) {
  return EditorState.create({ doc, extensions: [statementIndexField, sqlLexical.of(lexical)] });
}

const split = (text: string) => splitStatements(text, lexical);

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
  "#",
  "# nota; aqui\n",
  "E'",
  "e'a\\';b'",
  "E",
  "[",
  "]",
  "/*",
  "*/",
  "/* x; y */",
  "$$",
  "$tag$",
  "\\",
  "INSERT INTO t VALUES ('a;b', 2);",
  "x",
  "\n\n",
  "\n  \n",
  "(",
  ")",
  ",",
  "SELECT 2",
  "CREATE PROCEDURE p() ",
  "CREATE FUNCTION f() RETURNS int ",
  "CREATE TRIGGER tr BEFORE INSERT ON t FOR EACH ROW ",
  "BEGIN ",
  "BEGIN ATOMIC ",
  "END",
  "END;",
  "END IF;",
  "CASE WHEN a THEN begin ELSE 0 END",
  "IF a THEN SELECT 1; END IF;",
  "DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; END;",
  "lbl: LOOP LEAVE lbl; END LOOP lbl;",
  "RETURN 1",
  "AS $$ BEGIN SELECT 1; ",
  "$$ LANGUAGE sql",
  "DELIMITER $$\n",
  "DELIMITER ;\n",
  "$$",
];

describe("indice de sentencias", () => {
  it("conserva DELIMITER y rutinas al editar antes, dentro y despues", () => {
    lexical = ENGINES.mysql.lexical;
    let state = create(mysqlFixture.sql);
    expect(indexed(state)).toEqual(split(state.doc.toString()));
    for (const needle of ["SELECT @total", "DECLARE v_clie", "CALL core.sp"]) {
      const at = state.doc.toString().indexOf(needle);
      state = state.update({ changes: { from: at, insert: " " } }).state;
      expect(indexed(state)).toEqual(split(state.doc.toString()));
    }
  });

  it.each(LEXICALS)("coincide con el escaneo completo tras ediciones al azar (%s)", (_name, rules) => {
    lexical = rules;
    const next = random(7);
    let state = create("SELECT 1;\nSELECT 'a;b' FROM t; -- fin\n/* c */ SELECT 2");
    for (let step = 0; step < 3000; step += 1) {
      const length = state.doc.length;
      const from = Math.floor(next() * (length + 1));
      const to = next() < 0.3 ? Math.min(length, from + Math.floor(next() * 12)) : from;
      const insert = next() < 0.8 ? PIECES[Math.floor(next() * PIECES.length)] : "";
      state = state.update({ changes: { from, to, insert } }).state;
      expect(indexed(state)).toEqual(split(state.doc.toString()));
    }
  });

  it.each(LEXICALS)("con documentos grandes termina en segundo plano y sigue exacto (%s)", (_name, rules) => {
    lexical = rules;
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
      expect(indexed(state)).toEqual(split(state.doc.toString()));
    }
    for (let guard = 0; guard < 100 && !statementIndexComplete(state); guard += 1) {
      state = state.update({ effects: statementIndexStep() }).state;
    }
    expect(statementIndexComplete(state)).toBe(true);
    expect(indexed(state)).toEqual(split(state.doc.toString()));
  });

  it("elige la misma sentencia que statementAt", () => {
    const text = ["SELECT * FROM a;", "", "", "SELECT * FROM b;", "", "SELECT 3", "  FROM c;   SELECT 4;", ""].join(
      "\n",
    );
    const state = create(text);
    for (let offset = 0; offset <= text.length; offset += 1) {
      expect(statementNear(state, offset)).toEqual(
        statementAt(text, offset, lexical) && expect.objectContaining(statementAt(text, offset, lexical)),
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

describe("E'...' en el borde de un trozo", () => {
  it("la E al final de un trozo de 64 KB y la comilla al principio del siguiente", () => {
    lexical = ENGINES.postgres.lexical;
    const head = "SELECT ";
    // La E en la posicion 65535 y la comilla en la 65536 (el corte).
    const text = head + "x".repeat(65536 - head.length - 1) + " E'a\\';b'; SELECT 2;";
    const at = text.indexOf("E'");
    expect(at).toBe(65536);
    const shifted = text.slice(1);
    for (const doc of [text, shifted]) {
      const state = create(doc);
      expect(indexed(state)).toEqual(split(doc));
      expect(indexed(state).length).toBe(2);
    }
  });
});

describe("linea en blanco entre sentencias", () => {
  it("borrarla une las dos partes y volver a ponerla las separa", () => {
    lexical = ENGINES.mysql.lexical;
    let state = create("SELECT *\n\nSELECT abc");
    expect(indexed(state)).toEqual([
      { from: 0, to: 8 },
      { from: 10, to: 20 },
    ]);
    state = state.update({ changes: { from: 8, to: 9 } }).state;
    expect(indexed(state)).toEqual([{ from: 0, to: 19 }]);
    state = state.update({ changes: { from: 8, insert: "\n" } }).state;
    expect(indexed(state)).toEqual(split(state.doc.toString()));
    expect(indexed(state)).toHaveLength(2);
  });
});
