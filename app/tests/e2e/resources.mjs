// Ciclos de recursos en la app real: lo que se repite muchas veces no tiene
// que dejar memoria, editores ni estilos detras.
//
//   node tests/e2e/resources.mjs --app <binario>
//
// A diferencia de run.mjs, no usa WebDriver: abre la app con el inspector
// remoto de WebKit (inspector.mjs), que es lo unico que puede recolectar y
// medir el heap de JavaScript vivo. La app se maneja con clics en el DOM; el
// teclado y el foco son de run.mjs. Necesita un display X (xvfb-run).
//
// Usa las mismas bases que run.mjs: MySQL en E2E_MYSQL_PORT (root/rowly) con
// la base `rowly_e2e`, y PostgreSQL en E2E_PG_PORT con E2E_PG_USER/rowly.
//
// Cada ciclo mide, tras calentar: el heap de JavaScript vivo despues de
// recolectar, los objetos vivos, el PSS del backend y lo montado en el DOM.
// El PSS del WebKitWebProcess se informa pero no es compuerta: sube con la
// memoria que el recolector ya libero y WebKit retiene, y se aplana solo
// (con 1500 reconexiones, hacia la 600-700; con JIT y sin el).

import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { connectInspector, liveHeap } from "./inspector.mjs";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const APP = option("--app");
if (!APP) throw new Error("falta --app <binario>");
const INSPECTOR = "127.0.0.1:9333";
const MYSQL_PORT = Number(process.env.E2E_MYSQL_PORT ?? 3306);
const MYSQL = process.env.E2E_MYSQL_CLI ?? "mysql";
const PG_PORT = Number(process.env.E2E_PG_PORT ?? 5432);
const PG_USER = process.env.E2E_PG_USER ?? "postgres";
const RECONNECTIONS = Number(process.env.E2E_RECONNECTIONS ?? 300);
const CONSOLE_CYCLES = Number(process.env.E2E_CONSOLE_CYCLES ?? 300);
const IDLE_SECONDS = Number(process.env.E2E_IDLE_SECONDS ?? 300);
const WARMUP = 50;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sql(statement) {
  return execFileSync(MYSQL, ["-h127.0.0.1", `-P${MYSQL_PORT}`, "-uroot", "-prowly", "-N", "-e", statement], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

// --- La app -----------------------------------------------------------------

async function startApp(profileDir) {
  const app = spawn(APP, [], {
    env: {
      ...process.env,
      XDG_DATA_HOME: join(profileDir, "data"),
      XDG_CONFIG_HOME: join(profileDir, "config"),
      XDG_CACHE_HOME: join(profileDir, "cache"),
      WEBKIT_INSPECTOR_HTTP_SERVER: INSPECTOR,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  // Lo que diga la app, para el reporte de un fallo.
  app.output = "";
  const keep = (chunk) => (app.output = (app.output + chunk).slice(-4000));
  app.stdout.on("data", keep);
  app.stderr.on("data", keep);
  const page = await connectInspector(INSPECTOR).catch((error) => {
    error.app = app;
    throw error;
  });
  await waitFor(page, "la app", "document.readyState === 'complete' && !!document.querySelector('body *')");
  return { app, page };
}

async function waitFor(page, what, expression, timeout = 20000) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeout) {
    try {
      if (await page.evaluate(expression)) return;
    } catch (error) {
      last = error.message;
    }
    await sleep(50);
  }
  throw new Error(`no se cumplio en ${timeout} ms: ${what}${last ? ` (${last})` : ""}`);
}

// PSS en MB de la app y de sus procesos hijos, en total y por nombre.
function pss(pid) {
  const parents = new Map();
  for (const entry of readdirSync("/proc")) {
    if (!/^\d+$/.test(entry)) continue;
    try {
      const stat = readFileSync(`/proc/${entry}/stat`, "utf8");
      parents.set(Number(entry), Number(stat.slice(stat.lastIndexOf(")") + 2).split(" ")[1]));
    } catch {
      // Termino mientras se leia.
    }
  }
  const tree = new Set([pid]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const [child, parent] of parents) {
      if (tree.has(parent) && !tree.has(child)) {
        tree.add(child);
        grew = true;
      }
    }
  }
  const byName = {};
  const ticksByName = {};
  let total = 0;
  let ticks = 0;
  for (const process of tree) {
    try {
      const stat = readFileSync(`/proc/${process}/stat`, "utf8");
      const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
      // utime y stime (campos 14 y 15 de stat), en ticks de reloj.
      const own = Number(fields[11]) + Number(fields[12]);
      ticks += own;
      const comm = readFileSync(`/proc/${process}/comm`, "utf8").trim();
      ticksByName[comm] = (ticksByName[comm] ?? 0) + own;
      const mb = Number(readFileSync(`/proc/${process}/smaps_rollup`, "utf8").match(/^Pss:\s+(\d+)/m)?.[1] ?? 0) / 1024;
      const name = readFileSync(`/proc/${process}/comm`, "utf8").trim();
      byName[name] = (byName[name] ?? 0) + mb;
      total += mb;
    } catch {
      // Termino mientras se leia.
    }
  }
  return { total, byName, ticks, ticksByName };
}

const DOM = `({
  nodes: document.getElementsByTagName("*").length,
  editors: document.querySelectorAll(".cm-editor").length,
  styles: document.querySelectorAll("style").length,
})`;

async function sample(page, app, index) {
  return { index, heap: await liveHeap(page), pss: pss(app.pid), dom: await page.evaluate(DOM) };
}

const format = ({ index, heap, pss, dom }) =>
  `${index}: heap vivo ${heap.mb.toFixed(1)} MB en ${heap.objects} objetos; PSS ${pss.total.toFixed(1)} MB (${Object.entries(
    pss.byName,
  )
    .map(([name, mb]) => `${name} ${mb.toFixed(1)}`)
    .join(", ")}); ${dom.nodes} nodos, ${dom.editors} editores, ${dom.styles} estilos`;

// Las clases del heap que mas objetos sumaron entre dos muestras.
function classGrowth(first, last) {
  return Object.entries(last.heap.classes)
    .map(([name, entry]) => [name, entry.count - (first.heap.classes[name]?.count ?? 0), entry.bytes - (first.heap.classes[name]?.bytes ?? 0)])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, count, bytes]) => `${name} +${count} (${(bytes / 1024).toFixed(0)} KB)`)
    .join(", ");
}

