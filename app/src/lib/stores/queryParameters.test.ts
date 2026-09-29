import { beforeEach, describe, expect, it } from "vitest";
import { get } from "svelte/store";
import { queryParameterValues, rememberParameterValues } from "./queryParameters";

beforeEach(() => queryParameterValues.set({}));

describe("rememberParameterValues", () => {
  it("guarda valor y NULL por nombre, y lo ultimo usado reemplaza", () => {
    rememberParameterValues(new Map([["desde", { value: "2025-01-01", isNull: false }]]));
    rememberParameterValues(new Map([["desde", { value: "2025-02-01", isNull: false }], ["sector", { value: "", isNull: true }]]));
    expect(get(queryParameterValues)).toEqual({
      desde: { value: "2025-02-01", isNull: false },
      sector: { value: "", isNull: true },
    });
  });

  it("no pasa de 200: se olvidan los que hace mas que no se usan", () => {
    for (let index = 0; index < 205; index++) {
      rememberParameterValues(new Map([[`p${index}`, { value: String(index), isNull: false }]]));
    }
    // Volver a usar p10 lo salva del recorte siguiente.
    rememberParameterValues(new Map([["p10", { value: "10", isNull: false }]]));
    rememberParameterValues(new Map([["nuevo", { value: "x", isNull: false }]]));
    const names = Object.keys(get(queryParameterValues));
    expect(names).toHaveLength(200);
    expect(names).toContain("p10");
    expect(names).toContain("nuevo");
    expect(names).not.toContain("p0");
    expect(names.at(-1)).toBe("nuevo");
  });
});
