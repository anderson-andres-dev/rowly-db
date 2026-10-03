import { browser } from "$app/environment";
import { writable } from "svelte/store";
import { COPY_FORMATS, type CopyFormat } from "$lib/results/gridClipboard";

// Formato con que Ctrl+C copia varias celdas del grid (selector de la
// barra del resultado). Se recuerda entre sesiones.
export interface CopySettings {
  format: CopyFormat;
  headers: boolean;
}

const STORAGE_KEY = "khipu:copy-format:v1";
const DEFAULTS: CopySettings = { format: "tsv", headers: false };

function load(): CopySettings {
  if (!browser) return DEFAULTS;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<CopySettings> | null;
    return {
      format: COPY_FORMATS.some((item) => item.id === parsed?.format) ? (parsed!.format as CopyFormat) : DEFAULTS.format,
      headers: parsed?.headers === true,
    };
  } catch {
    return DEFAULTS;
  }
}

export const copySettings = writable<CopySettings>(load());

if (browser) {
  copySettings.subscribe((settings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Sin almacenamiento, la eleccion dura la sesion.
    }
  });
}
