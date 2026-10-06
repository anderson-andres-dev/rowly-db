// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { Terminal } from "@xterm/xterm";

// El backend manda los bytes del PTY tal como los lee (terminal.rs): un
// caracter puede llegar partido entre dos mensajes. xterm los decodifica de
// forma incremental; aqui se fija que ningun paso intermedio los convierta a
// texto por su cuenta.
describe("salida de la terminal", () => {
  it("un caracter UTF-8 partido entre dos escrituras se muestra entero", async () => {
    const term = new Terminal({ cols: 20, rows: 2 });
    const euro = new TextEncoder().encode("€");
    await new Promise<void>((resolve) => term.write(euro.slice(0, 2), resolve));
    await new Promise<void>((resolve) => term.write(euro.slice(2), resolve));
    expect(term.buffer.active.getLine(0)?.translateToString(true)).toBe("€");
    term.dispose();
  });
});
