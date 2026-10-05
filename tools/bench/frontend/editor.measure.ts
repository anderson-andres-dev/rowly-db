// Coste por tecla del trabajo del editor que no depende de la WebView:
// indice de sentencias, sentencia bajo el cursor, contexto de autocompletado
// y division completa. Complementa a tools/bench/linux (la app real) y no es
// la latencia tecla→pintado: esa necesita la app instrumentada (§3 de la spec).
//
//   cd app && BENCH_OUT=../tools/bench/baseline/<etiqueta>/node-editor.json \
//     npx vitest run --config ../tools/bench/frontend/vitest.config.mts
//
// No corre en `npm test`: los tiempos dependen de la maquina.

import { writeFileSync } from "node:fs";
import { EditorState, Text } from "@codemirror/state";
import { MySQL } from "@codemirror/lang-sql";
import { it } from "vitest";
import { ENGINES } from "$lib/engines";
import { classifyContext } from "$lib/editor/context";
import { splitStatements } from "$lib/sqlStatements";
import {
  statementIndexComplete,
  statementIndexField,
  statementIndexStep,
  statementNear,
  statementTextAt,
} from "$lib/editor/statementIndex";

const STATEMENT =
  "SELECT u.id, u.name, o.total\nFROM users u\nJOIN orders o ON o.user_id = u.id\nWHERE o.total > 100 AND u.name LIKE 'a%';\n";

// 10 000 lineas (documento normal de referencia) y 1 M de lineas / ~30 MB.
const DOCUMENTS = { "10k-lines": 2_500, "1M-lines": 250_000 } as const;
const KEYSTROKES = 500;

function percentiles(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (p: number) => Number(sorted[Math.min(sorted.length - 1, Math.round(p * (sorted.length - 1)))].toFixed(4));
  return { n: sorted.length, p50: at(0.5), p95: at(0.95), p99: at(0.99), max: at(1) };
}

function time(run: () => void): number {
  const start = performance.now();
  run();
  return performance.now() - start;
}

it("mide el editor sin WebView", () => {
  const results: Record<string, unknown> = {};
  for (const [name, statements] of Object.entries(DOCUMENTS)) {
    const text = STATEMENT.repeat(statements);
    const doc = Text.of(text.split("\n"));
    const lexical = ENGINES.mysql.lexical;

    const splitMs = time(() => splitStatements(text, lexical));
    let state = EditorState.create({ doc, extensions: [statementIndexField, MySQL.language] });
    let indexSteps = 0;
    const indexMs = time(() => {
      while (!statementIndexComplete(state)) {
        state = state.update({ effects: statementIndexStep() }).state;
        indexSteps += 1;
      }
    });

    const middle = Math.floor(doc.length / 2);
    const keystroke: number[] = [];
    const near: number[] = [];
    const context: number[] = [];
    let current = state;
    for (let i = 0; i < KEYSTROKES; i += 1) {
      keystroke.push(time(() => (current = current.update({ changes: { from: middle + i, insert: "x" } }).state)));
      near.push(time(() => statementNear(current, middle + i)));
      context.push(
        time(() => {
          const at = statementTextAt(current, middle + i);
          classifyContext(at.text, at.offset, lexical);
        }),
      );
    }
    results[name] = {
      lines: doc.lines,
      bytes: text.length,
      statements,
      splitAllMs: Number(splitMs.toFixed(1)),
      indexBuildMs: Number(indexMs.toFixed(1)),
      indexSteps,
      keystrokeIndexUpdateMs: percentiles(keystroke),
      statementNearMs: percentiles(near),
      completionContextMs: percentiles(context),
    };
  }
  const report = {
    format: 1,
    scenario: "editor-node",
    date: new Date().toISOString(),
    node: process.version,
    note: "Node, sin WebView: coste de los modulos puros del editor por tecla",
    results,
  };
  const out = process.env.BENCH_OUT;
  if (out) writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  else console.log(JSON.stringify(report, null, 2));
});
