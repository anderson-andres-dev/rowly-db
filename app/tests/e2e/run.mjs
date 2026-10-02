// Recorridos criticos en la app real (tauri-driver + WebKitWebDriver).
//
//   node tests/e2e/run.mjs --app <binario> [--driver http://127.0.0.1:4444]
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
//   - en produccion toda escritura pide confirmacion en la app real (S7)
//   - el texto de la consola sobrevive a reiniciar la app

import { execFileSync } from "node:child_process";
import { KEYS, Session, sleep } from "./webdriver.mjs";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const APP = option("--app");
const DRIVER = option("--driver", "http://127.0.0.1:4444");
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
  // Para el diagnostico de un fallo: que tecla llego y a que elemento.
  await session.script(`
    window.__e2eKeys = [];
    document.addEventListener("keydown", (e) => {
      const t = e.target;
      window.__e2eKeys.push((e.ctrlKey ? "Ctrl+" : "") + e.key + "@" + (t.className || t.tagName));
      if (window.__e2eKeys.length > 60) window.__e2eKeys.shift();
    }, true);
  `);
}

async function editorText(session) {
  return await session.script(`return document.querySelector(".cm-content")?.innerText ?? ""`);
}

// Reemplaza el texto de la consola escribiendolo con el teclado.
async function write(session, text) {
  await (await session.find(".cm-content")).click();
  await session.keys({ chord: [KEYS.control, "a"] }, ""); // Backspace
  await session.keys(text);
  // Escape solo si quedo abierto el autocompletado: sin el, Escape saca el
  // foco del editor y Ctrl+Enter ya no ejecuta.
  await sleep(200);
  const popup = await session.script(`return !!document.querySelector(".cm-tooltip-autocomplete")`);
  if (popup) await session.keys(KEYS.escape);
}

async function run(session, text) {
  await write(session, text);
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

let failures = 0;
for (const { name, body } of flows) {
  resetData();
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
    const keys = await session.script(`return (window.__e2eKeys ?? []).slice(-25)`).catch(() => []);
    console.log(`      teclas: ${JSON.stringify(keys)}`);
  } finally {
    await session.quit();
  }
}
process.exit(failures === 0 ? 0 : 1);
