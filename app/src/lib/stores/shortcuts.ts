import { browser } from "$app/environment";
import { derived, writable } from "svelte/store";
import { commandDefinitions, type CommandDefinition } from "$lib/workspace/commands";

// Capa tecla -> comando: la tecla vigente de cada comando del registro
// (lib/workspace/commands.ts), con los overrides que el usuario reasigne en Ajustes >
// Atajos. Quien ejecuta es keybindings.ts; aqui solo se sabe que tecla
// corresponde a que id.
export type ShortcutDefinition = CommandDefinition;

export const shortcutDefinitions: ShortcutDefinition[] = commandDefinitions;

const STORAGE_KEY = "khipu:shortcut-overrides";

function loadOverrides(): Record<string, string> {
  if (!browser) return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};

    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return {};

    const overrides: Record<string, string> = {};
    for (const [id, keys] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof keys === "string") overrides[id] = keys;
    }
    return overrides;
  } catch {
    return {};
  }
}

const shortcutOverrides = writable<Record<string, string>>(loadOverrides());

if (browser) {
  shortcutOverrides.subscribe((overrides) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    } catch {
      // La falta de almacenamiento no debe impedir usar el atajo por defecto.
    }
  });
}

export interface ResolvedShortcut extends ShortcutDefinition {
  keys: string;
  // Los alias de fabrica; se pierden al reasignar el comando.
  aliases: string[];
  isCustom: boolean;
}

// Lista lista para pintar en Ajustes > Atajos: cada definicion con su tecla
// vigente (override si existe, si no la de fabrica).
export const shortcuts = derived(shortcutOverrides, (overrides) =>
  shortcutDefinitions.map((definition): ResolvedShortcut => {
    const isCustom = definition.id in overrides;
    return {
      ...definition,
      keys: overrides[definition.id] ?? definition.defaultKeys,
      aliases: isCustom ? [] : (definition.aliasKeys ?? []),
      isCustom,
    };
  }),
);

// La tecla vigente o uno de sus alias.
export function shortcutUses(shortcut: ResolvedShortcut, keys: string): boolean {
  return keys !== "" && (shortcut.keys === keys || shortcut.aliases.includes(keys));
}

export function setShortcutKeys(id: string, keys: string): void {
  shortcutOverrides.update((overrides) => ({ ...overrides, [id]: keys }));
}

export function resetShortcutKeys(id: string): void {
  shortcutOverrides.update((overrides) => {
    const { [id]: _removed, ...rest } = overrides;
    return rest;
  });
}

export function resetAllShortcuts(): void {
  shortcutOverrides.set({});
}

const MODIFIER_KEYS = new Set(["Control", "Alt", "Shift", "Meta"]);

// La tecla de un evento. WebKitGTK manda "Unidentified" para teclas que GTK
// convierte con Shift (Shift+Tab es ISO_Left_Tab): Ctrl+Shift+Tab no llegaba
// a ningun atajo. Ahi manda la tecla fisica (code): KeyT -> T, Digit1 -> 1,
// Tab -> Tab.
export function eventKey(event: Pick<KeyboardEvent, "key" | "code">): string {
  if (event.key && event.key !== "Unidentified") return event.key;
  const code = event.code ?? "";
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  return code || event.key;
}

// Lo que formatShortcutEvent lee de un evento (keybindings.ts le pasa los
// modificadores fisicos, que WebKitGTK a veces no trae).
export type ShortcutEventLike = Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey">;

// Normaliza un KeyboardEvent a un string estable como "Ctrl+Alt+1" para
// guardar/comparar atajos. Devuelve null mientras solo se sostiene un
// modificador (todavia no hay una tecla "principal" que capturar).
export function formatShortcutEvent(event: ShortcutEventLike): string | null {
  if (MODIFIER_KEYS.has(event.key)) return null;

  const parts: string[] = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  if (event.metaKey) parts.push("Meta");

  const key = eventKey(event);
  parts.push(key.length === 1 ? key.toUpperCase() : key);

  return parts.join("+");
}

const KEY_SYMBOLS: Record<string, string> = { ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓" };

// Las teclas de un atajo para pintarlas una por una (<kbd>), con las flechas
// como simbolo.
export function shortcutKeyParts(keys: string): string[] {
  return keys.split("+").map((key) => KEY_SYMBOLS[key] ?? key);
}
