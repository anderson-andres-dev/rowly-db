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
}

// El orden es el de Ajustes > Atajos dentro de cada grupo.
export const commandDefinitions: CommandDefinition[] = [
  // Prefijo: despues, una flecha mueve el foco a la zona vecina
  // (focusZones.ts).
  { id: "focus-zone-prefix", zone: "global", group: "general", defaultKeys: "Ctrl+W" },
  { id: "toggle-sidebar", zone: "global", group: "general", defaultKeys: "Alt+1" },
  // Busca en la zona activa: cada zona registra su propio handler.
  { id: "find", zone: "global", group: "general", defaultKeys: "Ctrl+F" },
  // Ctrl+/ (lo habitual en otras apps) es comentar linea en el editor.
  { id: "shortcut-sheet", zone: "global", group: "general", defaultKeys: "F1" },
  { id: "new-query-console", zone: "global", group: "general", defaultKeys: "Ctrl+Shift+Q" },
  { id: "rename-query-console", zone: "global", group: "general", defaultKeys: "Shift+F6" },
  { id: "save-query-console", zone: "global", group: "general", defaultKeys: "Ctrl+S" },
  { id: "save-query-console-as", zone: "global", group: "general", defaultKeys: "Ctrl+Shift+S" },
  { id: "open-sql-file", zone: "global", group: "general", defaultKeys: "Ctrl+O" },
  { id: "close-query-console", zone: "global", group: "general", defaultKeys: "Ctrl+F4" },
  { id: "execute-query", zone: "editor", group: "editor", defaultKeys: "Ctrl+Enter" },
  { id: "execute-script", zone: "editor", group: "editor", defaultKeys: "Ctrl+Shift+Enter" },
  // Solo toma la tecla mientras corre una consulta; si no, Esc sigue su
  // camino (cerrar una busqueda, volver al editor...).
  { id: "cancel-query", zone: "global", group: "editor", defaultKeys: "Escape" },
  { id: "query-history", zone: "global", group: "editor", defaultKeys: "Ctrl+E" },
  { id: "format-sql", zone: "editor", group: "editor", defaultKeys: "Ctrl+L" },
  { id: "select-all", zone: "editor", group: "editor", defaultKeys: "Ctrl+A" },
  { id: "add-result-row", zone: "results", group: "results", defaultKeys: "Alt+Insert" },
  { id: "delete-result-rows", zone: "results", group: "results", defaultKeys: "Ctrl+Y" },
  { id: "revert-result-changes", zone: "results", group: "results", defaultKeys: "Ctrl+Alt+Z" },
  { id: "submit-result-changes", zone: "results", group: "results", defaultKeys: "Ctrl+Enter" },
  // Actuan sobre el resultado, pero sirven tambien desde el editor, recien
  // ejecutada la consulta.
  { id: "next-result-page", zone: "global", group: "results", defaultKeys: "Ctrl+Alt+ArrowDown" },
  { id: "previous-result-page", zone: "global", group: "results", defaultKeys: "Ctrl+Alt+ArrowUp" },
];

const definitionsById = new Map(commandDefinitions.map((definition) => [definition.id, definition]));

export function commandDefinition(id: string): CommandDefinition | undefined {
  return definitionsById.get(id);
}

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
