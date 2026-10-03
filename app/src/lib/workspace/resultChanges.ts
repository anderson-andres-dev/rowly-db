// Cambios hechos en el grid de un resultado: preparar la edicion de cada
// resultado nuevo, preguntar antes de descartar lo pendiente, la vista previa
// del SQL y aplicarlo. El borrador es de stores/resultEdits y el resultado de
// stores/queryConsoles: aqui solo vive lo efimero de la vista previa.
//
// En produccion nada se aplica sin ver antes el SQL: aplicar desde la vista
// previa confirma, y el backend lo vuelve a exigir (apply_result_changes).

import { get, writable, type Readable } from "svelte/store";
import { invalidCells } from "$lib/cellTypes";
import {
  applyChanges,
  buildChanges,
  fetchEditInfo,
  pendingCount,
  previewChanges,
  type ChangeError,
  type EditTarget,
  type ResultChanges,
  type ResultEditInfo,
} from "$lib/resultEditing";
import { formatPreviewSql } from "$lib/sqlPreviewFormat";
import { appendLog } from "$lib/stores/executionLog";
import { consoleOfKey } from "$lib/stores/pinnedResults";
import { executionForConsole, queryConsoles } from "$lib/stores/queryConsoles";
import {
  clearResultPendingEdits,
  editStateFor,
  forgetResultEdits,
  resetResultEdits,
  resultEdits,
  setResultEditInfo,
} from "$lib/stores/resultEdits";
import type { MessageKey, MessageParams } from "$lib/i18n";
import type { QueryExecutionResult } from "$lib/types";
import { formatMs } from "./executionSession";

export interface ChangesBackend {
  info(sql: string, columnNames: string[]): Promise<ResultEditInfo>;
  preview(target: EditTarget, changes: ResultChanges): Promise<string[]>;
  apply(target: EditTarget, changes: ResultChanges, confirmed: boolean): Promise<number>;
}

// El de la app: los comandos de result_editing.
export const tauriChangesBackend: ChangesBackend = {
  info: fetchEditInfo,
  preview: previewChanges,
  apply: applyChanges,
};

export interface ChangesView {
  text(key: MessageKey, params?: MessageParams): string;
  number(value: number): string;
  // Prefijo de las entradas "query" de la Salida.
  schema(): string;
  production(): boolean;
  notifyError(error: unknown): void;
  // Recarga el resultado tras aplicar: trae ids generados, defaults y lo que
  // haya cambiado un trigger.
  reload(key: string): void;
}

export interface ChangesPreview {
  consoleId: string;
  target: EditTarget;
  changes: ResultChanges;
  statements: string[];
  // Pide al modal que se cierre (animado); lo quita su onclose.
  dismiss: boolean;
}

export interface DiscardPrompt {
  resolve(discard: boolean): void;
}

export interface ResultChangesController {
  preview: Readable<ChangesPreview | null>;
  applying: Readable<boolean>;
  error: Readable<ChangeError | null>;
  discardPrompt: Readable<DiscardPrompt | null>;
  // Cada resultado nuevo arranca sin cambios pendientes; si es otra
  // consulta, se pregunta al backend si (y como) se puede editar.
  prepare(key: string, sql: string, result: QueryExecutionResult): void;
  pendingCount(key: string): number;
  // Acepta varias claves y pregunta UNA vez por todas; false = no descartar.
  confirmDiscard(keys: string | string[]): Promise<boolean>;
  openPreview(key: string, error?: ChangeError | null): Promise<void>;
  submit(key: string, confirmed?: boolean): Promise<void>;
  closePreview(): void;
}

// Ancho de la vista previa (ver sqlPreviewFormat.ts): una clausula por linea,
// sin lineas kilometricas ni un valor por linea.
const PREVIEW_LINE_WIDTH = 78;

export function asChangeError(error: unknown): ChangeError {
  if (error && typeof error === "object" && "message" in error) {
    const value = error as Partial<ChangeError>;
    return { statementIndex: value.statementIndex ?? null, message: String(value.message), code: value.code ?? null };
  }
  return { statementIndex: null, message: String(error), code: null };
}

