import type { Zone } from "$lib/focusZones";

// Registro central de comandos. Cada accion de la app tiene un id, la zona
// donde actua y uno o mas handlers, que registra el componente dueño de su
// estado (el toggle del sidebar en +layout.svelte, las consolas en
// Workspace.svelte...). Las teclas son otra capa encima (stores/shortcuts.ts
// + keybindings.ts): una tecla elige un comando y el comando resuelve segun
// la zona activa. Asi la hoja de atajos, el historial y el futuro vim mode
// hablan con los mismos comandos sin saber de teclas.
//
// El nombre y la descripcion de cada comando se traducen por su id en
// i18n/messages/shortcuts.ts.

// "global": actua este donde este el foco.
export type CommandZone = Zone | "global";
// Donde se muestra en Ajustes > Atajos y en la hoja de atajos.
export type CommandGroup = "general" | "editor" | "results";

export interface CommandDefinition {
  id: string;
  zone: CommandZone;
  group: CommandGroup;
  defaultKeys: string;
  // Teclas de fabrica que tambien valen mientras el usuario no reasigne el
  // comando (Ctrl+PageDown junto a Ctrl+Tab, F1 junto a Ctrl+?).
  aliasKeys?: string[];
}

// Ir a la pestaña 1..9 de la fila del foco (Ctrl+1..9).
export const TAB_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

// El orden es el de Ajustes > Atajos dentro de cada grupo.
export const commandDefinitions: CommandDefinition[] = [
  // Mueven el foco a la zona vecina (focusZones.ts). Valen tambien con el
  // foco en la terminal.
  { id: "focus-zone-left", zone: "global", group: "general", defaultKeys: "Ctrl+Alt+Shift+ArrowLeft" },
  { id: "focus-zone-right", zone: "global", group: "general", defaultKeys: "Ctrl+Alt+Shift+ArrowRight" },
  { id: "focus-zone-up", zone: "global", group: "general", defaultKeys: "Ctrl+Alt+Shift+ArrowUp" },
  { id: "focus-zone-down", zone: "global", group: "general", defaultKeys: "Ctrl+Alt+Shift+ArrowDown" },
  // Las pestañas de la fila del foco: consolas, panel inferior o sesiones de
  // la terminal (workspace/tabCommands.ts).
  { id: "next-tab", zone: "global", group: "general", defaultKeys: "Ctrl+Tab", aliasKeys: ["Ctrl+PageDown"] },
  { id: "previous-tab", zone: "global", group: "general", defaultKeys: "Ctrl+Shift+Tab", aliasKeys: ["Ctrl+PageUp"] },
  ...TAB_NUMBERS.map(
    (n): CommandDefinition => ({ id: `go-to-tab-${n}`, zone: "global", group: "general", defaultKeys: `Ctrl+${n}` }),
  ),
  { id: "toggle-sidebar", zone: "global", group: "general", defaultKeys: "Ctrl+E" },
  { id: "toggle-terminal", zone: "global", group: "general", defaultKeys: "Ctrl+T" },
  // Busca en la zona activa: cada zona registra su propio handler.
  { id: "find", zone: "global", group: "general", defaultKeys: "Ctrl+F" },
  // Como en DataGrip: buscar y reemplazar son atajos separados, no un
  // toggle dentro de buscar.
  { id: "replace", zone: "editor", group: "editor", defaultKeys: "Ctrl+R" },
  // Ctrl+? sale con Shift en cualquier distribucion (Shift+/ en ingles,
  // Shift+' en español).
  { id: "shortcut-sheet", zone: "global", group: "general", defaultKeys: "Ctrl+Shift+?", aliasKeys: ["F1"] },
  { id: "open-settings", zone: "global", group: "general", defaultKeys: "Ctrl+," },
  { id: "switch-connection", zone: "global", group: "general", defaultKeys: "Ctrl+Shift+O" },
  // En el arbol de archivos, crea un archivo (FileTree.svelte).
  { id: "new-query-console", zone: "global", group: "general", defaultKeys: "Ctrl+N" },
  // Segun el foco: la consola, la sesion de la terminal o el archivo.
  { id: "rename-query-console", zone: "global", group: "general", defaultKeys: "Ctrl+Shift+R" },
  // En el resultado, con cambios pendientes, los aplica (ResultPane.svelte).
  { id: "save-query-console", zone: "global", group: "general", defaultKeys: "Ctrl+S" },
  { id: "save-query-console-as", zone: "global", group: "general", defaultKeys: "Ctrl+Shift+S" },
  { id: "open-sql-file", zone: "global", group: "general", defaultKeys: "Ctrl+O" },
  { id: "close-query-console", zone: "global", group: "general", defaultKeys: "Ctrl+W" },
  // Consolas en mosaico (Workspace.svelte): elegir cual va junto a la
  // enfocada, y sacar la enfocada del mosaico sin cerrarla.
  { id: "tile-console", zone: "global", group: "general", defaultKeys: "Ctrl+Alt+M" },
  { id: "untile-console", zone: "global", group: "general", defaultKeys: "Ctrl+Alt+W" },
  // Solo con el foco en la terminal; fuera, la tecla sigue su camino.
  { id: "new-terminal-session", zone: "global", group: "general", defaultKeys: "Ctrl+Shift+T" },
  { id: "close-terminal-session", zone: "global", group: "general", defaultKeys: "Ctrl+Shift+W" },
  { id: "execute-query", zone: "editor", group: "editor", defaultKeys: "Ctrl+Enter" },
  { id: "execute-script", zone: "editor", group: "editor", defaultKeys: "Ctrl+Shift+Enter" },
  // Solo toma la tecla mientras corre una consulta; si no, Esc sigue su
  // camino (cerrar una busqueda, volver al editor...).
  { id: "cancel-query", zone: "global", group: "editor", defaultKeys: "Escape" },
  { id: "query-history", zone: "global", group: "editor", defaultKeys: "Ctrl+H" },
  { id: "format-sql", zone: "editor", group: "editor", defaultKeys: "Ctrl+L" },
  // Solo errores.
  { id: "next-diagnostic", zone: "editor", group: "editor", defaultKeys: "Alt+N" },
  { id: "previous-diagnostic", zone: "editor", group: "editor", defaultKeys: "Alt+P" },
  { id: "diagnostic-details", zone: "editor", group: "editor", defaultKeys: "Ctrl+." },
  // Como en JetBrains.
  { id: "apply-quick-fix", zone: "editor", group: "editor", defaultKeys: "Alt+Enter" },
  // Como Ctrl+clic; Ctrl+B es "ir a la declaracion" en JetBrains.
  { id: "open-table-definition", zone: "editor", group: "editor", defaultKeys: "Ctrl+B" },
  { id: "select-all", zone: "editor", group: "editor", defaultKeys: "Ctrl+A" },
  { id: "add-result-row", zone: "results", group: "results", defaultKeys: "Ctrl+I" },
  { id: "delete-result-rows", zone: "results", group: "results", defaultKeys: "Ctrl+Delete" },
  { id: "revert-result-changes", zone: "results", group: "results", defaultKeys: "Ctrl+Z" },
  { id: "submit-result-changes", zone: "results", group: "results", defaultKeys: "Ctrl+Enter" },
  // Actuan sobre el resultado, pero sirven tambien desde el editor, recien
  // ejecutada la consulta.
  { id: "next-result-page", zone: "global", group: "results", defaultKeys: "Alt+ArrowRight" },
  { id: "previous-result-page", zone: "global", group: "results", defaultKeys: "Alt+ArrowLeft" },
];

