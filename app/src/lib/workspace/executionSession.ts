// Ejecuciones de una consola, de punta a punta. Dos piezas:
//
// - createExecutionSession: las ejecuciones en curso por consola, cada una con
//   un id con el que se puede cancelar mientras corre. Es el unico llamador de
//   executeQuery en el frontend.
// - createExecutionFlow: todo lo que lleva una sentencia del editor (o del
//   historial, una pagina, un orden, una recarga o una confirmacion) hasta su
//   resultado: preparar parametros, dividir en sentencias, confirmar,
//   ejecutar, registrar en la Salida y en el historial, y refrescar el
//   catalogo tras un DDL.
//
// La consola sigue siendo de stores/queryConsoles: aqui no hay estado propio
// mas alla de las ejecuciones en curso. La confirmacion tiene un solo camino:
// el backend la pide (confirmationRequired), queda pendiente en la consola y
// confirmPending() la retira de forma atomica antes de ejecutar.

import { get, writable, type Readable } from "svelte/store";
import {
  cancelQuery,
  classifyStatements,
  countQueryRows,
  executeQuery,
  type PageRequest,
  type StatementCheck,
} from "$lib/queryExecution";
import { sqlTokens } from "$lib/sqlContext";
import { splitStatements, type SqlLexical } from "$lib/sqlStatements";
import { nextSort } from "$lib/gridSort";
import { appendLog } from "$lib/stores/executionLog";
import { recordQuery, type HistoryOutcome } from "$lib/stores/queryHistory";
import { forgetResultEdits } from "$lib/stores/resultEdits";
import { consoleOfKey } from "$lib/stores/pinnedResults";
import {
  beginQueryExecution,
  cancelQueryConfirmation,
  clearQueryResult,
  executionForConsole,
  finishQueryExecution,
  queryConsoles,
  requireQueryConfirmation,
  setQueryCounting,
  setQuerySort,
  setQueryTotalRows,
  stopQueryExecution,
  takeQueryConfirmation,
} from "$lib/stores/queryConsoles";
import type { MessageKey, MessageParams } from "$lib/i18n";
import type { DestructiveStatement, ExecuteQueryResponse, QueryExecutionResult } from "$lib/types";
import { OUTPUT_TAB } from "./resultTabs";

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

// La consola no puede tener dos ejecuciones a la vez (beginQueryExecution de
// stores/queryConsoles lo impide); aun asi, si una ejecucion vieja termina
// despues de que empezo otra, no borra el registro de la nueva.
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

type Text = (key: MessageKey, params?: MessageParams) => string;

// La linea de la Salida que resume un resultado: "500 filas obtenidas desde
// la fila 1 en 429 ms", "3 filas afectadas en 12 ms" o el error del servidor.
export function describeOutcome(
  result: QueryExecutionResult,
  offset: number,
  elapsedMs: number,
  text: Text,
  number: (value: number) => string,
): string {
  const ms = formatMs(elapsedMs, number);
  if (result.type === "resultSet") {
    const count = result.rows.length;
    if (count === 0) return text("workspace.output.noRows", { ms });
    return text(count === 1 ? "workspace.output.fetchedOne" : "workspace.output.fetchedOther", {
      count: number(count),
      from: number(offset + 1),
      ms,
    });
  }
  if (result.type === "command") {
    if (result.affectedRows === 0) return text("workspace.output.completed", { ms });
    return text(result.affectedRows === 1 ? "workspace.output.affectedOne" : "workspace.output.affectedOther", {
      count: number(result.affectedRows),
      ms,
    });
  }
  return result.code ? `[${result.code}] ${result.message}` : result.message;
}

// Duracion para la Salida: "1.234 ms", con los separadores del idioma.
export function formatMs(elapsedMs: number, number: (value: number) => string): string {
  return `${number(Math.round(elapsedMs))} ms`;
}

