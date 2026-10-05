import { MySQL } from "@codemirror/lang-sql";
import { byAnalyzerLocation, byNearFragment, byQuotedName, byServerPosition, firstLocated } from "$lib/editor/diagnostics";
import mysqlLines from "../../../../support/mysql.json";
import { COMMON_RESERVED, COMMON_STARTERS, identifierWith, lineReservedWords, QUOTING_RESERVED, quoteWith, caseInsensitiveName } from "./common";
import type { EngineProfile, TlsModeName } from "./types";

const TLS: Record<TlsModeName, string> = {
  auto: "PREFERRED",
  required: "REQUIRED",
  verifyCa: "VERIFY_CA",
  verifyIdentity: "VERIFY_IDENTITY",
  disabled: "DISABLED",
};

const RESERVED: ReadonlySet<string> = new Set([
  ...COMMON_RESERVED,
  "bit",
  "day",
  "dec",
  "div",
  "get",
  "int",
  "max",
  "min",
  "mod",
  "now",
  "out",
  "row",
  "sql",
  "sum",
  "xor",
  "call",
  "char",
  "each",
  "exit",
  "goto",
  "kill",
  "last",
  "limit",
  "lock",
  "long",
  "loop",
  "next",
  "open",
  "read",
  "real",
  "show",
  "time",
  "type",
  "year",
  "zone",
  ...lineReservedWords(mysqlLines),
]);

// Lo que solo se escribe entre comillas: lo reservado en el motor y en
// cualquiera de sus lineas. MariaDB parte de esta misma lista.
export const MYSQL_QUOTING = [
  ...QUOTING_RESERVED,
  "key",
  "keys",
  "index",
  "database",
  "change",
  "range",
  "read",
  "write",
  "groups",
  "interval",
  "div",
  "mod",
  "xor",
  "usage",
  "condition",
  "lock",
  ...lineReservedWords(mysqlLines),
];
export const MYSQL_PLAIN = /^[A-Za-z_][A-Za-z0-9_$]*$/;

export const mysql: EngineProfile = {
  lexical: {
    identifierQuotes: ["`", '"'],
    backslashEscapes: true,
    hashComments: true,
    dollarQuotes: false,
    escapeStringPrefix: false,
    nestedComments: false,
    dashCommentNeedsSpace: true,
    executableComments: ["/*!"],
    optimizerHints: true,
  },
  quoteIdentifier: (name) => quoteWith("`", "`", name),
  // Las mayusculas dan igual: solo caracteres raros o reservadas.
  nameMatches: caseInsensitiveName,
  identifier: identifierWith(MYSQL_PLAIN, new Set(MYSQL_QUOTING), (name) => quoteWith("`", "`", name)),
  // Sin NO_BACKSLASH_ESCAPES (lo habitual), la barra invertida escapa.
  quoteString: (value) => `'${value.replace(/\\/g, "\\\\").replace(/'/g, "''")}'`,
  editorDialect: MySQL,
  formatterDialect: "mysql",
  statementStarters: [
    ...COMMON_STARTERS,
    "start",
    "commit",
    "rollback",
    "truncate",
    "replace",
    "describe",
    "use",
    "call",
  ],
  builtinFunctions: ["NOW", "CONCAT", "IFNULL", "IF", "DATE_FORMAT", "JSON_EXTRACT", "JSON_OBJECT", "JSON_ARRAY", "GROUP_CONCAT", "UUID", "CURDATE"],
  reservedWords: RESERVED,
  errorHelp: {
    "1146": "tableMissing",
    "1054": "columnMissing",
    "1064": "syntax",
    "1055": "groupBy",
    "1451": "foreignKey",
    "1452": "foreignKey",
    "1062": "duplicate",
    "1048": "notNull",
    "1364": "notNull",
    "1366": "invalidValue",
    "1292": "invalidValue",
    "1305": "functionMissing",
    "1052": "ambiguous",
    "1142": "permission",
    "1044": "permission",
    "1317": "cancelled",
  },
  locateError: firstLocated(byServerPosition, byAnalyzerLocation, byNearFragment, byQuotedName("'")),
  // Todos: los OUT de un procedimiento se pasan como variables (@total).
  passedInCall: () => true,
  connectionUrl: { scheme: "mysql", tlsParameter: (mode) => `ssl-mode=${TLS[mode]}` },
};
