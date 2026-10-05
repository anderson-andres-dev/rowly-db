import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EditorState, Transaction, type TransactionSpec } from "@codemirror/state";
import { ENGINES } from "../engines";
import { buildCatalogCompletions } from "./catalogCompletions";
import type { SchemaObjects } from "../types";

// La mitad de crates/server-tests (completion_calls_run_on_the_real_servers):
// esa prueba lee las rutinas de los servidores reales con la introspeccion de
// la app y las deja en ROWLY_ROUTINES_IN; aqui el autocompletado escribe el
// CALL de cada procedure, y alla se ejecuta. Sin esa variable no corre.
const input = process.env.ROWLY_ROUTINES_IN;
const output = process.env.ROWLY_ROUTINES_OUT;

interface Request {
  driver: "mysql" | "mariadb" | "postgres";
  defaultSchema: string;
  schemas: SchemaObjects[];
}

describe.skipIf(!input || !output)("CALL escrito por el autocompletado, para los servidores reales", () => {
  it("escribe el CALL de cada procedure", () => {
    const request = JSON.parse(readFileSync(input!, "utf8")) as Request;
    const catalog = buildCatalogCompletions(request.schemas, ENGINES[request.driver], request.defaultSchema);
    const calls: { label: string; call: string }[] = [];
    for (const option of catalog.complete("call", 5)?.options ?? []) {
      if (option.type !== "procedure" || typeof option.apply !== "function") continue;
      let state = EditorState.create({ doc: "CALL " });
      const view = {
        get state() {
          return state;
        },
        dispatch(value: Transaction | TransactionSpec) {
          state = (value instanceof Transaction ? value : state.update(value)).state;
        },
      };
      option.apply(view as never, option, 5, 5);
      calls.push({ label: option.label, call: state.doc.toString() });
    }
    expect(calls.length).toBeGreaterThan(0);
    writeFileSync(output!, JSON.stringify(calls));
  });
});