// Lo que el flujo necesita de la vista: lo que vive en el componente
// (pestañas, dialogos, marcas del editor) y el contexto de la conexion.
export interface ExecutionView {
  profileId(): string;
  // Prefijo de las entradas "query" de la Salida (base o perfil).
  schema(): string;
  // Las reglas lexicas del motor conectado.
  lexical(): SqlLexical;
  text: Text;
  number(value: number): string;
  defaultPageSize(): number;
  showTab(consoleId: string, key: string): void;
  // Un resultado nuevo en `key`: la edicion arranca de cero.
  resultReady(key: string, sql: string, result: QueryExecutionResult): void;
  // Pregunta antes de descartar cambios pendientes; false = no seguir.
  confirmDiscard(keys: string | string[]): Promise<boolean>;
  // Las pestañas que una ejecucion nueva reemplaza (la normal y las desfijadas).
  replaceableKeys(consoleId: string): string[];
  dropUnpinned(consoleId: string): void;
  // Abre una pestaña desfijada para un SELECT de un script y da su clave.
  newScriptTab(consoleId: string): string;
  // Pide los parametros con nombre; null = se cancelo el dialogo.
  fillParameters(sql: string, lexical: SqlLexical): Promise<string | null>;
  // Marca la sentencia `index` del script en el editor, si la consola sigue a la vista.
  markStatement(consoleId: string, index: number, outcome: "running" | QueryExecutionResult): void;
  refreshCatalog(): Promise<void>;
  notifyError(error: unknown): void;
}

export interface ExecutionFlow {
  cancelling: Readable<Record<string, boolean>>;
  // Ctrl+Enter, el boton Ejecutar o el historial.
  request(consoleId: string, sql: string): Promise<void>;
  confirmPending(consoleId: string): Promise<void>;
  cancelPending(consoleId: string): void;
  cancel(consoleId: string): boolean;
  reload(key: string): Promise<void>;
  navigate(key: string, offset: number, pageSize: number): Promise<void>;
  sort(key: string, column: number, additive: boolean): Promise<void>;
  // La consulta de una pestaña de tabla (SELECT con sus filtros). Devuelve el
  // error del filtro, null si salio bien, o undefined si no llego a correr
  // (otra ejecucion en curso, cambios sin descartar o una confirmacion).
  table(consoleId: string, sql: string): Promise<string | null | undefined>;
  // El total de filas de la consulta del resultado (COUNT(*)), con su
  // registro en la Salida; null si no se pudo.
  count(key: string): Promise<number | null>;
  firstPage(key: string): PageRequest;
}

// Las sentencias que cambian el catalogo: tras ellas se recarga.
const CATALOG_DDL = new Set(["create", "drop", "alter", "rename", "comment"]);

// Un script abre como mucho estas pestañas de resultado.
export const MAX_SCRIPT_RESULT_TABS = 10;