// Sin fuga desde el calentamiento: heap vivo, objetos vivos, backend y lo
// montado en el DOM.
function assertStable(samples) {
  if (samples.length < 2) throw new Error("hacen falta dos muestras: menos ciclos que el calentamiento");
  const first = samples[0];
  const last = samples[samples.length - 1];
  const grew = (what, before, after, allowed) => {
    if (after > before + allowed)
      throw new Error(
        `${what} crecio de ${before.toFixed(1)} a ${after.toFixed(1)} entre el ciclo ${first.index} y el ${last.index}\n` +
          `      lo que mas crecio: ${classGrowth(first, last)}`,
      );
  };
  grew("el heap vivo (MB)", first.heap.mb, last.heap.mb, Math.max(2, first.heap.mb * 0.1));
  grew("los objetos vivos", first.heap.objects, last.heap.objects, first.heap.objects * 0.05);
  // El PSS del backend sube y baja con cada conexion (en CI, entre ~142 y
  // ~165 MB de una muestra a otra): una fuga sube su piso. Se compara el
  // minimo de la segunda mitad de las muestras con el de la primera.
  const backend = (s) => s.pss.byName[basename(APP).slice(0, 15)] ?? 0;
  const half = Math.ceil(samples.length / 2);
  const floor = (part) => Math.min(...part.map(backend));
  const before = floor(samples.slice(0, half));
  grew("el piso del PSS del backend (MB)", before, floor(samples.slice(half)), Math.max(2, before * 0.05));
  for (const key of ["editors", "styles"])
    if (last.dom[key] !== first.dom[key]) throw new Error(`${key}: ${first.dom[key]} -> ${last.dom[key]}`);
}

