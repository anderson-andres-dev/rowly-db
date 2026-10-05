// Recorridos criticos en la app real (tauri-driver + WebKitWebDriver).
//
//   node tests/e2e/run.mjs --app <binario> [--tauri-driver tauri-driver]
//
// Cada recorrido arranca su propio tauri-driver con un perfil vacio
// (XDG_* en un directorio temporal): no depende de lo que dejo el anterior.
// Necesita un display X (xvfb-run), su propio bus de sesion (dbus-run-session;
// ver e2e.yml) y xdotool para los acordes.
//
// Necesita un MySQL desechable en E2E_MYSQL_PORT (por defecto 3306) con
// root/rowly; el propio script crea la base `rowly_e2e`. Nunca se apunta a una
// base de usuario: cada recorrido borra y recrea sus datos.
//
// Cada recorrido demuestra una propiedad visible por teclado, de punta a punta
// (UI -> IPC -> guard del backend -> servidor):
//   - conectar con un perfil y ejecutar una consulta (Ctrl+Enter)
//   - un DELETE sin WHERE pide confirmacion; Escape lo cancela y no toca datos;
//     Enter lo confirma y se ejecuta (SQL_ENGINE S3)
//   - en produccion toda escritura pide confirmacion en la app real (S7),
//     tambien los cambios del grid, que el backend rechaza sin ella
//   - contar el total pasa por el guard del backend y cuenta en la base
//   - el texto de la consola sobrevive a reiniciar la app
//
// Los ciclos de recursos (reconexiones, memoria) estan en resources.mjs.

import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { KEYS, Session, sleep } from "./webdriver.mjs";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const APP = option("--app");
const TAURI_DRIVER = option("--tauri-driver", "tauri-driver");
const DRIVER = "http://127.0.0.1:4444";
const PORT = Number(process.env.E2E_MYSQL_PORT ?? 3306);
const MYSQL = process.env.E2E_MYSQL_CLI ?? "mysql";
if (!APP) throw new Error("falta --app <binario>");

function sql(statement) {
  return execFileSync(MYSQL, ["-h127.0.0.1", `-P${PORT}`, "-uroot", "-prowly", "-N", "-e", statement], {
    encoding: "utf8",
  }).trim();
}

function resetData() {
  sql(
    "DROP DATABASE IF EXISTS rowly_e2e; CREATE DATABASE rowly_e2e; " +
      "CREATE TABLE rowly_e2e.victim (id INT PRIMARY KEY, name VARCHAR(20)); " +
      "INSERT INTO rowly_e2e.victim VALUES (1,'uno'),(2,'dos'),(3,'tres');",
  );
}

const count = () => Number(sql("SELECT COUNT(*) FROM rowly_e2e.victim"));

function profile(id, name, environment) {
  return {
    id,
    name,
    driver: "mysql",
    host: "127.0.0.1",
    port: PORT,
    database: "rowly_e2e",
    username: "root",
    passwordPolicy: "never",
    tlsMode: "disabled",
    environment,
  };
}

async function seedProfiles(session, profiles) {
  await session.script(
    `localStorage.setItem("khipu:connection-profiles", arguments[0]); location.reload();`,
    JSON.stringify(profiles),
  );
  await sleep(500);
}

async function connect(session, name) {
  const card = await session.findBy(
    `la tarjeta "${name}"`,
    `return [...document.querySelectorAll(".card-main")].find((card) => card.textContent.includes(arguments[0])) ?? null`,
    name,
  );
  await card.click();
  // Perfil sin contrasena guardada: la app abre el formulario para pedirla.
  await (await session.find("#password")).type("rowly");
  await (await session.find('form button[type="submit"]')).click();
  await session.find(".cm-content", { timeout: 30000 });
  // Para el diagnostico de un fallo (que tecla llego y a que elemento) y para
  // comprobar la entrega de los acordes.
  await session.script(`
    window.__e2eKeys = [];
    // Las teclas principales recibidas, al bajar o al subir: con esto
    // webdriver.mjs comprueba que un acorde X11 llego. Con Ctrl+A, WebKitGTK
    // consume el keydown de la "a" y la pagina solo ve su keyup.
    window.__e2eSeen = [];
    for (const type of ["keydown", "keyup"]) {
      window.addEventListener(type, (e) => {
        const t = e.target;
        if (!["Control", "Shift", "Alt", "Meta"].includes(e.key)) window.__e2eSeen.push(e.key);
        window.__e2eKeys.push(type[3] + ":" + (e.ctrlKey ? "Ctrl+" : "") + e.key + "@" + (t.className || t.tagName));
        if (window.__e2eKeys.length > 80) window.__e2eKeys.shift();
      }, true);
    }
  `);
}

