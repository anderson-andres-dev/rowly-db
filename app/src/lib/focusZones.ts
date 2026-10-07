import { get, writable } from "svelte/store";
import { registerCommand, runFirstCommand } from "$lib/workspace/commands";
import { shortcutUses, shortcuts } from "$lib/stores/shortcuts";
import { inTerminal, TERMINAL_COMMANDS } from "$lib/keybindings";

// Zonas de foco de la ventana y movimiento entre ellas con el teclado.
//
//   ┌──────────┬────────────┐
//   │ explorer │   editor   │    Ctrl+Shift+Alt+flecha lleva el foco a la
//   │          ├────────────┤    zona vecina en esa direccion (en los
//   │  files   │  results   │    bordes da la vuelta), tambien desde la
//   └──────────┴────────────┘    terminal. Dentro del editor, primero
//                                 recorre las consolas en mosaico.
//
// La zona activa la deciden solo el foco real y el clic, nunca el mouse
// encima: WebKit no enfoca un boton al hacer clic, asi que el clic tambien
// cuenta. Cada zona recuerda donde estaba el foco y vuelve ahi.

export type Zone = "explorer" | "files" | "editor" | "results";
export type Direction = "left" | "right" | "up" | "down";

interface ZoneEntry {
  element: HTMLElement;
  // Enfoca la zona cuando no hay un foco anterior que recuperar.
  focusDefault?: (zone: HTMLElement) => boolean | void;
}

const zones = new Map<Zone, ZoneEntry>();
const lastFocused = new Map<Zone, HTMLElement>();

export const activeZone = writable<Zone | null>(null);

// Ultima zona usada de cada lado: ir a la izquierda desde el editor vuelve
// al explorador o a los archivos, segun donde se estuvo.
let lastLeft: Zone = "explorer";
let lastRight: Zone = "editor";

// Abre el sidebar si esta plegado (lo registra el layout).
let revealSidebar: (() => Promise<void> | void) | null = null;

export function setSidebarRevealer(reveal: (() => Promise<void> | void) | null): void {
  revealSidebar = reveal;
}

// Zona vecina en una direccion. `leftZone`/`rightZone`: la ultima usada de
// cada lado, a la que se vuelve al cruzar. En los bordes da la vuelta: asi,
// con Ctrl apretado, las flechas recorren todas las zonas.
export function neighborZone(from: Zone, direction: Direction, leftZone: Zone, rightZone: Zone): Zone {
  const left = from === "explorer" || from === "files";
  if (direction === "left" || direction === "right") return left ? rightZone : leftZone;
  if (left) return from === "explorer" ? "files" : "explorer";
  return from === "editor" ? "results" : "editor";
}

function zoneOf(node: EventTarget | null): Zone | null {
  if (!(node instanceof Element)) return null;
  const element = node.closest<HTMLElement>("[data-focus-zone]");
  return (element?.dataset.focusZone as Zone | undefined) ?? null;
}

function markActive(zone: Zone | null, target: HTMLElement | null) {
  activeZone.set(zone);
  if (!zone) return;
  if (zone === "explorer" || zone === "files") lastLeft = zone;
  else lastRight = zone;
  // Lo marcado con data-no-zone-focus (la pestaña Terminal, que tiene su
  // atajo) no es a donde se vuelve al llegar a la zona.
  if (target && !target.closest("[data-no-zone-focus]")) lastFocused.set(zone, target);
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex="0"], .cm-content, [role="grid"]';

function isUsable(element: HTMLElement | undefined, zone: HTMLElement): element is HTMLElement {
  return !!element && element.isConnected && zone.contains(element) && element.getClientRects().length > 0;
}

// Al llegar con el teclado, la zona destella y queda marcada con un
// contorno tenue. Mientras se sostienen Ctrl+Shift+Alt (modo mover) la marca no
// se va; un segundo despues de soltarlos, o de la ultima pulsacion, se
// desvanece sola, para no estorbar. Un clic la quita al instante. Ambos van
// en una capa encima del contenido (controls.css), para que el editor o los
// encabezados del grid no los tapen.
let marked: HTMLElement | null = null;
let fadeTimer: ReturnType<typeof setTimeout> | null = null;
let holding = () => false;

const MARK_LINGER_MS = 1000;

