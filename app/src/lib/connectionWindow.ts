import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { ConnectionProfile } from "$lib/stores/connectionProfiles";

// Abre `profile` en una ventana nueva de Rowly DB. La ventana carga la app con
// ?connect=<id> y +page.svelte se conecta sola a ese perfil. El backend
// guarda una conexion por ventana (AppState en src-tauri/src/state.rs), asi
// que esta ventana y la actual trabajan cada una contra su base.
//
// El label "connection-*" es el que habilita capabilities/default.json.
export function openConnectionWindow(profile: ConnectionProfile): Promise<void> {
  const label = `connection-${crypto.randomUUID().slice(0, 8)}`;
  const window = new WebviewWindow(label, {
    url: `/?connect=${encodeURIComponent(profile.id)}`,
    title: `${profile.name} · Rowly DB`,
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    // Igual que la ventana principal (tauri.conf.json): la barra de titulo
    // la dibuja la app.
    decorations: false,
    shadow: false,
    focus: true,
  });

  return new Promise((resolve, reject) => {
    void window.once("tauri://created", () => resolve());
    void window.once("tauri://error", (event) => reject(new Error(String(event.payload))));
  });
}
