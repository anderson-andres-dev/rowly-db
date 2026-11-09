// Enriquecimiento opcional con el grafo de simbolos de graphify. Si
// graphify-out/graph.json existe, suma a la tarjeta los archivos que sus
// llamadas y referencias relacionan con los elegidos; si no existe, no pasa
// nada: orient no depende de el. Sus aristas se resuelven por nombre, asi que
// sugieren donde mirar, no demuestran una dependencia.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const RELATIONS = new Set(["calls", "references", "indirect_call", "uses", "method"]);

export function loadGraph(root) {
  const path = join(root, "graphify-out/graph.json");
  if (!existsSync(path)) return null;
  try {
    const graph = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(graph.nodes) && Array.isArray(graph.links) ? graph : null;
  } catch {
    return null;
  }
}

// Archivos que el grafo relaciona con `paths` y que no estan en `skip`, con cuantas aristas
// los unen, de mas a menos.
export function graphNeighbors(graph, paths, { skip = new Set(), limit = 4 } = {}) {
  const fileOf = new Map(graph.nodes.map((node) => [node.id, node.source_file]));
  const wanted = new Set(paths);
  const count = new Map();
  for (const link of graph.links) {
    if (!RELATIONS.has(link.relation)) continue;
    const from = fileOf.get(link.source) ?? link.source_file;
    const to = fileOf.get(link.target);
    if (!from || !to || from === to) continue;
    const other = wanted.has(from) ? to : wanted.has(to) ? from : null;
    if (!other || wanted.has(other) || skip.has(other)) continue;
    count.set(other, (count.get(other) ?? 0) + 1);
  }
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([path, edges]) => ({ path, edges }));
}
