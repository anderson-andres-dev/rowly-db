// Cliente WebDriver minimo (W3C) sobre fetch, para hablar con tauri-driver
// sin dependencias. Solo lo que usan los flujos E2E.

const ELEMENT = "element-6066-11e4-a52e-4f735466cecc";

export const KEYS = {
  enter: "",
  escape: "",
  control: "",
  shift: "",
  tab: "",
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

  // Teclas al elemento con foco, como las pulsaria una persona. Los acordes
  // ({ chord: [KEYS.control, KEYS.enter] }) van por "Element Send Keys": con
  // las acciones de teclado, WebKitWebDriver entrega el modificador pero
  // pierde la tecla siguiente. Ahi, una tecla modificadora queda pulsada
  // hasta NULL (\uE000), como define W3C.
  async keys(...sequence) {
    for (const item of sequence) {
      const focused = await this.script("return document.activeElement");
      const element = new Element(this, elementId(focused));
      await element.type(typeof item === "string" ? item : `${item.chord.join("")}${KEYS.null}`);
    }
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
