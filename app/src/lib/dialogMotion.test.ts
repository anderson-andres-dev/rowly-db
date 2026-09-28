import { describe, expect, it } from "vitest";
import { OPEN_GRACE_MS, isBackdropClick } from "./dialogMotion";

// Un modal de 400x300 en el centro de una ventana de 1000x800.
const box = { left: 300, top: 250, right: 700, bottom: 550 };
const outsidePoint = { x: 40, y: 600 };
const insidePoint = { x: 500, y: 400 };

describe("isBackdropClick", () => {
  it("un clic en el fondo con el modal ya visible cierra", () => {
    expect(isBackdropClick({ box, down: outsidePoint, up: outsidePoint, detail: 1, openFor: 1000 })).toBe(true);
  });

  it("un segundo clic mientras el modal aparece no lo cierra", () => {
    expect(isBackdropClick({ box, down: outsidePoint, up: outsidePoint, detail: 1, openFor: 90 })).toBe(false);
    expect(isBackdropClick({ box, down: outsidePoint, up: outsidePoint, detail: 1, openFor: OPEN_GRACE_MS })).toBe(true);
  });

  it("apretar dentro y soltar afuera no lo cierra", () => {
    expect(isBackdropClick({ box, down: insidePoint, up: outsidePoint, detail: 1, openFor: 1000 })).toBe(false);
  });

  it("si el mouse no se apreto sobre el modal, no cuenta", () => {
    expect(isBackdropClick({ box, down: null, up: outsidePoint, detail: 1, openFor: 1000 })).toBe(false);
  });

  it("un clic dentro del recuadro, aunque caiga en el borde del dialogo, no cierra", () => {
    const edge = { x: 302, y: 252 };
    expect(isBackdropClick({ box, down: edge, up: edge, detail: 1, openFor: 1000 })).toBe(false);
  });

  it("un clic generado por el teclado no cierra", () => {
    expect(isBackdropClick({ box, down: outsidePoint, up: outsidePoint, detail: 0, openFor: 1000 })).toBe(false);
  });
});