function scheduleFade() {
  if (fadeTimer) clearTimeout(fadeTimer);
  fadeTimer = setTimeout(() => {
    fadeTimer = null;
    // Con Ctrl+Shift+Alt todavia apretados, la marca espera a que se suelten.
    if (holding()) return;
    marked?.classList.add("zone-fading");
  }, MARK_LINGER_MS);
}

// La zona actual, marcada sin destello: al sostener Ctrl+Shift+Alt.
function showMark(element: HTMLElement) {
  if (fadeTimer) clearTimeout(fadeTimer);
  fadeTimer = null;
  if (marked !== element) marked?.classList.remove("zone-current", "zone-fading");
  marked = element;
  element.classList.remove("zone-fading");
  element.classList.add("zone-current");
}

// El que quita el destello de cada zona: uno por zona, para que el de un
// destello anterior no borre uno nuevo apenas empieza (volver a una zona
// antes de los 600 ms dejaba la llegada sin animacion).
const flashTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

// "zone-flash" al llegar; "zone-nudge", mas suave y corto, cuando no hay
// zona en esa direccion: la tecla llego y se sigue en el mismo lugar.
function flash(element: HTMLElement, kind: "zone-flash" | "zone-nudge" = "zone-flash") {
  if (marked !== element) marked?.classList.remove("zone-current", "zone-fading");
  marked = element;
  element.classList.remove("zone-fading");
  element.classList.add("zone-current");
  scheduleFade();
  element.classList.remove("zone-flash", "zone-nudge");
  // Reinicia la animacion aunque se vuelva a la misma zona enseguida.
  void element.offsetWidth;
  element.classList.add(kind);
  clearTimeout(flashTimers.get(element));
  flashTimers.set(
    element,
    setTimeout(() => element.classList.remove(kind), 600),
  );
}

function clearMark() {
  if (fadeTimer) clearTimeout(fadeTimer);
  fadeTimer = null;
  marked?.classList.remove("zone-current", "zone-fading");
  marked = null;
}

export async function focusZone(zone: Zone): Promise<boolean> {
  if ((zone === "explorer" || zone === "files") && !zones.get(zone)?.element.getClientRects().length) {
    await revealSidebar?.();
  }
  const entry = zones.get(zone);
  if (!entry || entry.element.getClientRects().length === 0) return false;

  // La zona misma no es un lugar al que volver: se enfoca entera solo cuando
  // no tiene otra cosa (la seccion de abajo sin resultado); al volver, va a
  // lo que tenga ahora (el grid, la terminal).
  const previous = lastFocused.get(zone);
  if (previous !== entry.element && isUsable(previous, entry.element)) {
    previous.focus({ preventScroll: true });
  } else if (!entry.focusDefault?.(entry.element)) {
    entry.element.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
  }
  // Una zona sin nada que enfocar (el panel de archivos plegado) no cuenta:
  // marcarla dejaba el foco en una y la zona activa en otra, y las flechas
  // siguientes salian de la equivocada.
  if (!entry.element.contains(document.activeElement)) return false;
  markActive(zone, null);
  flash(entry.element);
  return true;
}

// La otra zona de la misma columna: si la ultima usada de un lado no esta,
// se cruza a la que haya.
const SAME_COLUMN: Record<Zone, Zone> = { explorer: "files", files: "explorer", editor: "results", results: "editor" };

// Una zona con varias piezas lado a lado (los mosaicos del editor o del
// resultado) se recorre por dentro antes de saltar a la vecina: su
// navegador enfoca la pieza de esa direccion y la devuelve, o null en el
// borde. Moverse entre piezas no marca nada: la barra del mosaico enfocado
// ya lo dice, y la marca de la zona se quita.
type ZoneNavigator = (direction: Direction) => HTMLElement | null;
const navigators = new Map<Zone, ZoneNavigator>();

export function setZoneNavigator(zone: Zone, navigator: ZoneNavigator): () => void {
  navigators.set(zone, navigator);
  return () => {
    if (navigators.get(zone) === navigator) navigators.delete(zone);
  };
}