async function editorText(session) {
  return await session.script(`return document.querySelector(".cm-content")?.innerText ?? ""`);
}

// Reemplaza el texto de la consola escribiendolo con el teclado.
async function write(session, text) {
  await (await session.find(".cm-content")).click();
  await session.keys({ chord: [KEYS.control, "a"] }, KEYS.backspace);
  await session.keys(text);
  // Escape solo si quedo abierto el autocompletado: sin el, Escape saca el
  // foco del editor y Ctrl+Enter ya no ejecuta.
  await sleep(200);
  const popup = await session.script(`return !!document.querySelector(".cm-tooltip-autocomplete")`);
  if (popup) await session.keys(KEYS.escape);
}

async function run(session, text) {
  await write(session, text);
  await sleep(300);
  await session.keys({ chord: [KEYS.control, KEYS.enter] });
}

async function gridText(session) {
  return await session.script(`return document.querySelector('[role="grid"]')?.innerText ?? ""`);
}

const flows = [];
const flow = (name, body) => flows.push({ name, body });

flow("conectar y ejecutar una consulta con Ctrl+Enter", async (session) => {
  await seedProfiles(session, [profile("e2e-local", "E2E local", "local")]);
  await connect(session, "E2E local");
  await run(session, "SELECT name FROM victim ORDER BY id");
  await session.waitFor("las filas en el grid", async () => /uno[\s\S]*dos[\s\S]*tres/.test(await gridText(session)));
});

flow("DELETE sin WHERE: Escape cancela sin tocar datos y Enter confirma", async (session) => {
  await seedProfiles(session, [profile("e2e-local", "E2E local", "local")]);
  await connect(session, "E2E local");
  await run(session, "DELETE FROM victim");
  await session.find("dialog.execution-guard[open]");
  await session.keys(KEYS.escape);
  await session.absent("dialog.execution-guard[open]");
  await sleep(500);
  if (count() !== 3) throw new Error(`Escape no debia borrar: quedan ${count()} filas`);

  await run(session, "DELETE FROM victim");
  await session.find("dialog.execution-guard[open]");
  await session.keys(KEYS.enter);
  await session.waitFor("el DELETE confirmado", async () => count() === 0);
});

flow("produccion: una escritura pide confirmacion en la app real", async (session) => {
  await seedProfiles(session, [profile("e2e-prod", "E2E produccion", "production")]);
  await connect(session, "E2E produccion");
  await run(session, "SELECT name FROM victim ORDER BY id");
  await session.waitFor("la lectura sin confirmar", async () => /uno/.test(await gridText(session)));
  await run(session, "INSERT INTO victim VALUES (4, 'cuatro')");
  await session.find("dialog.execution-guard[open]");
  await sleep(300);
  if (count() !== 3) throw new Error("la escritura en produccion corrio antes de confirmar");
  await session.keys(KEYS.escape);
  await session.absent("dialog.execution-guard[open]");
  if (count() !== 3) throw new Error("Escape no debia escribir en produccion");
});

flow("produccion: editar el grid se aplica solo tras confirmar la vista previa", async (session) => {
  await seedProfiles(session, [profile("e2e-prod", "E2E produccion", "production")]);
  await connect(session, "E2E produccion");
  await run(session, "SELECT id, name FROM victim ORDER BY id");
  // Enter sobre la celda con foco la selecciona y abre su editor, como al
  // llegar a ella con el teclado. (WebKitWebDriver no acepta un elemento
  // como origen de una accion de puntero, y el doble clic no es lo que se
  // prueba aqui.)
  await session.waitFor("la celda 'uno' con foco", () =>
    session.script(`
      const cell = [...document.querySelectorAll('[role="grid"] td')].find((td) => td.textContent.trim() === "uno");
      cell?.focus();
      return !!cell && document.activeElement === cell;
    `),
  );
  await session.keys(KEYS.enter);
  await session.find(".cell-editor");
  await session.keys({ chord: [KEYS.control, "a"] }, "UNO", KEYS.enter);
  await session.keys({ chord: [KEYS.control, KEYS.enter] });
  await session.find("dialog.changes-dialog[open]");
  await session.keys(KEYS.escape);
  await session.absent("dialog.changes-dialog[open]");
  if (sql("SELECT name FROM rowly_e2e.victim WHERE id = 1") !== "uno") throw new Error("se aplico sin confirmar");
  await session.keys({ chord: [KEYS.control, KEYS.enter] });
  await session.find("dialog.changes-dialog[open]");
  await session.keys(KEYS.enter);
  await session.waitFor("el cambio confirmado", async () => sql("SELECT name FROM rowly_e2e.victim WHERE id = 1") === "UNO");
});

