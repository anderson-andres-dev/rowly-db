import { describe, expect, it } from "vitest";
import { commandDefinitions, commandsCollide, registerCommand, registerCommands, runCommand, runFirstCommand } from "./commands";

describe("registro de comandos", () => {
  it("resuelve primero el handler de la zona activa y despues el global", () => {
    const calls: string[] = [];
    const cleanup = registerCommands("editor", { "t-find": () => void calls.push("editor") });
    const cleanupGlobal = registerCommand("t-find", "global", () => void calls.push("global"));
    expect(runCommand("t-find", "editor")).toBe(true);
    expect(runCommand("t-find", "results")).toBe(true);
    expect(calls).toEqual(["editor", "global"]);
    cleanup();
    cleanupGlobal();
    expect(runCommand("t-find", "editor")).toBe(false);
  });

  it("un handler que devuelve false no toma la tecla y se prueba el siguiente", () => {
    const cleanups = [
      registerCommand("t-run", "editor", () => false),
      registerCommand("t-apply", "results", () => true),
    ];
    expect(runFirstCommand(["t-run", "t-apply"], "editor")).toBeNull();
    expect(runFirstCommand(["t-run", "t-apply"], "results")).toBe("t-apply");
    cleanups.forEach((cleanup) => cleanup());
  });

  it("en la pila prueba del ultimo registrado al primero", () => {
    const calls: string[] = [];
    const first = registerCommand("t-stack", "global", () => void calls.push("primero"));
    const second = registerCommand("t-stack", "global", () => {
      calls.push("segundo");
      return false;
    });
    runCommand("t-stack", null);
    expect(calls).toEqual(["segundo", "primero"]);
    second();
    first();
  });

  it("dos atajos chocan en la misma zona o si uno es global", () => {
    expect(commandsCollide("editor", "results")).toBe(false);
    expect(commandsCollide("editor", "editor")).toBe(true);
    expect(commandsCollide("global", "results")).toBe(true);
  });

  it("las teclas de fabrica no chocan entre si", () => {
    for (const a of commandDefinitions) {
      for (const b of commandDefinitions) {
        if (a.id === b.id || a.defaultKeys !== b.defaultKeys) continue;
        expect(commandsCollide(a.zone, b.zone), `${a.id} / ${b.id}`).toBe(false);
      }
    }
  });
});
