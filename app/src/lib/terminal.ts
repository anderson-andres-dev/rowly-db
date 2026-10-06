// La terminal integrada del lado del frontend: el backend es dueño del PTY y
// del shell (src-tauri/src/terminal.rs); aquí solo se conoce su id. La
// salida llega en bytes y va directa a xterm, que decodifica el UTF-8: no se
// guarda en ningún store.
import { Channel, invoke } from "@tauri-apps/api/core";

export interface TerminalCallbacks {
  output: (bytes: Uint8Array) => void;
  // El shell terminó (`exit`, o se cerró la terminal); su código si lo dio.
  exit: (code: number | null) => void;
}

// Para la cabecera del panel: el nombre del shell y la carpeta en que
// arrancó, con ~ por HOME.
export interface TerminalInfo {
  id: number;
  shell: string;
  cwd: string;
}

// `cwd`: la carpeta SQL del perfil; sin ella (o si ya no existe), HOME.
export function createTerminal(cols: number, rows: number, cwd: string | null, callbacks: TerminalCallbacks): Promise<TerminalInfo> {
  const output = new Channel<ArrayBuffer>((bytes) => callbacks.output(new Uint8Array(bytes)));
  const exit = new Channel<number | null>((code) => callbacks.exit(code));
  return invoke<TerminalInfo>("create_terminal", { cols, rows, cwd, output, exit });
}

// Lo que produce xterm, tal cual. `binary`: lo de `onBinary`, un byte por
// carácter.
export function writeTerminal(id: number, data: string, binary = false): Promise<void> {
  return invoke("write_terminal", { id, data, binary });
}

export function resizeTerminal(id: number, cols: number, rows: number): Promise<void> {
  return invoke("resize_terminal", { id, cols, rows });
}

export function closeTerminal(id: number): Promise<void> {
  return invoke("close_terminal", { id });
}
