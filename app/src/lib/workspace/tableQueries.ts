// Pestañas de tabla (doble clic en el explorador): la consulta que muestran,
// las columnas que ofrece el constructor de filtros y la regla de una sola
// consulta activa por pestaña. El dueño de los filtros sigue siendo
// stores/queryConsoles; aqui solo se decide.

import type { TableTab } from "$lib/stores/queryConsoles";
import type { CatalogTable, QueryExecutionResult } from "$lib/types";

// SELECT de la pestaña. El orden se hace con clic en los encabezados del
// grid, no aqui.
export function tableSql(table: Pick<TableTab, "schema" | "name" | "where">, quote: (name: string) => string): string {
  const parts = [`SELECT * FROM ${quote(table.schema)}.${quote(table.name)}`];
  if (table.where.trim()) parts.push(`WHERE ${table.where.trim()}`);
  return parts.join(" ");
}

export interface FilterColumn {
  name: string;
  dataType: string;
}

// Las del catalogo (con su tipo, para citar bien los valores); si la tabla
// no esta en el catalogo, las del resultado.
export function filterColumns(
  table: Pick<TableTab, "schema" | "name">,
  catalog: CatalogTable[],
  result: QueryExecutionResult | null,
): FilterColumn[] {
  const fromCatalog = catalog.find((item) => item.schema === table.schema && item.name === table.name);
  if (fromCatalog) return fromCatalog.columns.map((column) => ({ name: column.name, dataType: column.dataType }));
  return result?.type === "resultSet" ? result.columns.map((column) => ({ name: column.name, dataType: column.type })) : [];
}

// Nunca dos consultas a la vez por pestaña: si llega un pedido mientras una
// corre, al terminar se ejecuta una sola vez mas (la funcion lee el estado
// vigente, asi que esa vuelta usa lo ultimo). Los pedidos intermedios se
// funden en esa unica vuelta.
export function oneQueryAtATime(run: (id: string) => Promise<void>): (id: string) => Promise<void> {
  const running = new Set<string>();
  const rerun = new Set<string>();
  const request = async (id: string): Promise<void> => {
    if (running.has(id)) {
      rerun.add(id);
      return;
    }
    running.add(id);
    try {
      await run(id);
    } finally {
      running.delete(id);
    }
    if (rerun.delete(id)) void request(id);
  };
  return request;
}
