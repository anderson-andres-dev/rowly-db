import { browser } from "$app/environment";
import { get, writable } from "svelte/store";

// Ultimo valor escrito para cada parametro (:nombre) de una consulta, o si
// se eligio NULL: el dialogo de parametros lo propone la proxima vez. Se
// recuerda entre sesiones; los mas viejos se olvidan pasado MAX_REMEMBERED.

export interface RememberedParameter {
  value: string;
  isNull: boolean;
}

const STORAGE_KEY = "khipu:query-parameters:v1";
const MAX_REMEMBERED = 200;

function parse(entry: unknown): RememberedParameter | null {
  if (typeof entry === "string") return { value: entry, isNull: false };
  if (!entry || typeof entry !== "object") return null;
  const { value, isNull } = entry as Partial<RememberedParameter>;
  return typeof value === "string" ? { value, isNull: isNull === true } : null;
}

function load(): Record<string, RememberedParameter> {
  if (!browser) return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, RememberedParameter> = {};
    for (const [name, entry] of Object.entries(parsed as Record<string, unknown>)) {
      const remembered = parse(entry);
      if (remembered) out[name] = remembered;
    }
    return out;
  } catch {
    return {};
  }
}

export const queryParameterValues = writable<Record<string, RememberedParameter>>(load());

// Los recien usados quedan al final (el orden de insercion de un objeto con
// claves de texto), asi recortar quita los que hace mas que no se usan.
export function rememberParameterValues(values: ReadonlyMap<string, RememberedParameter>): void {
  const next = { ...get(queryParameterValues) };
  for (const [name, value] of values) {
    delete next[name];
    next[name] = value;
  }
  const names = Object.keys(next);
  for (const name of names.slice(0, Math.max(0, names.length - MAX_REMEMBERED))) delete next[name];
  queryParameterValues.set(next);
}

if (browser) {
  queryParameterValues.subscribe((values) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
      // Sin almacenamiento, los valores duran la sesion.
    }
  });
}
