import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { BEGIN, END, HOOKS, hookBlock, hooksDir, install, status, uninstall } from "./hooks.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } });
const repo = () => {
  const dir = mkdtempSync(join(tmpdir(), "orient-hooks-"));
  git(dir, "init", "-q");
  return dir;
};
const hook = (dir, name) => join(hooksDir(dir), name);

// Los hooks son scripts de shell: en Windows (Git Bash) se omiten las pruebas que los ejecutan.
const unix = { skip: process.platform === "win32" };

test("install crea los tres hooks ejecutables, validos para sh, y es idempotente", unix, () => {
  const dir = repo();
  assert.deepEqual(install(dir).done, HOOKS);
  for (const name of HOOKS) {
    const text = readFileSync(hook(dir, name), "utf8");
    assert.ok(text.startsWith("#!/bin/sh\n"));
    assert.equal(text.split(BEGIN).length, 2);
    assert.ok(statSync(hook(dir, name)).mode & 0o100, `${name} ejecutable`);
    execFileSync("sh", ["-n", hook(dir, name)]);
  }
  const first = readFileSync(hook(dir, "post-commit"), "utf8");
  install(dir);
  assert.equal(readFileSync(hook(dir, "post-commit"), "utf8"), first);
  assert.ok(status(dir).every((item) => item.state === "orient"));
});

test("--graphify solo anade la actualizacion del grafo, en segundo plano y si esta instalado", () => {
  assert.doesNotMatch(hookBlock(), /graphify/);
  assert.match(hookBlock({ graphify: true }), /command -v graphify .*&/);
  const dir = repo();
  install(dir, { graphify: true });
  assert.ok(status(dir).every((item) => item.graphify));
});

test("un hook que ya existia conserva su contenido y uninstall deja exactamente lo que habia", () => {
  const dir = repo();
  mkdirSync(hooksDir(dir), { recursive: true });
  const original = '#!/bin/sh\necho "mio"\n';
  writeFileSync(hook(dir, "post-commit"), original);
  install(dir);
  const mixed = readFileSync(hook(dir, "post-commit"), "utf8");
  assert.ok(mixed.startsWith(original) && mixed.includes(BEGIN));
  assert.deepEqual(uninstall(dir).removed.sort(), [...HOOKS].sort());
  assert.equal(readFileSync(hook(dir, "post-commit"), "utf8"), original);
  assert.ok(!existsSync(hook(dir, "post-merge")), "los hooks que eran solo de orient se borran");
});

test("nunca pisa un hook que no es de shell ni toca uno ajeno al desinstalar", () => {
  const dir = repo();
  mkdirSync(hooksDir(dir), { recursive: true });
  const python = "#!/usr/bin/env python3\nprint('hola')\n";
  writeFileSync(hook(dir, "post-merge"), python);
  writeFileSync(hook(dir, "post-checkout"), '#!/bin/sh\necho ajeno\n');
  const result = install(dir);
  assert.match(result.skipped.join(), /post-merge/);
  assert.equal(readFileSync(hook(dir, "post-merge"), "utf8"), python);
  uninstall(dir);
  assert.equal(readFileSync(hook(dir, "post-merge"), "utf8"), python);
  assert.equal(readFileSync(hook(dir, "post-checkout"), "utf8"), "#!/bin/sh\necho ajeno\n");
  assert.deepEqual(status(dir).map((item) => item.state), ["none", "foreign", "foreign"]);
});

test("respeta core.hooksPath", () => {
  const dir = repo();
  git(dir, "config", "core.hooksPath", "mis-hooks");
  install(dir);
  assert.ok(existsSync(join(dir, "mis-hooks", "post-commit")));
  assert.ok(!existsSync(join(dir, ".git", "hooks", "post-commit")));
});

// Los hooks no pueden estorbar: un commit con ellos instalados sale bien aunque no haya
// tools/orient o aunque node no este en el PATH.
test("con los hooks instalados el commit sale bien sin tools/orient y sin node en el PATH", unix, () => {
  const dir = repo();
  install(dir, { graphify: true });
  writeFileSync(join(dir, "a.txt"), "a");
  git(dir, "add", "a.txt");
  const env = { ...process.env, PATH: "/usr/bin:/bin", GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };
  const commit = spawnSync("git", ["commit", "-q", "-m", "x"], { cwd: dir, env, encoding: "utf8" });
  assert.equal(commit.status, 0, commit.stderr);
  mkdirSync(join(dir, "tools/orient"), { recursive: true });
  writeFileSync(join(dir, "tools/orient/index.mjs"), "throw new Error('roto');\n");
  writeFileSync(join(dir, "b.txt"), "b");
  git(dir, "add", "-A");
  const again = spawnSync("git", ["commit", "-q", "-m", "y"], { cwd: dir, env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" }, encoding: "utf8" });
  assert.equal(again.status, 0, "un orient roto no hace fallar el commit");
  assert.equal(again.stderr.trim(), "");
});

test("el hook de verdad refresca el indice cuando existe tools/orient/index.mjs", unix, () => {
  const dir = repo();
  mkdirSync(join(dir, "tools/orient"), { recursive: true });
  writeFileSync(join(dir, "tools/orient/index.mjs"), 'import { writeFileSync } from "node:fs";\nwriteFileSync("refrescado.txt", process.argv.slice(2).join(" "));\n');
  install(dir);
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "x");
  assert.equal(readFileSync(join(dir, "refrescado.txt"), "utf8"), "--quiet");
});

// --- Opcionales de verdad ------------------------------------------------

test("nada en el repositorio instala los hooks: ni npm, ni workflows, ni otras herramientas", () => {
  const offenders = [];
  const scan = (path) => {
    if (!existsSync(path)) return;
    if (/hooks\.mjs\s+install|orient\/hooks/.test(readFileSync(path, "utf8"))) offenders.push(path);
  };
  scan(join(ROOT, "app/package.json"));
  scan(join(ROOT, "package.json"));
  scan(join(ROOT, "Cargo.toml"));
  for (const file of readdirSync(join(ROOT, ".github/workflows"))) scan(join(ROOT, ".github/workflows", file));
  for (const dir of ["tools/ci", "tools/inventory", "tools/architecture", "tools/release"]) {
    for (const file of readdirSync(join(ROOT, dir))) if (file.endsWith(".mjs")) scan(join(ROOT, dir, file));
  }
  assert.deepEqual(offenders, []);
});

test("el bloque lleva sus marcas y no usa set -e", () => {
  const block = hookBlock();
  assert.ok(block.startsWith(BEGIN) && block.endsWith(END));
  assert.doesNotMatch(block, /set -e/);
  assert.match(block, /\) \|\| true/);
});
