import { parseMixed, type Parser, type ParseWrapper } from "@lezer/common";
import { executablePrefix } from "$lib/sqlComments";
import type { SqlLexical } from "$lib/sqlStatements";

// El resaltado de @codemirror/lang-sql anida /* */ en todos los dialectos y
// pinta como comentario lo que MySQL y MariaDB ejecutan. Esta envoltura del
// parser vuelve a leer como SQL lo que el motor ejecuta
// (docs/specs/v0.3-comentarios.md, Parte 1):
// - el contenido de /*! ... */ y /*M! ... */, tras el numero de version;
// - sin anidamiento, lo que sigue al primer */ de un comentario que lang-sql
//   alargo por un /* interno (en MySQL eso es codigo y se ejecuta).
// Los marcadores quedan como comentario. null: el motor no necesita nada.
export function commentAwareWrap(lexical: SqlLexical, sql: Parser): ParseWrapper | null {
  if (lexical.nestedComments && lexical.executableComments.length === 0) return null;
  return parseMixed((node, input) => {
    if (node.name !== "BlockComment") return null;
    const text = input.read(node.from, node.to);
    // Donde acaba de verdad el comentario: en el primer */ si el motor no anida.
    const firstClose = text.indexOf("*/", 2);
    const realEnd = lexical.nestedComments || firstClose === -1 ? text.length : firstClose + 2;
    const overlay: { from: number; to: number }[] = [];
    const prefix = executablePrefix(text, 0, lexical);
    if (prefix) {
      let start = prefix.length;
      while (start < realEnd && text.charCodeAt(start) >= 48 && text.charCodeAt(start) <= 57) start++;
      const end = text.startsWith("*/", realEnd - 2) && realEnd - 2 >= start ? realEnd - 2 : realEnd;
      if (end > start) overlay.push({ from: node.from + start, to: node.from + end });
    }
    if (realEnd < text.length) overlay.push({ from: node.from + realEnd, to: node.to });
    return overlay.length > 0 ? { parser: sql, overlay } : null;
  });
}
