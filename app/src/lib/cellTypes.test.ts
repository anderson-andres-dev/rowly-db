import { describe, expect, it } from "vitest";
import { invalidCells, typeProblem } from "./cellTypes";
import type { CellValue, EditableColumn } from "./resultEditing";

function column(dataType: string, nullable = true): EditableColumn {
  return { name: "c", dataType, nullable, isPrimaryKey: false, defaultValue: null, generated: false };
}
const text = (value: string): CellValue => ({ kind: "text", value });
const problem = (dataType: string, value: string) => typeProblem(column(dataType), text(value))?.key ?? null;

describe("typeProblem", () => {
  it("enteros (MySQL y PostgreSQL)", () => {
    for (const type of ["int", "int(11)", "integer", "int4", "bigint", "smallint", "serial", "mediumint"]) {
      expect(problem(type, "42")).toBeNull();
      expect(problem(type, "-7")).toBeNull();
      expect(problem(type, " 5 ")).toBeNull();
      expect(problem(type, "Ana")).toBe("type.integer");
      expect(problem(type, "1.5")).toBe("type.integer");
      expect(problem(type, "")).toBe("type.integer");
    }
  });

  it("enteros fuera de rango, con y sin signo", () => {
    expect(problem("tinyint", "127")).toBeNull();
    expect(problem("tinyint", "128")).toBe("type.integerRange");
    expect(problem("tinyint unsigned", "255")).toBeNull();
    expect(problem("tinyint unsigned", "-1")).toBe("type.integerRange");
    expect(problem("int", "2147483648")).toBe("type.integerRange");
    expect(problem("int unsigned", "4294967295")).toBeNull();
    expect(problem("bigint", "9223372036854775807")).toBeNull();
    expect(problem("bigint", "9223372036854775808")).toBe("type.integerRange");
    expect(problem("smallint", "40000")).toBe("type.integerRange");
    expect(typeProblem(column("tinyint"), text("300"))?.params).toEqual({ min: "-128", max: "127" });
  });

  it("tinyint(1), el booleano de MySQL, sigue siendo un numero", () => {
    expect(problem("tinyint(1)", "1")).toBeNull();
    expect(problem("tinyint(1)", "0")).toBeNull();
    expect(problem("tinyint(1)", "si")).toBe("type.integer");
  });

  it("decimales con su precision", () => {
    expect(problem("decimal(10,2)", "12345678.99")).toBeNull();
    expect(problem("decimal(10,2)", "123456789.1")).toBe("type.decimalDigits");
    expect(problem("numeric(5,2)", "-999.99")).toBeNull();
    expect(problem("numeric(5,2)", "0.5")).toBeNull();
    expect(problem("numeric(5,2)", ".5")).toBeNull();
    expect(problem("numeric", "123456789012345678901234567890.5")).toBeNull();
    expect(problem("numeric", "NaN")).toBeNull();
    expect(problem("decimal(10,2)", "doce")).toBe("type.decimal");
    expect(problem("decimal(10,2)", "1,5")).toBe("type.decimal");
    expect(problem("decimal(10,2) unsigned", "-1")).toBe("type.unsigned");
    expect(typeProblem(column("decimal(10,2)"), text("123456789"))?.params).toEqual({ digits: 8 });
  });

  it("numeros de coma flotante", () => {
    for (const type of ["float", "double", "double precision", "real", "float8"]) {
      expect(problem(type, "3.14")).toBeNull();
      expect(problem(type, "-1e10")).toBeNull();
      expect(problem(type, "abc")).toBe("type.number");
    }
    expect(problem("double precision", "Infinity")).toBeNull();
  });

  it("booleanos de PostgreSQL", () => {
    for (const value of ["true", "FALSE", "t", "f", "yes", "no", "on", "off", "1", "0"]) {
      expect(problem("boolean", value)).toBeNull();
    }
    expect(problem("boolean", "quizas")).toBe("type.boolean");
  });

  it("fechas reales", () => {
    expect(problem("date", "2024-02-29")).toBeNull();
    expect(problem("date", "2023-02-29")).toBe("type.date");
    expect(problem("date", "2024-13-01")).toBe("type.date");
    expect(problem("date", "29/02/2024")).toBe("type.date");
    expect(problem("date", "ayer")).toBe("type.date");
  });

  it("horas", () => {
    expect(problem("time", "23:59:59")).toBeNull();
    expect(problem("time", "08:30")).toBeNull();
    expect(problem("time", "838:59:59")).toBeNull();
    expect(problem("time without time zone", "12:00:00.123")).toBeNull();
    expect(problem("time", "25:61")).toBe("type.time");
    expect(problem("time", "mediodia")).toBe("type.time");
  });

  it("fecha y hora, con y sin zona", () => {
    expect(problem("datetime", "2024-05-01 10:30:00")).toBeNull();
    expect(problem("datetime", "2024-05-01")).toBeNull();
    expect(problem("timestamp", "2024-05-01T10:30")).toBeNull();
    expect(problem("timestamp without time zone", "2024-05-01 10:30:00.5")).toBeNull();
    expect(problem("timestamp with time zone", "2024-05-01 10:30:00-05")).toBeNull();
    expect(problem("timestamptz", "2024-05-01T10:30:00Z")).toBeNull();
    expect(problem("timestamptz", "2024-05-01T10:30:00+05:30")).toBeNull();
    expect(problem("datetime", "2024-02-30 10:00")).toBe("type.datetime");
    expect(problem("datetime", "mañana")).toBe("type.datetime");
  });

  it("año de MySQL", () => {
    expect(problem("year", "2024")).toBeNull();
    expect(problem("year", "1800")).toBe("type.year");
    expect(problem("year", "24a")).toBe("type.year");
  });

  it("uuid y json", () => {
    expect(problem("uuid", "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")).toBeNull();
    expect(problem("uuid", "no-es-uuid")).toBe("type.uuid");
    expect(problem("json", '{"a": [1, 2]}')).toBeNull();
    expect(problem("jsonb", "[1, 2")).toBe("type.json");
  });

  it("largo maximo de un texto", () => {
    expect(problem("varchar(5)", "hola")).toBeNull();
    expect(problem("varchar(5)", "holas")).toBeNull();
    expect(problem("varchar(5)", "hola!!")).toBe("type.length");
    expect(problem("character varying(3)", "ñña")).toBeNull();
    expect(problem("char(2)", "abc")).toBe("type.length");
    expect(problem("text", "x".repeat(100_000))).toBeNull();
    expect(problem("varchar", "sin largo declarado")).toBeNull();
    expect(typeProblem(column("varchar(5)"), text("123456"))?.params).toEqual({ max: 5 });
  });

  it("valores de un enum de MySQL", () => {
    expect(problem("enum('activo','inactivo')", "activo")).toBeNull();
    expect(problem("enum('activo','inactivo')", "borrado")).toBe("type.enum");
    expect(problem("enum('it''s','no')", "it's")).toBeNull();
    expect(typeProblem(column("enum('a','b')"), text("c"))?.params).toEqual({ values: "a, b" });
  });

  it("NULL en una columna que no lo admite", () => {
    expect(typeProblem(column("int", false), { kind: "null" })?.key).toBe("type.notNull");
    expect(typeProblem(column("int", true), { kind: "null" })).toBeNull();
    expect(typeProblem(column("int", false), { kind: "default" })).toBeNull();
  });

  it("lo que no se reconoce no se valida", () => {
    expect(problem("text", "cualquier cosa")).toBeNull();
    expect(problem("inet", "no es ip")).toBeNull();
    expect(problem("integer[]", "{1,2}")).toBeNull();
    expect(problem("USER-DEFINED", "x")).toBeNull();
    expect(problem("geometry", "x")).toBeNull();
  });
});

