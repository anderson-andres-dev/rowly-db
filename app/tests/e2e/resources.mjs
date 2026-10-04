// Ciclos de recursos en la app real: lo que se repite muchas veces no tiene
// que dejar memoria, editores ni estilos detras.
//
//   node tests/e2e/resources.mjs --app <binario>
//   node tests/e2e/resources.mjs --app <binario> --measure <archivo.json>
//
// Con --measure no corren los ciclos sino las mediciones de tecla a pintado
// y de cuadros del grid (tools/bench/README.md), que no son compuerta.
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
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { basename, join } from "node:path";
import { connectInspector, liveHeap } from "./inspector.mjs";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const APP = option("--app");
if (!APP) throw new Error("falta --app <binario>");
// El inspector de cada app: un puerto por ciclo, para no chocar con el de
// la anterior mientras termina de cerrarse.
let INSPECTOR = "127.0.0.1:9333";
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

async function startApp(profileDir, port) {
  INSPECTOR = `127.0.0.1:${port}`;
  const app = spawn(APP, [], {
    // Su propio grupo: al terminar se cierran tambien sus procesos de WebKit.
    detached: true,
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
    error.message += ` (la app ${app.exitCode === null ? "seguia viva" : `termino con ${app.exitCode}`})`;
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
  const anonymousByName = {};
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
      const rollup = readFileSync(`/proc/${process}/smaps_rollup`, "utf8");
      const mb = Number(rollup.match(/^Pss:\s+(\d+)/m)?.[1] ?? 0) / 1024;
      const anonymous = Number(rollup.match(/^Anonymous:\s+(\d+)/m)?.[1] ?? 0) / 1024;
      const name = readFileSync(`/proc/${process}/comm`, "utf8").trim();
      byName[name] = (byName[name] ?? 0) + mb;
      anonymousByName[name] = (anonymousByName[name] ?? 0) + anonymous;
      total += mb;
    } catch {
      // Termino mientras se leia.
    }
  }
  return { total, byName, anonymousByName, ticks, ticksByName };
}

const DOM = `({
  nodes: document.getElementsByTagName("*").length,
  editors: document.querySelectorAll(".cm-editor").length,
  styles: document.querySelectorAll("style").length,
})`;

// La memoria de los procesos se lee antes de recolectar: el snapshot del
// heap pasa por la app y la infla un momento.
async function sample(page, app, index) {
  const memory = pss(app.pid);
  return { index, pss: memory, heap: await liveHeap(page), dom: await page.evaluate(DOM) };
}

