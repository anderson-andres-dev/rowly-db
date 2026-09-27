import { browser } from "$app/environment";
import { derived, writable } from "svelte/store";

// Catalogo de atajos de teclado de la app. La accion real de cada uno vive
// donde corresponde su estado (p.ej. el toggle del sidebar en
// +layout.svelte); este modulo solo sabe el id y la tecla por defecto y
// persiste los overrides que el usuario reasigne en Ajustes > Atajos.
// El nombre y la descripción de cada atajo se traducen por su id en
// i18n/messages/shortcuts.ts.
export interface ShortcutDefinition {
  id: string;
  defaultKeys: string;
}

export const shortcutDefinitions: ShortcutDefinition[] = [
  {
    id: "toggle-sidebar",
    defaultKeys: "Alt+1",
  },
  {
    id: "select-all",
    defaultKeys: "Ctrl+A",
  },
  {
    id: "new-query-console",
    defaultKeys: "Ctrl+Shift+Q",
  },
  {
    id: "rename-query-console",
    defaultKeys: "Shift+F6",
  },
  {
    id: "save-query-console",
    defaultKeys: "Ctrl+S",
  },
  {
    id: "save-query-console-as",
    defaultKeys: "Ctrl+Shift+S",
  },
  {
    id: "open-sql-file",
    defaultKeys: "Ctrl+O",
  },
  {
    id: "close-query-console",
    defaultKeys: "Ctrl+F4",
  },
  {
    id: "format-sql",
    defaultKeys: "Ctrl+L",
  },
  {
    id: "add-result-row",
    defaultKeys: "Alt+Insert",
  },
  {
    id: "delete-result-rows",
    defaultKeys: "Ctrl+Y",
  },
  {
    id: "revert-result-changes",
    defaultKeys: "Ctrl+Alt+Z",
  },
  {
    id: "submit-result-changes",
    defaultKeys: "Ctrl+Enter",
  },
  {
    id: "next-result-page",
    defaultKeys: "Ctrl+Alt+ArrowDown",
  },
  {
    id: "previous-result-page",
    defaultKeys: "Ctrl+Alt+ArrowUp",
  },
  {
    id: "execute-query",
    defaultKeys: "Ctrl+Enter",
  },
];

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
  isCustom: boolean;
}

// Lista lista para pintar en Ajustes > Atajos: cada definicion con su tecla
// vigente (override si existe, si no la de fabrica).
export const shortcuts = derived(shortcutOverrides, (overrides) =>
  shortcutDefinitions.map(
    (definition): ResolvedShortcut => ({
      ...definition,
      keys: overrides[definition.id] ?? definition.defaultKeys,
      isCustom: definition.id in overrides,
    }),
  ),
);

export function setShortcutKeys(id: string, keys: string): void {
  shortcutOverrides.update((overrides) => ({ ...overrides, [id]: keys }));
}

export function resetShortcutKeys(id: string): void {
  shortcutOverrides.update((overrides) => {
    const { [id]: _removed, ...rest } = overrides;
    return rest;
  });
}

const MODIFIER_KEYS = new Set(["Control", "Alt", "Shift", "Meta"]);

// Normaliza un KeyboardEvent a un string estable como "Ctrl+Alt+1" para
// guardar/comparar atajos. Devuelve null mientras solo se sostiene un
// modificador (todavia no hay una tecla "principal" que capturar).
export function resetAllShortcuts(): void {
  shortcutOverrides.set({});
}

export function formatShortcutEvent(event: KeyboardEvent): string | null {
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

export function eventMatchesShortcut(event: KeyboardEvent, keys: string): boolean {
  return formatShortcutEvent(event) === keys;
}

// Traduce nuestro formato ("Ctrl+A") al que espera keymap.of() de CodeMirror
// ("Ctrl-a": modificadores y tecla base separados por guion, base en
// minuscula cuando es una sola letra).
export function toCodeMirrorKey(keys: string): string {
  const parts = keys.split("+");
  const base = parts.pop() ?? "";
  const normalizedBase = base.length === 1 ? base.toLowerCase() : base;
  return [...parts, normalizedBase].join("-");
}