// --- Conexiones -------------------------------------------------------------

const card = (name) =>
  `[...document.querySelectorAll(".card-main")].find((card) => card.textContent.includes(${JSON.stringify(name)}))`;
const shown = `(document.querySelector(".server-version")?.textContent.trim() ?? "")`;

async function seedProfiles(page, profiles) {
  await page.evaluate(
    `localStorage.setItem("khipu:connection-profiles", ${JSON.stringify(JSON.stringify(profiles))}), location.reload(), true`,
  );
  await sleep(1000);
  await waitFor(page, "la lista de conexiones", "!!document.querySelector('.card-main')");
}

// Abre un perfil y espera a ver su servidor. La primera vez escribe la
// contrasena (politica "restart": despues la recuerda la sesion).
async function open(page, profile, server, password = null) {
  await waitFor(page, `la tarjeta "${profile.name}"`, `!!${card(profile.name)}`);
  await page.evaluate(`${card(profile.name)}.click(), true`);
  if (password) {
    await waitFor(page, "el formulario de la contrasena", "!!document.querySelector('#password')");
    await page.evaluate(`(() => {
      const input = document.querySelector("#password");
      input.value = ${JSON.stringify(password)};
      input.dispatchEvent(new Event("input", { bubbles: true }));
      document.querySelector('form button[type="submit"]').click();
      return true;
    })()`);
  }
  // El servidor que se ve es el de esta conexion, nunca el de la anterior.
  await waitFor(page, server, `${shown} === ${JSON.stringify(server)}`);
}

// Escribir es seleccionar todo (Ctrl+A) y pegar: los eventos que escucha
// CodeMirror, sin depender del foco de la ventana bajo Xvfb.
function writeSql(page, text) {
  return page.evaluate(`(() => {
    const content = document.querySelector(".cm-content");
    content.focus();
    content.dispatchEvent(new KeyboardEvent("keydown", { key: "a", code: "KeyA", keyCode: 65, ctrlKey: true, bubbles: true, cancelable: true }));
    const data = new DataTransfer();
    data.setData("text/plain", ${JSON.stringify(text)});
    content.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    content.blur();
    return content.textContent;
  })()`);
}

// Un atajo de la app: keydown sobre lo que tiene el foco (keybindings.ts
// decide la zona por ahi) o sobre el documento.
function press(page, { key, code, ctrl = false, shift = false }, target = null) {
  return page.evaluate(`(() => {
    const target = ${target ? `document.querySelector(${JSON.stringify(target)})` : "null"} ?? document.activeElement ?? document.body;
    target.focus?.();
    target.dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(key)}, code: ${JSON.stringify(code)}, ctrlKey: ${ctrl}, shiftKey: ${shift}, bubbles: true, cancelable: true }));
    return true;
  })()`);
}

async function backToConnections(page) {
  await page.evaluate(`document.querySelector(".connection-nav .icon-button").click(), true`);
  await waitFor(page, "la lista de conexiones", "!!document.querySelector('.card-main')");
}

function profile(id, name, extra = {}) {
  return {
    id,
    name,
    driver: "mysql",
    host: "127.0.0.1",
    port: MYSQL_PORT,
    database: "rowly_e2e",
    username: "root",
    passwordPolicy: "restart",
    tlsMode: "disabled",
    environment: "local",
    ...extra,
  };
}

const MYSQL_PROFILE = profile("e2e-local", "E2E local");
const PG_PROFILE = profile("e2e-pg", "E2E pg", { driver: "postgres", port: PG_PORT, database: "postgres", username: PG_USER });
const SERVERS = { [MYSQL_PROFILE.id]: "MySQL 8.4.11", [PG_PROFILE.id]: "PostgreSQL 18.6" };

