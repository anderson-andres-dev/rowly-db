import { get, writable } from "svelte/store";
import { registerCommand } from "$lib/commands";
import { formatShortcutEvent, shortcuts } from "$lib/stores/shortcuts";

// Zonas de foco de la ventana y movimiento entre ellas con el teclado.
//
//   ┌──────────┬────────────┐
//   │ explorer │   editor   │    Ctrl+W y despues una flecha lleva el
//   │          ├────────────┤    foco a la zona vecina en esa direccion.
//   │  files   │  results   │    Con Ctrl apretado, cada pulsacion de
//   └──────────┴────────────┘    flecha mueve una zona (y en los bordes
//                                da la vuelta) hasta soltar Ctrl.
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
  if (target) lastFocused.set(zone, target);
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex="0"], .cm-content, [role="grid"]';

function isUsable(element: HTMLElement | undefined, zone: HTMLElement): element is HTMLElement {
  return !!element && element.isConnected && zone.contains(element) && element.getClientRects().length > 0;
}

// Al llegar con el teclado, la zona destella y queda marcada con un
// contorno tenue mientras se sigue moviendo (Ctrl apretado); un segundo
// despues de dejar de moverse se desvanece solo, para no estorbar. Un clic
// la quita al instante. Ambos van en una capa encima del contenido
// (controls.css), para que el editor o los encabezados del grid no los
// tapen.
let marked: HTMLElement | null = null;
let fadeTimer: ReturnType<typeof setTimeout> | null = null;
let stillMoving = () => false;

const MARK_LINGER_MS = 1000;

function scheduleFade() {
  if (fadeTimer) clearTimeout(fadeTimer);
  fadeTimer = setTimeout(() => {
    fadeTimer = null;
    // Con Ctrl todavia apretado se sigue moviendo: la marca espera.
    if (stillMoving()) return;
    marked?.classList.add("zone-fading");
  }, MARK_LINGER_MS);
}

function flash(element: HTMLElement) {
  marked?.classList.remove("zone-current", "zone-fading");
  marked = element;
  element.classList.add("zone-current");
  scheduleFade();
  element.classList.remove("zone-flash");
  // Reinicia la animacion aunque se vuelva a la misma zona enseguida.
  void element.offsetWidth;
  element.classList.add("zone-flash");
  setTimeout(() => element.classList.remove("zone-flash"), 600);
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

  const previous = lastFocused.get(zone);
  if (isUsable(previous, entry.element)) {
    previous.focus({ preventScroll: true });
  } else if (!entry.focusDefault?.(entry.element)) {
    entry.element.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
  }
  markActive(zone, null);
  flash(entry.element);
  return true;
}

export function moveFocus(direction: Direction): void {
  const from = get(activeZone) ?? "editor";
  const target = neighborZone(from, direction, lastLeft, lastRight);
  void focusZone(target).then((moved) => {
    // Sin panel de archivos, bajar desde el explorador no tiene a donde ir.
    if (!moved && target === "files") lastLeft = "explorer";
  });
}

// Accion para marcar un contenedor como zona.
export function focusZoneAction(node: HTMLElement, params: { zone: Zone; focusDefault?: (zone: HTMLElement) => boolean | void }) {
  node.dataset.focusZone = params.zone;
  // La capa del destello se ubica respecto de la zona.
  if (getComputedStyle(node).position === "static") node.style.position = "relative";
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

const DIRECTIONS: Record<string, Direction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

// Tras el prefijo hay este tiempo para la direccion.
const CHORD_TIMEOUT_MS = 1500;

let installed = false;

// Se instala una vez desde el layout, antes que keybindings.ts: en captura,
// las flechas del modo mover tienen que llegar antes que el despachador, el
// editor (CodeMirror) y el grid.
export function installFocusZones(isBlocked: () => boolean): () => void {
  if (installed) return () => {};
  installed = true;
  // Modo mover: empieza con el comando focus-zone-prefix. Mientras Ctrl siga
  // apretado, las flechas solo mueven entre zonas (nunca el texto ni el
  // grid) y el modo dura hasta soltar Ctrl. Con Ctrl suelto, la primera
  // flecha (dentro del plazo) mueve una vez y termina. Cualquier otra tecla
  // lo termina y sigue su camino normal.
  //
  // Las repeticiones de teclado no cuentan: mantener Ctrl+W no reinicia el
  // modo en cada repeticion de la W (dejaba huecos en los que la flecha iba
  // al texto) y mantener una flecha no recorre las zonas sin control.

  let moving = false;
  let moved = false;
  let deadline = 0;
  // Ctrl apretado segun sus propios keydown/keyup, no event.ctrlKey solo.
  let ctrlHeld = false;

  function stopMoving() {
    const wasMoving = moving && moved;
    moving = false;
    moved = false;
    if (wasMoving) scheduleFade();
  }
  stillMoving = () => moving;

  const unregisterPrefix = registerCommand("focus-zone-prefix", "global", () => {
    moving = true;
    moved = false;
    deadline = Date.now() + CHORD_TIMEOUT_MS;
  });

  function isPrefix(event: KeyboardEvent): boolean {
    const keys = formatShortcutEvent(event);
    return !!keys && get(shortcuts).some((shortcut) => shortcut.id === "focus-zone-prefix" && shortcut.keys === keys);
  }

  function swallow(event: KeyboardEvent) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Control") ctrlHeld = true;
    if (isBlocked() || !moving) return;
    if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) return;
    const ctrl = event.ctrlKey || ctrlHeld;
    // La W que se repite (o el prefijo otra vez) sigue en el mismo modo.
    if (isPrefix(event)) {
      swallow(event);
      if (!ctrl) deadline = Date.now() + CHORD_TIMEOUT_MS;
      return;
    }
    const direction = !event.altKey && !event.metaKey ? DIRECTIONS[event.key] : undefined;
    if (!direction || (!ctrl && Date.now() > deadline)) {
      stopMoving();
      return;
    }
    swallow(event);
    if (event.repeat) return;
    moveFocus(direction);
    moved = true;
    if (!ctrl) stopMoving();
  }

  // Soltar Ctrl despues de moverse termina el modo. Si todavia no hubo
  // flecha, queda la espera normal de la primera.
  function onKeyup(event: KeyboardEvent) {
    if (event.key !== "Control") return;
    ctrlHeld = false;
    if (moving && moved) stopMoving();
  }

  // Al perder la ventana el foco no llega el keyup de Ctrl.
  function onWindowBlur() {
    ctrlHeld = false;
    stopMoving();
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
    unregisterPrefix();
    window.removeEventListener("keydown", onKeydown, true);
    window.removeEventListener("keyup", onKeyup, true);
    window.removeEventListener("blur", onWindowBlur);
    window.removeEventListener("keydown", onEscape);
    document.removeEventListener("focusin", onFocusIn);
    document.removeEventListener("pointerdown", onPointerDown, true);
  };
}
