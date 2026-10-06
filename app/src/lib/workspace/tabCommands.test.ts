import { describe, expect, it } from "vitest";
import { runCommand } from "./commands";
import { registerTabCommands, stepTab } from "./tabCommands";

describe("stepTab", () => {
  it("avanza y retrocede dando la vuelta en los bordes", () => {
    expect(stepTab(["a", "b", "c"], "a", 1)).toBe("b");
    expect(stepTab(["a", "b", "c"], "c", 1)).toBe("a");
    expect(stepTab(["a", "b", "c"], "a", -1)).toBe("c");
  });

  it("sin pestaña elegida empieza por un extremo; sin pestañas, nada", () => {
    expect(stepTab(["a", "b"], null, 1)).toBe("a");
    expect(stepTab(["a", "b"], "x", -1)).toBe("b");
    expect(stepTab([], null, 1)).toBeNull();
  });
});

describe("registerTabCommands", () => {
  it("siguiente, anterior e ir a la N sobre la fila; la N que no existe no toma la tecla", () => {
    let current = "a";
    const cleanup = registerTabCommands("editor", {
      keys: () => ["a", "b", "c"],
      current: () => current,
      select: (key) => (current = key),
    });
    expect(runCommand("next-tab", "editor")).toBe(true);
    expect(current).toBe("b");
    expect(runCommand("previous-tab", "editor")).toBe(true);
    expect(current).toBe("a");
    expect(runCommand("go-to-tab-3", "editor")).toBe(true);
    expect(current).toBe("c");
    expect(runCommand("go-to-tab-4", "editor")).toBe(false);
    cleanup();
  });

  it("sin el foco en la fila, la tecla pasa a la de abajo de la pila", () => {
    const picked: string[] = [];
    const outer = registerTabCommands("results", { keys: () => ["x"], current: () => null, select: (key) => picked.push(`panel:${key}`) });
    const inner = registerTabCommands("results", {
      keys: () => ["1", "2"],
      current: () => "1",
      select: (key) => picked.push(`sesion:${key}`),
      applies: () => false,
    });
    runCommand("next-tab", "results");
    expect(picked).toEqual(["panel:x"]);
    inner();
    outer();
  });
});
