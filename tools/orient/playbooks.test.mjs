import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { anchors } from "./features.mjs";
import { playbookFor, playbookJson } from "./orient.mjs";
import { SKILL_ROOTS, findPlaybook, renderPlaybooks, renderRouter, renderSkill, skillFiles, skillPath, validatePlaybooks } from "./playbooks.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (path) => readFileSync(join(ROOT, path), "utf8");
const model = JSON.parse(read("tools/architecture/model.json"));
const tracked = new Set(execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean));
const ctx = { trackedSet: tracked, anchors: (file) => anchors(read(file)), exists: (path) => tracked.has(path) };

test("los playbooks del catalogo son validos: anclas, reglas y comandos existen", () => {
  assert.ok(model.playbooks.length >= 10);
  assert.deepEqual(validatePlaybooks(model, ctx), []);
});

test("validatePlaybooks senala id, frases, anclas, reglas y scripts que no existen", () => {
  const bad = {
    rules: [{ id: "real" }],
    playbooks: [
      { id: "Mal_Id", title: "", when: { es: ["a"], en: [] }, read: [], steps: [] },
      { id: "dup", title: "ok", when: { es: ["a", "b", "c"], en: ["a", "b", "c"] }, read: ["doc.md#no", "falta.md"], steps: ["x".repeat(300)], rules: ["fantasma", "real"], checks: ["node tools/no-existe.mjs"] },
      { id: "dup", title: "ok", when: { es: ["a", "b", "c"], en: ["a", "b", "c"] }, read: ["doc.md"], steps: ["x"] },
    ],
  };
  const problems = validatePlaybooks(bad, { trackedSet: new Set(["doc.md"]), anchors: () => new Set(), exists: () => false }).join("\n");
  for (const expected of ["kebab-case", "`title` falta", "`when.es`", "`read` vacio", "`steps` vacio", "id repetido", "#no", "falta.md no existe", "pasa de 220", "`fantasma` no existe", "no-existe.mjs"]) assert.ok(problems.includes(expected), expected);
});

test("AGENTS.md, PLAYBOOKS.md y las skills de Claude y Codex estan al dia", () => {
  assert.ok(read("AGENTS.md").includes(renderRouter(model)));
  assert.equal(read("docs/map/PLAYBOOKS.md"), renderPlaybooks(model));
  for (const [path, content] of skillFiles(model)) assert.equal(read(path), content, path);
  assert.equal(skillFiles(model).size, SKILL_ROOTS.length * model.playbooks.length);
});

test("el router de AGENTS.md cubre cada playbook y una skill es un adaptador sin contenido propio", () => {
  const router = renderRouter(model);
  for (const pb of model.playbooks) {
    assert.ok(router.includes(`\`${pb.id}\``));
    const skill = renderSkill(model, pb);
    assert.match(skill, new RegExp(`^---\\nname: rowly-${pb.id}\\ndescription: .+\\n---\\n`));
    for (const step of pb.steps) assert.ok(skill.includes(step));
    for (const root of SKILL_ROOTS) assert.ok(existsSync(join(ROOT, skillPath(root, pb.id))));
  }
});

test("los enlaces relativos de una skill llegan a los documentos", () => {
  for (const pb of model.playbooks) {
    const skill = renderSkill(model, pb);
    for (const [, target] of skill.matchAll(/\]\(\.\.\/\.\.\/\.\.\/([^)#]+)/g)) assert.ok(existsSync(join(ROOT, target)), target);
  }
});

const ASKED = [
  ["analiza el repo", "understand-repo"],
  ["explain the project architecture to me", "understand-repo"],
  ["arregla este bug: se rompe al guardar", "fix-bug"],
  ["fix the error, it crashes when I paginate", "fix-bug"],
  ["quiero añadir un comando nuevo del backend", "ipc-command"],
  ["add a new tauri command to expose to the frontend", "ipc-command"],
  ["cambiar un texto de un botón de la interfaz", "ui-text"],
  ["translate a ui message", "ui-text"],
  ["cambiar la guarda de sentencias destructivas", "sql-behavior"],
  ["change how pagination and generated SQL work", "sql-behavior"],
  ["añadir un motor de base de datos nuevo", "add-engine"],
  ["we need a new version line for postgres", "add-engine"],
  ["escribir pruebas para esta función", "add-tests"],
  ["how to run the tests of an area", "add-tests"],
  ["cambiar el workflow de github del ci", "tooling-ci"],
  ["edit the architecture rules and allowed dependencies", "tooling-ci"],
  ["actualizar la documentación del readme", "write-docs"],
  ["update the documentation and translate the guide", "write-docs"],
  ["publicar una versión nueva", "release"],
  ["cut a release and tag it", "release"],
];

test("--playbook encuentra el procedimiento de peticiones etiquetadas en espanol e ingles", () => {
  const wrong = ASKED.filter(([request, id]) => playbookFor(request, model)?.pb.id !== id).map(([request, id]) => `${request} -> ${playbookFor(request, model)?.pb.id} (esperado ${id})`);
  assert.deepEqual(wrong, []);
});

test("una peticion sin relacion no devuelve playbook y no se inventa uno", () => {
  for (const request of ["xyzzy plugh", "la grilla", "hola"]) assert.equal(playbookFor(request, model), null, request);
  assert.deepEqual(findPlaybook(model, "").ranked, []);
});

test("el JSON de un playbook lleva su esquema, las reglas con su texto y las comprobaciones", () => {
  const found = playbookFor("añadir un comando nuevo del backend", model);
  const json = playbookJson(found.pb, model);
  assert.deepEqual(Object.keys(json), ["schemaVersion", "kind", "id", "title", "read", "steps", "rules", "checks"]);
  assert.equal(json.kind, "playbook");
  assert.ok(json.rules.every((rule) => rule.rule));
});
