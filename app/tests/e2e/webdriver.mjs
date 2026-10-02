import { execFileSync } from "node:child_process";

// Cliente WebDriver minimo (W3C) sobre fetch, para hablar con tauri-driver
// sin dependencias. Solo lo que usan los flujos E2E.

const ELEMENT = "element-6066-11e4-a52e-4f735466cecc";

export const KEYS = {
  null: "\uE000",
  backspace: "\uE003",
  tab: "\uE004",
  enter: "\uE007",
  shift: "\uE008",
  control: "\uE009",
  escape: "\uE00C",
};

export class Session {
  constructor(base, id) {
    this.base = base;
    this.id = id;
  }

  static async start(base, application, args = []) {
    const response = await request(base, "POST", "/session", {
      capabilities: { alwaysMatch: { "tauri:options": { application, args } } },
    });
    return new Session(base, response.sessionId);
  }

  command(method, path, body) {
    return request(this.base, method, `/session/${this.id}${path}`, body);
  }

  async quit() {
    await this.command("DELETE", "").catch(() => {});
  }

  script(source, ...args) {
    return this.command("POST", "/execute/sync", { script: source, args });
  }

  async find(css, { timeout = 15000 } = {}) {
    const deadline = Date.now() + timeout;
    let last;
    while (Date.now() < deadline) {
      try {
        const found = await this.command("POST", "/element", { using: "css selector", value: css });
        return new Element(this, elementId(found));
      } catch (error) {
        last = error;
        await sleep(100);
      }
    }
    throw new Error(`no aparecio "${css}" en ${timeout} ms: ${last?.message ?? ""}`);
  }

  // El elemento que devuelve un script (o null): para elegir por contenido.
  async findBy(description, source, ...args) {
    const found = await this.waitFor(description, () => this.script(source, ...args));
    return new Element(this, elementId(found));
  }

  async absent(css, { timeout = 15000 } = {}) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const count = await this.script(`return document.querySelectorAll(arguments[0]).length`, css);
      if (count === 0) return;
      await sleep(100);
    }
    throw new Error(`"${css}" sigue en pantalla tras ${timeout} ms`);
  }

  async waitFor(description, check, { timeout = 15000 } = {}) {
    const deadline = Date.now() + timeout;
    let value;
    while (Date.now() < deadline) {
      value = await check();
      if (value) return value;
      await sleep(100);
    }
    throw new Error(`${description}: no se cumplio en ${timeout} ms (ultimo valor: ${JSON.stringify(value)})`);
  }

  // Teclas al elemento con foco. El texto va por "Element Send Keys". Los
  // acordes ({ chord: [KEYS.control, KEYS.enter] }) van como eventos X11
  // reales (xdotool, XTEST) a la ventana de la app: WebKitWebDriver pierde o
  // desfigura la tecla que acompaña al modificador ("Unidentified").
  async keys(...sequence) {
    for (const item of sequence) {
      if (typeof item === "string" && X11_KEYS[item]) {
        await this.x11([item]);
      } else if (typeof item === "string") {
        const focused = await this.script("return document.activeElement");
        await new Element(this, elementId(focused)).type(item);
      } else {
        await this.x11(item.chord);
      }
    }
  }

  // Un acorde X11 cuenta como entregado cuando la pagina ve su tecla
  // principal, al bajar o al subir (window.__e2eSeen, el registro que instala
  // run.mjs). Si no llega, la ventana no tenia el foco de X: se repite, y a la
  // tercera se detiene diciendo quien lo tenia. Sin registro no hay como
  // comprobarlo.
  async x11(chord) {
    const last = chord[chord.length - 1];
    const key = DOM_KEYS[last] ?? last;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const before = await this.script("return window.__e2eSeen?.length ?? null");
      x11Chord(chord);
      if (before === null) {
        await sleep(100);
        return;
      }
      const deadline = Date.now() + 1000;
      while (Date.now() < deadline) {
        const seen = await this.script(
          "return window.__e2eSeen.slice(arguments[0]).includes(arguments[1])",
          before,
          key,
        );
        if (seen) {
          await sleep(100);
          return;
        }
        await sleep(50);
      }
    }
    throw new Error(`la tecla ${x11Combo(chord)} no llego a la app en 3 intentos; foco de X: ${x11Focus()}`);
  }
}

const X11_KEYS = { [KEYS.control]: "ctrl", [KEYS.shift]: "shift", [KEYS.enter]: "Return", [KEYS.escape]: "Escape" };
// event.key que ve la pagina para cada tecla especial.
const DOM_KEYS = { [KEYS.enter]: "Enter", [KEYS.escape]: "Escape" };

const x11Combo = (chord) => chord.map((key) => X11_KEYS[key] ?? key).join("+");

function x11Chord(chord) {
  execFileSync("xdotool", [
    "search", "--sync", "--onlyvisible", "--name", "^Rowly DB$", "windowfocus", "--sync",
    "key", "--clearmodifiers", x11Combo(chord),
  ]);
}

function x11Focus() {
  try {
    return execFileSync("xdotool", ["getwindowfocus", "getwindowname"], { encoding: "utf8" }).trim();
  } catch (error) {
    return `desconocido (${error.message.split("\n")[0]})`;
  }
}

export class Element {
  constructor(session, id) {
    this.session = session;
    this.id = id;
  }

  click() {
    return this.session.command("POST", `/element/${this.id}/click`, {});
  }

  // Doble clic real del puntero en el centro del elemento.
  async doubleClick() {
    const origin = { [ELEMENT]: this.id };
    const click = [{ type: "pointerDown", button: 0 }, { type: "pointerUp", button: 0 }];
    await this.session.command("POST", "/actions", {
      actions: [
        {
          type: "pointer",
          id: "mouse",
          parameters: { pointerType: "mouse" },
          actions: [{ type: "pointerMove", origin, x: 0, y: 0 }, ...click, ...click],
        },
      ],
    });
    await this.session.command("DELETE", "/actions");
  }

  type(text) {
    return this.session.command("POST", `/element/${this.id}/value`, { text });
  }

  async text() {
    return await this.session.command("GET", `/element/${this.id}/text`);
  }
}

// W3C usa la clave ELEMENT; algunos drivers devuelven otra (o la vieja "ELEMENT").
export function elementId(found) {
  const id = found?.[ELEMENT] ?? found?.ELEMENT ?? Object.values(found ?? {})[0];
  if (typeof id !== "string") throw new Error(`referencia de elemento ilegible: ${JSON.stringify(found)}`);
  return id;
}

async function request(base, method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.value?.error) {
    throw new Error(`${method} ${path}: ${json.value?.error ?? response.status} ${json.value?.message ?? ""}`);
  }
  return json.value;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
