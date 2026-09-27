import { translate, type Translate } from "$lib/i18n";
import type { ConnectionErrorKind, ConnectionFailure } from "$lib/types";

// Un fallo de conexion explicado: que paso y que revisar, en el idioma de
// la app. El detalle tecnico (el texto crudo del driver) no se muestra, pero
// queda para copiar. Lo usan el aviso del formulario y el popover de
// "Probar conexión" (connectionTest.ts).

export interface ConnectionTarget {
  host: string;
  port: number;
  database: string;
}

export interface ExplainedFailure {
  // null cuando no se reconocio la causa: se muestra el detalle tal cual.
  title: string | null;
  hint: string | null;
  detail: string;
}

const KNOWN_KINDS = new Set<ConnectionErrorKind>([
  "authFailed",
  "accessDenied",
  "unknownDatabase",
  "hostNotFound",
  "refused",
  "unreachable",
  "timeout",
  "tlsUnavailable",
  "tlsIncompatible",
  "tlsCertificate",
]);

// Lo que llega del invoke: el objeto de src-tauri o, si algo fallo antes
// (p. ej. el propio puente), un texto suelto.
export function toConnectionFailure(error: unknown): ConnectionFailure {
  if (error && typeof error === "object" && "kind" in error && "detail" in error) {
    const { kind, detail } = error as { kind: unknown; detail: unknown };
    return {
      kind: typeof kind === "string" && KNOWN_KINDS.has(kind as ConnectionErrorKind) ? (kind as ConnectionErrorKind) : "other",
      detail: String(detail),
    };
  }
  return { kind: "other", detail: String(error) };
}

export function explainConnectionFailure(
  failure: ConnectionFailure,
  target: ConnectionTarget,
  t: Translate = translate,
): ExplainedFailure {
  if (failure.kind === "other") return { title: null, hint: null, detail: failure.detail };
  const params = { host: target.host, port: target.port, database: target.database };
  return {
    title: t(`connections.failure.${failure.kind}.title`, params),
    hint: t(`connections.failure.${failure.kind}.hint`, params),
    detail: failure.detail,
  };
}
