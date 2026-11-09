// Una sesion de orient para un proceso largo (el servidor MCP): el indice y la preparacion
// de la busqueda viven en memoria y solo se rehacen si cambio algun archivo del repositorio.
// Construirlos cuesta ~100 ms; comprobar que nada cambio, ~10 ms; la consulta, ~15 ms.
import { createHash } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { listFiles } from "./index.mjs";
import { createOrient } from "./orient.mjs";

// Huella del estado del repositorio: la lista de archivos (con los nuevos sin versionar) y el
// tamano y la fecha de cada uno, mas el grafo opcional de graphify. Lo que no esta en la
// lista (ignorados, `target/`, `node_modules/`) no cuenta, igual que para el indice.
export function stampOf(root) {
  const hash = createHash("sha1");
  for (const path of listFiles(root)) {
    try {
      const stat = statSync(join(root, path));
      hash.update(`${path}\0${stat.size}\0${stat.mtimeMs}\n`);
    } catch {
      hash.update(`${path}\0gone\n`);
    }
  }
  const graph = join(root, "graphify-out/graph.json");
  if (existsSync(graph)) hash.update(`graph\0${statSync(graph).mtimeMs}`);
  return hash.digest("hex");
}

export function createSession({ root, stamp = stampOf, create = createOrient } = {}) {
  let current = null;
  const stats = { builds: 0, reuses: 0 };
  return {
    stats,
    // El orient al dia: el de antes si nada cambio, uno nuevo si algo cambio.
    get() {
      const now = stamp(root);
      if (current && current.stamp === now) {
        stats.reuses += 1;
        return current.orient;
      }
      current = { stamp: now, orient: create({ root }) };
      stats.builds += 1;
      return current.orient;
    },
  };
}
