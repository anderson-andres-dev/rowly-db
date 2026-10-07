import { browser } from "$app/environment";
import { writable } from "svelte/store";
import { leaves, parseMosaic } from "$lib/workspace/mosaic";
import { parseGroups, type TabGroups } from "$lib/workspace/tabGroups";

// Los grupos de consolas del editor, por conexion (workspace/tabGroups.ts):
// el mosaico, que consola esta en cada grupo y cual se ve. Las consolas que
// ya no existen las acomoda Workspace.svelte al montar (normalizeGroups).
// La version anterior guardaba solo el arbol de consolas: no se migra (se
// empieza con un grupo).
const STORAGE_KEY = "khipu:editor-groups:v1";

function load(): Record<string, TabGroups> {
  if (!browser) return {};
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    const out: Record<string, TabGroups> = {};
    if (raw && typeof raw === "object") {
      for (const [profileId, value] of Object.entries(raw)) {
        const groups = parseGroups(value, parseMosaic);
        if (groups) out[profileId] = groups;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export const editorGroups = writable<Record<string, TabGroups>>(load());

export function setEditorGroups(profileId: string, groups: TabGroups): void {
  editorGroups.update((all) => (all[profileId] === groups ? all : { ...all, [profileId]: groups }));
}

if (browser) {
  editorGroups.subscribe((all) => {
    // Solo los que de verdad parten el editor: un grupo solo es el estado
    // por defecto.
    const kept = Object.fromEntries(Object.entries(all).filter(([, groups]) => leaves(groups.tree).length > 1));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
    } catch {
      // Sin almacenamiento, los grupos viven solo durante la sesion.
    }
  });
}
