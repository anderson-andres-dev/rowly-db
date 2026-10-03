// Traduce un ClauseContext (editor/context.ts) en que debe permitir/priorizar
// el autocompletado: es la unica pieza que "decide" que significa cada
// posicion, separada del clasificador (que solo dice "donde estamos") y de
// la integracion con CodeMirror (editor/completionSource.ts, que solo ejecuta la
// decision). Funcion pura, sin imports de CodeMirror.

import type { ClauseContext } from "./context";
import type { SqlProfile } from "../engines";

export interface CompletionPolicy {
  /** Que tan permisivo es el completado de relaciones y columnas. */
  schemaMode: "none" | "relations" | "expressions" | "fallback";
  /** undefined = sin restriccion (vocabulario completo del dialecto). */
  allowedKeywords?: ReadonlySet<string>;
  /** Boost adicional para una keyword puntual en este contexto; 0 = sin boost. */
  keywordBoost: (label: string) => number;
  /** Si la sugerencia de JOIN por FK tiene sentido en esta posicion. */
  allowFkJoin: boolean;
}

const RELATION_TAIL_BASE = ["where", "group", "order", "having", "join", "inner", "left", "right", "full", "outer", "cross", "union", "limit"];

function relationTailKeywords(clause: ClauseContext["clause"]): ReadonlySet<string> {
  return new Set(clause === "join" ? [...RELATION_TAIL_BASE, "on"] : RELATION_TAIL_BASE);
}

const RELATION_TAIL_BOOST: Record<string, number> = { where: 30, group: 18, order: 18, join: 15, on: 20 };

const NO_BOOST = () => 0;

// `engine`: lo que puede abrir una sentencia depende del motor (su perfil).
export function completionPolicy(
  context: ClauseContext,
  engine: Pick<SqlProfile, "statementStarters">,
): CompletionPolicy {
  const allowFkJoin =
    context.position === "unknown" ||
    (context.position === "relation-target" && context.clause === "join" && context.confidence !== "unknown");

  switch (context.position) {
    case "statement-start":
      return { schemaMode: "none", allowedKeywords: new Set(engine.statementStarters), keywordBoost: NO_BOOST, allowFkJoin };

    case "select-tail":
      return {
        schemaMode: "none",
        allowedKeywords: new Set(["from", "union", "into"]),
        keywordBoost: (label) => (label.toLowerCase() === "from" ? 30 : 0),
        allowFkJoin,
      };

    case "expression":
      // Columnas/alias si, tablas sueltas no (ver filterSchemaResult en
      // editor/completionSource.ts); vocabulario de keywords sin restringir (funciones,
      // tipos, AND/OR/CASE/etc. son legitimos en cualquier expresion).
      return { schemaMode: "expressions", keywordBoost: NO_BOOST, allowFkJoin };

    case "relation-target":
      // Se espera un nombre de tabla, no una keyword.
      return { schemaMode: "relations", allowedKeywords: new Set(), keywordBoost: NO_BOOST, allowFkJoin };

    case "relation-tail":
      return {
        schemaMode: "none",
        allowedKeywords: relationTailKeywords(context.clause),
        keywordBoost: (label) => RELATION_TAIL_BOOST[label.toLowerCase()] ?? 0,
        allowFkJoin,
      };

    case "alias":
      // Justo despues de "AS" (o en posicion de alias implicito): ni
      // catalogo ni keywords tienen sentido, es un identificador nuevo.
      return { schemaMode: "none", allowedKeywords: new Set(), keywordBoost: NO_BOOST, allowFkJoin };

    case "keyword-continuation":
      if (context.pendingKeyword === "by") {
        return { schemaMode: "none", allowedKeywords: new Set(["by"]), keywordBoost: NO_BOOST, allowFkJoin };
      }
      if (context.pendingKeyword === "join") {
        return {
          schemaMode: "none",
          allowedKeywords: new Set(["join", "inner", "left", "right", "full", "outer", "cross"]),
          keywordBoost: (label) => (label.toLowerCase() === "join" ? 10 : 0),
          allowFkJoin,
        };
      }
      return { schemaMode: "none", keywordBoost: NO_BOOST, allowFkJoin };

    case "unknown":
    default:
      // Sin degradar nada: es exactamente el comportamiento de hoy.
      return { schemaMode: "fallback", keywordBoost: NO_BOOST, allowFkJoin };
  }
}
