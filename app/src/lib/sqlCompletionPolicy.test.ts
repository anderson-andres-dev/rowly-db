import { ENGINES } from "./engines";
import { describe, expect, it } from "vitest";
import { completionPolicy } from "./sqlCompletionPolicy";
import type { ClauseContext } from "./sqlContext";

function ctx(overrides: Partial<ClauseContext>): ClauseContext {
  return {
    position: "unknown",
    clause: "none",
    confidence: "confident",
    lexical: "code",
    activeWord: { from: 0, to: 0, text: "" },
    qualified: false,
    ...overrides,
  };
}

describe("completionPolicy - una fila por posicion", () => {
  it("statement-start: sin catalogo, solo keywords de arranque", () => {
    const policy = completionPolicy(ctx({ position: "statement-start" }), ENGINES.mysql);
    expect(policy.schemaMode).toBe("none");
    expect(policy.allowedKeywords?.has("select")).toBe(true);
    expect(policy.allowedKeywords?.has("where")).toBe(false);
  });

  it("statement-start en postgres incluye TABLE/VALUES, mysql no", () => {
    const pgPolicy = completionPolicy(ctx({ position: "statement-start" }), ENGINES.postgres);
    const mysqlPolicy = completionPolicy(ctx({ position: "statement-start" }), ENGINES.mysql);
    expect(pgPolicy.allowedKeywords?.has("table")).toBe(true);
    expect(mysqlPolicy.allowedKeywords?.has("table")).toBe(false);
  });

  it("expression: columnas si, tablas sueltas no", () => {
    const policy = completionPolicy(ctx({ position: "expression", clause: "where" }), ENGINES.mysql);
    expect(policy.schemaMode).toBe("expressions");
    expect(policy.allowedKeywords).toBeUndefined();
  });

  it("select-tail confidente: boostea FROM y no ofrece catalogo", () => {
    const policy = completionPolicy(ctx({ position: "select-tail", clause: "select" }), ENGINES.mysql);
    expect(policy.schemaMode).toBe("none");
    expect(policy.keywordBoost("FROM")).toBeGreaterThan(0);
    expect(policy.allowedKeywords?.has("where")).toBe(false);
  });

  it("relation-target: solo tablas, sin keywords", () => {
    const policy = completionPolicy(ctx({ position: "relation-target", clause: "from" }), ENGINES.mysql);
    expect(policy.schemaMode).toBe("relations");
    expect(policy.allowedKeywords?.size).toBe(0);
  });

  it("relation-tail: boostea WHERE y excluye keywords no relacionadas como WHEN/WHILE", () => {
    const policy = completionPolicy(ctx({ position: "relation-tail", clause: "from" }), ENGINES.mysql);
    expect(policy.schemaMode).toBe("none");
    expect(policy.keywordBoost("where")).toBeGreaterThan(policy.keywordBoost("join"));
    expect(policy.allowedKeywords?.has("where")).toBe(true);
    expect(policy.allowedKeywords?.has("when")).toBe(false);
    expect(policy.allowedKeywords?.has("while")).toBe(false);
    expect(policy.allowedKeywords?.has("whenever")).toBe(false);
  });

  it("relation-tail de un JOIN admite ON; de un FROM no", () => {
    const joinPolicy = completionPolicy(ctx({ position: "relation-tail", clause: "join" }), ENGINES.mysql);
    const fromPolicy = completionPolicy(ctx({ position: "relation-tail", clause: "from" }), ENGINES.mysql);
    expect(joinPolicy.allowedKeywords?.has("on")).toBe(true);
    expect(fromPolicy.allowedKeywords?.has("on")).toBe(false);
  });

  it("alias: nada de catalogo ni keywords", () => {
    const policy = completionPolicy(ctx({ position: "alias", clause: "from" }), ENGINES.mysql);
    expect(policy.schemaMode).toBe("none");
    expect(policy.allowedKeywords?.size).toBe(0);
  });

  it("keyword-continuation con pendingKeyword=by solo permite BY", () => {
    const policy = completionPolicy(ctx({ position: "keyword-continuation", clause: "group-by", pendingKeyword: "by" }), ENGINES.mysql);
    expect([...(policy.allowedKeywords ?? [])]).toEqual(["by"]);
  });

  it("keyword-continuation con pendingKeyword=join permite variantes de JOIN", () => {
    const policy = completionPolicy(ctx({ position: "keyword-continuation", clause: "join", pendingKeyword: "join" }), ENGINES.mysql);
    expect(policy.allowedKeywords?.has("join")).toBe(true);
    expect(policy.allowedKeywords?.has("inner")).toBe(true);
    expect(policy.allowedKeywords?.has("where")).toBe(false);
  });

  it("unknown: fallback sin restricciones (comportamiento actual)", () => {
    const policy = completionPolicy(ctx({ position: "unknown" }), ENGINES.mysql);
    expect(policy.schemaMode).toBe("fallback");
    expect(policy.allowedKeywords).toBeUndefined();
  });
});

describe("completionPolicy - allowFkJoin", () => {
  it("se permite en relation-target dentro de un JOIN confidente", () => {
    const policy = completionPolicy(ctx({ position: "relation-target", clause: "join", confidence: "confident" }), ENGINES.mysql);
    expect(policy.allowFkJoin).toBe(true);
  });

  it("no se permite en relation-target de un FROM (no es JOIN)", () => {
    const policy = completionPolicy(ctx({ position: "relation-target", clause: "from", confidence: "confident" }), ENGINES.mysql);
    expect(policy.allowFkJoin).toBe(false);
  });

  it("no se permite si la confianza es unknown", () => {
    const policy = completionPolicy(ctx({ position: "relation-target", clause: "join", confidence: "unknown" }), ENGINES.mysql);
    expect(policy.allowFkJoin).toBe(false);
  });

  it("se permite en unknown (preserva el comportamiento de hoy)", () => {
    const policy = completionPolicy(ctx({ position: "unknown" }), ENGINES.mysql);
    expect(policy.allowFkJoin).toBe(true);
  });
});
