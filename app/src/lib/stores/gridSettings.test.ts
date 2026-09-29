import { describe, expect, it } from "vitest";
import { get } from "svelte/store";
import { gridSettings, setGridRowStyle, type GridRowStyle } from "$lib/stores/gridSettings";

describe("estilo de las filas del resultado", () => {
  it("empieza con franjas y cambia a planas y de vuelta", () => {
    expect(get(gridSettings).rowStyle).toBe("striped");
    setGridRowStyle("plain");
    expect(get(gridSettings).rowStyle).toBe("plain");
    setGridRowStyle("striped");
    expect(get(gridSettings).rowStyle).toBe("striped");
  });

  it("un valor desconocido vuelve a con franjas", () => {
    setGridRowStyle("otro" as GridRowStyle);
    expect(get(gridSettings).rowStyle).toBe("striped");
  });
});
