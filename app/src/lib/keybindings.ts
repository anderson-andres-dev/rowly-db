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
  "shortcut-sheet",
]);

export function inTerminal(target: EventTarget | null): boolean {
  return !!(target as Element | null)?.closest?.("[data-terminal]");
}

let installed = false;

export function installKeybindings(isBlocked: () => boolean): () => void {
  if (installed) return () => {};
  installed = true;

  function onKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.isComposing || isBlocked()) return;
    const keys = formatShortcutEvent(event);
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
  return () => {
    installed = false;
    window.removeEventListener("keydown", onKeydown, true);
  };
}
