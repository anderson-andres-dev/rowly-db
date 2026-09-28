import type { SqlProfile } from "$lib/engines";

type Quote = "'" | '"' | "`" | "]";

interface SqlScanResult {
  compact: string;
  hasComment: boolean;
}

const CLAUSES_WITH_INLINE_BODY = new Set([
  "DELETE FROM",
  "FROM",
  "GROUP BY",
  "HAVING",
  "INSERT INTO",
  "LIMIT",
  "OFFSET",
  "ORDER BY",
  "SET",
  "UPDATE",
  "VALUES",
  "WHERE",
]);

function indentation(line: string): number {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function isClause(line: string): boolean {
  return CLAUSES_WITH_INLINE_BODY.has(line.trim());
}

// sql-formatter prioriza una disposición muy vertical (`FROM` y la tabla en
// líneas distintas). Khipu conserva los bloques grandes, pero une la cabecera
// con su primer elemento para reducir altura sin crear líneas kilométricas.
function compactStructuredLayoutPass(formatted: string): string {
  const lines = formatted.trim().split("\n");
  const result: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const next = lines[index + 1];
    const nextAfter = lines[index + 2];
    const currentIndent = indentation(line);

    const singleSelectExpression =
      line.trim() === "SELECT" &&
      next !== undefined &&
      nextAfter !== undefined &&
      indentation(next) > currentIndent &&
      !next.trimEnd().endsWith(",") &&
      indentation(nextAfter) <= currentIndent &&
      isClause(nextAfter);

    const clauseBody =
      isClause(line) &&
      next !== undefined &&
      next.trim().length > 0 &&
      !next.trimStart().startsWith("--") &&
      !next.trimStart().startsWith("/*") &&
      indentation(next) > currentIndent;

    const parenthesizedSelect =
      line.trim() === "(" &&
      next !== undefined &&
      next.trimStart().startsWith("SELECT ") &&
      indentation(next) > currentIndent;

    if (singleSelectExpression || clauseBody || parenthesizedSelect) {
      const separator = parenthesizedSelect ? "" : " ";
      result.push(`${line.trimEnd()}${separator}${next.trimStart()}`);
      index += 1;
    } else {
      result.push(line.trimEnd());
    }
  }

  return result.join("\n");
}

function compactStructuredLayout(formatted: string): string {
  // La segunda pasada puede unir `(` con un `SELECT` de una sola expresión
  // que fue compactado durante la primera.
  return compactStructuredLayoutPass(compactStructuredLayoutPass(formatted));
}

// Compacta solo el espacio que esta fuera de literales e identificadores.
// Los comentarios fuerzan el formato multilínea para que `--` no cambie el
// significado de lo que le sigue.
function scanFormattedSql(sql: string): SqlScanResult {
  let compact = "";
  let quote: Quote | null = null;
  let dollarQuote: string | null = null;
  let pendingSpace = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (dollarQuote) {
      if (sql.startsWith(dollarQuote, index)) {
        compact += dollarQuote;
        index += dollarQuote.length - 1;
        dollarQuote = null;
      } else {
        compact += char;
      }
      continue;
    }

    if (quote) {
      compact += char;
      const closing = quote === "]" ? "]" : quote;
      if (char === closing) {
        if (next === closing) {
          compact += next;
          index += 1;
        } else if (sql[index - 1] !== "\\") {
          quote = null;
        }
      }
      continue;
    }

    if (char === "-" && next === "-" || char === "/" && next === "*") {
      return { compact: sql.trim(), hasComment: true };
    }

    if (char === "'" || char === '"' || char === "`") {
      if (pendingSpace && compact.length > 0) compact += " ";
      pendingSpace = false;
      quote = char;
      compact += char;
      continue;
    }

    if (char === "[") {
      if (pendingSpace && compact.length > 0) compact += " ";
      pendingSpace = false;
      quote = "]";
      compact += char;
      continue;
    }

    if (char === "$") {
      const match = sql.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) {
        if (pendingSpace && compact.length > 0) compact += " ";
        pendingSpace = false;
        dollarQuote = match[0];
        compact += dollarQuote;
        index += dollarQuote.length - 1;
        continue;
      }
    }

    if (/\s/.test(char)) {
      pendingSpace = compact.length > 0;
      continue;
    }

    if (pendingSpace && compact.length > 0) compact += " ";
    pendingSpace = false;
    compact += char;
  }

  return { compact: compact.trim(), hasComment: false };
}

export async function formatSqlBlock(
  sql: string,
  engine: SqlProfile,
  lineWidth: number,
): Promise<string> {
  if (!sql.trim()) return sql;

  try {
    const formatter = await import("sql-formatter");
    const formatted = formatter.formatDialect(sql, {
      dialect: formatter[engine.formatterDialect],
      keywordCase: "upper",
      dataTypeCase: "upper",
      functionCase: "upper",
      tabWidth: 2,
      useTabs: false,
      expressionWidth: lineWidth,
      linesBetweenQueries: 1,
      logicalOperatorNewline: "before",
    });
    const scanned = scanFormattedSql(formatted);
    return !scanned.hasComment && scanned.compact.length <= lineWidth
      ? scanned.compact
      : compactStructuredLayout(formatted);
  } catch {
    // Una consulta incompleta sigue siendo editable; no se destruye texto si
    // el parser del formateador aun no puede entenderla.
    return sql;
  }
}
