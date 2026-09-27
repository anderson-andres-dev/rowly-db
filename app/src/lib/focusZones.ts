import { get, writable } from "svelte/store";
import { eventMatchesShortcut, shortcuts } from "$lib/stores/shortcuts";

// Zonas de foco de la ventana y movimiento entre ellas con el teclado.
//
//   ┌──────────┬────────────┐
//   │ explorer │   editor   │    Ctrl+W y despues una flecha lleva el
//   │          ├────────────┤    foco a la zona vecina en esa direccion.
//   │  files   │  results   │
//   └──────────┴────────────┘
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
// cada lado, a la que se vuelve al cruzar.
export function neighborZone(from: Zone, direction: Direction, leftZone: Zone, rightZone: Zone): Zone | null {
  const left = from === "explorer" || from === "files";
  if (direction === "left") return left ? null : leftZone;
  if (direction === "right") return left ? rightZone : null;
  if (direction === "up") return from === "files" ? "explorer" : from === "results" ? "editor" : null;
  return from === "explorer" ? "files" : from === "editor" ? "results" : null;
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
// contorno tenue mientras se siga con el teclado: asi siempre se sabe donde
// esta el foco. El primer clic quita la marca (con el mouse no hace falta).
// Ambos van en una capa encima del contenido (controls.css), para que el
// editor o los encabezados del grid no los tapen.
let marked: HTMLElement | null = null;

function flash(element: HTMLElement) {
  marked?.classList.remove("zone-current");
  marked = element;
  element.classList.add("zone-current");
  element.classList.remove("zone-flash");
  // Reinicia la animacion aunque se vuelva a la misma zona enseguida.
  void element.offsetWidth;
  element.classList.add("zone-flash");
  setTimeout(() => element.classList.remove("zone-flash"), 600);
}

function clearMark() {
  marked?.classList.remove("zone-current");
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
  if (!target) return;
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

// Se instala una vez desde el layout. En captura: tiene que llegar antes que
// el editor (CodeMirror) y el grid.
export function installFocusZones(isBlocked: () => boolean): () => void {
  if (installed) return () => {};
  installed = true;
  let pendingUntil = 0;

  function onKeydown(event: KeyboardEvent) {
    if (isBlocked()) return;
    const prefix = get(shortcuts).find((shortcut) => shortcut.id === "focus-zone-prefix")?.keys ?? "";

    if (pendingUntil > Date.now()) {
      if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) return;
      pendingUntil = 0;
      // Ctrl puede seguir apretado (Ctrl+W, Ctrl+flecha): es lo natural.
      const direction = !event.altKey && !event.metaKey ? DIRECTIONS[event.key] : undefined;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (direction) moveFocus(direction);
      return;
    }

    if (prefix && eventMatchesShortcut(event, prefix)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      pendingUntil = Date.now() + CHORD_TIMEOUT_MS;
    }
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
  window.addEventListener("keydown", onEscape);
  document.addEventListener("focusin", onFocusIn);
  document.addEventListener("pointerdown", onPointerDown, true);
  return () => {
    installed = false;
    window.removeEventListener("keydown", onKeydown, true);
    window.removeEventListener("keydown", onEscape);
    document.removeEventListener("focusin", onFocusIn);
    document.removeEventListener("pointerdown", onPointerDown, true);
  };
}
