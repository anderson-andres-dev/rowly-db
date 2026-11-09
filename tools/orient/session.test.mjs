import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createSession, stampOf } from "./session.mjs";

test("la sesion reutiliza el orient mientras la huella no cambia y lo rehace cuando cambia", () => {
  let stamp = "a";
  let built = 0;
  const session = createSession({ root: "x", stamp: () => stamp, create: () => ({ id: ++built }) });
  const first = session.get();
  assert.equal(session.get(), first);
  assert.equal(session.get(), first);
  stamp = "b";
  assert.notEqual(session.get(), first);
  assert.deepEqual(session.stats, { builds: 2, reuses: 2 });
});

test("si crear el orient falla, el error sale y el siguiente intento vuelve a construir", () => {
  let fail = true;
  const session = createSession({ root: "x", stamp: () => "a", create: () => { if (fail) throw new Error("sin git"); return { ok: true }; } });
  assert.throws(() => session.get(), /sin git/);
  fail = false;
  assert.deepEqual(session.get(), { ok: true });
  assert.equal(session.stats.builds, 1);
});

test("la huella cambia al editar, crear o borrar un archivo versionado o nuevo, y no al leer", () => {
  const dir = mkdtempSync(join(tmpdir(), "orient-stamp-"));
  try {
    const git = (...args) => execFileSync("git", args, { cwd: dir, stdio: "ignore" });
    git("init", "-q");
    writeFileSync(join(dir, "a.ts"), "export const a = 1;\n");
    git("add", "a.ts");
    const base = stampOf(dir);
    assert.equal(stampOf(dir), base);
    writeFileSync(join(dir, "a.ts"), "export const a = 22;\n");
    const edited = stampOf(dir);
    assert.notEqual(edited, base);
    utimesSync(join(dir, "a.ts"), new Date(), new Date(Date.now() + 5000));
    assert.notEqual(stampOf(dir), edited);
    const before = stampOf(dir);
    writeFileSync(join(dir, "b.ts"), "export const b = 1;\n");
    assert.notEqual(stampOf(dir), before);
    const withB = stampOf(dir);
    rmSync(join(dir, "b.ts"));
    assert.notEqual(stampOf(dir), withB);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
