import { get } from "svelte/store";
import { runFirstCommand } from "$lib/workspace/commands";
import { activeZone } from "$lib/focusZones";
import { formatShortcutEvent, shortcuts } from "$lib/stores/shortcuts";

// Despachador unico de atajos: traduce la tecla a los comandos que la usan
// (stores/shortcuts.ts) y los ejecuta en la zona activa (lib/workspace/commands.ts).
// Ningun componente escucha teclas para sus acciones; registran comandos.
//
// En captura, para llegar antes que CodeMirror y el grid: si un comando
// toma la tecla, nadie mas la ve. Si ninguno aplica, sigue su camino normal
// (p. ej. Ctrl+A en un input fuera del editor).
//
// Esc hacia el editor y las flechas del modo mover siguen en focusZones.ts:
// dependen de lo que la zona haga con la tecla, no son acciones.

let installed = false;

export function installKeybindings(isBlocked: () => boolean): () => void {
  if (installed) return () => {};
  installed = true;

  function onKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.isComposing || isBlocked()) return;
    const keys = formatShortcutEvent(event);
    if (!keys) return;
    const ids = get(shortcuts)
      .filter((shortcut) => shortcut.keys === keys)
      .map((shortcut) => shortcut.id);
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