describe("invalidCells", () => {
  const info = {
    target: { schema: "s", table: "t" },
    keyColumns: ["id"],
    columns: [
      { name: "id", dataType: "int", nullable: false, isPrimaryKey: true, defaultValue: null, generated: true },
      { name: "edad", dataType: "int", nullable: true, isPrimaryKey: false, defaultValue: null, generated: false },
      { name: "nombre", dataType: "varchar(5)", nullable: false, isPrimaryKey: false, defaultValue: null, generated: false },
      null,
    ],
  };
  const rows = [
    ["1", "30", "Ana", "x"],
    ["2", "40", "Luis", "y"],
  ];

  it("marca los cambios que no encajan, no los que si", () => {
    const edits = {
      updates: new Map([
        [0, new Map<number, CellValue>([[1, text("treinta")], [2, text("Eva")]])],
        [1, new Map<number, CellValue>([[2, text("demasiado largo")]])],
      ]),
      deleted: new Set<number>(),
      inserted: [],
    };
    expect(invalidCells(edits, info, rows).map(({ row, col, problem }) => [row, col, problem.key])).toEqual([
      [0, 1, "type.integer"],
      [1, 2, "type.length"],
    ]);
  });

  it("una fila marcada para eliminar no cuenta", () => {
    const edits = {
      updates: new Map([[0, new Map<number, CellValue>([[1, text("x")]])]]),
      deleted: new Set([0]),
      inserted: [],
    };
    expect(invalidCells(edits, info, rows)).toEqual([]);
  });

  it("en una fila nueva, el NULL de una obligatoria solo cuenta al aplicar", () => {
    const edits = {
      updates: new Map(),
      deleted: new Set<number>(),
      inserted: [[{ kind: "default" }, text("abc"), { kind: "null" }, { kind: "null" }]] as CellValue[][],
    };
    expect(invalidCells(edits, info, rows).map((cell) => cell.problem.key)).toEqual(["type.integer"]);
    expect(invalidCells(edits, info, rows, { requiredNulls: true }).map((cell) => [cell.row, cell.col, cell.problem.key])).toEqual([
      [2, 1, "type.integer"],
      [2, 2, "type.notNull"],
    ]);
  });
});