// --- Ciclos -----------------------------------------------------------------

const cycles = [];
const cycle = (name, body) => cycles.push({ name, body });

cycle(`${RECONNECTIONS} reconexiones alternando MySQL y PostgreSQL: cada una con su servidor y su catalogo, sin crecer en memoria`, async (page, app) => {
  await seedProfiles(page, [MYSQL_PROFILE, PG_PROFILE]);
  await open(page, MYSQL_PROFILE, SERVERS[MYSQL_PROFILE.id], "rowly");
  await backToConnections(page);
  await open(page, PG_PROFILE, SERVERS[PG_PROFILE.id], "rowly");

  const samples = [];
  for (let index = 1; index <= RECONNECTIONS; index += 1) {
    const next = index % 2 === 1 ? MYSQL_PROFILE : PG_PROFILE;
    await backToConnections(page);
    await open(page, next, SERVERS[next.id]);
    if (index === Math.min(WARMUP, RECONNECTIONS) || (index > WARMUP && index % 50 === 0) || index === RECONNECTIONS)
      samples.push(await sample(page, app, index));
  }
  console.log(samples.map((s) => `        ${format(s)}`).join("\n"));

  // El analisis usa el catalogo de la conexion actual: `victim` existe en
  // MySQL (rowly_e2e) y no en PostgreSQL. Se mira con el foco fuera del
  // editor: mientras el cursor esta en la sentencia, el editor oculta los
  // nombres que no encuentra (SQL_ENGINE §8).
  const write = (text) => writeSql(page, text);
  const marked = `[...document.querySelectorAll(".cm-unresolved")].map((element) => element.textContent)`;
  if ((await page.evaluate(shown)) !== SERVERS[PG_PROFILE.id]) {
    await backToConnections(page);
    await open(page, PG_PROFILE, SERVERS[PG_PROFILE.id]);
  }
  await write("SELECT name FROM victim");
  await waitFor(page, "victim marcada como inexistente en PostgreSQL", `${marked}.some((text) => text.includes("victim"))`);
  await backToConnections(page);
  await open(page, MYSQL_PROFILE, SERVERS[MYSQL_PROFILE.id]);
  // El control: una tabla que no existe si se marca. Asi la ausencia de
  // marca en victim no es un analisis que no corrio.
  await write("SELECT * FROM victim, missing_e2e");
  await waitFor(page, "missing_e2e marcada como inexistente en MySQL", `${marked}.some((text) => text.includes("missing_e2e"))`);
  const names = await page.evaluate(marked);
  if (names.some((text) => text.includes("victim")))
    throw new Error(`en MySQL se marco victim, que existe en rowly_e2e: ${JSON.stringify(names)}`);

  assertStable(samples);
});

const consoles = `document.querySelectorAll(".cm-editor").length`;
const gridText = `(document.querySelector('[role="grid"]')?.innerText ?? "")`;
const settingsButton = `document.querySelector("button.icon-button[aria-expanded][aria-pressed]")`;

