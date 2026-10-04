import { describe, expect, it } from "vitest";
import { initials, readableTextColor } from "$lib/connections/connectionIdentity";

describe("initials", () => {
  it("toma la inicial de las dos primeras palabras", () => {
    expect(initials("Core test")).toBe("CT");
    expect(initials("billing_prod replica")).toBe("BP");
  });

  it("usa las dos primeras letras de un nombre de una palabra", () => {
    expect(initials("core")).toBe("CO");
    expect(initials("  ")).toBe("?");
  });
});

describe("readableTextColor", () => {
  it("elige texto claro sobre colores oscuros y oscuro sobre claros", () => {
    expect(readableTextColor("#3b82f6")).toBe("#ffffff");
    expect(readableTextColor("#000000")).toBe("#ffffff");
    expect(readableTextColor("#eab308")).toBe("#111827");
    expect(readableTextColor("#ffffff")).toBe("#111827");
  });
});