flow("contar el total: el backend lo clasifica y lo cuenta en la base", async (session) => {
  // Mas filas que la pagina (500): el total no se conoce hasta contarlo.
  sql(
    "CREATE TABLE rowly_e2e.many (id INT PRIMARY KEY); " +
      "INSERT INTO rowly_e2e.many SELECT i FROM (WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 600) SELECT i FROM n) AS series;",
  );
  await seedProfiles(session, [profile("e2e-local", "E2E local", "local")]);
  await connect(session, "E2E local");
  await run(session, "SELECT id FROM many ORDER BY id");
  const count = await session.find(".total-button");
  await count.click();
  await session.waitFor("el total contado", async () =>
    (await session.script(`return document.querySelector(".total")?.textContent ?? ""`)).replace(/\D/g, "") === "600",
  );
});

flow("el texto de la consola sobrevive a reiniciar la app", async (session, restart) => {
  await seedProfiles(session, [profile("e2e-local", "E2E local", "local")]);
  await connect(session, "E2E local");
  const marker = `SELECT 'rowly-e2e-${Date.now()}' AS persisted`;
  await write(session, marker);
  await sleep(2000); // el volcado del texto va con retardo
  const next = await restart();
  await connect(next, "E2E local");
  await next.waitFor("el texto recuperado", async () => (await editorText(next)).includes(marker.slice(8)));
  return next;
});

async function startDriver(profile) {
  const env = {
    ...process.env,
    XDG_DATA_HOME: join(profile, "data"),
    XDG_CONFIG_HOME: join(profile, "config"),
    XDG_CACHE_HOME: join(profile, "cache"),
  };
  const driver = spawn(TAURI_DRIVER, ["--port", "4444"], { env, stdio: "ignore" });
  for (let i = 0; i < 100; i += 1) {
    if (await fetch(`${DRIVER}/status`).then((r) => r.ok, () => false)) return driver;
    await sleep(100);
  }
  throw new Error("tauri-driver no respondio en 10 s");
}

// Termina las instancias de la app que queden del recorrido y espera a que
// salgan: cerrar la sesion y tauri-driver no siempre las cierra, y una que
// sigue viva escribe en el perfil mientras se borra y en el siguiente
// recorrido. El patron va anclado al principio: la linea de comandos de este
// script tambien contiene la ruta de la app.
async function stopApp() {
  const pattern = `^${APP.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`;
  const alive = () => {
    try {
      execFileSync("pgrep", ["-f", pattern]);
      return true;
    } catch {
      return false;
    }
  };
  for (const signal of ["TERM", "KILL"]) {
    if (!alive()) return;
    execFileSync("pkill", [`-${signal}`, "-f", pattern], { stdio: "ignore" });
    for (let i = 0; i < 50 && alive(); i += 1) await sleep(100);
  }
  if (alive()) throw new Error("la app no termino tras SIGKILL");
}

// E2E_ONLY=<texto>: solo los recorridos cuyo nombre lo contiene (para
// diagnosticar uno sin correr todos).
const only = process.env.E2E_ONLY;
let failures = 0;
for (const { name, body } of flows.filter((candidate) => !only || candidate.name.includes(only))) {
  resetData();
  const profile = mkdtempSync(join(tmpdir(), "rowly-e2e-"));
  const driver = await startDriver(profile);
  let session = await Session.start(DRIVER, APP);
  const restart = async () => {
    await session.quit();
    await sleep(1000);
    session = await Session.start(DRIVER, APP);
    return session;
  };
  const started = Date.now();
  try {
    await body(session, restart);
    console.log(`ok    ${name} (${Date.now() - started} ms)`);
  } catch (error) {
    failures += 1;
    console.log(`FALLO ${name}\n      ${error.message}`);
    const html = await session.script(`return document.body.innerText.slice(0, 2000)`).catch(() => "");
    console.log(`      pantalla: ${String(html).replace(/\s+/g, " ").slice(0, 600)}`);
    const dialogs = await session
      .script(`return [...document.querySelectorAll("dialog")].map((d) => d.className + (d.open ? " [open]" : ""))`)
      .catch((e) => e.message);
    console.log(`      dialogs: ${JSON.stringify(dialogs)}; filas en victim: ${count()}`);
    const active = await session.script(`return document.activeElement?.className ?? ""`).catch(() => "");
    console.log(`      foco: ${active}`);
    const keys = await session.script(`return (window.__e2eKeys ?? []).slice(-16)`).catch(() => []);
    console.log(`      teclas: ${JSON.stringify(keys)}`);
  } finally {
    await session.quit();
    driver.kill();
    await new Promise((resolve) => driver.once("exit", resolve));
    await stopApp();
    // Los procesos de WebKit salen un instante despues que la app.
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}
process.exit(failures === 0 ? 0 : 1);