cycle(`${CONSOLE_CYCLES} ciclos de consola: abrir, ejecutar, cambiar de tema y cerrar, sin dejar nada detras`, async (page, app) => {
  await seedProfiles(page, [MYSQL_PROFILE]);
  await open(page, MYSQL_PROFILE, SERVERS[MYSQL_PROFILE.id], "rowly");
  const tabs = `document.querySelectorAll('[role="tab"]').length`;
  const baseTabs = await page.evaluate(tabs);
  const samples = [];
  for (let index = 1; index <= CONSOLE_CYCLES; index += 1) {
    // Abrir: una consola nueva, activa, con su editor.
    await press(page, { key: "Q", code: "KeyQ", ctrl: true, shift: true });
    await waitFor(page, `la consola ${index}`, `${tabs} === ${baseTabs + 1}`);
    // Ejecutar en ella.
    await writeSql(page, `SELECT id, name, ${index} AS ciclo FROM victim ORDER BY id`);
    await press(page, { key: "Enter", code: "Enter", ctrl: true }, ".cm-content");
    await waitFor(page, `el resultado del ciclo ${index}`, `${gridText}.includes("tres") && ${gridText}.includes("${index}")`);
    // Cambiar de tema: otra paleta, desde Ajustes.
    await page.evaluate(`${settingsButton}.click(), true`);
    await waitFor(page, "las paletas", `document.querySelectorAll(".palette-grid .palette-option").length > 1`);
    await page.evaluate(`document.querySelectorAll(".palette-grid .palette-option")[${index % 2}].click(), true`);
    await page.evaluate(`${settingsButton}.click(), true`);
    await waitFor(page, "Ajustes cerrado", `${settingsButton}.getAttribute("aria-expanded") === "false"`);
    // Cerrar: si pregunta por el texto, se descarta.
    await press(page, { key: "F4", code: "F4", ctrl: true }, ".cm-content");
    await waitFor(page, `cerrar la consola ${index}`, `${tabs} === ${baseTabs} || !!document.querySelector("dialog[open] .danger-soft")`);
    if (await page.evaluate(`!!document.querySelector("dialog[open] .danger-soft")`)) {
      await page.evaluate(`document.querySelector("dialog[open] .danger-soft").click(), true`);
      await waitFor(page, `cerrar la consola ${index}`, `${tabs} === ${baseTabs}`);
    }
    if (index === Math.min(WARMUP, CONSOLE_CYCLES) || (index > WARMUP && index % 50 === 0) || index === CONSOLE_CYCLES)
      samples.push(await sample(page, app, index));
  }
  console.log(samples.map((s) => `        ${format(s)}`).join("\n"));
  if ((await page.evaluate(consoles)) !== 1) throw new Error(`quedaron ${await page.evaluate(consoles)} editores montados`);
  assertStable(samples);
});

