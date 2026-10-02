// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { blocksHeldEnter, confirmsOnEnter, moveDialogActionFocus } from "./dialogKeys";

function key(init: KeyboardEventInit, target: HTMLElement = document.createElement("dialog")) {
  const event = new KeyboardEvent("keydown", init);
  Object.defineProperty(event, "target", { value: target });
  return event;
}

describe("Enter confirma un modal de confirmacion", () => {
  it("Enter solo confirma", () => {
    expect(confirmsOnEnter(key({ key: "Enter" }))).toBe(true);
  });

  it("Enter con modificadores o mantenido no confirma", () => {
    expect(confirmsOnEnter(key({ key: "Enter", ctrlKey: true }))).toBe(false);
    expect(confirmsOnEnter(key({ key: "Enter", metaKey: true }))).toBe(false);
    expect(confirmsOnEnter(key({ key: "Enter", altKey: true }))).toBe(false);
    expect(confirmsOnEnter(key({ key: "Enter", shiftKey: true }))).toBe(false);
    expect(confirmsOnEnter(key({ key: "Enter", repeat: true }))).toBe(false);
  });

  it("con el foco en un boton, decide el boton", () => {
    expect(confirmsOnEnter(key({ key: "Enter" }, document.createElement("button")))).toBe(false);
  });

  it("otras teclas y la composicion de texto no confirman", () => {
    expect(confirmsOnEnter(key({ key: "Escape" }))).toBe(false);
    expect(confirmsOnEnter(key({ key: "Enter", isComposing: true }))).toBe(false);
  });

  it("Enter modificado, mantenido o en composicion no activa el boton enfocado", () => {
    const button = document.createElement("button");
    expect(blocksHeldEnter(key({ key: "Enter", ctrlKey: true }, button))).toBe(true);
    expect(blocksHeldEnter(key({ key: "Enter", metaKey: true }, button))).toBe(true);
    expect(blocksHeldEnter(key({ key: "Enter", altKey: true }, button))).toBe(true);
    expect(blocksHeldEnter(key({ key: "Enter", shiftKey: true }, button))).toBe(true);
    expect(blocksHeldEnter(key({ key: "Enter", repeat: true }, button))).toBe(true);
    expect(blocksHeldEnter(key({ key: "Enter", isComposing: true }, button))).toBe(true);
    expect(blocksHeldEnter(key({ key: "Enter" }, button))).toBe(false);
    expect(blocksHeldEnter(key({ key: "Escape", ctrlKey: true }, button))).toBe(false);
  });
});

describe("flechas entre acciones del dialogo", () => {
  it("mueve el foco en ambas direcciones y Enter queda en el boton elegido", () => {
    const actions = document.createElement("div");
    actions.dataset.dialogActions = "";
    const cancel = document.createElement("button");
    const confirm = document.createElement("button");
    actions.append(cancel, confirm);
    document.body.append(actions);
    try {
      confirm.focus();
      const toCancel = key({ key: "ArrowLeft", cancelable: true }, confirm);
      expect(moveDialogActionFocus(toCancel)).toBe(true);
      expect(toCancel.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(cancel);
      expect(confirmsOnEnter(key({ key: "Enter" }, cancel))).toBe(false);

      const toConfirm = key({ key: "ArrowRight", cancelable: true }, cancel);
      expect(moveDialogActionFocus(toConfirm)).toBe(true);
      expect(toConfirm.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(confirm);
    } finally {
      actions.remove();
    }
  });

  it("ignora modificadores, campos y botones deshabilitados", () => {
    const actions = document.createElement("div");
    actions.dataset.dialogActions = "";
    const cancel = document.createElement("button");
    const disabled = document.createElement("button");
    disabled.disabled = true;
    const confirm = document.createElement("button");
    const input = document.createElement("input");
    actions.append(cancel, disabled, confirm, input);
    document.body.append(actions);
    try {
      cancel.focus();
      expect(moveDialogActionFocus(key({ key: "ArrowRight", ctrlKey: true }, cancel))).toBe(false);
      expect(moveDialogActionFocus(key({ key: "ArrowRight" }, input))).toBe(false);
      expect(document.activeElement).toBe(cancel);
      expect(moveDialogActionFocus(key({ key: "ArrowRight" }, cancel))).toBe(true);
      expect(document.activeElement).toBe(confirm);
    } finally {
      actions.remove();
    }
  });
});
