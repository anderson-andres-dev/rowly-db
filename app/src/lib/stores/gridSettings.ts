import { browser } from "$app/environment";
import { writable } from "svelte/store";

const STORAGE_KEY = "khipu:grid-settings:v1";

// Filas del resultado: con franjas alternas o todas del mismo fondo.
export type GridRowStyle = "striped" | "plain";
export const GRID_ROW_STYLES: readonly GridRowStyle[] = ["striped", "plain"];

export interface GridSettings {
  rowStyle: GridRowStyle;
}

function normalizeRowStyle(value: unknown): GridRowStyle {
  return GRID_ROW_STYLES.includes(value as GridRowStyle) ? (value as GridRowStyle) : "striped";
}

function loadGridSettings(): GridSettings {
  if (!browser) return { rowStyle: "striped" };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as Partial<GridSettings>) : {};
    return { rowStyle: normalizeRowStyle(parsed.rowStyle) };
  } catch {
    return { rowStyle: "striped" };
  }
}

export const gridSettings = writable<GridSettings>(loadGridSettings());

if (browser) {
  gridSettings.subscribe((settings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rowStyle: normalizeRowStyle(settings.rowStyle) }));
    } catch {
      // Sin almacenamiento, el valor vive en memoria.
    }
  });
}

export function setGridRowStyle(style: GridRowStyle): void {
  gridSettings.update((settings) => ({ ...settings, rowStyle: normalizeRowStyle(style) }));
}
