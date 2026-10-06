import { registerCommands, TAB_NUMBERS, type CommandHandler, type CommandZone } from "$lib/workspace/commands";

// Una fila de pestañas que se recorre con el teclado: siguiente y anterior
// (Ctrl+Tab / Ctrl+Shift+Tab, dando la vuelta en los bordes) e ir a la N
// (Ctrl+1..9). Cada fila (consolas, panel inferior, sesiones de la terminal)
// registra la suya en su zona; `applies` dice si el foco esta en ella.
export interface TabRow {
  keys: () => string[];
  current: () => string | null;
  select: (key: string) => void;
  applies?: () => boolean;
}

export function stepTab(keys: string[], current: string | null, delta: 1 | -1): string | null {
  if (keys.length === 0) return null;
  const index = current === null ? -1 : keys.indexOf(current);
  if (index < 0) return delta > 0 ? keys[0] : keys[keys.length - 1];
  return keys[(index + delta + keys.length) % keys.length];
}

export function registerTabCommands(zone: CommandZone, row: TabRow): () => void {
  const when = (run: () => boolean): CommandHandler => () => (row.applies?.() ?? true) && run();
  const step = (delta: 1 | -1) =>
    when(() => {
      const key = stepTab(row.keys(), row.current(), delta);
      if (key === null) return false;
      row.select(key);
      return true;
    });
  const handlers: Record<string, CommandHandler> = { "next-tab": step(1), "previous-tab": step(-1) };
  for (const n of TAB_NUMBERS) {
    handlers[`go-to-tab-${n}`] = when(() => {
      const key = row.keys()[n - 1];
      if (key === undefined) return false;
      row.select(key);
      return true;
    });
  }
  return registerCommands(zone, handlers);
}