cycle(`${IDLE_SECONDS} s de reposo con una conexion abierta: sin trabajo, llamadas al backend ni memoria que crezca`, async (page, app) => {
  await seedProfiles(page, [MYSQL_PROFILE]);
  await open(page, MYSQL_PROFILE, SERVERS[MYSQL_PROFILE.id], "rowly");
  await writeSql(page, "SELECT id, name FROM victim ORDER BY id");
  await press(page, { key: "Enter", code: "Enter", ctrl: true }, ".cm-content");
  await waitFor(page, "el resultado", `${gridText}.includes("tres")`);
  // Lo que haga la app sola desde aqui: llamadas al backend y timers.
  await page.evaluate(`(() => {
    const counts = (window.__idle = { invokes: [], timeouts: 0, intervals: 0, frames: 0 });
    const requestAnimationFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => (counts.frames++, requestAnimationFrame(callback));
    const internals = window.__TAURI_INTERNALS__;
    const invoke = internals.invoke.bind(internals);
    internals.invoke = (command, ...rest) => (counts.invokes.push(command), invoke(command, ...rest));
    const setTimeout = window.setTimeout;
    window.setTimeout = (...rest) => (counts.timeouts++, setTimeout(...rest));
    const setInterval = window.setInterval;
    window.setInterval = (...rest) => (counts.intervals++, setInterval(...rest));
    return true;
  })()`);
  await sleep(5000);
  const before = await sample(page, app, 0);
  // La CPU se cuenta solo en el reposo: recolectar y tomar el snapshot del
  // heap tambien gastan, y no son de la app.
  const idleStart = pss(app.pid);
  await sleep(IDLE_SECONDS * 1000);
  const idleEnd = pss(app.pid);
  const after = await sample(page, app, IDLE_SECONDS);
  const idle = await page.evaluate("window.__idle");
  // Lo que anima solo: animaciones y transiciones CSS que siguen corriendo.
  const animations = await page.evaluate(`document.getAnimations()
    .filter((animation) => animation.playState === "running")
    .map((animation) => {
      const target = animation.effect?.target;
      const where = target ? target.tagName.toLowerCase() + (target.classList.length ? "." + [...target.classList].join(".") : "") : "?";
      return (animation.animationName ?? animation.transitionProperty ?? "animacion") + " en " + where;
    })`);
  const clock = Number(execFileSync("getconf", ["CLK_TCK"], { encoding: "utf8" }).trim());
  const cpuSeconds = (idleEnd.ticks - idleStart.ticks) / clock;
  const cpuByProcess = Object.keys(idleEnd.ticksByName)
    .map((name) => `${name} ${((idleEnd.ticksByName[name] - (idleStart.ticksByName[name] ?? 0)) / clock).toFixed(2)} s`)
    .join(", ");
  console.log(`        ${format(before)}\n        ${format(after)}`);
  console.log(
    `        en ${IDLE_SECONDS} s: ${cpuSeconds.toFixed(2)} s de CPU (${((cpuSeconds / IDLE_SECONDS) * 100).toFixed(2)} % de un nucleo: ${cpuByProcess}); ` +
      `${idle.invokes.length} llamadas al backend (${[...new Set(idle.invokes)].join(", ") || "ninguna"}); ` +
      `${idle.timeouts} setTimeout, ${idle.intervals} setInterval, ${idle.frames} requestAnimationFrame; ` +
      `animando: ${animations.join(", ") || "nada"}`,
  );
  if (idle.invokes.length > 0) throw new Error(`en reposo se llamo al backend: ${idle.invokes.join(", ")}`);
  if (idle.intervals > 0) throw new Error(`en reposo se crearon ${idle.intervals} setInterval`);
  // Con el editor enfocado, el cursor parpadea: bajo Xvfb, sin GPU, eso y el
  // compositor de GTK son ~3 % de un nucleo. Lo que se busca es trabajo
  // continuo (sondeos, bucles), que se ve muy por encima.
  if (cpuSeconds / IDLE_SECONDS > 0.1) throw new Error(`en reposo se uso ${((cpuSeconds / IDLE_SECONDS) * 100).toFixed(2)} % de un nucleo`);
  assertStable([before, after]);
});

// --- Ejecucion --------------------------------------------------------------

async function stop(app) {
  if (app.exitCode !== null) return;
  app.kill("SIGTERM");
  for (let i = 0; i < 50 && app.exitCode === null; i += 1) await sleep(100);
  if (app.exitCode === null) app.kill("SIGKILL");
}

const only = process.env.E2E_ONLY;
let failures = 0;
for (const { name, body } of cycles.filter((candidate) => !only || candidate.name.includes(only))) {
  sql(
    "DROP DATABASE IF EXISTS rowly_e2e; CREATE DATABASE rowly_e2e; " +
      "CREATE TABLE rowly_e2e.victim (id INT PRIMARY KEY, name VARCHAR(20)); " +
      "INSERT INTO rowly_e2e.victim VALUES (1,'uno'),(2,'dos'),(3,'tres');",
  );
  const profileDir = mkdtempSync(join(tmpdir(), "rowly-resources-"));
  const started = Date.now();
  let app = null;
  let page = null;
  try {
    ({ app, page } = await startApp(profileDir).catch((error) => {
      app = error.app ?? null;
      throw error;
    }));
    await body(page, app);
    console.log(`ok    ${name} (${Date.now() - started} ms)`);
  } catch (error) {
    failures += 1;
    console.log(`FALLO ${name}\n      ${error.message}`);
    const screen = await page?.evaluate("document.body.innerText.slice(0, 600)").catch(() => "");
    console.log(`      pantalla: ${String(screen ?? "").replace(/\s+/g, " ")}`);
    if (app) console.log(`      app (salida ${app.exitCode ?? "viva"}): ${app.output.trim().slice(-1500)}`);
  } finally {
    page?.close();
    if (app) await stop(app);
    rmSync(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}
process.exit(failures === 0 ? 0 : 1);
