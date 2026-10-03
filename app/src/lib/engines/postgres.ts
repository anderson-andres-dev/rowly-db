import { PostgreSQL } from "@codemirror/lang-sql";
import { byAnalyzerLocation, byQuotedName, byServerPosition, firstLocated } from "$lib/editor/diagnostics";
import { ansiString, COMMON_RESERVED, COMMON_STARTERS, identifierWith, QUOTING_RESERVED, quoteWith, foldedName } from "./common";
import type { EngineProfile, TlsModeName } from "./types";

// Los valores de sslmode de libpq.
const TLS: Record<TlsModeName, string> = {
  auto: "prefer",
  required: "require",
  verifyCa: "verify-ca",
  verifyIdentity: "verify-full",
  disabled: "disable",
};

const RESERVED: ReadonlySet<string> = new Set([
  ...COMMON_RESERVED,
  "array",
  "check",
  "column",
  "do",
  "except",
  "fetch",
  "grant",
  "limit",
  "offset",
  "order",
  "table",
  "union",
  "using",
  "where",
  "window",
]);

export const postgres: EngineProfile = {
  lexical: {
    identifierQuotes: ['"'],
    backslashEscapes: false,
    hashComments: false,
    dollarQuotes: true,
    escapeStringPrefix: true,
    nestedComments: true,
    dashCommentNeedsSpace: false,
    executableComments: [],
    // Solo con la extension pg_hint_plan: para el motor es un comentario.
    optimizerHints: false,
  },
  quoteIdentifier: (name) => quoteWith('"', '"', name),
  // Sin comillas se lee en minusculas: "Users" las necesita.
  nameMatches: foldedName,
  identifier: identifierWith(
    /^[a-z_][a-z0-9_$]*$/,
    new Set([
      ...QUOTING_RESERVED,
      "user",
      "analyse",
      "analyze",
      "array",
      "both",
      "cast",
      "collate",
      "current_date",
      "current_time",
      "current_user",
      "do",
      "except",
      "fetch",
      "leading",
      "offset",
      "only",
      "placing",
      "returning",
      "some",
      "symmetric",
      "trailing",
      "variadic",
      "window",
    ]),
    (name) => quoteWith('"', '"', name),
  ),
  // Con standard_conforming_strings (lo predeterminado), la barra invertida
  // es un caracter mas.
  quoteString: ansiString,
  editorDialect: PostgreSQL,
  formatterDialect: "postgresql",
  statementStarters: [
    ...COMMON_STARTERS,
    "begin",
    "commit",
    "rollback",
    "truncate",
    "table",
    "values",
    "copy",
    "vacuum",
    "analyze",
  ],
  reservedWords: RESERVED,
  errorHelp: {
    "42P01": "tableMissing",
    "42703": "columnMissing",
    "42601": "syntax",
    "42803": "groupBy",
    "23503": "foreignKey",
    "23505": "duplicate",
    "23502": "notNull",
    "22P02": "invalidValue",
    "22007": "invalidValue",
    "42883": "functionMissing",
    "42702": "ambiguous",
    "42501": "permission",
    "57014": "cancelled",
  },
  // Postgres da la posicion casi siempre; si no, el nombre va entre "".
  locateError: firstLocated(byServerPosition, byAnalyzerLocation, byQuotedName('"')),
  // Los de entrada; en un CALL tambien los OUT (se pasan como NULL, desde
  // PostgreSQL 14).
  passedInCall: (mode, kind) => mode !== "out" || kind === "procedure",
  connectionUrl: { scheme: "postgresql", tlsParameter: (mode) => `sslmode=${TLS[mode]}` },
};
