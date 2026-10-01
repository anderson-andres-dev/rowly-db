import type { Completion, CompletionResult } from "@codemirror/autocomplete";
import type { SchemaObjects } from "$lib/types";
import type { SqlProfile } from "$lib/engines";
import { ENGINES } from "$lib/engines";
import { boostFor, recordUsage } from "$lib/usageStats";
import { sqlTokens } from "$lib/sqlContext";

export type CatalogPosition = "procedure" | "function" | "relation" | "expression" | "routine" | "unknown";

const COMMON_FUNCTIONS = ["COUNT", "SUM", "AVG", "MIN", "MAX", "COALESCE", "NULLIF", "LOWER", "UPPER", "LENGTH", "SUBSTRING", "TRIM", "ABS", "ROUND"];
const MYSQL_FUNCTIONS = ["NOW", "CONCAT", "IFNULL", "IF", "DATE_FORMAT", "JSON_EXTRACT", "JSON_OBJECT", "JSON_ARRAY", "GROUP_CONCAT", "UUID", "CURDATE"];
const POSTGRES_FUNCTIONS = ["NOW", "CONCAT", "GENERATE_SERIES", "STRING_AGG", "ARRAY_AGG", "TO_CHAR", "DATE_TRUNC", "JSONB_BUILD_OBJECT", "JSONB_AGG", "JSONB_ARRAY_ELEMENTS", "JSONB_EXTRACT_PATH", "PG_TYPEOF"];

interface Entry {
  schema: string;
  name: string;
  kind: "procedure" | "function" | "sequence";
  detail?: string;
  noArgs?: boolean;
}

export function prefixStartForNames(names: Iterable<string>): (text: string, end: number) => number {
  const prefixes = new Set<string>();
  let longest = 0;
  for (const name of names) {
    const firstSpecial = name.search(/[-\s]/);
    if (firstSpecial < 0) continue;
    for (let length = firstSpecial + 1; length <= name.length; length++) {
      prefixes.add(name.slice(0, length).toLowerCase());
    }
    longest = Math.max(longest, name.length);
  }
  return (text, end) => {
    let start = end;
    for (let length = 1; length <= longest && length <= end; length++) {
      const candidate = end - length;
      if (candidate >= start || (candidate > 0 && /[\w"`-]/.test(text[candidate - 1]))) continue;
      if (prefixes.has(text.slice(candidate, end).toLowerCase())) start = candidate;
    }
    return start;
  };
}

function insert(entry: Entry, engine: SqlProfile): Exclude<NonNullable<Completion["apply"]>, string> {
  return (view, _completion, from, to) => {
    const key = `${entry.kind}:${entry.schema}.${entry.name}`;
    recordUsage(key);
    const name = engine.identifier(entry.name);
    const suffix = entry.kind === "function" ? "()" : "";
    const text = name + suffix;
    view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length - (entry.kind === "function" && !entry.noArgs ? 1 : 0) } });
  };
}

function option(entry: Entry, engine: SqlProfile, defaultSchema?: string, qualified = false): Completion {
  const prefix = !qualified && entry.schema !== defaultSchema ? `${entry.schema}.` : "";
  const key = `${entry.kind}:${entry.schema}.${entry.name}`;
  return {
    label: prefix + entry.name,
    type: entry.kind,
    detail: entry.detail ?? entry.schema,
    boost: boostFor(key) + (entry.schema === defaultSchema ? 3 : 0),
    apply: (view, completion, from, to) => {
      if (prefix) {
        const name = `${engine.identifier(entry.schema)}.${engine.identifier(entry.name)}`;
        const suffix = entry.kind === "function" ? "()" : "";
        recordUsage(key);
        view.dispatch({ changes: { from, to, insert: name + suffix }, selection: { anchor: from + name.length + suffix.length - (entry.kind === "function" && !entry.noArgs ? 1 : 0) } });
      } else insert(entry, engine)(view, completion, from, to);
    },
  };
}

