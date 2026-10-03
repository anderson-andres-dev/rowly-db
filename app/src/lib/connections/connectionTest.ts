import { translate, type Translate } from "$lib/i18n";
import { explainConnectionFailure, type ConnectionTarget } from "$lib/connections/connectionErrors";
import type { ConnectionFailure, TestConnectionReport, TlsStatus } from "$lib/types";

// Resumen de "Probar conexión" para el popover del formulario
// (ConnectionForm.svelte): el estado, el texto corto que queda junto al
// botón y las líneas del detalle, que también son lo que copia "Copiar".
// Los textos salen de `t`: el formulario pasa `$t` para que el resumen
// cambie con el idioma; sin él se usa el idioma vigente al llamar.

// Conectar es exito aunque sea sin cifrar: el aviso va solo en la linea
// del SSL (`warning`), no en el resultado entero. Un titulo de exito con un
// icono de advertencia al lado se leia ambiguo.
export type TestOutcome = "success" | "error";

export interface TestLine {
  label: string;
  value: string;
  // La linea pide atencion (SSL sin cifrar).
  warning?: boolean;
}

export interface TestSummary {
  outcome: TestOutcome;
  title: string;
  // Texto corto junto al botón, p.ej. "MySQL 8.4.9".
  badge: string;
  lines: TestLine[];
}

function describeTls(tls: TlsStatus, t: Translate): string {
  if (tls.encrypted === true) {
    return tls.detail ? t("connections.test.tls.yesDetail", { detail: tls.detail }) : t("connections.test.tls.yes");
  }
  if (tls.encrypted === false) {
    return tls.fellBack ? t("connections.test.tls.fellBack") : t("connections.test.tls.noTls");
  }
  return t("connections.test.tls.unknown");
}

export function summarizeReport(report: TestConnectionReport, t: Translate = translate): TestSummary {
  const unencrypted = report.tls.encrypted === false;
  const lines: TestLine[] = [
    { label: t("connections.test.server"), value: report.serverVersion },
    ...(report.defaultSchema ? [{ label: t("connections.test.schema"), value: report.defaultSchema }] : []),
    {
      label: t("connections.test.latency"),
      value: report.latencyMs === null ? "—" : t("connections.test.latencyValue", { ms: report.latencyMs }),
    },
    { label: t("connections.test.ssl"), value: describeTls(report.tls, t), ...(unencrypted ? { warning: true } : {}) },
  ];
  return {
    outcome: "success",
    title: t("connections.test.success"),
    badge: report.serverVersion,
    lines,
  };
}

// La causa va de titulo y lo que conviene revisar como primera linea; el
// detalle crudo del driver, al final (tambien entra en "Copiar").
export function summarizeError(failure: ConnectionFailure, target: ConnectionTarget, t: Translate = translate): TestSummary {
  const explained = explainConnectionFailure(failure, target, t);
  const lines: TestLine[] = [{ label: t("connections.test.target"), value: `${target.host}:${target.port}` }];
  if (explained.hint) lines.push({ label: t("connections.test.hint"), value: explained.hint });
  lines.push({
    label: explained.title ? t("connections.test.detail") : t("connections.test.error"),
    value: explained.detail,
  });
  return {
    outcome: "error",
    title: explained.title ?? t("connections.test.failed"),
    badge: t("connections.test.failedBadge"),
    lines,
  };
}

export function summaryText(summary: TestSummary): string {
  return [summary.title, ...summary.lines.map((line) => `${line.label}: ${line.value}`)].join("\n");
}
