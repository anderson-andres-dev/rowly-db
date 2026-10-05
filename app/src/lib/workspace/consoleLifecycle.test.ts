import { describe, expect, it } from "vitest";
import workspace from "$lib/components/Workspace.svelte?raw";

// #74: cada consola abierta y cerrada dejaba 2 fuentes de Svelte vivas. Un
// $state indexado por id de consola crea una fuente por cada clave que se lee
// (aunque no exista) y la conserva mientras viva el objeto; si nadie lo
// reasigna al cerrar la consola, crece una por consola para siempre. Lo que
// Workspace guarda por consola se olvida en forgetConsole, que es lo que
// llama el cierre.

function body(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`);
  expect(start, `function ${name}`).toBeGreaterThan(-1);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}" && --depth === 0) return source.slice(open, index + 1);
  }
  throw new Error(`function ${name} sin cerrar`);
}

describe("estado por consola de Workspace (#74)", () => {
  it("el cierre de una consola olvida cada $state indexado por id", () => {
    const records = [...workspace.matchAll(/let (\w+) = \$state<Record<string, [^>]+>+\(\{\}\)/g)].map((match) => match[1]);
    expect(records).toEqual(expect.arrayContaining(["selectedTabByConsole", "resultTabOrder", "tableFilterError"]));
    const forget = body(workspace, "forgetConsole");
    for (const name of records) expect(forget, name).toContain(`${name} = withoutKey(${name}, consoleId)`);
    expect(forget).toContain("tableLoadAttempted.delete(consoleId)");
    expect(forget).toContain("forgetConsoleResults(consoleId)");
  });

  it("el cierre llama a forgetConsole", () => {
    expect(workspace).toMatch(/createConsoleFiles\(\{[\s\S]*?forgetResults: forgetConsole,/);
  });
});
