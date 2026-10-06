import { get, writable } from "svelte/store";
import { registerCommand } from "$lib/workspace/commands";

// Zonas de foco de la ventana y movimiento entre ellas con el teclado.
//
//   ┌──────────┬────────────┐
//   │ explorer │   editor   │    Ctrl+Shift+flecha lleva el foco a la
//   │          ├────────────┤    zona vecina en esa direccion (en los
//   │  files   │  results   │    bordes da la vuelta), tambien desde la
//   └──────────┴────────────┘    terminal.
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
// contorno tenue; un segundo despues de la ultima pulsacion se desvanece
// solo, para no estorbar. Un clic la quita al instante. Ambos van en una capa encima del contenido
// (controls.css), para que el editor o los encabezados del grid no los
// tapen.
let marked: HTMLElement | null = null;
let fadeTimer: ReturnType<typeof setTimeout> | null = null;

const MARK_LINGER_MS = 1000;

function scheduleFade() {
  if (fadeTimer) clearTimeout(fadeTimer);
  fadeTimer = setTimeout(() => {
    fadeTimer = null;
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

  window.addEventListener("keydown", onEscape);
  document.addEventListener("focusin", onFocusIn);
  document.addEventListener("pointerdown", onPointerDown, true);
  return () => {
    installed = false;
    unregisterDirections.forEach((unregister) => unregister());
    window.removeEventListener("keydown", onEscape);
    document.removeEventListener("focusin", onFocusIn);
    document.removeEventListener("pointerdown", onPointerDown, true);
  };
}
