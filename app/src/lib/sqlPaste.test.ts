// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { mysql } from "$lib/engines/mysql";
import { postgres } from "$lib/engines/postgres";
import { standardSql as standard } from "$lib/engines/standard";
import { sqlLexical } from "$lib/sqlStatementIndex";
import { normalizePastedSql } from "$lib/sqlPaste";

const NBSP = "\u00A0";
const ZWSP = "\u200B";
const BOM = "\uFEFF";
const LINE_SEPARATOR = "\u2028";

// Lo comun a todos los motores esta en el contrato (engines/contract.test.ts).
describe("pegar: todos los caracteres invisibles", () => {
  it("espacio duro, ancho cero, BOM y separador de linea", () => {
    const pasted = `${BOM}SELECT${NBSP}id,${ZWSP} nombre${LINE_SEPARATOR}FROM${NBSP}usuarios`;
    expect(normalizePastedSql(pasted, standard.lexical)).toBe("SELECT id, nombre\nFROM usuarios");
  });

  it("sin nada raro, el texto es el mismo (no se recorre)", () => {
    const pasted = "SELECT 1;\r\nSELECT 2;";
    expect(normalizePastedSql(pasted, mysql.lexical)).toBe(pasted);
  });
});

describe("pegar: lo que es cadena lo decide el motor", () => {
  it("MySQL: \\' escapa dentro de la cadena, asi que no la cierra", () => {
    const pasted = `SELECT 'O\\'Brien${NBSP}x'${NBSP}FROM t`;
    expect(normalizePastedSql(pasted, mysql.lexical)).toBe(`SELECT 'O\\'Brien${NBSP}x' FROM t`);
  });

  it("Postgres: \\ es un caracter mas, la cadena cierra en la comilla", () => {
    const pasted = `SELECT 'C:\\'${NBSP}AS ruta`;
    expect(normalizePastedSql(pasted, postgres.lexical)).toBe("SELECT 'C:\\' AS ruta");
  });

  it("Postgres: en E'...' la barra invertida si escapa", () => {
    const pasted = `SELECT E'a\\'b${NBSP}c'${NBSP}AS x`;
    expect(normalizePastedSql(pasted, postgres.lexical)).toBe(`SELECT E'a\\'b${NBSP}c' AS x`);
  });

  it("Postgres: un bloque $tag$ queda entero", () => {
    const body = `$fn$ BEGIN RAISE NOTICE 'x${NBSP}y'; END $fn$`;
    const pasted = `CREATE FUNCTION f() RETURNS void AS ${body}${NBSP}LANGUAGE plpgsql`;
    expect(normalizePastedSql(pasted, postgres.lexical)).toBe(`CREATE FUNCTION f() RETURNS void AS ${body} LANGUAGE plpgsql`);
  });

  it("MySQL: $ no abre nada y # es comentario", () => {
    const pasted = `SELECT${NBSP}$a # nota${NBSP}x\nFROM t`;
    expect(normalizePastedSql(pasted, mysql.lexical)).toBe(`SELECT $a # nota${NBSP}x\nFROM t`);
  });

  it("Postgres: # no es comentario", () => {
    const pasted = `SELECT a #${NBSP}b`;
    expect(normalizePastedSql(pasted, postgres.lexical)).toBe("SELECT a # b");
  });

  it("identificadores citados de cada motor quedan", () => {
    expect(normalizePastedSql(`SELECT \`a${NBSP}b\`${NBSP}FROM t`, mysql.lexical)).toBe(`SELECT \`a${NBSP}b\` FROM t`);
    expect(normalizePastedSql(`SELECT "a${NBSP}b"${NBSP}FROM t`, postgres.lexical)).toBe(`SELECT "a${NBSP}b" FROM t`);
    // En Postgres el backtick no cita: lo de adentro es codigo.
    expect(normalizePastedSql(`SELECT \`a${NBSP}b\``, postgres.lexical)).toBe("SELECT `a b`");
  });
});

describe("pegar en el editor real", () => {
  it("Ctrl+V pasa por el filtro con el motor de la conexion", () => {
    const view = new EditorView({
      state: EditorState.create({
        extensions: [
          sqlLexical.of(postgres.lexical),
          EditorView.clipboardInputFilter.of((text, state) => normalizePastedSql(text, state.facet(sqlLexical))),
        ],
      }),
      parent: document.body,
    });
    const data = new DataTransfer();
    data.setData("text/plain", `SELECT${NBSP}'a${NBSP}b'`);
    view.contentDOM.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    expect(view.state.doc.toString()).toBe(`SELECT 'a${NBSP}b'`);
    view.destroy();
  });
});
