import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Atajos con eventos de teclado reales sobre un window y un document
// minimos: Node no tiene DOM. Que una tecla quede "tragada" (preventDefault)
// es lo que dice si la tomo Rowly o sigue su camino (el texto, el grid, el
// shell).

interface KeyInit {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  code?: string;
  repeat?: boolean;
  inTerminal?: boolean;
}

class FakeKey extends Event {
  key: string;
  code: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
  altKey: boolean;
  metaKey = false;
  isComposing = false;
  constructor(type: string, key: string, init: KeyInit = {}) {
    super(type, { cancelable: true });
    this.key = key;
    this.ctrlKey = init.ctrl ?? false;
    this.shiftKey = init.shift ?? false;
    this.altKey = init.alt ?? false;
    this.code = init.code ?? "";
    this.repeat = init.repeat ?? false;
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

function release(key: string) {
  (g.window as EventTarget).dispatchEvent(new FakeKey("keyup", key));
}

describe("moverse entre zonas (Ctrl+Shift+Alt+flechas)", () => {
  it("cada flecha con Ctrl+Shift+Alt mueve a su zona, sin prefijo", () => {
    const all = { ctrl: true, shift: true, alt: true };
    expect(press("ArrowLeft", all)).toBe(true);
    expect(press("ArrowDown", all)).toBe(true);
    expect(press("ArrowUp", all)).toBe(true);
    expect(press("ArrowRight", all)).toBe(true);
    expect(moves).toEqual(["left", "down", "up", "right"]);
  });

  it("las flechas con menos modificadores siguen su camino (seleccionar por palabra, etc.)", () => {
    expect(press("ArrowDown", { ctrl: true, shift: true })).toBe(false);
    expect(press("ArrowDown", { ctrl: true })).toBe(false);
    expect(press("ArrowDown", { shift: true })).toBe(false);
    expect(press("ArrowDown")).toBe(false);
    expect(moves).toEqual([]);
  });

  it("tambien desde la terminal", () => {
    expect(press("ArrowUp", { ctrl: true, shift: true, alt: true, inTerminal: true })).toBe(true);
    expect(moves).toEqual(["up"]);
  });
});

function hold() {
  press("Control", { ctrl: true });
  press("Shift", { ctrl: true, shift: true });
  press("Alt", { ctrl: true, shift: true, alt: true });
}

function letGo() {
  release("Alt");
  release("Shift");
  release("Control");
}

describe("modo mover (Ctrl+Shift+Alt sostenidos)", () => {
  it("la flecha cambia de zona aunque el evento llegue sin modificadores, y no sigue al arbol", () => {
    hold();
    expect(press("ArrowDown")).toBe(true);
    expect(press("ArrowLeft", { ctrl: true })).toBe(true);
    release("Alt");
    expect(press("ArrowDown", { ctrl: true, shift: true })).toBe(false);
    release("Shift");
    release("Control");
    expect(press("ArrowDown")).toBe(false);
  });

  it("Ctrl+Shift sin Alt no activa la capa: Tab y las letras son del editor", () => {
    press("Control", { ctrl: true });
    press("Shift", { ctrl: true, shift: true });
    expect(press("Tab")).toBe(false);
    expect(press("x")).toBe(false);
    release("Shift");
    release("Control");
  });

  it("con la capa, una tecla que no es de ningun atajo (Tab, una letra) sigue su camino", () => {
    hold();
    expect(press("Tab")).toBe(false);
    expect(press("x")).toBe(false);
    letGo();
  });

  it("perder la ventana suelta los modificadores", () => {
    hold();
    (g.window as EventTarget).dispatchEvent(new Event("blur"));
    expect(press("ArrowDown")).toBe(false);
  });
});

describe("la terminal", () => {
  it("permite separar y reunir mosaicos sin enviar los atajos al shell", () => {
    const calls: string[] = [];
    const cleanups = ["tile-console", "untile-console"].map(id =>
      registerCommand(id, "global", () => void calls.push(id)),
    );
    expect(press("m", { ctrl: true, alt: true, inTerminal: true })).toBe(true);
    expect(press("w", { ctrl: true, alt: true, inTerminal: true })).toBe(true);
    expect(calls).toEqual(["tile-console", "untile-console"]);
    cleanups.forEach(done => done());
  });
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

describe("zonas con piezas (consolas en mosaico)", () => {
  it("el navegador de la zona va primero; en el borde, la zona vecina", async () => {
    const { moveFocus, setZoneNavigator } = await import("./focusZones");
    const piece = {};
    const asked: string[] = [];
    let edge = false;
    const done = setZoneNavigator("editor", (direction) => {
      asked.push(direction);
      return edge ? null : (piece as unknown as HTMLElement);
    });
    // Sin foco en ninguna zona se parte del editor.
    moveFocus("left");
    expect(asked).toEqual(["left"]);
    edge = true;
    moveFocus("right");
    expect(asked).toEqual(["left", "right"]);
    done();
    moveFocus("left");
    expect(asked).toEqual(["left", "right"]);
  });
});

describe("lo que manda WebKitGTK (medido con el teclado real)", () => {
  it("Ctrl+Shift+Tab llega con key Unidentified: cuenta por su code", () => {
    const calls: string[] = [];
    const done = registerCommand("previous-tab", "global", () => void calls.push("previous-tab"));
    expect(press("Unidentified", { ctrl: true, shift: true, code: "Tab" })).toBe(true);
    expect(calls).toEqual(["previous-tab"]);
    done();
  });

  it("con Ctrl+Shift sostenidos, la repeticion de Tab sin modificadores sigue siendo el atajo", () => {
    const calls: string[] = [];
    const done = registerCommand("previous-tab", "global", () => void calls.push("previous-tab"));
    press("Control", { ctrl: true, code: "ControlLeft" });
    press("Shift", { ctrl: true, shift: true, code: "ShiftLeft" });
    expect(press("Tab", { code: "Tab", repeat: true })).toBe(true);
    expect(calls).toEqual(["previous-tab"]);
    // Soltar Shift llega como CapsLock, pero con su code.
    (g.window as EventTarget).dispatchEvent(Object.assign(new FakeKey("keyup", "CapsLock", { code: "ShiftLeft" })));
    (g.window as EventTarget).dispatchEvent(Object.assign(new FakeKey("keyup", "Control", { code: "ControlLeft" })));
    expect(press("Tab", { code: "Tab" })).toBe(false);
    done();
  });

  it("perder la ventana suelta los modificadores fisicos", () => {
    press("Control", { ctrl: true, code: "ControlLeft" });
    (g.window as EventTarget).dispatchEvent(new Event("blur"));
    expect(press("Tab", { code: "Tab" })).toBe(false);
  });
});