export function moveFocus(direction: Direction): void {
  // Desde donde esta el foco de verdad; la zona activa, si el foco no esta
  // en ninguna (un menu, el body).
  const from = zoneOf(document.activeElement) ?? get(activeZone) ?? "editor";
  if (navigators.get(from)?.(direction)) {
    clearMark();
    return;
  }
  const target = neighborZone(from, direction, lastLeft, lastRight);
  const crossing = direction === "left" || direction === "right";
  const stay = () => {
    const element = zones.get(from)?.element;
    if (element) flash(element, "zone-nudge");
  };
  void focusZone(target).then((moved) => {
    if (moved) return;
    if (!crossing) return stay();
    void focusZone(SAME_COLUMN[target]).then((crossed) => crossed || stay());
  });
}

// Accion para marcar un contenedor como zona.
export function focusZoneAction(node: HTMLElement, params: { zone: Zone; focusDefault?: (zone: HTMLElement) => boolean | void }) {
  // La capa del destello se ubica respecto de la zona: el position:relative
  // lo pone controls.css por este atributo, no un estilo en linea (el panel
  // del editor reescribe su style al mover el divisor y lo borraba).
  node.dataset.focusZone = params.zone;
  zones.set(params.zone, { element: node, focusDefault: params.focusDefault });
  return {
    update(next: { zone: Zone; focusDefault?: (zone: HTMLElement) => boolean | void }) {
      node.dataset.focusZone = next.zone;
      zones.set(next.zone, { element: node, focusDefault: next.focusDefault });
    },
    destroy() {
      if (zones.get(params.zone)?.element === node) zones.delete(params.zone);
    },
  };
}

// --- Teclado ---------------------------------------------------------------

// Cada direccion es un comando (lib/workspace/commands.ts); la tecla la pone
// el despachador (keybindings.ts).
const DIRECTION_COMMANDS: Record<string, Direction> = {
  "focus-zone-left": "left",
  "focus-zone-right": "right",
  "focus-zone-up": "up",
  "focus-zone-down": "down",
};

let installed = false;

