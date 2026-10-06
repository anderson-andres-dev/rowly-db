import { browser } from "$app/environment";
import { writable } from "svelte/store";

const STORAGE_KEY = "khipu:sidebar-width:v1";
export const DEFAULT_SIDEBAR_WIDTH = 220;
// Por debajo de este ancho el arbol de tablas ya no se lee: si se suelta
// el arrastre ahi, el sidebar termina de cerrarse con animacion en vez de
// quedar como una franja inutil.
export const MIN_SIDEBAR_WIDTH = 150;
export const MAX_SIDEBAR_WIDTH = 520;

export function clampSidebarWidth(value: number): number {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(value)));
}

// Resultado de soltar el arrastre en `width`: o se colapsa (conservando
// el ultimo ancho util para cuando se vuelva a abrir con Ctrl+E), o queda
// fijo en ese ancho, acotado al rango permitido.
export function releaseSidebarDrag(width: number): { collapse: true } | { collapse: false; width: number } {
  if (width < MIN_SIDEBAR_WIDTH) return { collapse: true };
  return { collapse: false, width: clampSidebarWidth(width) };
}

function loadSidebarWidth(): number {
  if (!browser) return DEFAULT_SIDEBAR_WIDTH;
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(stored) && stored > 0 ? clampSidebarWidth(stored) : DEFAULT_SIDEBAR_WIDTH;
  } catch {
    return DEFAULT_SIDEBAR_WIDTH;
  }
}

export const sidebarWidth = writable<number>(loadSidebarWidth());

if (browser) {
  sidebarWidth.subscribe((width) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(width));
    } catch {
      // Sin almacenamiento, el ancho vive solo en memoria durante la sesion.
    }
  });
}
