import { describe, expect, it } from "vitest";
import { get } from "svelte/store";
import type { ExecuteQueryResponse } from "$lib/types";
import {
  createExecutionFlow,
  createExecutionSession,
  type ExecutionBackend,
  type ExecutionView,
} from "./executionSession";
import { OUTPUT_TAB } from "./resultTabs";
import type { StatementCheck } from "$lib/queryExecution";
import { STANDARD_LEXICAL } from "$lib/sqlStatements";
import { executionLog } from "$lib/stores/executionLog";
import { queryHistory } from "$lib/stores/queryHistory";
import { executionForConsole, queryConsoles } from "$lib/stores/queryConsoles";

const page = { offset: 0, pageSize: 100 };
const done: ExecuteQueryResponse = {
  type: "completed",
  result: { type: "command", affectedRows: 0, executionTimeMs: 1 },
} as unknown as ExecuteQueryResponse;

function fakeBackend() {
  const pending = new Map<string, (response: ExecuteQueryResponse) => void>();
  const calls: { sql: string; confirmed: unknown; executionId: string }[] = [];
  const cancels: string[] = [];
  let next = 0;
  return {
    calls,
    cancels,
    finish(executionId: string) {
      pending.get(executionId)!(done);
    },
    backend: {
      execute: (sql: string, confirmed: unknown, _page: unknown, executionId: string) => {
        calls.push({ sql, confirmed, executionId });
        return new Promise<ExecuteQueryResponse>((resolve) => pending.set(executionId, resolve));
      },
      cancel: async (executionId: string) => {
        cancels.push(executionId);
      },
      newId: () => `e${++next}`,
    },
  };
}

describe("createExecutionSession", () => {
  it("passes the SQL, the confirmation and a fresh execution id to the backend", async () => {
    const fake = fakeBackend();
    const session = createExecutionSession(fake.backend);
    const running = session.run("c1", "DELETE FROM t", "deleteWithoutWhere", page);
    expect(fake.calls).toEqual([{ sql: "DELETE FROM t", confirmed: "deleteWithoutWhere", executionId: "e1" }]);
    fake.finish("e1");
    expect(await running).toEqual({ response: done, cancelled: false });
  });

  it("cancels the running execution once, reports it as cancelled and then forgets it", async () => {
    const fake = fakeBackend();
    const session = createExecutionSession(fake.backend);
    const running = session.run("c1", "SELECT SLEEP(10)", null, page);
    expect(session.cancel("c1")).toBe(true);
    expect(session.cancel("c1")).toBe(true);
    expect(fake.cancels).toEqual(["e1"]);
    expect(get(session.cancelling)).toEqual({ c1: true });
    fake.finish("e1");
    expect((await running).cancelled).toBe(true);
    expect(get(session.cancelling)).toEqual({});
    expect(session.cancel("c1")).toBe(false);
  });

  it("has nothing to cancel in a console that is not running", () => {
    const session = createExecutionSession(fakeBackend().backend);
    expect(session.cancel("c1")).toBe(false);
  });

  it("an old execution that ends late does not erase the newer one of its console", async () => {
    const fake = fakeBackend();
    const session = createExecutionSession(fake.backend);
    const first = session.run("c1", "SELECT 1", null, page);
    const second = session.run("c1", "SELECT 2", null, page);
    fake.finish("e1");
    await first;
    expect(session.cancel("c1")).toBe(true);
    expect(fake.cancels).toEqual(["e2"]);
    fake.finish("e2");
    expect((await second).cancelled).toBe(true);
  });
});

describe("one path to execute SQL", () => {
  it("only the execution session calls executeQuery, and only queryExecution invokes execute_query", async () => {
    const { readdirSync, readFileSync } = await import("node:fs");
    const { join, relative } = await import("node:path");
    const root = new URL("../..", import.meta.url).pathname;
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (/\.(ts|svelte)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) files.push(path);
      }
    };
    walk(root);
    const callers = files
      .filter((path) => /\bexecuteQuery\(/.test(readFileSync(path, "utf8")))
      .map((path) => relative(root, path));
    const invokers = files
      .filter((path) => /["']execute_query["']/.test(readFileSync(path, "utf8")))
      .map((path) => relative(root, path));
    const importers = files
      .filter((path) => /import\s*\{[^}]*\bexecuteQuery\b[^}]*\}\s*from/.test(readFileSync(path, "utf8")))
      .map((path) => relative(root, path));
    // La definicion es la unica llamada textual; el unico que la importa es la sesion.
    expect(callers).toEqual(["lib/queryExecution.ts"]);
    expect(importers).toEqual(["lib/workspace/executionSession.ts"]);
    expect(invokers).toEqual(["lib/queryExecution.ts"]);
  });
});