export function createExecutionFlow(
  view: ExecutionView,
  session: ExecutionSession = createExecutionSession(),
  classify: (statements: string[]) => Promise<StatementCheck[]> = classifyStatements,
  countRows: (sql: string) => Promise<number> = countQueryRows,
): ExecutionFlow {
  const execution = (key: string) => executionForConsole(get(queryConsoles), key);
  const outcomeText = (result: QueryExecutionResult, offset: number, elapsedMs: number) =>
    describeOutcome(result, offset, elapsedMs, view.text, view.number);

  async function refreshAfterDdl(sql: string, result: QueryExecutionResult, cancelled: boolean) {
    if (cancelled || result.type === "error") return;
    const first = sqlTokens(sql, view.lexical()).find((token) => token.kind === "word");
    if (!first || !CATALOG_DDL.has(first.text)) return;
    try {
      await view.refreshCatalog();
    } catch (error) {
      view.notifyError(error);
    }
  }

  // Una ejecucion nueva arranca en la primera pagina, con el tamaño que la
  // consola venia usando (o el predeterminado).
  function firstPage(key: string): PageRequest {
    const current = execution(key).page;
    return { offset: 0, pageSize: current?.pageSize ?? view.defaultPageSize() };
  }

  function applyResponse(key: string, sql: string, response: ExecuteQueryResponse, paging: boolean) {
    if (response.type === "confirmationRequired") {
      requireQueryConfirmation(key, { sql, statement: response.statement });
      return;
    }
    // Una pestaña fijada que falla al recargar o paginar conserva lo que
    // mostraba: el error queda en la Salida.
    if (key !== consoleOfKey(key) && response.result.type !== "resultSet") {
      stopQueryExecution(key);
      return;
    }
    finishQueryExecution(key, sql, response.result, response.page ?? null, paging);
    view.resultReady(key, sql, response.result);
  }

  // Unico camino de toda sentencia suelta (Ctrl+Enter, confirmacion, pagina,
  // recarga): ejecuta, deja constancia en la Salida y aplica el resultado.
  // Si el backend pide confirmacion, no se ejecuto nada y no se registra.
  //
  // `key` es la pestaña de resultado que recibe el resultado (la normal de
  // la consola o una fijada); la Salida es siempre la de su consola. Con
  // filas, se muestra esa pestaña; con error o sin filas, la Salida.
  // `record`: ejecucion nueva desde el editor, queda en el historial (Ctrl+E).
  async function run(
    key: string,
    sql: string,
    confirmed: DestructiveStatement | null,
    page: PageRequest,
    paging = false,
    record = false,
  ) {
    const consoleId = consoleOfKey(key);
    const startedAt = Date.now();
    const started = performance.now();
    const { response, cancelled } = await session.run(consoleId, sql, confirmed, page);
    if (response.type === "completed") {
      const elapsed = performance.now() - started;
      appendLog(consoleId, { kind: "query", schema: view.schema(), text: sql.trim(), at: startedAt });
      appendLog(consoleId, {
        kind: response.result.type === "error" && !cancelled ? "error" : "info",
        text: cancelled
          ? view.text("workspace.output.cancelled")
          : outcomeText(response.result, response.page?.offset ?? 0, elapsed),
      });
      if (record) {
        recordQuery(view.profileId(), {
          sql,
          at: startedAt,
          durationMs: elapsed,
          outcome: cancelled ? "cancelled" : response.result.type === "error" ? "error" : "ok",
        });
      }
    }
    applyResponse(key, sql, response, paging);
    if (response.type === "completed") {
      view.showTab(consoleId, response.result.type === "resultSet" ? key : OUTPUT_TAB);
      await refreshAfterDdl(sql, response.result, cancelled);
    }
  }

  // Varias sentencias (una seleccion o "Ejecutar todo"): antes de ejecutar
  // nada se analizan todas; si alguna no se puede analizar, no se ejecuta
  // ninguna, y si alguna pide confirmacion, se confirma una sola vez el
  // script entero (el guard muestra cuantas se ejecutaran). Despues corren
  // en orden, cada una con autocommit, y el script se detiene si falla o al
  // cancelar. Cada SELECT abre su pestaña (desfijada: la proxima ejecucion
  // la reemplaza); la ultima sentencia que corre queda en la pestaña normal.
  async function startScript(consoleId: string, sql: string, statements: string[]) {
    const checks = await classify(statements);
    const invalid = checks.findIndex((check) => check.error !== undefined);
    if (invalid !== -1) {
      appendLog(consoleId, { kind: "query", schema: view.schema(), text: statements[invalid].trim(), at: Date.now() });
      const message = view.text("workspace.output.scriptInvalid", {
        index: invalid + 1,
        error: checks[invalid].error ?? "",
      });
      appendLog(consoleId, { kind: "error", text: message });
      finishQueryExecution(consoleId, sql, { type: "error", message });
      view.showTab(consoleId, OUTPUT_TAB);
      return;
    }
    const confirmations = checks.map((check) => check.confirmation ?? null);
    const first = confirmations.find((item) => item !== null);
    if (first) {
      requireQueryConfirmation(consoleId, { sql, statement: first, script: { statements, confirmations } });
      return;
    }
    await runScript(consoleId, sql, statements, confirmations);
  }

  async function runScript(
    consoleId: string,
    sql: string,
    statements: string[],
    confirmations: (DestructiveStatement | null)[],
  ) {
    // Lo de la ejecucion anterior se va de entrada: los resultados nuevos
    // aparecen a medida que llegan.
    view.dropUnpinned(consoleId);
    clearQueryResult(consoleId);
    forgetResultEdits(consoleId);
    const startedAt = Date.now();
    const started = performance.now();
    let outcome: HistoryOutcome = "ok";
    let lastResultTab: string | null = null;
    let resultTabs = 0;

    for (let index = 0; index < statements.length; index += 1) {
      const statement = statements[index].trim();
      const statementStarted = performance.now();
      view.markStatement(consoleId, index, "running");
      appendLog(consoleId, { kind: "query", schema: view.schema(), text: statement, at: Date.now() });
      const { response, cancelled } = await session.run(consoleId, statement, confirmations[index], firstPage(consoleId));
      // execute_query vuelve a clasificar cada sentencia: si ahora pide una
      // confirmacion distinta, no se ejecuto y el script se detiene.
      const result: QueryExecutionResult =
        response.type === "completed"
          ? response.result
          : { type: "error", message: view.text(`workspace.guard.${response.statement}` as MessageKey) };
      const page = response.type === "completed" ? (response.page ?? null) : null;
      view.markStatement(consoleId, index, result);
      appendLog(consoleId, {
        kind: result.type === "error" && !cancelled ? "error" : "info",
        text: cancelled
          ? view.text("workspace.output.cancelled")
          : outcomeText(result, page?.offset ?? 0, performance.now() - statementStarted),
      });
      await refreshAfterDdl(statement, result, cancelled);

      const stopped = result.type === "error" || cancelled;
      if (stopped || index === statements.length - 1) {
        finishQueryExecution(consoleId, statement, result, page);
        view.resultReady(consoleId, statement, result);
        if (result.type === "resultSet") lastResultTab = consoleId;
        if (stopped) {
          outcome = cancelled ? "cancelled" : "error";
          const remaining = statements.length - index - 1;
          if (remaining > 0) {
            appendLog(consoleId, {
              kind: "info",
              text: view.text("workspace.output.scriptStopped", { count: view.number(remaining) }),
            });
          }
        }
        break;
      }
      if (result.type === "resultSet" && resultTabs < MAX_SCRIPT_RESULT_TABS) {
        const key = view.newScriptTab(consoleId);
        finishQueryExecution(key, statement, result, page);
        view.resultReady(key, statement, result);
        lastResultTab = key;
        resultTabs += 1;
      }
    }

    recordQuery(view.profileId(), { sql, at: startedAt, durationMs: performance.now() - started, outcome });
    view.showTab(consoleId, outcome === "error" || !lastResultTab ? OUTPUT_TAB : lastResultTab);
  }

  return {
    cancelling: session.cancelling,
    cancel: session.cancel,
    firstPage,

    // Solicita una ejecucion nueva. No hace nada si esa consola ya esta
    // ejecutando. Con una confirmacion pendiente, la ejecucion nueva la
    // reemplaza: confirmar ejecuta siempre lo ultimo que se pidio, nunca un
    // bloque anterior. Nada se confirma por si solo.
    async request(consoleId, requested) {
      if (!(await view.confirmDiscard(view.replaceableKeys(consoleId)))) return;
      cancelQueryConfirmation(consoleId);
      // Con las reglas del motor: las mismas con que el editor marca cada
      // sentencia del script. Los parametros se reemplazan antes de dividir.
      const lexical = view.lexical();
      const sql = await view.fillParameters(requested, lexical);
      if (sql === null || !beginQueryExecution(consoleId)) return;
      // Consulta nueva: arranca sin el orden de los encabezados.
      setQuerySort(consoleId, []);
      const statements = splitStatements(sql, lexical).map((range) => sql.slice(range.from, range.to));
      if (statements.length === 0) {
        stopQueryExecution(consoleId);
        return;
      }
      if (statements.length > 1) {
        await startScript(consoleId, sql, statements);
        return;
      }
      await run(consoleId, statements[0], null, firstPage(consoleId), false, true);
      view.dropUnpinned(consoleId);
    },

    // La confirmacion del guard llama aqui. takeQueryConfirmation() retira el
    // pendiente de forma atomica antes del await: un doble click no confirma
    // dos veces.
    async confirmPending(consoleId) {
      const pending = takeQueryConfirmation(consoleId);
      if (!pending || !beginQueryExecution(consoleId)) return;
      setQuerySort(consoleId, []);
      if (pending.script) {
        await runScript(consoleId, pending.sql, pending.script.statements, pending.script.confirmations);
        return;
      }
      await run(consoleId, pending.sql, pending.statement, firstPage(consoleId), false, true);
      view.dropUnpinned(consoleId);
    },

    cancelPending(consoleId) {
      cancelQueryConfirmation(consoleId);
    },

    // Vuelve a ejecutar la consulta del resultado en la misma pagina, como
    // una ejecucion nueva (el total se vuelve a calcular). Con cambios
    // pendientes pregunta antes de descartarlos.
    async reload(key) {
      const current = execution(key);
      const sql = current.resultSql;
      if (!sql || !(await view.confirmDiscard(key)) || !beginQueryExecution(key)) return;
      const page = current.page ?? firstPage(key);
      await run(key, sql, null, { offset: page.offset, pageSize: page.pageSize, sort: current.sort });
    },

    // Otra pagina de la consulta que produjo el resultado vigente (resultSql,
    // no el texto actual del editor, que puede haber cambiado). Paginar
    // conserva el orden elegido en los encabezados: cada pagina es consulta
    // + orden + LIMIT/OFFSET (el backend ordena ANTES de paginar).
    async navigate(key, offset, pageSize) {
      const current = execution(key);
      const sql = current.resultSql;
      if (!sql || !(await view.confirmDiscard(key)) || !beginQueryExecution(key)) return;
      await run(key, sql, null, { offset, pageSize, sort: current.sort }, true);
    },

    // Clic en un encabezado: nuevo orden, de vuelta a la primera pagina
    // (mismo tamaño). Es la misma consulta, asi que el total se conserva.
    async sort(key, column, additive) {
      const current = execution(key);
      const sql = current.resultSql;
      if (!sql || !current.page?.sortable) return;
      if (!(await view.confirmDiscard(key)) || !beginQueryExecution(key)) return;
      const sort = nextSort(current.sort, column, additive);
      setQuerySort(key, sort);
      await run(key, sql, null, { offset: 0, pageSize: current.page.pageSize, sort }, true);
    },

    // Los filtros se ejecutan mientras se arman. Un filtro con error no
    // borra lo que se estaba viendo: el error queda al lado de los filtros
    // y en la Salida.
    async table(consoleId, sql) {
      if (!(await view.confirmDiscard(view.replaceableKeys(consoleId))) || !beginQueryExecution(consoleId)) {
        return undefined;
      }
      setQuerySort(consoleId, []);
      const startedAt = Date.now();
      const started = performance.now();
      const { response, cancelled } = await session.run(consoleId, sql, null, firstPage(consoleId));
      if (response.type !== "completed") {
        applyResponse(consoleId, sql, response, false);
        return undefined;
      }
      appendLog(consoleId, { kind: "query", schema: view.schema(), text: sql, at: startedAt });
      appendLog(consoleId, {
        kind: response.result.type === "error" && !cancelled ? "error" : "info",
        text: cancelled
          ? view.text("workspace.output.cancelled")
          : outcomeText(response.result, response.page?.offset ?? 0, performance.now() - started),
      });
      const hadRows = execution(consoleId).result?.type === "resultSet";
      const error = response.result.type === "error" ? outcomeText(response.result, 0, 0) : null;
      if (error !== null && hadRows) {
        stopQueryExecution(consoleId);
        return error;
      }
      applyResponse(consoleId, sql, response, false);
      view.showTab(consoleId, response.result.type === "resultSet" ? consoleId : OUTPUT_TAB);
      view.dropUnpinned(consoleId);
      return error;
    },

    async count(key) {
      const consoleId = consoleOfKey(key);
      const sql = execution(key).resultSql;
      if (!sql) return null;
      setQueryCounting(key, true);
      const started = performance.now();
      appendLog(consoleId, { kind: "query", schema: view.schema(), text: `SELECT COUNT(*) FROM (${sql.trim()})` });
      try {
        const total = await countRows(sql);
        setQueryTotalRows(key, sql, total);
        appendLog(consoleId, {
          kind: "info",
          text: view.text(total === 1 ? "workspace.output.totalOne" : "workspace.output.totalOther", {
            count: view.number(total),
            ms: formatMs(performance.now() - started, view.number),
          }),
        });
        return total;
      } catch (error) {
        setQueryCounting(key, false);
        appendLog(consoleId, { kind: "error", text: String(error) });
        view.notifyError(error);
        return null;
      }
    },
  };
}
