import { browser } from "$app/environment";
import { writable } from "svelte/store";
import { leaves, parseMosaic, type Mosaic } from "$lib/workspace/mosaic";

// Como quedan las consolas en mosaico, por conexion (workspace/mosaic.ts).
// Una sola hoja es lo de siempre: una consola a la vez. Las consolas que ya
// no existen las poda Workspace.svelte al montar.
const STORAGE_KEY = "khipu:console-mosaic:v1";

function load(): Record<string, Mosaic> {
  if (!browser) return {};
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    const out: Record<string, Mosaic> = {};
    if (raw && typeof raw === "object") {
      for (const [profileId, value] of Object.entries(raw)) {
        const tree = parseMosaic(value);
        if (tree) out[profileId] = tree;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export const consoleMosaics = writable<Record<string, Mosaic>>(load());

export function setConsoleMosaic(profileId: string, tree: Mosaic | null): void {
  consoleMosaics.update((all) => {
    if (all[profileId] === tree) return all;
    const { [profileId]: _previous, ...rest } = all;
    return tree ? { ...rest, [profileId]: tree } : rest;
  });
}

if (browser) {
  consoleMosaics.subscribe((all) => {
    // Solo los que de verdad parten la pantalla: una hoja sola es el estado
    // por defecto y no hace falta recordarla.
    const kept = Object.fromEntries(Object.entries(all).filter(([, tree]) => leaves(tree).length > 1));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
    } catch {
      // Sin almacenamiento, el mosaico vive solo durante la sesion.
    }
  });
}