export function installFocusZones(isBlocked: () => boolean): () => void {
  if (installed) return () => {};
  installed = true;

  const unregisterDirections = Object.entries(DIRECTION_COMMANDS).map(([id, direction]) =>
    registerCommand(id, "global", () => moveFocus(direction)),
  );

  // Modo mover: una capa encima de la app mientras Ctrl, Shift y Alt estan
  // apretados. Las flechas solo cambian de zona (nunca llegan al arbol, al
  // texto ni al grid) y la zona actual queda marcada hasta soltarlos; al
  // soltar, se interactua con lo que quedo enfocado. La marca espera
  // HOLD_MARK_MS para que un atajo rapido (Ctrl+Shift+Alt+T)
  // no la haga parpadear.
  //
  // Solo cuentan el pulsar y soltar de las teclas fisicas Ctrl, Shift y Alt
  // (event.code), nunca ctrlKey/shiftKey de las demas: medido con el teclado
  // real en WebKitGTK, al pasar el foco al explorador las flechas siguientes
  // llegan sin Ctrl, Shift ni Alt aunque sigan apretados, y soltar Shift llega a
  // veces como key "CapsLock".
  const held = { Control: false, Shift: false, Alt: false };
  holding = () => held.Control && held.Shift && held.Alt;
  let markTimer: ReturnType<typeof setTimeout> | null = null;
  const HOLD_MARK_MS = 200;

  function cancelMarkTimer() {
    if (markTimer) clearTimeout(markTimer);
    markTimer = null;
  }

  function markCurrent() {
    markTimer = null;
    const zone = zoneOf(document.activeElement) ?? get(activeZone);
    const element = zone ? zones.get(zone)?.element : undefined;
    if (element && !isBlocked()) showMark(element);
  }

  // Mientras dura, ningun elemento dibuja su anillo de foco (controls.css):
  // solo se ve la marca de la zona. Al soltar, aparece donde quedo el foco.
  function setHeld(key: "Control" | "Shift" | "Alt", down: boolean) {
    const was = holding();
    held[key] = down;
    if (!was && holding()) {
      cancelMarkTimer();
      markTimer = setTimeout(markCurrent, HOLD_MARK_MS);
      document.documentElement?.classList.add("zone-moving");
    } else if (was && !holding()) {
      cancelMarkTimer();
      document.documentElement?.classList.remove("zone-moving");
      if (marked) scheduleFade();
    }
  }

  function modifierOf(event: KeyboardEvent): "Control" | "Shift" | "Alt" | null {
    const code = event.code ?? "";
    if (code.startsWith("Control") || event.key === "Control") return "Control";
    if (code.startsWith("Shift") || event.key === "Shift") return "Shift";
    if (code.startsWith("Alt") || event.key === "Alt") return "Alt";
    // Soltar Shift que llega como CapsLock (ver arriba).
    if (event.type === "keyup" && event.key === "CapsLock" && held.Shift) return "Shift";
    return null;
  }

  function onKeydown(event: KeyboardEvent) {
    const modifier = modifierOf(event);
    if (modifier) {
      setHeld(modifier, true);
      return;
    }
    if (!holding() || event.metaKey || isBlocked()) return;
    // La misma tecla que veria el despachador, con Ctrl, Alt y Shift aunque
    // el evento no los traiga.
    const keys = `Ctrl+Alt+Shift+${event.key.length === 1 ? event.key.toUpperCase() : event.key}`;
    const direction = get(shortcuts).find((shortcut) => shortcut.id in DIRECTION_COMMANDS && shortcutUses(shortcut, keys));
    cancelMarkTimer();
    if (direction) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) moveFocus(DIRECTION_COMMANDS[direction.id]);
      return;
    }
    // Otro atajo con Ctrl+Alt+Shift: con sus modificadores sigue su camino
    // normal. Si llega sin ellos, se ejecuta aqui; la tecla que no es de
    // ningun atajo (Tab, una letra) sigue su camino, nunca se traga.
    if (event.ctrlKey && event.shiftKey && event.altKey) return;
    const ids = get(shortcuts)
      .filter((shortcut) => shortcutUses(shortcut, keys))
      .map((shortcut) => shortcut.id)
      .filter((id) => !inTerminal(event.target) || TERMINAL_COMMANDS.has(id));
    if (ids.length === 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    runFirstCommand(ids, get(activeZone));
  }

  function onKeyup(event: KeyboardEvent) {
    const modifier = modifierOf(event);
    if (modifier) setHeld(modifier, false);
  }

  // Al perder la ventana el foco no llegan los keyup.
  function onWindowBlur() {
    setHeld("Control", false);
    setHeld("Shift", false);
    setHeld("Alt", false);
  }

  // Esc desde el explorador, los archivos o el resultado vuelve al editor,
  // al punto exacto donde estaba el cursor. Va en burbuja: si la zona usa
  // Esc para algo propio (cerrar una busqueda, cancelar una edicion), gana.
  function onEscape(event: KeyboardEvent) {
    if (event.key !== "Escape" || event.defaultPrevented || isBlocked()) return;
    const zone = zoneOf(event.target);
    if (!zone || zone === "editor") return;
    if ((event.target as Element).closest("input, textarea, [contenteditable='true'], [role='menu'], [role='listbox']")) return;
    event.preventDefault();
    void focusZone("editor");
  }

  function onFocusIn(event: FocusEvent) {
    const zone = zoneOf(event.target);
    if (zone) markActive(zone, event.target as HTMLElement);
  }

  // El clic tambien elige zona (WebKit no enfoca botones al hacer clic) y
  // quita la marca de navegacion por teclado.
  function onPointerDown(event: PointerEvent) {
    clearMark();
    const zone = zoneOf(event.target);
    if (!zone) return;
    const target = (event.target as Element).closest<HTMLElement>(FOCUSABLE);
    markActive(zone, target);
  }

  window.addEventListener("keydown", onKeydown, true);
  window.addEventListener("keyup", onKeyup, true);
  window.addEventListener("blur", onWindowBlur);
  window.addEventListener("keydown", onEscape);
  document.addEventListener("focusin", onFocusIn);
  document.addEventListener("pointerdown", onPointerDown, true);
  return () => {
    installed = false;
    unregisterDirections.forEach((unregister) => unregister());
    cancelMarkTimer();
    holding = () => false;
    document.documentElement?.classList.remove("zone-moving");
    window.removeEventListener("keydown", onKeydown, true);
    window.removeEventListener("keyup", onKeyup, true);
    window.removeEventListener("blur", onWindowBlur);
    window.removeEventListener("keydown", onEscape);
    document.removeEventListener("focusin", onFocusIn);
    document.removeEventListener("pointerdown", onPointerDown, true);
  };
}
