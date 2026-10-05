// La ventana de soporte avanza con el calendario sin romper Quality, y una
// version que sale de ella pasa a `retired` sin perder su evidencia.
// node --test tools/test-dbs/*.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { requiredVersions } from "./evidence.mjs";

const ROOT = new URL("../..", import.meta.url).pathname;
// PostgreSQL 13: fin de soporte 2025-11-13, LTS, ventana hasta 2026-11-13.
// Los casos parten de lines.json con 13.23 en `verified`, como el 2026-10-04,
// asi siguen valiendo despues de retirarla de verdad.
const PG13 = { version: "13.23", image: "postgres:13.23", digest: "sha256:4689940c683801b4ab839ab3b0a0a3555a5fe425371422310944e89eca7d8068", tls: "none" };
const LINES = JSON.parse(readFileSync(join(ROOT, "tools/test-dbs/lines.json"), "utf8"));
LINES.verified.postgres = [PG13, ...LINES.verified.postgres.filter((server) => server.version !== PG13.version)];
LINES.retired = {};
const EVIDENCE = { commit: "c".repeat(40), run: "123" };

function window(lines, ...args) {
  const dir = mkdtempSync(join(tmpdir(), "rowly-window-"));
  try {
    writeFileSync(join(dir, "lines.json"), JSON.stringify(lines));
    const run = spawnSync(process.execPath, [join(ROOT, "tools/test-dbs/window.mjs"), "--lines", join(dir, "lines.json"), ...args], {
      encoding: "utf8",
      env: { ...process.env, GITHUB_ACTIONS: "" },
    });
    return { status: run.status, out: run.stdout + run.stderr };
  } finally {
    rmSync(dir, { recursive: true });
  }
}

// lines.json despues de la transicion: 13.23 fuera de `verified`, en `retired`.
function retired(until = "2026-11-13", evidence = EVIDENCE) {
  const lines = structuredClone(LINES);
  lines.verified.postgres = lines.verified.postgres.filter((server) => server.version !== PG13.version);
  lines.retired = { postgres: [{ ...PG13, until, evidence }] };
  return lines;
}

test("lejos de la fecha: sin avisos", () => {
  const { status, out } = window(LINES, "--today", "2026-08-01");
  assert.equal(status, 0);
  assert.doesNotMatch(out, /aviso/);
});

test("dentro de los 90 dias: aviso anticipado, Quality y release siguen verdes", () => {
  for (const extra of [[], ["--release"]]) {
    const { status, out } = window(LINES, "--today", "2026-10-04", ...extra);
    assert.equal(status, 0, out);
    assert.match(out, /aviso: postgres 13\.23 sale de la ventana el 2026-11-13 \(en 40 dias\)/);
  }
});

test("pasada la fecha: Quality avisa sin fallar, la release se bloquea", () => {
  const quality = window(LINES, "--today", "2026-11-14");
  assert.equal(quality.status, 0, quality.out);
  assert.match(quality.out, /aviso: postgres 13\.23 salio de la ventana el 2026-11-13 y sigue anunciada como verificada/);
  const release = window(LINES, "--today", "2026-11-14", "--release");
  assert.equal(release.status, 1);
  assert.match(release.out, /No se puede publicar una release/);
});

test("retirada con su evidencia: release permitida, ya no se exige ni se anuncia", () => {
  const lines = retired();
  const { status, out } = window(lines, "--today", "2026-11-14", "--release");
  assert.equal(status, 0, out);
  assert.match(out, /postgres 13\.23 \(retired\): verificada hasta 2026-11-13 \(commit cccccccccccc\)/);
  // La release ya no le pide evidencia: no corre en la matriz.
  assert.ok(!requiredVersions(lines).some(({ engine, version }) => engine === "postgres" && version === "13.23"));
});

test("retirar antes de tiempo, sin evidencia o en las dos listas: rechazado", () => {
  assert.match(window(retired(), "--today", "2026-11-01").out, /sigue en la ventana hasta 2026-11-13/);
  assert.match(window(retired("2026-11-13", { commit: "abc" }), "--today", "2026-11-14").out, /falta evidence\.commit/);
  assert.match(window(retired("2026-12-01"), "--today", "2026-12-02").out, /until 2026-12-01, su ventana cierra el 2026-11-13/);
  const both = retired();
  both.verified.postgres.unshift(PG13);
  const run = window(both, "--today", "2026-11-14");
  assert.equal(run.status, 1);
  assert.match(run.out, /postgres 13\.23 \(retired\) tambien esta en verified/);
});

// El estado generado tras la transicion: README deja de anunciarla como
// verificada y la conserva aparte, con su evidencia.
test("README conserva la verificacion historica aparte de la actual", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "rowly-status-"));
  t.after(() => rmSync(dir, { recursive: true }));
  for (const path of ["README.md", "README.es.md", "SQL_ENGINE.md", "SQL_ENGINE.es.md", "tools", "tests/sql", "support", "app/src/lib/connections.ts"])
    cpSync(join(ROOT, path), join(dir, path), { recursive: true });
  writeFileSync(join(dir, "tools/test-dbs/lines.json"), JSON.stringify(retired(), null, 2));
  const run = spawnSync(process.execPath, ["tools/inventory/status.mjs", "--write"], { cwd: dir, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  const row = (doc) => readFileSync(join(dir, doc), "utf8").split("\n").find((line) => line.startsWith("| PostgreSQL |"));
  assert.equal(row("README.md"), "| PostgreSQL | 14.24, 15.19, 16.15, 17.11, 18.6 | 13.23 (until 2026-11-13, evidence cccccccccccc) | 10, 11, 12, 14, 15, 16, 17, 18 |");
  assert.equal(row("README.es.md"), "| PostgreSQL | 14.24, 15.19, 16.15, 17.11, 18.6 | 13.23 (hasta 2026-11-13, evidencia cccccccccccc) | 10, 11, 12, 14, 15, 16, 17, 18 |");
});
