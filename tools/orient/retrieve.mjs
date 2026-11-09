// Recuperar: de la descripcion de una tarea a las funcionalidades y archivos
// mas probables. Dos busquedas BM25 (funcionalidades y archivos) que se
// refuerzan: un archivo sube si su texto coincide y tambien si pertenece a la
// funcionalidad que mejor encaja. Los pesos estan en PARAMS; se ajustan solo
// contra la particion `train` de la prueba de oro.
import { covers } from "./features.mjs";
import { fieldsOf } from "./index.mjs";
import { Bm25, tokens } from "./text.mjs";

export const PARAMS = {
  feature: { terms: 3, id: 2, summary: 1, names: 1.5, docs: 0.5 },
  file: { name: 3, path: 1.5, symbols: 2, ui: 1, lead: 1 },
  lambda: 1.5,
  exact: 0,
  prior: 0.05,
  neighbor: 0.1,
  test: { name: 2, property: 2, owner: 1 },
  perFeature: 3,
  confidence: { margin: 0.2, coverage: 0.35 },
};

const norm = (text) => tokens(text);

function featureDocs(index, { useTerms }) {
  return index.model.features.items.map((feature) => ({
    id: feature.id,
    fields: {
      id: norm(feature.id.replace(/-/g, " ")),
      summary: norm(feature.summary),
      terms: useTerms ? [...feature.terms.es, ...feature.terms.en].flatMap(norm) : [],
      names: feature.entry.flatMap((entry) => norm(entry.replace(/\/$/, "").split("/").pop().replace(/\.[a-z]+$/, ""))),
      docs: (feature.docs ?? []).flatMap((target) => norm(target.split("#")[1]?.replace(/-/g, " ") ?? "")),
    },
  }));
}

// Se arma una sola vez por indice y variante.
export function prepare(index, { useTerms = true } = {}) {
  const features = new Bm25(featureDocs(index, { useTerms }), PARAMS.feature);
  const files = new Bm25([...index.files.values()].map((file) => ({ id: file.path, fields: fieldsOf(file) })), PARAMS.file);
  // Las pruebas se buscan por su nombre y por la propiedad que el inventario dice que protegen.
  const tests = new Bm25(
    index.inventory.tests.map((test) => ({
      id: test.path,
      fields: { name: norm(test.path.split("/").pop().replace(/\.[a-z.]+$/, "")), property: norm(test.property ?? ""), owner: norm((test.owner ?? "").split("/").pop().replace(/\.[a-z]+$/, "")) },
    })),
    PARAMS.test,
  );
  const maxIn = Math.max(1, ...[...index.files.keys()].map((path) => index.indegree(path)));
  return { index, features, files, tests, maxIn };
}

export function retrieve(prepared, task, params = PARAMS) {
  const { index, features, files, tests, maxIn } = prepared;
  const query = tokens(task);
  const unique = [...new Set(query)];

  const featureScores = [...features.score(query).entries()].map(([id, hit]) => ({ id, ...hit })).sort((a, b) => b.score - a.score);
  const topFeature = featureScores[0]?.score ?? 0;
  const featureNorm = new Map(featureScores.map((item) => [item.id, item.score / topFeature]));

  const fileHits = files.score(query);
  const topFile = Math.max(0, ...[...fileHits.values()].map((hit) => hit.score));

  const ranked = [...index.files.values()].map((file) => {
    const hit = fileHits.get(file.path);
    const lexical = hit && topFile ? hit.score / topFile : 0;
    let boost = 0;
    let owner = null;
    for (const id of file.features) {
      const feature = index.featureById.get(id);
      const base = featureNorm.get(id) ?? 0;
      const exact = feature.entry.includes(file.path) ? params.exact : 0;
      const value = base > 0 ? base + exact : 0;
      if (value > boost) {
        boost = value;
        owner = id;
      }
    }
    const prior = (Math.log(1 + index.indegree(file.path)) / Math.log(1 + maxIn)) * params.prior;
    return { path: file.path, score: lexical + params.lambda * boost + prior, lexical, matched: hit?.matched ?? [], feature: owner ?? file.features[0] };
  });
  ranked.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  if (params.neighbor > 0) {
    const byPath = new Map(ranked.map((item) => [item.path, item]));
    const top = ranked.slice(0, 10);
    for (const item of top) {
      const file = index.files.get(item.path);
      for (const other of [...file.deps, ...file.rdeps, ...file.calls, ...file.callers]) {
        const target = byPath.get(other);
        if (target && !top.includes(target)) target.score += params.neighbor * item.score;
      }
    }
    ranked.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  }

  const symbolsMatching = (path) => {
    const file = index.files.get(path);
    return file.rec.symbols.filter((symbol) => tokens(symbol.name).some((token) => unique.includes(token)));
  };
  const second = featureScores[1]?.score ?? 0;
  const margin = topFeature ? (topFeature - second) / topFeature : 0;
  const seen = new Set([...(featureScores[0]?.matched ?? []), ...(ranked[0]?.matched ?? [])]);
  const coverage = unique.length ? unique.filter((term) => seen.has(term)).length / unique.length : 0;
  const level = margin >= params.confidence.margin && coverage >= params.confidence.coverage ? "high" : margin >= params.confidence.margin || coverage >= params.confidence.coverage ? "medium" : "low";

  const testHits = tests.score(query);

  return {
    query: unique,
    testHits,
    features: featureScores,
    files: ranked,
    symbolsMatching,
    confidence: { level, margin, coverage },
  };
}

export { covers };