// --- Flujo de ejecucion ------------------------------------------------------

type Answer = ExecuteQueryResponse | ((sql: string) => ExecuteQueryResponse);
const rows = (count: number): ExecuteQueryResponse =>
  ({
    type: "completed",
    result: {
      type: "resultSet",
      columns: [{ name: "id" }],
      rows: Array.from({ length: count }, (_, i) => [String(i)]),
      truncated: false,
      executionTimeMs: 1,
    },
    page: { offset: 0, pageSize: 100, pageable: true, sortable: true },
  }) as unknown as ExecuteQueryResponse;
const command = (affectedRows: number): ExecuteQueryResponse =>
  ({ type: "completed", result: { type: "command", affectedRows, executionTimeMs: 1 } }) as unknown as ExecuteQueryResponse;
const failure = (message: string): ExecuteQueryResponse =>
  ({ type: "completed", result: { type: "error", message } }) as unknown as ExecuteQueryResponse;
const needsConfirmation = (statement: string): ExecuteQueryResponse =>
  ({ type: "confirmationRequired", statement }) as unknown as ExecuteQueryResponse;

let consoleCounter = 0;

// Un flujo con la vista y el backend falsos; los stores son los reales, con
// una consola nueva por prueba.
function flowFixture(
  answers: Record<string, Answer> = {},
  options: { classify?: StatementCheck[]; count?: (sql: string) => Promise<number> } = {},
) {
  const consoleId = `flow-${++consoleCounter}`;
  const executed: { sql: string; confirmed: unknown }[] = [];
  const shown: string[] = [];
  const ready: string[] = [];
  const marks: string[] = [];
  const refreshed: string[] = [];
  let discard = true;
  let parameters: string | null | undefined;
  let tab = 0;
  const view: ExecutionView = {
    profileId: () => `profile-${consoleId}`,
    schema: () => "core",
    lexical: () => STANDARD_LEXICAL,
    text: (key, params) => (params ? `${key} ${JSON.stringify(params)}` : key),
    number: (value) => String(value),
    defaultPageSize: () => 100,
    showTab: (_consoleId, key) => shown.push(key),
    resultReady: (key) => ready.push(key),
    confirmDiscard: async () => discard,
    replaceableKeys: (id) => [id],
    dropUnpinned: () => {},
    newScriptTab: (id) => `${id}#tab${++tab}`,
    fillParameters: async (sql) => (parameters === undefined ? sql : parameters),
    markStatement: (_id, index, outcome) => marks.push(`${index}:${outcome === "running" ? "running" : outcome.type}`),
    refreshCatalog: async () => {
      refreshed.push("catalog");
    },
    notifyError: () => {},
  };
  const backend: ExecutionBackend = {
    execute: async (sql, confirmed) => {
      executed.push({ sql, confirmed });
      const answer = answers[sql.trim()] ?? rows(1);
      return typeof answer === "function" ? answer(sql) : answer;
    },
    cancel: async () => {},
    newId: () => crypto.randomUUID(),
  };
  const classify = async (statements: string[]) => options.classify ?? statements.map(() => ({}));
  const count = options.count ?? (async () => 0);
  const flow = createExecutionFlow(view, createExecutionSession(backend), classify, count);
  return {
    consoleId,
    flow,
    executed,
    shown,
    ready,
    marks,
    refreshed,
    log: () => (get(executionLog)[consoleId] ?? []).map((entry) => `${entry.kind}: ${entry.text}`),
    history: () => get(queryHistory)[`profile-${consoleId}`] ?? [],
    state: (key = consoleId) => executionForConsole(get(queryConsoles), key),
    refuseDiscard: () => (discard = false),
    cancelParameters: () => (parameters = null),
  };
}

