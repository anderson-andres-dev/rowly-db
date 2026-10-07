import { describe, expect, it } from "vitest";
import {
  NULL_KEY,
  canFilterOnServer,
  columnValueCounts,
  filterRequests,
  rowsHiddenByFilters,
  valueKey,
  withColumnFilter,
} from "./columnFilters";

const ROWS = [
  ["Ana", "Biometrico_Data"],
  ["Ana", "Biometrico_Manta"],
  ["Luis", "Biometrico_Data"],
  ["Luis", null],
  ["Eva", ""],
  ["Eva", "Biometrico_10"],
  ["Eva", "Biometrico_2"],
];

describe("rowsHiddenByFilters", () => {
  it("oculta las filas con un valor desmarcado en su columna", () => {
    const filters = new Map([[1, new Set(["Biometrico_Data", NULL_KEY])]]);
    expect([...rowsHiddenByFilters(ROWS, filters)]).toEqual([0, 2, 3]);
  });

  it("varias columnas se combinan (se oculta si falla cualquiera)", () => {
    const filters = new Map([
      [0, new Set(["Ana"])],
      [1, new Set([""])],
    ]);
    expect([...rowsHiddenByFilters(ROWS, filters)]).toEqual([0, 1, 4]);
  });

  it("NULL y texto vacio son valores distintos", () => {
    expect([...rowsHiddenByFilters(ROWS, new Map([[1, new Set([valueKey(null)])]]))]).toEqual([3]);
    expect([...rowsHiddenByFilters(ROWS, new Map([[1, new Set([valueKey("")])]]))]).toEqual([4]);
  });

  it("sin filtros no oculta nada", () => {
    expect(rowsHiddenByFilters(ROWS, new Map()).size).toBe(0);
    expect(rowsHiddenByFilters(ROWS, new Map([[1, new Set<string>()]])).size).toBe(0);
  });
});

describe("columnValueCounts", () => {
  it("todos los valores distintos, NULL y vacio primero y orden natural", () => {
    expect(columnValueCounts(ROWS, 1, new Map()).map((item) => [item.value, item.count])).toEqual([
      [null, 1],
      ["", 1],
      ["Biometrico_2", 1],
      ["Biometrico_10", 1],
      ["Biometrico_Data", 2],
      ["Biometrico_Manta", 1],
    ]);
  });

  it("cuenta con los filtros de las otras columnas, no con el propio", () => {
    const filters = new Map([
      [0, new Set(["Luis", "Eva"])],
      [1, new Set(["Biometrico_Manta"])],
    ]);
    const counts = Object.fromEntries(columnValueCounts(ROWS, 1, filters).map((item) => [item.key, item.count]));
    // Solo quedan las filas de Ana (0 y 1); el filtro propio no cuenta.
    expect(counts).toEqual({ [NULL_KEY]: 0, "": 0, Biometrico_2: 0, Biometrico_10: 0, Biometrico_Data: 1, Biometrico_Manta: 1 });
  });

  it("respeta lo que ya oculta la busqueda", () => {
    const counts = columnValueCounts(ROWS, 0, new Map(), new Set([0, 1, 2]));
    expect(counts.map((item) => [item.value, item.count])).toEqual([
      ["Ana", 0],
      ["Eva", 3],
      ["Luis", 1],
    ]);
  });

  it("una fila corta (sin esa columna) cuenta como NULL", () => {
    expect(columnValueCounts([["x"]], 3, new Map())).toEqual([{ key: NULL_KEY, value: null, count: 1 }]);
  });

  it("aguanta muchas filas en una pasada", () => {
    const many = Array.from({ length: 100_000 }, (_, index) => [String(index % 50)]);
    const started = performance.now();
    const counts = columnValueCounts(many, 0, new Map([[0, new Set(["1"])]]));
    expect(counts).toHaveLength(50);
    expect(counts.every((item) => item.count === 2000)).toBe(true);
    expect(performance.now() - started).toBeLessThan(500);
  });
});

describe("withColumnFilter", () => {
  it("quitar todos los desmarcados borra el filtro de la columna", () => {
    const filters = withColumnFilter(new Map(), 2, new Set(["a"]));
    expect(filters.get(2)).toEqual(new Set(["a"]));
    expect(withColumnFilter(filters, 2, new Set()).has(2)).toBe(false);
  });
});

describe("filtrar en la base", () => {
  const columns = [
    { name: "id", type: "INT" },
    { name: "Estado", type: "VARCHAR" },
  ];
  const page = { offset: 0, pageSize: 100, pageable: true };

  it("solo si la consulta se pagina ahi y ninguna columna repite su nombre", () => {
    expect(canFilterOnServer(columns, page)).toBe(true);
    expect(canFilterOnServer(columns, { ...page, pageable: false })).toBe(false);
    expect(canFilterOnServer(columns, null)).toBe(false);
    expect(canFilterOnServer([...columns, { name: "ESTADO", type: "TEXT" }], page)).toBe(false);
  });

  it("cada filtro por el nombre y el tipo de su columna, con el NULL como null", () => {
    const filters = new Map([
      [1, new Set(["baja", NULL_KEY])],
      [0, new Set<string>()],
      [7, new Set(["x"])],
    ]);
    expect(filterRequests(columns, filters)).toEqual([{ name: "Estado", dataType: "VARCHAR", excluded: ["baja", null] }]);
  });
});