export function createResultChanges(
  view: ChangesView,
  backend: ChangesBackend = tauriChangesBackend,
): ResultChangesController {
  const preview = writable<ChangesPreview | null>(null);
  const applying = writable(false);
  const error = writable<ChangeError | null>(null);
  const discardPrompt = writable<DiscardPrompt | null>(null);

  const editState = (key: string) => editStateFor(get(resultEdits), key);
  const shownResult = (key: string) => executionForConsole(get(queryConsoles), key).result;
  const count = (key: string) => pendingCount(editState(key).edits);

  // Antes de aplicar (o de ver el SQL): si algun valor no encaja en su
  // columna (cellTypes.ts), no se manda nada; las celdas ya estan en rojo.
  function blockedByInvalidValues(key: string): boolean {
    const state = editState(key);
    const result = shownResult(key);
    if (!state.info || result?.type !== "resultSet") return false;
    const invalid = invalidCells(state.edits, state.info, result.rows);
    if (invalid.length === 0) return false;
    view.notifyError(
      view.text(invalid.length === 1 ? "results.invalidValuesOne" : "results.invalidValuesOther", {
        count: view.number(invalid.length),
      }),
    );
    return true;
  }

  function currentChanges(key: string): { target: EditTarget; changes: ResultChanges } | null {
    const state = editState(key);
    const result = shownResult(key);
    if (!state.info || result?.type !== "resultSet") return null;
    return { target: state.info.target, changes: buildChanges(state.edits, state.info, result.rows) };
  }

  // El SQL se pide ANTES de abrir: el modal aparece ya completo, sin un
  // instante vacio ni contenido que salta al llegar.
  async function openPreview(key: string, failure: ChangeError | null = null) {
    if (!failure && blockedByInvalidValues(key)) return;
    const current = currentChanges(key);
    if (!current) return;
    try {
      const statements = (await backend.preview(current.target, current.changes)).map((statement) =>
        formatPreviewSql(statement, PREVIEW_LINE_WIDTH),
      );
      error.set(failure);
      preview.set({ consoleId: key, ...current, statements, dismiss: false });
    } catch (cause) {
      view.notifyError(cause);
    }
  }

  return {
    preview: { subscribe: preview.subscribe },
    applying: { subscribe: applying.subscribe },
    error: { subscribe: error.subscribe },
    discardPrompt: { subscribe: discardPrompt.subscribe },
    pendingCount: count,
    openPreview,

    // Es un analisis local (AST + catalogo en memoria), no va a la base.
    prepare(key, sql, result) {
      if (result.type !== "resultSet") {
        forgetResultEdits(key);
        return;
      }
      if (resetResultEdits(key, sql)) return;
      backend
        .info(
          sql,
          result.columns.map((column) => column.name),
        )
        .then((info) => setResultEditInfo(key, sql, info, null))
        .catch((reason) => setResultEditInfo(key, sql, null, String(reason)));
    },

    // Cambiar de pagina, re-ejecutar o cerrar con cambios sin aplicar pide
    // confirmacion: los cambios son sobre las filas visibles y se perderian.
    confirmDiscard(keys) {
      const list = (Array.isArray(keys) ? keys : [keys]).filter((key) => count(key) > 0);
      if (list.length === 0) return Promise.resolve(true);
      return new Promise((resolve) => {
        discardPrompt.set({
          resolve: (discard) => {
            discardPrompt.set(null);
            if (discard) for (const key of list) clearResultPendingEdits(key);
            resolve(discard);
          },
        });
      });
    },

    // Aplica todo en una transaccion. Si falla no queda nada aplicado: los
    // cambios siguen pendientes y el error se muestra en la vista previa. En
    // produccion el atajo o el boton del grid abren la vista previa, y
    // aplicar desde ella confirma.
    async submit(key, confirmed = false) {
      if (blockedByInvalidValues(consoleOfKey(key))) return;
      if (view.production() && !confirmed) {
        void openPreview(key);
        return;
      }
      const consoleId = consoleOfKey(key);
      const current = currentChanges(key);
      if (!current || get(applying)) return;
      applying.set(true);
      // El error anterior sigue a la vista mientras se reintenta: si vuelve a
      // fallar, la vista previa lo "golpea" en vez de borrarlo y redibujarlo.
      // Las mismas sentencias que muestra la vista previa, para la Salida.
      const statements = await backend.preview(current.target, current.changes).catch(() => [] as string[]);
      const startedAt = Date.now();
      const started = performance.now();
      const logStatements = () => {
        for (const statement of statements) {
          appendLog(consoleId, { kind: "query", schema: view.schema(), text: statement, at: startedAt });
        }
      };
      try {
        const affected = await backend.apply(current.target, current.changes, confirmed);
        logStatements();
        appendLog(consoleId, {
          kind: "info",
          text: view.text(affected === 1 ? "workspace.output.appliedOne" : "workspace.output.appliedOther", {
            count: view.number(affected),
            ms: formatMs(performance.now() - started, view.number),
          }),
        });
        error.set(null);
        clearResultPendingEdits(key);
        // El modal (si estaba abierto) se cierra animado; lo quita su onclose.
        preview.update((value) => (value ? { ...value, dismiss: true } : value));
        view.reload(key);
      } catch (cause) {
        applying.set(false);
        const changeError = asChangeError(cause);
        logStatements();
        appendLog(consoleId, {
          kind: "error",
          text:
            changeError.statementIndex !== null
              ? view.text("workspace.output.applyFailedAt", {
                  index: changeError.statementIndex + 1,
                  message: changeError.message,
                })
              : view.text("workspace.output.applyFailed", { message: changeError.message }),
        });
        if (get(preview)) error.set(changeError);
        else void openPreview(key, changeError);
        return;
      }
      applying.set(false);
    },

    closePreview() {
      preview.set(null);
      error.set(null);
    },
  };
}
