import type { SqlProfile } from "$lib/engines";
import { refineLayout, upperOperatorWords } from "$lib/sqlFormatLayout";
import { splitStatements, type SqlLexical } from "$lib/sqlStatements";
import { DEFAULT_INDENT_SIZE, indentationUnit, type IndentSize, type IndentStyle } from "$lib/sqlIndentationConfig";

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

// Hasta donde los retoques de sqlFormatLayout.ts juntan lineas o alinean los
// AS: el ancho configurado, pero nunca menos que esto (con 60, una condicion
// normal entre parentesis ya no entraria en una linea).
const MIN_LAYOUT_WIDTH = 80;

function applyIndentation(text: string, style: IndentStyle, size: IndentSize, lexical: SqlLexical): string {
  if (style === "spaces" && size === DEFAULT_INDENT_SIZE) return text;
  const unit = indentationUnit(style, size);
  let quote: string | null = null;
  let blockComment = false;
  return text.split("\n").map((line) => {
    const protectedLine = quote !== null || blockComment;
    for (let index = 0; index < line.length; index++) {
      const char = line[index];
      const next = line[index + 1];
      if (quote) {
        if (line.startsWith(quote, index)) {
          if (quote.length === 1 && next === quote) index++;
          else {
            index += quote.length - 1;
            quote = null;
          }
        } else if (char === "\\" && quote === "'" && next) index++;
      } else if (blockComment) {
        if (char === "*" && next === "/") {
          blockComment = false;
          index++;
        }
      } else if ((char === "-" && next === "-") || (char === "#" && lexical.hashComments)) {
        break;
      } else if (char === "/" && next === "*") {
        blockComment = true;
        index++;
      } else if (char === "'" || char === '"' || char === "`" || char === "[") {
        quote = char === "[" ? "]" : char;
      } else if (char === "$" && lexical.dollarQuotes && !/[\w$]/.test(line[index - 1] ?? "")) {
        const tag = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.exec(line.slice(index))?.[0];
        if (tag) {
          quote = tag;
          index += tag.length - 1;
        }
      }
    }
    if (protectedLine) return line;
    return line.replace(/^ +/, (spaces) =>
      unit.repeat(Math.floor(spaces.length / DEFAULT_INDENT_SIZE)) +
      " ".repeat(spaces.length % DEFAULT_INDENT_SIZE),
    );
  }).join("\n");
}

export type FormatResult =
  | { ok: true; text: string }
  // El parser del formateador no entendio la consulta: donde se trabo, si lo
  // dijo (linea dentro del texto formateado, desde 1).
  | { ok: false; token?: string; line?: number };

// `alignAliases`: alineacion en columnas (Ajustes > Editor, sqlFormatLayout.ts).
export async function tryFormatSqlBlock(
  sql: string,
  engine: SqlProfile,
  lineWidth: number,
  alignAliases = true,
  indentStyle: IndentStyle = "spaces",
  indentSize: IndentSize = DEFAULT_INDENT_SIZE,
): Promise<FormatResult> {
  if (!sql.trim()) return { ok: true, text: sql };

  const formatter = await import("sql-formatter");
  let formatted: string;
  try {
    formatted = formatter.formatDialect(sql, {
      dialect: formatter[engine.formatterDialect],
      keywordCase: "upper",
      dataTypeCase: "upper",
      functionCase: "upper",
      tabWidth: DEFAULT_INDENT_SIZE,
      useTabs: false,
      expressionWidth: lineWidth,
      linesBetweenQueries: 1,
      logicalOperatorNewline: "before",
      // Los parametros con nombre (:nombre, sqlParameters.ts): sin esto el
      // parser no los entiende y la consulta queda sin formatear.
      paramTypes: { named: [":"] },
    });
  } catch (error) {
    // "Parse error at token: ORDER BY at line 45 column 1"
    const message = error instanceof Error ? error.message : String(error);
    const at = /at token: (.+?) at line (\d+)/.exec(message);
    return at ? { ok: false, token: at[1], line: Number(at[2]) } : { ok: false };
  }
  const scanned = scanFormattedSql(formatted);
  return {
    ok: true,
    text: applyIndentation(
      !scanned.hasComment && scanned.compact.length <= lineWidth
        ? upperOperatorWords(scanned.compact)
        : refineLayout(compactStructuredLayout(formatted), {
            width: Math.max(lineWidth, MIN_LAYOUT_WIDTH),
            alignAliases,
          }),
      indentStyle,
      indentSize,
      engine.lexical,
    ),
  };
}

export interface FormatFailure {
  // Linea (desde 1, dentro del texto pedido) donde se trabo el parser o,
  // si no lo dijo, donde empieza la consulta.
  line: number;
  token?: string;
}

export interface FormatTextResult {
  text: string;
  // Consultas formateadas y las que no se pudieron.
  formatted: number;
  failures: FormatFailure[];
}

function lineAt(text: string, offset: number): number {
  let line = 1;
  for (let index = text.indexOf("\n"); index !== -1 && index < offset; index = text.indexOf("\n", index + 1)) line += 1;
  return line;
}

// Varias consultas (una seleccion): cada una por separado. Las que el
// parser entiende se formatean, la que tiene un error queda tal cual (con
// una sola mala no se pierde el formato de las demas). Entre consultas, una
// linea en blanco; lo que habia entre ellas que no sea espacio (un
// comentario) se conserva.
export async function formatSqlText(
  sql: string,
  engine: SqlProfile,
  lineWidth: number,
  alignAliases = true,
  indentStyle: IndentStyle = "spaces",
  indentSize: IndentSize = DEFAULT_INDENT_SIZE,
): Promise<FormatTextResult> {
  const ranges = splitStatements(sql, engine.lexical);
  if (ranges.length <= 1) {
    const result = await tryFormatSqlBlock(sql, engine, lineWidth, alignAliases, indentStyle, indentSize);
    return result.ok
      ? { text: result.text, formatted: 1, failures: [] }
      : { text: sql, formatted: 0, failures: [{ line: result.line ?? 1, token: result.token }] };
  }
  let text = "";
  let last = 0;
  let formatted = 0;
  const failures: FormatFailure[] = [];
  for (const range of ranges) {
    const gap = sql.slice(last, range.from);
    text += last === 0 || gap.trim() !== "" ? gap : "\n\n";
    const statement = sql.slice(range.from, range.to);
    const result = await tryFormatSqlBlock(statement, engine, lineWidth, alignAliases, indentStyle, indentSize);
    if (result.ok) {
      text += result.text;
      formatted += 1;
    } else {
      text += statement;
      failures.push({ line: lineAt(sql, range.from) + (result.line ?? 1) - 1, token: result.token });
    }
    last = range.to;
  }
  // Si ninguna se pudo formatear, ni el espacio entre ellas cambia.
  return { text: formatted === 0 ? sql : text + sql.slice(last), formatted, failures };
}

// Una consulta incompleta sigue siendo editable: si el parser del
// formateador aun no puede entenderla, el texto queda tal cual.
export async function formatSqlBlock(
  sql: string,
  engine: SqlProfile,
  lineWidth: number,
  alignAliases = true,
  indentStyle: IndentStyle = "spaces",
  indentSize: IndentSize = DEFAULT_INDENT_SIZE,
): Promise<string> {
  const result = await tryFormatSqlBlock(sql, engine, lineWidth, alignAliases, indentStyle, indentSize);
  return result.ok ? result.text : sql;
}
