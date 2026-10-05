import { describe, expect, it } from "vitest";
import { ENGINES } from "../engines";

const postgres = ENGINES.postgres.locateError;
const mysql = ENGINES.mysql.locateError;

const slice = (text: string, range: { from: number; to: number } | null) => (range ? text.slice(range.from, range.to) : null);

describe("ubicar un error de ejecucion, segun el motor", () => {
  it("usa la posicion de Postgres, contando caracteres y no unidades UTF-16", () => {
    const sql = "SELECT '🙂', fcha FROM usuarios";
    const position = [...sql.slice(0, sql.indexOf("fcha"))].length + 1;
    expect(slice(sql, postgres(sql, { message: "column \"fcha\" does not exist", position }))).toBe("fcha");
  });

  it("con la posicion en un simbolo marca ese caracter", () => {
    const sql = "SELECT id, FROM t";
    expect(slice(sql, postgres(sql, { message: "syntax error", position: 10 }))).toBe(",");
  });

  it("MySQL: busca el fragmento de near desde su linea", () => {
    const sql = "SELECT id\nFROM usuarios\nWHER id = 1";
    const message = "You have an error in your SQL syntax; ... near 'WHER id = 1' at line 3";
    expect(slice(sql, mysql(sql, { message }))).toBe("WHER");
  });

  it("MySQL: near vacio es el final de la sentencia", () => {
    const sql = "SELECT * FROM t WHERE";
    expect(mysql(sql, { message: "... to use near '' at line 1" })).toEqual({ from: 20, to: 21 });
  });

  it("MySQL: nombres citados, quedandose con la ultima parte", () => {
    const sql = "SELECT id, fcha FROM usarios";
    expect(slice(sql, mysql(sql, { message: "Unknown column 'fcha' in 'field list'" }))).toBe("fcha");
    expect(slice(sql, mysql(sql, { message: "Table 'ventas.usarios' doesn't exist" }))).toBe("usarios");
  });

  it("sin pistas no adivina", () => {
    expect(mysql("SELECT 1", { message: "Lost connection to server" })).toBeNull();
  });

  it("Postgres: sin posicion, el nombre entre comillas dobles", () => {
    const sql = "SELECT * FROM usarios";
    expect(slice(sql, postgres(sql, { message: 'relation "usarios" does not exist' }))).toBe("usarios");
    // El fragmento "near" es de MySQL: en Postgres no se interpreta.
    expect(postgres("SELECT * FROM t WHERE", { message: "... near '' at line 1" })).toBeNull();
  });
});
