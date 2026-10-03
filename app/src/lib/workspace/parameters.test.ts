import { describe, expect, it } from "vitest";
import { findParameters, parameterNames, parameterValue, substituteParameters, type ParameterType } from "./parameters";
import { ENGINES } from "../engines";

const MYSQL = ENGINES.mysql.lexical;

const POSTGRES = ENGINES.postgres.lexical;

const names = (sql: string, lexical = MYSQL) => findParameters(sql, lexical).map((parameter) => parameter.name);

describe("findParameters", () => {
  it("encuentra los :nombre del codigo, con repetidos", () => {
    const sql = "SELECT * FROM t WHERE (:empresa_check IS NULL OR e = :empresa_valor) AND d BETWEEN :di AND :df AND x = :di";
    expect(names(sql)).toEqual(["empresa_check", "empresa_valor", "di", "df", "di"]);
    expect(parameterNames(findParameters(sql, MYSQL))).toEqual(["empresa_check", "empresa_valor", "di", "df"]);
  });

  it("ignora strings, comentarios e identificadores entre comillas", () => {
    expect(names("SELECT ':a', \"b:c\", `d:e` -- :f\n/* :g */ # :h\nFROM t WHERE x = :real")).toEqual(["real"]);
    expect(names("SELECT 'it\\'s :no' , :si")).toEqual(["si"]);
    expect(names("SELECT 'a'':no', :si")).toEqual(["si"]);
  });

  it("no confunde casts, asignaciones ni horas", () => {
    expect(names("SELECT '1'::int, x::text, :p", POSTGRES)).toEqual(["p"]);
    expect(names("SELECT @a := 1, @b:=2")).toEqual([]);
    expect(names("SELECT arr[1:n], arr[i:j] FROM t", POSTGRES)).toEqual([]);
    expect(names("SELECT TIME '10:30', 10:30")).toEqual([]);
  });

  it("en Postgres salta los bloques $tag$ y respeta E'...'", () => {
    const sql = "DO $body$ BEGIN PERFORM :no; END $body$; SELECT $$ :no $$, E'a\\':no', :si";
    expect(names(sql, POSTGRES)).toEqual(["si"]);
  });

  it("# no es comentario en Postgres", () => {
    expect(names("SELECT a # b, :p", POSTGRES)).toEqual(["p"]);
  });
});

describe("substituteParameters", () => {
  it("reemplaza cada aparicion con su valor, tal cual", () => {
    const sql = "SELECT * FROM t WHERE a = :a AND b IN (:b, :a)";
    const parameters = findParameters(sql, MYSQL);
    const values = new Map([
      ["a", "'x'"],
      ["b", "NULL"],
    ]);
    expect(substituteParameters(sql, parameters, values)).toBe("SELECT * FROM t WHERE a = 'x' AND b IN (NULL, 'x')");
  });

  it("deja tal cual un parametro sin valor", () => {
    const sql = "SELECT :a, :b";
    expect(substituteParameters(sql, findParameters(sql, MYSQL), new Map([["a", "1"]]))).toBe("SELECT 1, :b");
  });
});

describe("parameterValue", () => {
  const value = (raw: string, type: ParameterType | null = null, lexical = MYSQL) => parameterValue(raw, type, false, lexical);
  const sql = (raw: string, type: ParameterType | null = null, lexical = MYSQL) => {
    const result = value(raw, type, lexical);
    return result.ok ? result.sql : `error:${result.error}`;
  };

  it("sin tipo conocido, lo deduce de lo escrito", () => {
    expect(sql("centro")).toBe("'centro'");
    expect(sql("42")).toBe("42");
    expect(sql("-3.5")).toBe("-3.5");
    expect(sql("0998270549")).toBe("'0998270549'");
    expect(sql("null")).toBe("NULL");
    expect(sql("true")).toBe("TRUE");
  });

  it("SQL tal cual con cualquier tipo: funciones, palabras reservadas, literales y comillas", () => {
    expect(sql("NOW()", "datetime")).toBe("NOW()");
    expect(sql("CURDATE() - INTERVAL 30 DAY", "date")).toBe("CURDATE() - INTERVAL 30 DAY");
    expect(sql("current_date", "date")).toBe("current_date");
    expect(sql("DATE '2025-01-01'")).toBe("DATE '2025-01-01'");
    expect(sql("'ya con comillas'", "text")).toBe("'ya con comillas'");
  });

  it("columna de texto: siempre entre comillas, con los escapes del motor", () => {
    expect(sql("123", "text")).toBe("'123'");
    expect(sql("O'Brien", "text")).toBe("'O''Brien'");
    expect(sql("C:\\ruta", "text")).toBe("'C:\\\\ruta'");
    expect(sql("C:\\ruta", "text", POSTGRES)).toBe("'C:\\ruta'");
  });

  it("columna numerica: valida y acepta coma decimal", () => {
    expect(sql("7", "integer")).toBe("7");
    expect(sql("7.5", "integer")).toBe("error:integer");
    expect(sql("3,25", "decimal")).toBe("3.25");
    expect(sql("abc", "decimal")).toBe("error:decimal");
  });

  it("fechas: a ISO desde AAAA-MM-DD o DD/MM/AAAA, y rechaza las que no existen", () => {
    expect(sql("2025-01-05", "date")).toBe("'2025-01-05'");
    expect(sql("5/1/2025", "date")).toBe("'2025-01-05'");
    expect(sql("31/02/2025", "date")).toBe("error:date");
    expect(sql("2025-01-05 8:30", "datetime")).toBe("'2025-01-05 08:30:00'");
    expect(sql("05/01/2025 23:59:59", "datetime")).toBe("'2025-01-05 23:59:59'");
    expect(sql("2025-01-05", "datetime")).toBe("'2025-01-05'");
    expect(sql("25:00", "time")).toBe("error:time");
    expect(sql("7:05", "time")).toBe("'07:05:00'");
  });

  it("booleanos", () => {
    expect(sql("sí", "boolean")).toBe("TRUE");
    expect(sql("0", "boolean")).toBe("FALSE");
    expect(sql("quizas", "boolean")).toBe("error:boolean");
  });

  it("NULL elegido o escrito, y vacio sin valor", () => {
    expect(parameterValue("lo que sea", "integer", true, MYSQL)).toEqual({ ok: true, sql: "NULL" });
    expect(sql("NULL", "date")).toBe("NULL");
    expect(value("  ")).toEqual({ ok: false, error: "empty" });
  });
});
