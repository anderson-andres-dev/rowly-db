import { get } from "svelte/store";
import { runFirstCommand, TAB_NUMBERS } from "$lib/workspace/commands";
import { activeZone } from "$lib/focusZones";
import { formatShortcutEvent, shortcutUses, shortcuts } from "$lib/stores/shortcuts";

// Despachador unico de atajos: traduce la tecla a los comandos que la usan
// (stores/shortcuts.ts) y los ejecuta en la zona activa (lib/workspace/commands.ts).
// Ningun componente escucha teclas para sus acciones; registran comandos.
//
// En captura, para llegar antes que CodeMirror y el grid: si un comando
// toma la tecla, nadie mas la ve. Si ninguno aplica, sigue su camino normal
// (p. ej. Ctrl+A en un input fuera del editor).
//
// Esc hacia el editor sigue en focusZones.ts: depende de lo que la zona haga
// con la tecla, no es una accion.

// En la terminal las teclas son del shell y de las IA (Ctrl+R, Ctrl+W,
// Ctrl+Enter...): solo pasan moverse entre zonas, mostrarla u ocultarla, la
// capa Ctrl+Shift de sus sesiones, Ctrl+Tab y Ctrl+1..9.
export const TERMINAL_COMMANDS = new Set([
  "focus-zone-left",
  "focus-zone-right",
  "focus-zone-up",
  "focus-zone-down",
  "toggle-terminal",
  "next-tab",
  "previous-tab",
  ...TAB_NUMBERS.map((n) => `go-to-tab-${n}`),
  "new-terminal-session",
  "close-terminal-session",
  "rename-query-console",
  "tile-console",
  "untile-console",
  "shortcut-sheet",
]);

export function inTerminal(target: EventTarget | null): boolean {
  return !!(target as Element | null)?.closest?.("[data-terminal]");
}

let installed = false;

// Los modificadores fisicos. Medido con el teclado real en WebKitGTK: con
// Ctrl+Shift sostenidos, las repeticiones de Tab llegan sin ctrlKey ni
// shiftKey (y el editor las tomaba como Tab: sangraba), y tras mover el foco
// otras teclas tambien. Se siguen por event.code (soltar Shift llega a
// veces con key "CapsLock", pero code ShiftLeft) y valen un rato: un
// keyup perdido no puede dejar Ctrl "pegado" a las letras.
const HELD_MS = 3000;
type Modifier = "ctrl" | "shift" | "alt" | "meta";

export function modifierOfCode(code: string): Modifier | null {
  if (code.startsWith("Control")) return "ctrl";
  if (code.startsWith("Shift")) return "shift";
  if (code.startsWith("Alt")) return "alt";
  if (code.startsWith("Meta") || code.startsWith("OS")) return "meta";
  return null;
}

export function installKeybindings(isBlocked: () => boolean): () => void {
  if (installed) return () => {};
  installed = true;

  // Cuando se vio por ultima vez cada modificador apretado (0: suelto).
  const held: Record<Modifier, number> = { ctrl: 0, shift: 0, alt: 0, meta: 0 };

  function track(event: KeyboardEvent) {
    const modifier = modifierOfCode(event.code ?? "");
    const now = event.timeStamp || performance.now();
    if (modifier) held[modifier] = event.type === "keydown" ? now : 0;
    // Un evento que si los trae confirma que siguen apretados.
    if (event.ctrlKey && held.ctrl) held.ctrl = now;
    if (event.shiftKey && held.shift) held.shift = now;
    if (event.altKey && held.alt) held.alt = now;
    if (event.metaKey && held.meta) held.meta = now;
  }

  function withHeld(event: KeyboardEvent) {
    const now = event.timeStamp || performance.now();
    const down = (modifier: Modifier) => held[modifier] > 0 && now - held[modifier] < HELD_MS;
    return {
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey || down("ctrl"),
      shiftKey: event.shiftKey || down("shift"),
      altKey: event.altKey || down("alt"),
      metaKey: event.metaKey || down("meta"),
    };
  }

  function onKeyup(event: KeyboardEvent) {
    track(event);
  }

  function onBlur() {
    held.ctrl = held.shift = held.alt = held.meta = 0;
  }

  function onKeydown(event: KeyboardEvent) {
    track(event);
    if (event.defaultPrevented || event.isComposing || isBlocked()) return;
    const keys = formatShortcutEvent(withHeld(event));
    if (!keys) return;
    let ids = get(shortcuts)
      .filter((shortcut) => shortcutUses(shortcut, keys))
      .map((shortcut) => shortcut.id);
    if (inTerminal(event.target)) ids = ids.filter((id) => TERMINAL_COMMANDS.has(id));
    if (ids.length === 0) return;
    if (runFirstCommand(ids, get(activeZone)) === null) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  window.addEventListener("keydown", onKeydown, true);
  window.addEventListener("keyup", onKeyup, true);
  window.addEventListener("blur", onBlur);
  return () => {
    installed = false;
    window.removeEventListener("keydown", onKeydown, true);
    window.removeEventListener("keyup", onKeyup, true);
    window.removeEventListener("blur", onBlur);
  };
}
