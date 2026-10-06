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

// Normaliza un KeyboardEvent a un string estable como "Ctrl+Alt+1" para
// guardar/comparar atajos. Devuelve null mientras solo se sostiene un
// modificador (todavia no hay una tecla "principal" que capturar).
export function formatShortcutEvent
(event: KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(event.key)) return null;

  const parts: string[] = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  if (event.metaKey) parts.push("Meta");

  const key = event.key;
  parts.push(key.length === 1 ? key.toUpperCase() : key);

  return parts.join("+");
}

const KEY_SYMBOLS: Record<string, string> = { ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓" };

// Las teclas de un atajo para pintarlas una por una (<kbd>), con las flechas
// como simbolo.
export function shortcutKeyParts(keys: string): string[] {
  return keys.split("+").map((key) => KEY_SYMBOLS[key] ?? key);
}
