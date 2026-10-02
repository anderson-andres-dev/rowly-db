// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { confirmsOnEnter } from "./dialogKeys";

function key(init: KeyboardEventInit, target: HTMLElement = document.createElement("dialog")) {
  const event = new KeyboardEvent("keydown", init);
  Object.defineProperty(event, "target", { value: target });
  return event;
}

describe("Enter confirma un modal de confirmacion", () => {
  it("Enter solo confirma", () => {
    expect(confirmsOnEnter(key({ key: "Enter" }))).toBe(true);
  });

  it("el Ctrl+Enter que lo abrio, mantenido, no confirma", () => {
    expect(confirmsOnEnter(key({ key: "Enter", ctrlKey: true }))).toBe(false);
    expect(confirmsOnEnter(key({ key: "Enter", metaKey: true }))).toBe(false);
    expect(confirmsOnEnter(key({ key: "Enter", repeat: true }))).toBe(false);
  });

  it("con el foco en un boton, decide el boton", () => {
    expect(confirmsOnEnter(key({ key: "Enter" }, document.createElement("button")))).toBe(false);
  });

  it("otras teclas y la composicion de texto no confirman", () => {
    expect(confirmsOnEnter(key({ key: "Escape" }))).toBe(false);
    expect(confirmsOnEnter(key({ key: "Enter", isComposing: true }))).toBe(false);
  });
});
