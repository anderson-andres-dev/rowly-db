import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Atajos con eventos de teclado reales sobre un window y un document
// minimos: Node no tiene DOM. Que una tecla quede "tragada" (preventDefault)
// es lo que dice si la tomo Rowly o sigue su camino (el texto, el grid, el
// shell).

interface KeyInit {
  ctrl?: boolean;
  shift?: boolean;
  inTerminal?: boolean;
}

class FakeKey extends Event {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  repeat = false;
  altKey = false;
  metaKey = false;
  isComposing = false;
  constructor(type: string, key: string, init: KeyInit = {}) {
    super(type, { cancelable: true });
    this.key = key;
    this.ctrlKey = init.ctrl ?? false;
    this.shiftKey = init.shift ?? false;
    // El despachador mira si la tecla viene de la terminal por el destino.
    if (init.inTerminal) {
      Object.defineProperty(this, "target", { value: { closest: (selector: string) => selector === "[data-terminal]" } });
    }
  }
}

const g = globalThis as unknown as Record<string, unknown>;
let cleanup: (() => void) | undefined;
let moves: string[];
let registerCommand: typeof import("./workspace/commands").registerCommand;

beforeEach(async () => {
  g.window = new EventTarget();
  g.document = new EventTarget();
  g.Element = class {};
  const zones = await import("./focusZones");
  const { installKeybindings } = await import("./keybindings");
  ({ registerCommand } = await import("./workspace/commands"));
  const uninstallZones = zones.installFocusZones(() => false);
  const uninstallKeys = installKeybindings(() => false);
  // Por encima de los de focusZones (sin zonas registradas en Node): anota
  // la direccion.
  moves = [];
  const spies = ["left", "right", "up", "down"].map((direction) =>
    registerCommand(`focus-zone-${direction}`, "global", () => void moves.push(direction)),
  );
  cleanup = () => {
    spies.forEach((spy) => spy());
    uninstallKeys();
    uninstallZones();
  };
});

afterEach(() => {
  cleanup?.();
  delete g.window;
  delete g.document;
  delete g.Element;
});

function press(key: string, init: KeyInit = {}): boolean {
  const event = new FakeKey("keydown", key, init);
  (g.window as EventTarget).dispatchEvent(event);
  return event.defaultPrevented;
}

describe("moverse entre zonas (Ctrl+Shift+flechas)", () => {
  it("cada flecha con Ctrl+Shift mueve a su zona, sin prefijo", () => {
    expect(press("ArrowLeft", { ctrl: true, shift: true })).toBe(true);
    expect(press("ArrowDown", { ctrl: true, shift: true })).toBe(true);
    expect(press("ArrowUp", { ctrl: true, shift: true })).toBe(true);
    expect(press("ArrowRight", { ctrl: true, shift: true })).toBe(true);
    expect(moves).toEqual(["left", "down", "up", "right"]);
  });

  it("las flechas sin Ctrl+Shift siguen su camino", () => {
    expect(press("ArrowDown", { ctrl: true })).toBe(false);
    expect(press("ArrowDown", { shift: true })).toBe(false);
    expect(press("ArrowDown")).toBe(false);
    expect(moves).toEqual([]);
  });

  it("tambien desde la terminal", () => {
    expect(press("ArrowUp", { ctrl: true, shift: true, inTerminal: true })).toBe(true);
    expect(moves).toEqual(["up"]);
  });
});

describe("la terminal", () => {
  it("las teclas del shell y de las IA siguen siendo suyas", () => {
    const calls: string[] = [];
    const cleanups = ["close-query-console", "query-history", "replace", "toggle-sidebar"].map((id) =>
      registerCommand(id, "global", () => void calls.push(id)),
    );
    expect(press("w", { ctrl: true, inTerminal: true })).toBe(false);
    expect(press("h", { ctrl: true, inTerminal: true })).toBe(false);
    expect(press("r", { ctrl: true, inTerminal: true })).toBe(false);
    expect(press("e", { ctrl: true, inTerminal: true })).toBe(false);
    expect(calls).toEqual([]);
    cleanups.forEach((done) => done());
  });

  it("Rowly toma Ctrl+T, Ctrl+Tab y la capa Ctrl+Shift de las sesiones", () => {
    const calls: string[] = [];
    const cleanups = ["toggle-terminal", "next-tab", "new-terminal-session", "close-terminal-session"].map((id) =>
      registerCommand(id, "global", () => void calls.push(id)),
    );
    expect(press("t", { ctrl: true, inTerminal: true })).toBe(true);
    expect(press("Tab", { ctrl: true, inTerminal: true })).toBe(true);
    expect(press("T", { ctrl: true, shift: true, inTerminal: true })).toBe(true);
    expect(press("W", { ctrl: true, shift: true, inTerminal: true })).toBe(true);
    expect(calls).toEqual(["toggle-terminal", "next-tab", "new-terminal-session", "close-terminal-session"]);
    cleanups.forEach((done) => done());
  });
});

describe("alias de fabrica", () => {
  it("Ctrl+PageDown hace lo mismo que Ctrl+Tab", () => {
    const calls: string[] = [];
    const done = registerCommand("next-tab", "global", () => void calls.push("next-tab"));
    expect(press("PageDown", { ctrl: true })).toBe(true);
    expect(press("Tab", { ctrl: true })).toBe(true);
    expect(calls).toEqual(["next-tab", "next-tab"]);
    done();
  });
});
