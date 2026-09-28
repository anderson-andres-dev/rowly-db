import { describe, expect, it } from "vitest";
import { summarizeError, summarizeReport, summaryText } from "$lib/connectionTest";

const encrypted = {
  serverVersion: "MySQL 8.4.9",
  defaultSchema: "core",
  latencyMs: 20,
  tls: { encrypted: true, detail: "TLSv1.3 · TLS_AES_256_GCM_SHA384", fellBack: false },
};

describe("summarizeReport", () => {
  it("resume una conexion cifrada", () => {
    const summary = summarizeReport(encrypted);

    expect(summary).toMatchObject({ outcome: "success", title: "Conexión correcta", badge: "MySQL 8.4.9" });
    expect(summary.lines).toEqual([
      { label: "Servidor", value: "MySQL 8.4.9" },
      { label: "Schema", value: "core" },
      { label: "Latencia", value: "20 ms" },
      { label: "SSL", value: "sí (TLSv1.3 · TLS_AES_256_GCM_SHA384)" },
    ]);
  });

  it("avisa cuando conecto sin cifrar y explica por que", () => {
    const fellBack = summarizeReport({
      ...encrypted,
      tls: { encrypted: false, detail: null, fellBack: true },
    });
    expect(fellBack.outcome).toBe("warning");
    expect(fellBack.lines.at(-1)?.value).toContain("MySQL 5.7");

    const noTls = summarizeReport({
      ...encrypted,
      tls: { encrypted: false, detail: null, fellBack: false },
    });
    expect(noTls.lines.at(-1)?.value).toBe("no: el servidor no tiene TLS habilitado");
  });

  it("omite el schema y la latencia que no se pudieron medir", () => {
    const summary = summarizeReport({ ...encrypted, defaultSchema: null, latencyMs: null });

    expect(summary.lines.map((line) => line.label)).toEqual(["Servidor", "Latencia", "SSL"]);
    expect(summary.lines[1].value).toBe("—");
  });
});

describe("summaryText", () => {
  it("arma el texto que se copia, una linea por dato", () => {
    const target = { host: "db", port: 3306, database: "core" };
    expect(summaryText(summarizeError({ kind: "other", detail: "boom" }, target))).toBe(
      "No se pudo conectar\nDestino: db:3306\nError: boom",
    );
    expect(summaryText(summarizeError({ kind: "unknownDatabase", detail: "Unknown database 'core'" }, target))).toBe(
      "La base «core» no existe\nDestino: db:3306\n" +
        "Qué revisar: Revisa el nombre; en algunos servidores importan las mayúsculas.\n" +
        "Detalle: Unknown database 'core'",
    );
  });
});
