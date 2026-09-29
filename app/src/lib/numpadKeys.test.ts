import { describe, expect, it } from "vitest";
import { numpadText } from "./numpadKeys";

const key = (code: string, value: string, mods: Partial<KeyboardEvent> = {}) => ({
  code,
  key: value,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...mods,
});

describe("numpadText", () => {
  it("devuelve el digito cuando el keypad llega como navegacion", () => {
    expect(numpadText(key("Numpad1", "End"))).toBe("1");
    expect(numpadText(key("Numpad8", "ArrowUp"))).toBe("8");
    expect(numpadText(key("Numpad0", "Insert"))).toBe("0");
    expect(numpadText(key("NumpadDecimal", "Delete"))).toBe(".");
  });

  it("no toca lo que ya llega bien", () => {
    expect(numpadText(key("Numpad1", "1"))).toBeNull();
    expect(numpadText(key("NumpadDecimal", ","))).toBeNull();
    expect(numpadText(key("End", "End"))).toBeNull();
    expect(numpadText(key("Digit1", "1"))).toBeNull();
  });

  it("respeta los atajos con modificadores", () => {
    expect(numpadText(key("Numpad1", "End", { ctrlKey: true }))).toBeNull();
  });
});
