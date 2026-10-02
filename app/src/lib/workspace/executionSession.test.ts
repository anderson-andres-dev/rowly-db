import { describe, expect, it } from "vitest";
import { get } from "svelte/store";
import type { ExecuteQueryResponse } from "$lib/types";
import { createExecutionSession } from "./executionSession";

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