describe("createExecutionFlow", () => {
  it("runs one statement, logs it with its outcome, keeps it in the history and shows its rows", async () => {
    const fixture = flowFixture({ "SELECT id FROM t": rows(2) });
    await fixture.flow.request(fixture.consoleId, "SELECT id FROM t");
    expect(fixture.executed).toEqual([{ sql: "SELECT id FROM t", confirmed: null }]);
    expect(fixture.log()[0]).toBe("query: SELECT id FROM t");
    expect(fixture.log()[1]).toMatch(/^info: workspace\.output\.fetchedOther/);
    expect(fixture.history().map((entry) => [entry.sql, entry.outcome])).toEqual([["SELECT id FROM t", "ok"]]);
    expect(fixture.shown).toEqual([fixture.consoleId]);
    expect(fixture.ready).toEqual([fixture.consoleId]);
    expect(fixture.state().isExecuting).toBe(false);
    expect(fixture.state().resultSql).toBe("SELECT id FROM t");
  });

  it("an error goes to the Output tab and to the history as an error", async () => {
    const fixture = flowFixture({ "SELECT nope": failure("unknown column") });
    await fixture.flow.request(fixture.consoleId, "SELECT nope");
    expect(fixture.log()[1]).toBe("error: unknown column");
    expect(fixture.shown).toEqual([OUTPUT_TAB]);
    expect(fixture.history()[0].outcome).toBe("error");
  });

  it("when the backend asks for confirmation nothing ran: nothing is logged and it waits for the user", async () => {
    const fixture = flowFixture({ "DELETE FROM t": needsConfirmation("deleteWithoutWhere") });
    await fixture.flow.request(fixture.consoleId, "DELETE FROM t");
    expect(fixture.log()).toEqual([]);
    expect(fixture.history()).toEqual([]);
    expect(fixture.state().pendingConfirmation).toEqual({ sql: "DELETE FROM t", statement: "deleteWithoutWhere" });
  });

  it("confirming runs the pending statement with its confirmation, once even on a double confirm", async () => {
    const answers: Record<string, Answer> = { "DELETE FROM t": needsConfirmation("deleteWithoutWhere") };
    const fixture = flowFixture(answers);
    await fixture.flow.request(fixture.consoleId, "DELETE FROM t");
    answers["DELETE FROM t"] = command(3);
    await Promise.all([fixture.flow.confirmPending(fixture.consoleId), fixture.flow.confirmPending(fixture.consoleId)]);
    expect(fixture.executed).toEqual([
      { sql: "DELETE FROM t", confirmed: null },
      { sql: "DELETE FROM t", confirmed: "deleteWithoutWhere" },
    ]);
    expect(fixture.state().pendingConfirmation).toBeNull();
    expect(fixture.log()[1]).toMatch(/^info: workspace\.output\.affectedOther/);
  });

  it("a new request replaces a pending confirmation: confirming never runs an older statement", async () => {
    const fixture = flowFixture({ "DELETE FROM t": needsConfirmation("deleteWithoutWhere") });
    await fixture.flow.request(fixture.consoleId, "DELETE FROM t");
    await fixture.flow.request(fixture.consoleId, "SELECT 1");
    await fixture.flow.confirmPending(fixture.consoleId);
    expect(fixture.executed.map((call) => call.sql)).toEqual(["DELETE FROM t", "SELECT 1"]);
  });

  it("cancelling the confirmation runs nothing", async () => {
    const fixture = flowFixture({ "DELETE FROM t": needsConfirmation("deleteWithoutWhere") });
    await fixture.flow.request(fixture.consoleId, "DELETE FROM t");
    fixture.flow.cancelPending(fixture.consoleId);
    await fixture.flow.confirmPending(fixture.consoleId);
    expect(fixture.executed).toHaveLength(1);
  });

  it("does nothing when the user keeps the pending edits or cancels the parameters", async () => {
    const kept = flowFixture();
    kept.refuseDiscard();
    await kept.flow.request(kept.consoleId, "SELECT 1");
    const cancelled = flowFixture();
    cancelled.cancelParameters();
    await cancelled.flow.request(cancelled.consoleId, "SELECT :id");
    expect([kept.executed, cancelled.executed]).toEqual([[], []]);
    expect([kept.state().isExecuting, cancelled.state().isExecuting]).toEqual([false, false]);
  });

  it("refreshes the catalog after DDL, not after a query", async () => {
    const fixture = flowFixture({ "CREATE TABLE x (id INT)": command(0) });
    await fixture.flow.request(fixture.consoleId, "SELECT 1");
    expect(fixture.refreshed).toEqual([]);
    await fixture.flow.request(fixture.consoleId, "CREATE TABLE x (id INT)");
    expect(fixture.refreshed).toEqual(["catalog"]);
  });

  it("a script runs in order, opens a tab per SELECT and stops at the first error", async () => {
    const fixture = flowFixture({ "SELECT 2;": failure("boom") });
    await fixture.flow.request(fixture.consoleId, "SELECT 1; SELECT 2; SELECT 3");
    expect(fixture.executed.map((call) => call.sql)).toEqual(["SELECT 1;", "SELECT 2;"]);
    expect(fixture.marks).toEqual(["0:running", "0:resultSet", "1:running", "1:error"]);
    expect(fixture.log().at(-1)).toBe('info: workspace.output.scriptStopped {"count":"1"}');
    expect(fixture.ready).toEqual([`${fixture.consoleId}#tab1`, fixture.consoleId]);
    expect(fixture.history().map((entry) => [entry.sql, entry.outcome])).toEqual([["SELECT 1; SELECT 2; SELECT 3", "error"]]);
    expect(fixture.shown).toEqual([OUTPUT_TAB]);
  });

  it("a script with a statement the guard cannot read runs nothing", async () => {
    const fixture = flowFixture({}, { classify: [{}, { error: "parse error" }] });
    await fixture.flow.request(fixture.consoleId, "SELECT 1; SELEC 2");
    expect(fixture.executed).toEqual([]);
    expect(fixture.log()).toEqual(["query: SELEC 2", 'error: workspace.output.scriptInvalid {"index":2,"error":"parse error"}']);
  });

  it("a script that needs confirmation asks once, then runs every statement with its own confirmation", async () => {
    const fixture = flowFixture({}, { classify: [{}, { confirmation: "deleteWithoutWhere" }] });
    await fixture.flow.request(fixture.consoleId, "SELECT 1; DELETE FROM t");
    expect(fixture.executed).toEqual([]);
    expect(fixture.state().pendingConfirmation?.statement).toBe("deleteWithoutWhere");
    await fixture.flow.confirmPending(fixture.consoleId);
    expect(fixture.executed).toEqual([
      { sql: "SELECT 1;", confirmed: null },
      { sql: "DELETE FROM t", confirmed: "deleteWithoutWhere" },
    ]);
  });

  it("paging and sorting run the query that produced the result, not the editor text", async () => {
    const fixture = flowFixture({ "SELECT id FROM t": rows(2) });
    await fixture.flow.request(fixture.consoleId, "SELECT id FROM t");
    await fixture.flow.navigate(fixture.consoleId, 100, 100);
    await fixture.flow.sort(fixture.consoleId, 0, false);
    await fixture.flow.reload(fixture.consoleId);
    expect(fixture.executed.map((call) => call.sql)).toEqual(Array(4).fill("SELECT id FROM t"));
    expect(fixture.state().sort).toEqual([{ column: 0, descending: false }]);
    // Solo la ejecucion nueva queda en el historial.
    expect(fixture.history()).toHaveLength(1);
  });

  it("counts the rows of the query that produced the result and keeps the total; a failure is logged", async () => {
    const counted: string[] = [];
    const fixture = flowFixture(
      { "SELECT id FROM t": rows(2) },
      {
        count: async (sql) => {
          counted.push(sql);
          if (counted.length > 1) throw new Error("timeout");
          return 1234;
        },
      },
    );
    await fixture.flow.request(fixture.consoleId, "SELECT id FROM t");
    expect(await fixture.flow.count(fixture.consoleId)).toBe(1234);
    expect(fixture.state().totalRows).toBe(1234);
    expect(fixture.log().slice(-2)).toEqual([
      "query: SELECT COUNT(*) FROM (SELECT id FROM t)",
      expect.stringMatching(/^info: workspace\.output\.totalOther/),
    ]);
    expect(await fixture.flow.count(fixture.consoleId)).toBeNull();
    expect(fixture.state().counting).toBe(false);
    expect(fixture.log().at(-1)).toBe("error: Error: timeout");
    expect(counted).toEqual(["SELECT id FROM t", "SELECT id FROM t"]);
  });

  it("a table tab keeps the rows it showed when a filter fails, and reports the error", async () => {
    const answers: Record<string, Answer> = { "SELECT * FROM t": rows(2) };
    const fixture = flowFixture(answers);
    expect(await fixture.flow.table(fixture.consoleId, "SELECT * FROM t")).toBeNull();
    answers["SELECT * FROM t WHERE x"] = failure("bad filter");
    expect(await fixture.flow.table(fixture.consoleId, "SELECT * FROM t WHERE x")).toBe("bad filter");
    expect(fixture.state().result?.type).toBe("resultSet");
    expect(fixture.state().resultSql).toBe("SELECT * FROM t");
    expect(fixture.state().isExecuting).toBe(false);
  });
});
