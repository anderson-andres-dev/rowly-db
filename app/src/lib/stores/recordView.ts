import { browser } from "$app/environment";
import { writable } from "svelte/store";

// Ancho de la vista de registro (#133), el mismo en todos los resultados de
// la ventana. Persiste como el del panel lateral.
const STORAGE_KEY = "khipu:record-view-width:v1";
export const DEFAULT_RECORD_WIDTH = 340;
export const MIN_RECORD_WIDTH = 260;
export const MAX_RECORD_WIDTH = 640;

export function clampRecordWidth(value: number): number {
  return Math.min(MAX_RECORD_WIDTH, Math.max(MIN_RECORD_WIDTH, Math.round(value)));
}

function load(): number {
  if (!browser) return DEFAULT_RECORD_WIDTH;
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(stored) && stored > 0 ? clampRecordWidth(stored) : DEFAULT_RECORD_WIDTH;
  } catch {
    return DEFAULT_RECORD_WIDTH;
  }
}

export const recordViewWidth = writable<number>(load());

if (browser) {
  recordViewWidth.subscribe((width) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(width));
    } catch {
      // Sin almacenamiento, el ancho vive solo en memoria durante la sesion.
    }
  });
}
