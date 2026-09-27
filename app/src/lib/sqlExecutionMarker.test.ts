import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import {
  executionMarkerField,
  executionPart,
  formatExecutionTime,
  markerFromResult,
  setExecutionMarker,
  setPartStatus,
} from "$lib/sqlExecutionMarker";

function stateWithMarker(doc: string, from: number, to: number) {
  const state = EditorState.create({ doc, extensions: [executionMarkerField] });
  return state.update({ effects: setExecutionMarker.of({ from, to, status: "success", executionTimeMs: 411 }) })
    .state;
}

describe("executionMarkerField", () => {
  it("sigue a la sentencia cuando se escribe antes de ella", () => {
    const state = stateWithMarker("SELECT 1;", 0, 9);
    const next = state.update({ changes: { from: 0, insert: "\n\n" } }).state;
    expect(next.field(executionMarkerField)).toMatchObject({ from: 2, to: 11 });
  });

  it("no crece al escribir justo despues del final de la sentencia", () => {
    const state = stateWithMarker("SELECT 1;", 0, 9);
    const next = state.update({ changes: { from: 9, insert: " SELECT 2;" } }).state;
    expect(next.field(executionMarkerField)).toMatchObject({ from: 0, to: 9 });
  });

  it("desaparece si se borra la sentencia completa", () => {
    const state = stateWithMarker("SELECT 1;", 0, 9);
    const next = state.update({ changes: { from: 0, to: 9 } }).state;
    expect(next.field(executionMarkerField)).toBeNull();
  });
});

describe("markerFromResult", () => {
  it("toma el tiempo de un resultado correcto", () => {
    const result = { type: "command", affectedRows: 3, executionTimeMs: 12 } as const;
    expect(markerFromResult(0, 5, result)).toEqual({ from: 0, to: 5, status: "success", executionTimeMs: 12 });
  });

  it("marca el error con su mensaje y sin tiempo", () => {
    const result = { type: "error", message: "Table doesn't exist" } as const;
    expect(markerFromResult(0, 5, result)).toEqual({
      from: 0,
      to: 5,
      status: "error",
      message: "Table doesn't exist",
    });
  });
});

describe("formatExecutionTime", () => {
  it("usa ms por debajo de un segundo y s por encima", () => {
    expect(formatExecutionTime(411)).toBe("411 ms");
    expect(formatExecutionTime(1234)).toBe("1.23 s");
    expect(formatExecutionTime(12_345)).toBe("12.3 s");
  });
});

describe("scripts enormes", () => {
  const line = "SELECT 1;\n";

  function scriptState(count: number) {
    const state = EditorState.create({ doc: line.repeat(count), extensions: [executionMarkerField] });
    const parts = Array.from({ length: count }, (_, index) => ({
      from: index * line.length,
      to: index * line.length + 9,
      status: "pending" as const,
    }));
    return state.update({ effects: setExecutionMarker.of({ from: 0, to: state.doc.length, status: "running", parts }) })
      .state;
  }

  function markAll(count: number) {
    let state = scriptState(count);
    const start = performance.now();
    for (let index = 0; index < count; index += 1) {
      state = state.update({ effects: setPartStatus.of({ index, part: { status: "success", executionTimeMs: 1 } }) }).state;
    }
    return { state, ms: performance.now() - start };
  }

  it("marcar las sentencias en orden crece lineal, no cuadratico", () => {
    markAll(2_000); // calentar
    const small = markAll(10_000).ms;
    const big = markAll(40_000).ms;
    // Cuatro veces mas sentencias: lineal ~4x; cuadratico, ~16x.
    expect(big / small).toBeLessThan(8);
  });

  it("sigue a las ediciones despues de marcar", () => {
    const count = 10_000;
    let { state } = markAll(count);
    state = state.update({ changes: { from: 0, insert: "-- x\n" } }).state;
    expect(executionPart(state, 1)).toEqual({ from: 15, to: 24, status: "success", executionTimeMs: 1, message: undefined });
    expect(executionPart(state, count - 1)?.status).toBe("success");
  });
});
