import type { SqlLexical } from "$lib/sqlStatements";

// Lo que llega al pegar desde Slack, Teams, Word o una pagina web trae
// caracteres que se ven como un espacio (o como nada) pero que el motor no
// acepta como tal: el error de sintaxis que dan no se encuentra a simple
// vista. En el codigo se pasan a su equivalente; dentro de cadenas,
// identificadores citados, comentarios y bloques $tag$ son datos del usuario
// y quedan tal cual. Que es cadena y que no lo dice el perfil del motor.

const SPACE = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/;
const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF]/;
const LINE_BREAK = /[\u2028\u2029\u0085]/;
const SUSPECT = /[\u00A0\u1680\u2000-\u200D\u202F\u205F\u3000\u2060\uFEFF\u2028\u2029\u0085]/;

const IDENTIFIER_CLOSE: Record<string, string> = { '"': '"', "`": "`", "[": "]" };
const DOLLAR_TAG = /\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/y;

function codeChar(char: string): string {
  if (SPACE.test(char)) return " ";
  if (INVISIBLE.test(char)) return "";
  if (LINE_BREAK.test(char)) return "\n";
  return char;
}

const isWordChar = (char: string | undefined) => !!char && /[A-Za-z0-9_$]/.test(char);

// Fin (exclusivo) de lo citado que empieza en `start` y cierra `close`; la
// comilla doblada ('it''s') no cierra, y la barra invertida escapa si el
// motor la usa.
function quotedEnd(text: string, start: number, close: string, backslash: boolean): number {
  for (let index = start + 1; index < text.length; index++) {
    const char = text[index];
    if (backslash && char === "\\") {
      index++;
    } else if (char === close) {
      if (text[index + 1] === close) index++;
      else return index + 1;
    }
  }
  return text.length;
}

export function normalizePastedSql(text: string, lexical: SqlLexical): string {
  if (!SUSPECT.test(text)) return text;
  let out = "";
  let index = 0;
  const keep = (end: number) => {
    out += text.slice(index, end);
    index = end;
  };

  while (index < text.length) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "'") {
      // E'...' (Postgres): la barra invertida escapa aunque en el resto no.
      const prefixed =
        lexical.escapeStringPrefix && /[eE]/.test(text[index - 1] ?? "") && !isWordChar(text[index - 2]);
      keep(quotedEnd(text, index, "'", lexical.backslashEscapes || prefixed));
    } else if (lexical.identifierQuotes.includes(char as '"' | "`" | "[")) {
      keep(quotedEnd(text, index, IDENTIFIER_CLOSE[char], lexical.backslashEscapes && char === '"'));
    } else if ((char === "-" && next === "-") || (char === "#" && lexical.hashComments)) {
      const end = text.indexOf("\n", index);
      keep(end === -1 ? text.length : end);
    } else if (char === "/" && next === "*") {
      const end = text.indexOf("*/", index + 2);
      keep(end === -1 ? text.length : end + 2);
    } else if (char === "$" && lexical.dollarQuotes && !isWordChar(text[index - 1])) {
      DOLLAR_TAG.lastIndex = index;
      const tag = DOLLAR_TAG.exec(text)?.[0];
      if (tag) {
        const end = text.indexOf(tag, index + tag.length);
        keep(end === -1 ? text.length : end + tag.length);
      } else {
        keep(index + 1);
      }
    } else {
      out += codeChar(char);
      index++;
    }
  }
  return out;
}
