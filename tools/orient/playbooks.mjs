// Los playbooks: el procedimiento de cada tipo de cambio, como datos. Viven en
// tools/architecture/model.json (clave `playbooks`), apoyados en documentos que ya
// existen: no inventan nada, dicen que leer, que hacer, que reglas importan y que
// correr. De ahi salen el router de AGENTS.md, docs/map/PLAYBOOKS.md, las skills
// para Claude y Codex (adaptadores opcionales y generados) y `orient --playbook`.
import { Bm25, tokens } from "./text.mjs";

export const DOC = "docs/map/PLAYBOOKS.md";
// Estandar Agent Skills: Claude Code lee .claude/skills; Codex, .agents/skills.
export const SKILL_ROOTS = [".claude/skills", ".agents/skills"];
export const skillName = (id) => `rowly-${id}`;
export const skillPath = (root, id) => `${root}/${skillName(id)}/SKILL.md`;

const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const TITLE_MAX = 70;
const STEP_MAX = 220;
const link = (target, prefix = "") => `[${target}](${prefix}${target})`;
const ruleById = (model) => new Map((model.rules ?? []).map((rule) => [rule.id, rule]));

// `anchors(file)` devuelve el conjunto de anclas de un .md (o null); `exists(path)` si el archivo esta versionado.
export function validatePlaybooks(model, { trackedSet, anchors, exists }) {
  const problems = [];
  const seen = new Set();
  const rules = ruleById(model);
  for (const pb of model.playbooks ?? []) {
    const where = `playbooks.${pb.id ?? "(sin id)"}`;
    if (!ID.test(pb.id ?? "")) problems.push(`${where}: el id debe ser kebab-case`);
    if (seen.has(pb.id)) problems.push(`${where}: id repetido`);
    seen.add(pb.id);
    if (!pb.title || pb.title.length > TITLE_MAX) problems.push(`${where}: \`title\` falta o pasa de ${TITLE_MAX} caracteres`);
    for (const lang of ["es", "en"]) if (!Array.isArray(pb.when?.[lang]) || pb.when[lang].length < 3) problems.push(`${where}: \`when.${lang}\` necesita al menos 3 frases`);
    if (!Array.isArray(pb.read) || pb.read.length === 0) problems.push(`${where}: \`read\` vacio`);
    for (const target of pb.read ?? []) {
      const [file, anchor] = target.split("#");
      if (!trackedSet.has(file)) problems.push(`${where}: el documento ${file} no existe`);
      else if (anchor && file.endsWith(".md") && !anchors(file)?.has(anchor)) problems.push(`${where}: ${file} no tiene el ancla #${anchor}`);
    }
    if (!Array.isArray(pb.steps) || pb.steps.length === 0) problems.push(`${where}: \`steps\` vacio`);
    for (const step of pb.steps ?? []) if (step.length > STEP_MAX) problems.push(`${where}: un paso pasa de ${STEP_MAX} caracteres`);
    for (const id of pb.rules ?? []) if (!rules.has(id)) problems.push(`${where}: la regla \`${id}\` no existe`);
    for (const check of pb.checks ?? []) {
      const script = /node\s+(\S+\.mjs)/.exec(check)?.[1];
      if (script && !exists(script)) problems.push(`${where}: el comando \`${check}\` usa ${script}, que no existe`);
    }
  }
  return problems;
}

// Router de AGENTS.md: una linea por playbook, la minima para saber a cual ir.
export function renderRouter(model) {
  return (model.playbooks ?? []).map((pb) => `- \`${pb.id}\` — ${pb.title}. Read: ${pb.read[0]}`).join("\n");
}

// Cuerpo de un playbook; `prefix` lleva los enlaces relativos hasta la raiz del repositorio.
function body(model, pb, prefix) {
  const rules = ruleById(model);
  const lines = [`## Read first`, "", ...pb.read.map((target) => `- ${link(target, prefix)}`), "", "## Steps", "", ...pb.steps.map((step, i) => `${i + 1}. ${step}`)];
  if (pb.rules?.length) lines.push("", "## Rules that apply", "", ...pb.rules.map((id) => `- **${id}** — ${rules.get(id).rule}`));
  if (pb.checks?.length) lines.push("", "## Before you finish", "", ...pb.checks.map((check) => `- \`${check}\``));
  return lines;
}

export function renderPlaybooks(model) {
  const items = model.playbooks ?? [];
  const lines = [
    "# Playbooks",
    "",
    "<!-- generated: playbooks (tools/orient/playbooks.mjs) -->",
    "",
    "The procedure for each kind of change: what to read, what to do, which rules matter and what to run. Generated from the `playbooks` and `rules` keys of `tools/architecture/model.json`; to change it, edit the model and run `node tools/orient/features.mjs --write`. Never edit this file by hand. `node tools/orient/orient.mjs --playbook \"<request>\"` finds the right one.",
    "",
    "## Index",
    "",
    ...items.map((pb) => `- [\`${pb.id}\`](#${pb.id}): ${pb.title}`),
    "",
  ];
  for (const pb of items) {
    lines.push(`## ${pb.id}`, "", `**${pb.title}.** Asked as: ${pb.when.en.map((phrase) => `"${phrase}"`).join(", ")}.`, "");
    lines.push(...body(model, pb, "../../").map((line) => line.replace(/^## /, "### ")), "");
  }
  lines.push("<!-- /generated -->", "");
  return lines.join("\n");
}

// Una skill (Agent Skills): `name` y `description` en el encabezado; carga progresiva.
export function renderSkill(model, pb) {
  const description = `${pb.title}. Use when asked to: ${pb.when.en.slice(0, 4).join("; ")}.`;
  return [
    "---",
    `name: ${skillName(pb.id)}`,
    `description: ${description}`,
    "---",
    "",
    `<!-- generated: skill (tools/orient/playbooks.mjs); edit the playbook \`${pb.id}\` in tools/architecture/model.json -->`,
    "",
    `# ${pb.title}`,
    "",
    ...body(model, pb, "../../../"),
    "",
  ].join("\n");
}

// Todos los archivos de skills que deben existir: ruta -> contenido.
export function skillFiles(model) {
  const files = new Map();
  for (const root of SKILL_ROOTS) for (const pb of model.playbooks ?? []) files.set(skillPath(root, pb.id), renderSkill(model, pb));
  return files;
}

// Busca el playbook de una peticion: BM25 sobre el titulo y las frases `when` (es y en).
export function findPlaybook(model, request) {
  const items = model.playbooks ?? [];
  const query = tokens(request);
  if (!items.length || !query.length) return { match: null, strong: false, ranked: [] };
  const bm = new Bm25(
    items.map((pb) => ({ id: pb.id, fields: { title: tokens(pb.title), when: tokens([...pb.when.es, ...pb.when.en].join(" ")) } })),
    { title: 2, when: 1 },
  );
  const ranked = [...bm.score(query)].map(([id, { score, matched }]) => ({ id, score, matched })).sort((a, b) => b.score - a.score);
  const [top, second] = ranked;
  const match = top ? items.find((pb) => pb.id === top.id) : null;
  // Fuerte: al menos dos terminos en comun y una ventaja clara sobre el segundo.
  const strong = Boolean(top) && top.matched.length >= 2 && (!second || top.score >= second.score * 1.3);
  return { match, strong, ranked };
}

export function playbookText(model, pb) {
  return `${[`# Playbook: ${pb.id}`, "", `${pb.title}.`, "", ...body(model, pb, "")].join("\n")}\n`;
}
