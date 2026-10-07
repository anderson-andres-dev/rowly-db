import { describe, expect, it } from "vitest";
import type { LogEntry } from "$lib/stores/executionLog";
import { formatTimestamp, lastLines, outputLines, parseCustomAmount } from "./outputCopy";

const at = new Date(2026, 9, 7, 13, 21, 36, 46).getTime();
const entries: LogEntry[] = [
  { id: 1, at, kind: "query", schema: "core", text: "SELECT *\nFROM t;" },
  { id: 2, at, kind: "info", text: "58 filas" },
  { id: 3, at, kind: "error", text: "Tabla inexistente" },
];

describe("copiar la Salida", () => {
  it("cada linea como se ve: marca de tiempo, prompt y continuaciones alineadas", () => {
    const stamp = `[${formatTimestamp(at)}] `;
    expect(formatTimestamp(at)).toBe("2026-10-07 13:21:36.046");
    expect(outputLines(entries)).toEqual([
      `${stamp}core>SELECT *`,
      `${" ".repeat(stamp.length)}FROM t;`,
      `${stamp}58 filas`,
      `${stamp}Tabla inexistente`,
    ]);
  });

  it("las ultimas N lineas, o todas", () => {
    expect(lastLines(entries, 2).split("\n")).toHaveLength(2);
    expect(lastLines(entries, 2)).toContain("Tabla inexistente");
    expect(lastLines(entries, 2)).not.toContain("SELECT");
    expect(lastLines(entries, "all").split("\n")).toHaveLength(4);
    expect(lastLines(entries, 100).split("\n")).toHaveLength(4);
    expect(lastLines([], 50)).toBe("");
  });

  it("una cantidad propia es un entero positivo con tope", () => {
    expect(parseCustomAmount(" 30 ")).toBe(30);
    expect(parseCustomAmount("0")).toBeNull();
    expect(parseCustomAmount("2.5")).toBeNull();
    expect(parseCustomAmount("abc")).toBeNull();
    expect(parseCustomAmount("1000000")).toBeNull();
  });
});
