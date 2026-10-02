import { StandardSQL } from "@codemirror/lang-sql";
import { byAnalyzerLocation, byServerPosition, firstLocated } from "$lib/sqlDiagnostics";
import { ansiString, COMMON_RESERVED, COMMON_STARTERS, identifierWith, QUOTING_RESERVED, quoteWith, caseInsensitiveName } from "./common";
import type { SqlProfile } from "./types";

// El SQL estandar: lo que usa el editor sin conexion (no hay motor todavia).
// Es explicito a proposito: nada cae en silencio al SQL de otro motor.
const RESERVED: ReadonlySet<string> = new Set(COMMON_RESERVED);

export const standardSql: SqlProfile = {
  lexical: {
    identifierQuotes: ['"'],
    backslashEscapes: false,
    hashComments: false,
    dollarQuotes: false,
    escapeStringPrefix: false,
    nestedComments: false,
    dashCommentNeedsSpace: false,
    executableComments: [],
    optimizerHints: false,
  },
  quoteIdentifier: (name) => quoteWith('"', '"', name),
  nameMatches: caseInsensitiveName,
  identifier: identifierWith(/^[A-Za-z_][A-Za-z0-9_]*$/, new Set(QUOTING_RESERVED), (name) =>
    quoteWith('"', '"', name),
  ),
  quoteString: ansiString,
  editorDialect: StandardSQL,
  formatterDialect: "sql",
  statementStarters: COMMON_STARTERS,
  reservedWords: RESERVED,
  errorHelp: {},
  locateError: firstLocated(byServerPosition, byAnalyzerLocation),
  passedInCall: (mode) => mode !== "out",
};
