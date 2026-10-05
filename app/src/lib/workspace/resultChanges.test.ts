import { describe, expect, it } from "vitest";
import { get } from "svelte/store";
import type { CellValue, EditableColumn, ResultEditInfo } from "$lib/results/resultEditing";
import { executionLog } from "$lib/stores/executionLog";
import { finishQueryExecution } from "$lib/stores/queryConsoles";
import {
  commitResultEdits,
  editStateFor,
  resetResultEdits,
  resultEdits,
  setResultEditInfo,
} from "$lib/stores/resultEdits";
import type { QueryExecutionResult } from "$lib/types";
import { createResultChanges, type ChangesBackend, type ChangesView } from "./resultChanges";

const SQL = "SELECT id, name FROM t";
const column = (name: string, dataType: string, isPrimaryKey = false): EditableColumn => ({
  name,
  dataType,
  nullable: true,
  isPrimaryKey,
  defaultValue: null,
  generated: false,
});
const INFO: ResultEditInfo = {
  target: { schema: "core", table: "t" },
  columns: [column("id", "int", true), column("name", "varchar(20)")],
  keyColumns: ["id"],
};
const RESULT = {
  type: "resultSet",
  columns: [{ name: "id" }, { name: "name" }],
  rows: [["1", "uno"]],
  truncated: false,
  executionTimeMs: 1,
} as unknown as QueryExecutionResult;

let counter = 0;

// Una pestaña con el resultado de SQL, editable, y `cell` cambiada en la fila 0.
function fixture(options: { production?: boolean; cell?: [number, CellValue]; apply?: () => Promise<number> } = {}) {
  const key = `changes-${++counter}`;
  finishQueryExecution(key, SQL, RESULT);
  resetResultEdits(key, SQL);
  setResultEditInfo(key, SQL, INFO, null);
  const [col, value] = options.cell ?? [1, { kind: "text", value: "UNO" }];
  commitResultEdits(key, { updates: new Map([[0, new Map([[col, value]])]]), deleted: new Set(), inserted: [] }, null);
  const applied: boolean[] = [];
  const reloaded: string[] = [];
  const errors: unknown[] = [];
  const view: ChangesView = {
    text: (message, params) => (params ? `${message} ${JSON.stringify(params)}` : message),
    number: (value) => String(value),
    schema: () => "core",
    production: () => options.production ?? false,
    notifyError: (error) => errors.push(error),
    reload: (reload) => reloaded.push(reload),
  };
  const backend: ChangesBackend = {
    info: async () => INFO,
    preview: async () => ["UPDATE core.t SET name = 'UNO' WHERE id = 1"],
    apply: async (_target, _changes, confirmed) => {
      applied.push(confirmed);
      return options.apply ? options.apply() : 1;
    },
  };
  const controller = createResultChanges(view, backend);
  return {
    key,
    controller,
    applied,
    reloaded,
    errors,
    pending: () => controller.pendingCount(key),
    log: () => (get(executionLog)[key] ?? []).map((entry) => `${entry.kind}: ${entry.text}`),
  };
}

describe("createResultChanges", () => {
  it("applies, logs the SQL it ran, clears the pending edits and reloads the result", async () => {
    const changes = fixture();
    expect(changes.pending()).toBe(1);
    await changes.controller.submit(changes.key);
    expect(changes.applied).toEqual([false]);
    expect(changes.log()).toEqual([
      "query: UPDATE core.t SET name = 'UNO' WHERE id = 1",
      expect.stringMatching(/^info: workspace\.output\.appliedOne/),
    ]);
    expect(changes.pending()).toBe(0);
    expect(changes.reloaded).toEqual([changes.key]);
    expect(get(changes.controller.applying)).toBe(false);
  });

  it("in production the shortcut opens the preview and applies nothing until it is confirmed there", async () => {
    const changes = fixture({ production: true });
    await changes.controller.submit(changes.key);
    await Promise.resolve();
    expect(changes.applied).toEqual([]);
    // Formateada para leerla: una clausula por linea.
    expect(get(changes.controller.preview)?.statements).toEqual(["UPDATE core.t\nSET name = 'UNO'\nWHERE id = 1"]);
    await changes.controller.submit(changes.key, true);
    expect(changes.applied).toEqual([true]);
    expect(get(changes.controller.preview)?.dismiss).toBe(true);
  });

  it("a failure applies nothing: the edits stay pending and the preview shows the error", async () => {
    const changes = fixture({
      apply: () => Promise.reject({ statementIndex: 0, message: "duplicate key", code: "1062" }),
    });
    await changes.controller.submit(changes.key);
    await new Promise((resolve) => setTimeout(resolve));
    expect(changes.pending()).toBe(1);
    expect(get(changes.controller.error)).toEqual({ statementIndex: 0, message: "duplicate key", code: "1062" });
    expect(get(changes.controller.preview)).not.toBeNull();
    expect(changes.log().at(-1)).toBe('error: workspace.output.applyFailedAt {"index":1,"message":"duplicate key"}');
    expect(changes.reloaded).toEqual([]);
  });

  it("a value that does not fit its column sends nothing, not even the preview", async () => {
    const changes = fixture({ cell: [0, { kind: "text", value: "not a number" }] });
    await changes.controller.submit(changes.key);
    await changes.controller.openPreview(changes.key);
    expect(changes.applied).toEqual([]);
    expect(get(changes.controller.preview)).toBeNull();
    // Un aviso por intento: aplicar y ver el SQL.
    expect(changes.errors).toEqual(Array(2).fill('results.invalidValuesOne {"count":"1"}'));
  });

  it("asks once for every tab with pending edits, and keeps them if the user says no", async () => {
    const first = fixture();
    const second = fixture();
    const clean = `changes-clean-${counter}`;
    const keep = first.controller.confirmDiscard([first.key, second.key, clean]);
    get(first.controller.discardPrompt)!.resolve(false);
    expect(await keep).toBe(false);
    expect([first.pending(), second.pending()]).toEqual([1, 1]);
    const discard = first.controller.confirmDiscard([first.key, second.key]);
    get(first.controller.discardPrompt)!.resolve(true);
    expect(await discard).toBe(true);
    expect([first.pending(), second.pending()]).toEqual([0, 0]);
    expect(get(first.controller.discardPrompt)).toBeNull();
    expect(await first.controller.confirmDiscard(clean)).toBe(true);
  });

  it("a result that is not a row set forgets the edits of its tab", () => {
    const changes = fixture();
    changes.controller.prepare(changes.key, "UPDATE t SET x = 1", {
      type: "command",
      affectedRows: 1,
      executionTimeMs: 1,
    } as unknown as QueryExecutionResult);
    expect(editStateFor(get(resultEdits), changes.key).info).toBeNull();
  });
});
