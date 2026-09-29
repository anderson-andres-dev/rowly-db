import { describe, expect, it } from "vitest";
import { buildCmTheme } from "$lib/theming/codemirrorTheme";
import { THEME_FAMILIES, themeVariant } from "$lib/theming/palettes";

// Cada tema nuevo agrega reglas CSS al documento que CodeMirror no quita
// nunca: montar un editor por pestaña no puede crear uno cada vez (tras
// horas de uso se acumulaban decenas de miles de reglas).
describe("buildCmTheme", () => {
  it("la misma paleta y esquema dan el mismo tema, aunque la paleta sea otra copia", () => {
    for (const { id } of THEME_FAMILIES) {
      for (const scheme of ["dark", "light"] as const) {
        const palette = themeVariant(id, scheme).editor;
        const first = buildCmTheme(palette, scheme);
        expect(buildCmTheme(palette, scheme)).toBe(first);
        expect(buildCmTheme({ ...palette }, scheme)).toBe(first);
      }
    }
  });

  it("otra paleta u otro esquema, otro tema", () => {
    const palette = themeVariant(THEME_FAMILIES[0].id, "dark").editor;
    expect(buildCmTheme({ ...palette, keyword: "#123456" }, "dark")).not.toBe(buildCmTheme(palette, "dark"));
    expect(buildCmTheme(palette, "light")).not.toBe(buildCmTheme(palette, "dark"));
  });
});
