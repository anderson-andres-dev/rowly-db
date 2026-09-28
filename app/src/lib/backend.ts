import { invoke as tauriInvoke, type InvokeArgs } from "@tauri-apps/api/core";
import { translate, type MessageKey } from "$lib/i18n";

// Frontera con el backend. Lo que dice la app (sin conexion activa, la
// tabla no tiene clave primaria...) llega como clave + parametros
// (`Message` en driver-core) y se traduce aca, con `backend.*`; lo que dice
// la base o el sistema llega como texto y se muestra tal cual. Asi el resto
// de la interfaz sigue recibiendo strings.

export type BackendMessage = string | { key: string; params?: Record<string, string> };

function isKeyed(value: unknown): value is { key: string; params?: Record<string, string> } {
  return !!value && typeof value === "object" && typeof (value as { key?: unknown }).key === "string";
}

export function backendText(value: unknown): string {
  if (typeof value === "string") return value;
  if (isKeyed(value)) {
    const key = `backend.${value.key}` as MessageKey;
    const text = translate(key, value.params);
    // Una clave que este frontend no conoce (backend mas nuevo): al menos
    // se ve cual es.
    return text === key ? value.key : text;
  }
  if (value instanceof Error) return value.message;
  return String(value);
}

// Un rechazo del backend: un mensaje, o un objeto con su `message` (p. ej.
// el error de aplicar cambios del grid). Otros objetos (el fallo de conectar,
// con su causa) pasan tal cual.
function translatedRejection(error: unknown): unknown {
  if (typeof error === "string" || isKeyed(error)) return backendText(error);
  if (error && typeof error === "object" && "message" in error) {
    return { ...error, message: backendText((error as { message: unknown }).message) };
  }
  return error;
}

// El `invoke` de Tauri, con los rechazos ya traducidos.
export async function invoke<T>(command: string, args?: InvokeArgs): Promise<T> {
  try {
    return await tauriInvoke<T>(command, args);
  } catch (error) {
    throw translatedRejection(error);
  }
}
