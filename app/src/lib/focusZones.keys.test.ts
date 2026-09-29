import { afterEach, beforeEach, describe, expect, it } from "vitest";

// El modo mover (Ctrl+W) con eventos de teclado reales sobre un window y un
// document minimos: Node no tiene DOM. Que una tecla quede "tragada"
// (preventDefault) es lo que dice si fue al modo mover o sigue su camino
// (el texto, el grid).

class FakeKey extends Event {
  key: string;
  ctrlKey: boolean;
  repeat: boolean;
  altKey = false;
  metaKey = false;
  shiftKey = false;
  isComposing = false;
  constructor(type: string, key: string, init: { ctrl?: boolean; repeat?: boolean } = {}) {
    super(type, { cancelable: true });
    this.key = key;
    this.ctrlKey = init.ctrl ?? false;
    this.repeat = init.repeat ?? false;
  }
}

const g = globalThis as unknown as Record<string, unknown>;
let cleanup: (() => void) | undefined;
let runCommand: (id: string, zone: null) => boolean;

beforeEach(async () => {
  g.window = new EventTarget();
  g.document = new EventTarget();
  g.Element = class {};
  const zones = await import("./focusZones");
  ({ runCommand } = await import("./commands"));
  cleanup = zones.installFocusZones(() => false);
});

afterEach(() => {
  cleanup?.();
  delete g.window;
  delete g.document;
  delete g.Element;
});

const win = () => g.window as EventTarget;

function press(key: string, init: { ctrl?: boolean; repeat?: boolean } = {}): boolean {
  const event = new FakeKey("keydown", key, init);
  win().dispatchEvent(event);
  return event.defaultPrevented;
}

function release(key: string) {
  win().dispatchEvent(new FakeKey("keyup", key));
}

// Ctrl+W: el despachador de atajos corre el comando del prefijo.
function prefix() {
  press("Control", { ctrl: true });
  press("w", { ctrl: true });
  runCommand("focus-zone-prefix", null);
}

describe("modo mover (Ctrl+W)", () => {
  it("con Ctrl apretado, cada flecha va al modo mover hasta soltar Ctrl", () => {
    prefix();
    expect(press("ArrowDown", { ctrl: true })).toBe(true);
    expect(press("ArrowRight", { ctrl: true })).toBe(true);
    release("Control");
    expect(press("ArrowDown")).toBe(false);
  });

  it("la W que se repite mientras se mantiene no corta el modo", () => {
    prefix();
    expect(press("w", { ctrl: true, repeat: true })).toBe(true);
    expect(press("w", { ctrl: true, repeat: true })).toBe(true);
    expect(press("ArrowUp", { ctrl: true })).toBe(true);
    expect(press("w", { ctrl: true, repeat: true })).toBe(true);
    expect(press("ArrowLeft", { ctrl: true })).toBe(true);
  });

  it("mantener una flecha no se escapa al texto (la repeticion tambien se traga)", () => {
    prefix();
    expect(press("ArrowDown", { ctrl: true })).toBe(true);
    expect(press("ArrowDown", { ctrl: true, repeat: true })).toBe(true);
  });

  it("aunque el evento pierda ctrlKey, cuenta el Ctrl que sigue apretado", () => {
    prefix();
    expect(press("ArrowDown", { ctrl: false })).toBe(true);
    expect(press("ArrowDown", { ctrl: false })).toBe(true);
  });

  it("Ctrl+W, soltar Ctrl y una flecha: mueve una vez y termina", () => {
    prefix();
    release("Control");
    expect(press("ArrowDown")).toBe(true);
    expect(press("ArrowDown")).toBe(false);
  });

  it("otra tecla termina el modo y sigue su camino", () => {
    prefix();
    expect(press("a", { ctrl: true })).toBe(false);
    expect(press("ArrowDown", { ctrl: true })).toBe(false);
  });

  it("perder el foco de la ventana cancela el modo y olvida el Ctrl", () => {
    prefix();
    win().dispatchEvent(new Event("blur"));
    expect(press("ArrowDown")).toBe(false);
  });

  it("sin Ctrl+W, las flechas no se tocan", () => {
    expect(press("ArrowDown", { ctrl: true })).toBe(false);
    expect(press("ArrowDown")).toBe(false);
  });
});
