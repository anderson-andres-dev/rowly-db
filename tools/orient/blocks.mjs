// Los bloques generados de AGENTS.md: el mapa de funcionalidades y las reglas. Salen de
// tools/architecture/model.json (la unica fuente curada) y `features.mjs --write` los
// escribe entre sus marcas; `--check` falla si quedaron atras.
import { renderRouter } from "./playbooks.mjs";

export const AGENTS = "AGENTS.md";
export const marks = (name) => ({ start: `<!-- generated: ${name} (tools/orient/blocks.mjs) -->`, end: `<!-- /generated: ${name} -->` });

// El mapa corto: una linea por funcionalidad, para tener el plano cargado sin leer FEATURES.md.
const head = (summary) => {
  const cut = summary.split(/[:.]/)[0].trim();
  return cut.length > 78 ? `${cut.slice(0, 77)}…` : cut;
};

export function renderMap(model) {
  return model.features.items.map((feature) => `- \`${feature.id}\` — ${head(feature.summary)} → \`${feature.entry[0]}\``).join("\n");
}

// Las reglas persistentes: cada una con la razon y, si existe, el comando que la comprueba.
export function renderRules(model) {
  return (model.rules ?? [])
    .map((rule) => `- **${rule.id}** — ${rule.rule} *Why:* ${rule.why}${rule.check ? ` Check: \`${rule.check}\`.` : ""}`)
    .join("\n");
}

const RENDERERS = { router: renderRouter, map: renderMap, rules: renderRules };

// `text` es AGENTS.md; reemplaza lo que hay entre las marcas de cada bloque.
export function applyBlocks(text, model, names = Object.keys(RENDERERS)) {
  let out = text;
  for (const name of names) {
    const { start, end } = marks(name);
    const from = out.indexOf(start);
    const to = out.indexOf(end);
    if (from < 0 || to < from) throw new Error(`${AGENTS}: faltan las marcas ${start} ... ${end}`);
    out = `${out.slice(0, from + start.length)}\n${RENDERERS[name](model)}\n${out.slice(to)}`;
  }
  return out;
}

const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const RULE_MAX = 200;
const WHY_MAX = 110;

// Problemas de las reglas: `anchors` devuelve el conjunto de anclas de un documento (o null).
export function validateRules(model, { trackedSet, anchors, exists }) {
  const problems = [];
  const seen = new Set();
  for (const rule of model.rules ?? []) {
    const where = `rules.${rule.id ?? "(sin id)"}`;
    if (!ID.test(rule.id ?? "")) problems.push(`${where}: el id debe ser kebab-case`);
    if (seen.has(rule.id)) problems.push(`${where}: id repetido`);
    seen.add(rule.id);
    if (!rule.rule || rule.rule.length > RULE_MAX) problems.push(`${where}: \`rule\` falta o pasa de ${RULE_MAX} caracteres`);
    if (!rule.why || rule.why.length > WHY_MAX) problems.push(`${where}: \`why\` falta o pasa de ${WHY_MAX} caracteres`);
    const script = rule.check && /node\s+(\S+\.mjs)/.exec(rule.check)?.[1];
    if (script && !exists(script)) problems.push(`${where}: el comando de \`check\` usa ${script}, que no existe`);
    for (const target of rule.docs ?? []) {
      const [file, anchor] = target.split("#");
      if (!trackedSet.has(file)) problems.push(`${where}: el documento ${file} no existe`);
      else if (anchor && file.endsWith(".md") && !anchors(file)?.has(anchor)) problems.push(`${where}: ${file} no tiene el ancla #${anchor}`);
    }
  }
  return problems;
}