export function buildCatalogCompletions(schemas: readonly SchemaObjects[], engine: SqlProfile, defaultSchema?: string) {
  const entries: Entry[] = [];
  const schemaNames = new Set<string>();
  for (const objects of schemas) {
    schemaNames.add(objects.schema);
    for (const routine of objects.routines) entries.push({
      schema: objects.schema, name: routine.name, kind: routine.kind,
      detail: `(${routine.arguments})${routine.returnType ? `: ${routine.returnType}` : ""}`,
      noArgs: routine.parameters ? routine.parameters.filter((p) => engine.passedInCall(p.mode, routine.kind)).length === 0 : routine.arguments.trim() === "",
    });
    if (engine === ENGINES.postgres) {
      for (const sequence of objects.sequences) entries.push({ schema: objects.schema, name: sequence.name, kind: "sequence", detail: sequence.dataType ?? undefined });
    }
  }
  const functions = engine === ENGINES.postgres ? POSTGRES_FUNCTIONS : engine === ENGINES.mysql || engine === ENGINES.mariadb ? MYSQL_FUNCTIONS : [];
  const builtin = [...COMMON_FUNCTIONS, ...functions].map((name): Completion => ({
    label: name,
    type: "function",
    boost: -2,
    apply: (view, _completion, from, to) => {
      const noArgs = name === "NOW" || name === "CURDATE" || name === "UUID";
      const text = `${name}()`;
      view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length - (noArgs ? 0 : 1) } });
    },
  }));

  const prepared = entries.map((entry) => ({
    entry,
    plain: option(entry, engine, defaultSchema),
    qualified: option(entry, engine, defaultSchema, true),
  }));
  const prefixStart = prefixStartForNames(entries.map((entry) => entry.name));
  return {
    hasSchema: (name: string, quoted = false) => [...schemaNames].some((schema) => engine.nameMatches(name, quoted, schema)),
    prefixStart,
    complete(position: CatalogPosition, wordFrom: number, schema?: string, schemaQuoted = false): CompletionResult | null {
      if (position === "relation") return null;
      const visible = prepared.filter(({ entry }) => {
        if (schema && !engine.nameMatches(schema, schemaQuoted, entry.schema)) return false;
        if (position === "procedure") return entry.kind === "procedure";
        if (position === "function" || position === "expression") return entry.kind === "function";
        if (position === "routine") return entry.kind === "procedure" || entry.kind === "function";
        return true;
      });
      const options = visible.map((candidate) => schema ? candidate.qualified : candidate.plain);
      if (!schema && (position === "expression" || position === "unknown")) options.push(...builtin);
      return options.length ? { from: wordFrom, options } : null;
    },
  };
}

export function catalogPosition(text: string, wordFrom: number, engine: SqlProfile, classified: string): { position: CatalogPosition; schema?: string; schemaQuoted?: boolean } {
  const tokens = sqlTokens(text, engine.lexical, wordFrom);
  const last = tokens.at(-1);
  const prefix = last?.kind === "dot" ? tokens.at(-2) : undefined;
  const schema = prefix && (prefix.kind === "word" || prefix.kind === "quoted") ? (prefix.kind === "quoted" ? prefix.text : prefix.raw) : undefined;
  const schemaQuoted = prefix?.kind === "quoted";
  const before = sqlTokens(text, engine.lexical, prefix ? prefix.from : wordFrom);
  const words = before.map((token) => token.text);
  const ends = (...suffix: string[]) => suffix.every((part, index) => words[words.length - suffix.length + index] === part);
  if (ends("call")) return { position: "procedure", schema, schemaQuoted };
  const routineKind = ends("procedure") || ends("procedure", "if", "exists") ? "procedure"
    : ends("function") || ends("function", "if", "exists") ? "function" : undefined;
  if (routineKind && (words.includes("drop") || words.includes("alter") || words.includes("create") || words.includes("grant"))) {
    return { position: routineKind, schema, schemaQuoted };
  }
  if (ends("grant", "execute", "on") || ends("execute", "on")) return { position: "routine", schema, schemaQuoted };
  if (ends("set") || ends("values") || ends("(") || ends("=") || classified === "expression") return { position: "expression", schema, schemaQuoted };
  const existsAfterObject = ["table", "view", "index", "sequence", "schema", "database"].some((value) => ends(value, "if", "exists") || ends(value, "if", "not", "exists"));
  if (["from", "join", "into", "update", "table"].some((value) => ends(value)) || existsAfterObject || classified === "relation-target") return { position: "relation", schema, schemaQuoted };
  return { position: "unknown", schema, schemaQuoted };
}
