import type { Text } from "@codemirror/state";

// Las tablas y vistas que crea el documento (CREATE [TEMPORARY] TABLE tmp):
// existen aunque el catalogo no las tenga, y el analisis no las marca como
// inexistentes (`CatalogView::created` en crates/engine). Se busca linea por
// linea, con la siguiente pegada (el nombre puede ir abajo); lo que caiga en
// una cadena o un comentario solo hace que no se marque una tabla: nunca un
// error de mas.

const CREATE =
  /\bcreate\s+(?:or\s+replace\s+)?(?:(?:global|local)\s+)?(?:temp(?:orary)?\s+)?(?:materialized\s+)?(?:table|view)\s+(?:if\s+not\s+exists\s+)?((?:[`"[]?[\w$]+[`"\]]?\s*\.\s*)?[`"[]?[\w$]+[`"\]]?)/gi;
const MENTIONS_CREATE = /create/i;

function lastPart(name: string): string {
  const parts = name.split(".");
  return parts[parts.length - 1].trim().replace(/^[`"[]|[`"\]]$/g, "");
}

export function createdTables(doc: Text): string[] {
  const names = new Set<string>();
  let previous = "";
  const scan = (text: string) => {
    for (const match of text.matchAll(CREATE)) names.add(lastPart(match[1]));
  };
  for (const line of doc.iterLines()) {
    if (MENTIONS_CREATE.test(previous)) scan(`${previous} ${line}`);
    previous = line;
  }
  if (MENTIONS_CREATE.test(previous)) scan(previous);
  return [...names].sort();
}
