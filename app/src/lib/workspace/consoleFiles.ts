// Guardar, abrir, renombrar y cerrar consolas. La consola es de
// stores/queryConsoles y el archivo en disco de sqlFiles; aqui vive solo el
// cierre pendiente (el aviso de "guardar antes de cerrar").
//
// Las acciones de archivo (dialogos + disco) son asincronas y pueden fallar
// por permisos, disco lleno, etc.: el error se muestra como aviso en vez de
// perderse en la consola del navegador.

import { get, writable, type Readable } from "svelte/store";
import { openSqlFileWithDialog, renameConsoleFile, saveConsole, saveConsoleAs } from "$lib/sqlFiles";
import { forgetLog } from "$lib/stores/executionLog";
import {
  closeQueryConsole,
  currentQueryConsole,
  isQueryConsoleDirty,
  queryConsoles,
  renameQueryConsole,
  type QueryConsole,
} from "$lib/stores/queryConsoles";
import { forgetResultEdits } from "$lib/stores/resultEdits";

export interface FileBackend {
  save(item: QueryConsole): Promise<boolean>;
  saveAs(item: QueryConsole): Promise<boolean>;
  open(profileId: string): Promise<boolean>;
  renameFile(id: string, name: string): Promise<void>;
}

// El de la app: los dialogos y el disco de sqlFiles.
export const tauriFileBackend: FileBackend = {
  save: saveConsole,
  saveAs: saveConsoleAs,
  open: openSqlFileWithDialog,
  renameFile: renameConsoleFile,
};

export interface FilesView {
  profileId(): string;
  // El titulo como se muestra ("consola_1" traducido).
  displayTitle(title: string): string;
  fallbackTitle(): string;
  // Pregunta antes de descartar cambios del grid; false = no seguir.
  confirmDiscard(key: string): Promise<boolean>;
  // Las pestañas de resultado de la consola (normal y fijadas).
  forgetResults(consoleId: string): void;
  notifyError(error: unknown): void;
}

// Cierre pendiente: el titulo queda congelado al abrir el aviso, para que no
// cambie si la consola se cierra mientras el aviso se desvanece.
export interface PendingClose {
  id: string;
  title: string;
}

export interface ConsoleFiles {
  pendingClose: Readable<PendingClose | null>;
  // true si la accion termino (no se cancelo el dialogo ni fallo).
  run(action: () => Promise<boolean | void>): Promise<boolean>;
  save(item: QueryConsole): Promise<boolean>;
  saveAs(item: QueryConsole): Promise<boolean>;
  open(): Promise<boolean>;
  // Guarda el nombre nuevo; en un archivo, renombra el archivo en disco.
  rename(id: string, name: string): void;
  requestClose(id: string): Promise<void>;
  cancelClose(): void;
  discardAndClose(): void;
  saveAndClose(): Promise<void>;
}

export function createConsoleFiles(view: FilesView, backend: FileBackend = tauriFileBackend): ConsoleFiles {
  const pendingClose = writable<PendingClose | null>(null);
  const find = (id: string) => get(queryConsoles).consoles.find((item) => item.id === id);

  async function run(action: () => Promise<boolean | void>): Promise<boolean> {
    try {
      return (await action()) !== false;
    } catch (error) {
      view.notifyError(error);
      return false;
    }
  }

  function close(id: string) {
    closeQueryConsole(view.profileId(), id);
    forgetResultEdits(id);
    forgetLog(id);
    view.forgetResults(id);
  }

  // Las tres respuestas del aviso llegan cuando termino de cerrarse.
  function take(): string | null {
    const pending = get(pendingClose);
    pendingClose.set(null);
    return pending?.id ?? null;
  }

  return {
    pendingClose: { subscribe: pendingClose.subscribe },
    run,
    save: (item) => run(() => backend.save(item)),
    saveAs: (item) => run(() => backend.saveAs(item)),
    open: () => run(() => backend.open(view.profileId())),

    rename(id, name) {
      const original = find(id)?.title;
      // Confirmar sin cambios el nombre por defecto traducido no debe
      // guardarlo traducido: se perderia el "consola_N" del que depende la
      // numeracion.
      if (original !== undefined && name === view.displayTitle(original)) return;
      if (find(id)?.filePath) void run(() => backend.renameFile(id, name));
      else renameQueryConsole(id, name);
    },

    async requestClose(id) {
      if (!(await view.confirmDiscard(id))) return;
      // Con el texto del editor al dia (lo manda con un retraso).
      const item = currentQueryConsole(id);
      // Solo se pregunta cuando cerrar perderia algo.
      if (item && !isQueryConsoleDirty(item)) {
        close(id);
        return;
      }
      pendingClose.set({ id, title: item ? view.displayTitle(item.title) : view.fallbackTitle() });
    },

    cancelClose() {
      pendingClose.set(null);
    },

    discardAndClose() {
      const id = take();
      if (id) close(id);
    },

    // Guarda (con el dialogo de "Guardar como" si es una consola) y recien
    // despues cierra; si el usuario cancela el dialogo o falla el disco, la
    // pestaña queda abierta.
    async saveAndClose() {
      const id = take();
      const item = id ? find(id) : undefined;
      if (!id || !item) return;
      if (await run(() => backend.save(item))) close(id);
    },
  };
}