const format = ({ index, heap, pss, dom }) =>
  `${index}: heap vivo ${heap.mb.toFixed(1)} MB en ${heap.objects} objetos; backend propio ${(pss.anonymousByName[basename(APP).slice(0, 15)] ?? 0).toFixed(1)} MB; PSS ${pss.total.toFixed(1)} MB (${Object.entries(
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
function assertStable(samples, memory = samples.length > 3 ? samples.filter((s) => s.index >= 2 * WARMUP) : samples) {
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
  // La memoria propia de la app (Anonymous: su heap y su pila), no su PSS:
  // el PSS reparte las bibliotecas compartidas entre quienes las usan, y
  // sube solo cuando muere otro proceso que las compartia. Sube y baja con
  // cada conexion; una fuga sube su piso, asi que se compara el minimo de la
  // segunda mitad de las muestras con el de la primera, desde el ciclo 100:
  // del 50 al 100 todavia calienta (sus caches de conexion).
  const backend = (s) => s.pss.anonymousByName[basename(APP).slice(0, 15)] ?? 0;
  const half = Math.ceil(memory.length / 2);
  const floor = (part) => Math.min(...part.map(backend));
  const before = floor(memory.slice(0, half));
  grew("el piso de la memoria propia del backend (MB)", before, floor(memory.slice(half)), Math.max(2, before * 0.05));
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
  // Muestras de memoria cada 30 s, sin recolectar (para no sumar trabajo).
  const idleStart = pss(app.pid);
  const during = [{ index: 0, pss: idleStart }];
  for (let elapsed = 30; elapsed <= IDLE_SECONDS; elapsed += 30) {
    await sleep(30000);
    during.push({ index: elapsed, pss: pss(app.pid) });
  }
  await sleep((IDLE_SECONDS % 30) * 1000);
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
    `        memoria propia por proceso cada 30 s: ${during
      .map(({ index, pss }) => `${index}: ${Object.entries(pss.anonymousByName).map(([name, mb]) => `${name} ${mb.toFixed(1)}`).join(" / ")}`)
      .join("; ")}`,
  );
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
  // El heap vivo y el DOM, del principio al final; la memoria propia de la
  // app, por pisos de las muestras cada 30 s.
  assertStable([before, after], during);
});

// --- Ejecucion --------------------------------------------------------------

async function stop(app) {
  const group = (signal) => {
    try {
      process.kill(-app.pid, signal);
    } catch {
      // Ya no queda nadie en el grupo.
    }
  };
  group("SIGTERM");
  for (let i = 0; i < 50 && app.exitCode === null; i += 1) await sleep(100);
  group("SIGKILL");
}

// --- Mediciones (no son compuerta) -----------------------------------------
// Con --measure <archivo.json> corren estas en vez de los ciclos y escriben
// sus percentiles. Bajo Xvfb sin GPU los tiempos dependen de la maquina y de
// su carga: son un benchmark de release que se compara con una referencia
// del mismo equipo (tools/bench/README.md), nunca un umbral de CI.

const MEASURE = option("--measure");
const KEYSTROKES = Number(process.env.E2E_KEYSTROKES ?? 200);
const SCROLL_FRAMES = Number(process.env.E2E_SCROLL_FRAMES ?? 300);
const measures = [];
const measure = (name, body) => measures.push({ name, body });
const measured = {};

function percentiles(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const round = (value) => Math.round(value * 100) / 100;
  return { n: sorted.length, p50: round(at(0.5)), p95: round(at(0.95)), p99: round(at(0.99)), max: round(sorted[sorted.length - 1]) };
}

// Corre una funcion asincrona en la pagina y trae su resultado: el
// Runtime.evaluate de WebKit no espera promesas, asi que se deja en window.
async function evaluateAsync(page, what, body, timeout = 300000) {
  await page.evaluate(`(window.__measure = null, (${body})().then(
    (value) => (window.__measure = { value }),
    (error) => (window.__measure = { error: String(error) }),
  ), true)`);
  await waitFor(page, what, "window.__measure !== null", timeout);
  const outcome = await page.evaluate("window.__measure");
  if (outcome.error) throw new Error(`${what}: ${outcome.error}`);
  return outcome.value;
}

// El EditorView de CodeMirror a partir de su DOM (lo que hace findFromDOM).
const editorView = `(() => {
  const content = document.querySelector(".cm-content");
  return (content?.cmTile ?? content?.cmView)?.root?.view ?? content?.cmView?.rootView?.view ?? null;
})()`;

// Cada tecla entra como la escribe el navegador (insertText sobre el
// contenido editable, que CodeMirror lee del DOM) y se cuenta hasta que
// termina el cuadro siguiente: el requestAnimationFrame y despues un
// mensaje, que corre cuando ese cuadro ya se pinto.
async function keyToPaint(page, lines) {
  // El documento se arma y se pega dentro de la pagina: un mensaje tan
  // grande por el inspector remoto no llega.
  await page.evaluate(`(() => {
    const view = ${editorView};
    view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } });
    const content = document.querySelector(".cm-content");
    content.focus();
    const data = new DataTransfer();
    data.setData("text/plain", Array.from({ length: ${lines} }, (_, i) => "SELECT id, name FROM victim WHERE id = " + i + ";").join("\\n"));
    content.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    return true;
  })()`);
  await waitFor(page, `el documento de ${lines} lineas`, `${editorView}?.state.doc.lines === ${lines}`);
  await sleep(2000);
  const times = await evaluateAsync(page, "las teclas", `async () => {
    const view = ${editorView};
    const content = document.querySelector(".cm-content");
    content.focus();
    view.dispatch({ selection: { anchor: view.state.doc.length }, scrollIntoView: true });
    const painted = () => new Promise((resolve) => requestAnimationFrame(() => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => resolve(performance.now());
      channel.port2.postMessage(0);
    }));
    await painted();
    await painted();
    const times = [];
    for (let i = 0; i < ${KEYSTROKES}; i += 1) {
      const before = view.state.doc.length;
      const start = performance.now();
      const typed = document.execCommand("insertText", false, i % 8 === 7 ? " " : "x");
      const end = await painted();
      if (!typed || view.state.doc.length !== before + 1) throw new Error("la tecla " + i + " no llego al documento");
      times.push(end - start);
      // Alguien que escribe rapido: unas 12 teclas por segundo.
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    return times;
  }`);
  return percentiles(times);
}

measure("tecla -> pintado con 20 y con 10 000 lineas", async (page) => {
  await seedProfiles(page, [MYSQL_PROFILE]);
  await open(page, MYSQL_PROFILE, SERVERS[MYSQL_PROFILE.id], "rowly");
  measured.keyToPaintMs = { lines20: await keyToPaint(page, 20), lines10000: await keyToPaint(page, 10_000) };
  console.log(`      tecla -> pintado (ms): ${JSON.stringify(measured.keyToPaintMs)}`);
});

measure("cuadros del grid con 2000 x 120 al desplazarse", async (page) => {
  await page.evaluate(`localStorage.setItem("khipu:result-page-size:v1", "2000"), true`);
  await seedProfiles(page, [MYSQL_PROFILE]);
  await open(page, MYSQL_PROFILE, SERVERS[MYSQL_PROFILE.id], "rowly");
  const digits = "(SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9)";
  const columns = Array.from({ length: 120 }, (_, i) =>
    i % 3 === 0 ? `r.n + ${i} AS c${i + 1}` : i % 3 === 1 ? `CONCAT('texto ', r.n, ' ', ${i}) AS c${i + 1}` : `r.n * ${i} / 7 AS c${i + 1}`,
  ).join(", ");
  await writeSql(
    page,
    `SELECT ${columns} FROM (SELECT a.n * 200 + b.n * 20 + c.n * 2 + d.n AS n FROM ${digits} a, ${digits} b, ${digits} c, (SELECT 0 AS n UNION ALL SELECT 1) d) r ORDER BY r.n`,
  );
  await press(page, { key: "Enter", code: "Enter", ctrl: true }, ".cm-content");
  await waitFor(page, "el grid de 2000 filas", `(document.querySelector(".grid-viewport")?.scrollHeight ?? 0) > 2000 * 15`, 60000);
  await sleep(2000);
  // Un desplazamiento por cuadro, hacia abajo y despues a la derecha, como
  // la rueda: se guarda cuanto tardo cada cuadro y cuantas celdas habia.
  const result = await evaluateAsync(page, "el desplazamiento", `async () => {
    const viewport = document.querySelector(".grid-viewport");
    const frames = [];
    let cells = 0;
    let last = null;
    await new Promise((resolve) => {
      let index = 0;
      const step = (now) => {
        if (last !== null) frames.push(now - last);
        last = now;
        cells = Math.max(cells, viewport.querySelectorAll("td").length);
        if (index >= ${SCROLL_FRAMES}) return resolve();
        if (index < ${SCROLL_FRAMES} * 0.7) viewport.scrollTop += 90;
        else viewport.scrollLeft += 160;
        index += 1;
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    return { frames, cells, bottom: viewport.scrollTop, right: viewport.scrollLeft };
  }`);
  if (result.bottom < 1000 || result.right < 1000) throw new Error(`el grid no se desplazo: ${JSON.stringify({ bottom: result.bottom, right: result.right })}`);
  measured.gridFrameMs = {
    ...percentiles(result.frames),
    over25: result.frames.filter((ms) => ms > 25).length,
    over50: result.frames.filter((ms) => ms > 50).length,
    maxCells: result.cells,
  };
  console.log(`      cuadros del grid (ms): ${JSON.stringify(measured.gridFrameMs)}`);
});

const only = process.env.E2E_ONLY;
let failures = 0;
let port = 9333;
const selected = MEASURE ? measures : cycles;
for (const { name, body } of selected.filter((candidate) => !only || candidate.name.includes(only))) {
  port += 1;
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
    // Si la app no llega a mostrar su pagina (paso alguna vez en CI en el
    // tercer arranque), se cierra y se intenta una vez mas, en otro puerto.
    ({ app, page } = await startApp(profileDir, port).catch(async (error) => {
      console.log(`      reintento: ${error.message}`);
      if (error.app) await stop(error.app);
      port += 100;
      return startApp(profileDir, port);
    }).catch((error) => {
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
if (MEASURE && failures === 0) {
  writeFileSync(
    MEASURE,
    JSON.stringify({ label: process.env.E2E_LABEL ?? null, date: new Date().toISOString(), host: hostname(), ...measured }, null, 2) + "\n",
  );
  console.log(`      escrito ${MEASURE}`);
}
process.exit(failures === 0 ? 0 : 1);
