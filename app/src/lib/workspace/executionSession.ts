// Ejecuciones en curso por consola: cada una lleva un id con el que se puede
// cancelar mientras corre. Es el unico llamador de executeQuery en el
// frontend: editor, historial, pestañas de tabla, paginacion, scripts y
// confirmaciones pasan por run().
//
// La consola no puede tener dos ejecuciones a la vez (beginQueryExecution de
// stores/queryConsoles lo impide); aun asi, si una ejecucion vieja termina
// despues de que empezo otra, no borra el registro de la nueva.

import { writable, type Readable } from "svelte/store";
import { cancelQuery, executeQuery, type PageRequest } from "$lib/queryExecution";
import type { DestructiveStatement, ExecuteQueryResponse } from "$lib/types";

export interface ExecutionBackend {
  execute(
    sql: string,
    confirmed: DestructiveStatement | null,
    page: PageRequest,
    executionId: string,
  ): Promise<ExecuteQueryResponse>;
  cancel(executionId: string): Promise<void>;
  newId(): string;
}

export interface ExecutionSession {
  // Consolas con una cancelacion pedida y aun sin respuesta.
  cancelling: Readable<Record<string, boolean>>;
  run(
    consoleId: string,
    sql: string,
    confirmed: DestructiveStatement | null,
    page: PageRequest,
  ): Promise<{ response: ExecuteQueryResponse; cancelled: boolean }>;
  // true si habia una ejecucion que cancelar (aunque ya se hubiera pedido).
  cancel(consoleId: string): boolean;
}

// El de la app: los comandos execute_query y cancel_query.
export const tauriExecutionBackend: ExecutionBackend = {
  execute: executeQuery,
  cancel: cancelQuery,
  newId: () => crypto.randomUUID(),
};

export function createExecutionSession(backend: ExecutionBackend = tauriExecutionBackend): ExecutionSession {
  const running = new Map<string, string>();
  const cancelling = writable<Record<string, boolean>>({});
  let current: Record<string, boolean> = {};
  cancelling.subscribe((value) => (current = value));

  return {
    cancelling: { subscribe: cancelling.subscribe },

    async run(consoleId, sql, confirmed, page) {
      const executionId = backend.newId();
      running.set(consoleId, executionId);
      try {
        const response = await backend.execute(sql, confirmed, page, executionId);
        return { response, cancelled: current[consoleId] === true };
      } finally {
        if (running.get(consoleId) === executionId) {
          running.delete(consoleId);
          cancelling.update(({ [consoleId]: _done, ...rest }) => rest);
        }
      }
    },

    cancel(consoleId) {
      const executionId = running.get(consoleId);
      if (!executionId) return false;
      if (!current[consoleId]) {
        cancelling.update((value) => ({ ...value, [consoleId]: true }));
        void backend.cancel(executionId);
      }
      return true;
    },
  };
}