// Dos comandos con la misma tecla chocan si actuan en la misma zona o si uno
// es global (el de la zona lo taparia ahi). Ejecutar (editor) y Aplicar
// cambios (resultado) comparten Ctrl+Enter a proposito.
export function commandsCollide(a: CommandZone, b: CommandZone): boolean {
  return a === b || a === "global" || b === "global";
}

// Devuelve false cuando no aplica en ese momento (p. ej. no hay consola
// activa): la tecla sigue su camino normal o prueba el siguiente comando.
export type CommandHandler = () => boolean | void;

// Por comando y zona, una pila: se prueba del ultimo registrado al primero
// hasta que uno aplique.
const handlers = new Map<string, CommandHandler[]>();

function handlerKey(id: string, zone: CommandZone): string {
  return `${zone}:${id}`;
}

export function registerCommand(id: string, zone: CommandZone, handler: CommandHandler): () => void {
  const key = handlerKey(id, zone);
  const stack = handlers.get(key) ?? [];
  stack.push(handler);
  handlers.set(key, stack);
  return () => {
    const current = handlers.get(key);
    if (!current) return;
    const index = current.lastIndexOf(handler);
    if (index >= 0) current.splice(index, 1);
    if (current.length === 0) handlers.delete(key);
  };
}

// Varios de una vez para la misma zona; devuelve una sola limpieza (para
// usar directo como retorno de un $effect o de onMount).
export function registerCommands(zone: CommandZone, map: Record<string, CommandHandler>): () => void {
  const cleanups = Object.entries(map).map(([id, handler]) => registerCommand(id, zone, handler));
  return () => cleanups.forEach((cleanup) => cleanup());
}

function runHandler(id: string, zone: CommandZone): boolean {
  const stack = handlers.get(handlerKey(id, zone)) ?? [];
  for (let index = stack.length - 1; index >= 0; index--) {
    if (stack[index]() !== false) return true;
  }
  return false;

}

// Para una tecla con varios comandos: el primero que aplique, en el orden
// dado. Primero los de la zona activa, asi Ctrl+Enter ejecuta en el editor y
// aplica cambios en el resultado.
export function runFirstCommand(ids: string[], zone: Zone | null): string | null {
  if (zone !== null) {
    for (const id of ids) if (runHandler(id, zone)) return id;
  }
  for (const id of ids) if (runHandler(id, "global")) return id;
  return null;
}

// Un solo comando (desde un menu, la hoja de atajos o el vim mode).
export function runCommand(id: string, zone: Zone | null): boolean {
  return runFirstCommand([id], zone) !== null;
}
