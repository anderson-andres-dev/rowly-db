// Division del texto del editor en sentencias y eleccion de la que "esta
// bajo el cursor" para ejecutar. No depende del arbol sintactico de
// CodeMirror (se parsea por partes y en los huecos entre sentencias no
// devuelve ninguna); nunca cae al documento entero.
//
// Se corta en cada ";" que no este dentro de una rutina compuesta, comillas
// ('...', "...", `...`), comentarios (-- ..., /* ... */) ni bloques $tag$
// de PostgreSQL. DELIMITER cambia el terminador de MySQL y MariaDB; su linea
// y el terminador elegido quedan fuera del SQL. Tambien se corta en una
// linea en blanco, como en DataGrip o DBeaver,
// salvo dentro de parentesis, cuando la linea anterior termina en algo que
// pide seguir (una coma, un parentesis que abre, un operador), cuando la
// siguiente empieza con algo que no puede abrir una consulta (FROM, WHERE,
// JOIN, ORDER BY, UNION, AND, un ")"...), tras el ")" de una CTE, o en un
// INSERT ... VALUES / UPDATE ... SET. Los comentarios no cuentan para
// decidirlo. Un tramo que solo tiene espacios o comentarios no es una
// sentencia. Las pruebas de todo esto estan en sqlBlankLines.test.ts.
//
// En el editor no se usa sobre el texto entero: sqlStatementIndex.ts lleva
// las sentencias del documento al dia por partes, con este mismo escaner.

export interface StatementRange {
  from: number;
  to: number;
}

export interface ScannedStatement extends StatementRange {
  // Termino en ";": justo despues el escaner esta fuera de todo (comillas,
  // comentarios), asi que se puede volver a escanear desde ahi sin mirar
  // atras (sqlStatementIndex.ts). Una sentencia cortada por una linea en
  // blanco no lo es: si esa linea se borra, se une con la siguiente, y eso
  // solo se ve escaneando desde antes.
  terminated: boolean;
}

// Como se escribe el SQL de un motor (su perfil en lib/engines). Vive aca,
// en el modulo mas bajo, porque lo usan el escaner y el lexer del contexto.
export interface SqlLexical {
  // Comillas de identificadores que acepta ("nombre", `nombre`, [nombre]).
  identifierQuotes: readonly ('"' | "`" | "[")[];
  // En '...', la barra invertida escapa (MySQL) o es un caracter mas
  // (Postgres, con standard_conforming_strings).
  backslashEscapes: boolean;
  // "#" abre un comentario de linea (MySQL).
  hashComments: boolean;
  // Bloques $tag$ ... $tag$ (Postgres).
  dollarQuotes: boolean;
  // E'...': un texto donde la barra invertida escapa aunque en el resto no
  // (Postgres).
  escapeStringPrefix: boolean;
}

// El SQL estandar: sin conexion no hay motor (engines/standard.ts).
export const STANDARD_LEXICAL: SqlLexical = {
  identifierQuotes: ['"'],
  backslashEscapes: false,
  hashComments: false,
  dollarQuotes: false,
  escapeStringPrefix: false,
};

// Donde quedo el escaner al cortar un trozo: el documento se escanea por
// partes (sqlStatementIndex.ts) y cada una sigue donde la anterior quedo.
export interface ScanState {
  mode: number;
  // La comilla que cierra lo abierto (codigo de caracter) o el $tag$ abierto.
  quote: number;
  tag: string;
  // El texto abierto es un E'...' (la barra invertida escapa).
  escaping: boolean;
  // Inicio de la sentencia en curso (absoluto); -1 sin codigo todavia.
  codeStart: number;
  // Fin del ultimo caracter que no es espacio desde el ultimo ";" (absoluto):
  // el fin de una sentencia sin ";" final.
  lastNonSpace: number;
  // Parentesis abiertos en la sentencia en curso: una linea en blanco
  // adentro no la corta.
  depth: number;
  // Para decidir si una linea en blanco corta (todo sin contar comentarios):
  // el ultimo caracter de codigo de la sentencia en curso (-1 sin codigo),
  // la palabra en que termina, tal cual ("" si no termina en palabra), y la
  // primera palabra de la sentencia, en mayusculas.
  tail: number;
  tailWord: string;
  lead: string;
  // En un WITH: ya empezo la consulta principal (despues de las CTE).
  mainStarted: boolean;
  // El trozo anterior termino en medio de una palabra: la que empieza este
  // trozo la continua (a tailWord y, si es la primera, a lead).
  wordOpen: boolean;
  leadOpen: boolean;
  // Terminador del cliente y palabra de SQL que puede cruzar un trozo.
  delimiter: string;
  sqlWord: string;
  // Cabecera CREATE y bloques de su cuerpo.
  createHead: boolean;
  objectKind: string;
  blockDepth: number;
  caseDepth: number;
  pendingEnd: boolean;
  // Los comentarios /*!...*/ llevan SQL ejecutable en MySQL.
  versionedComment: boolean;
  // Cuerpo de funcion SQL de Postgres, con o sin LANGUAGE antes de AS.
  bodyComplete: boolean;
  languagePending: boolean;
  languageValueSeen: boolean;
  // Una directiva DELIMITER puede cruzar el limite de un trozo.
  directiveText: string;
  awaitingBodyQuote: boolean;
  bodyQuote: boolean;
  commentDepth: number;
  recovery: { from: number; previousTo: number }[];
  // Puntos donde cortar un $$...$$ que no llega a cerrarse (ver DOLLAR_QUOTED).
  dollarRecovery: { from: number; previousTo: number }[];
}

const CODE = 0;
const LINE_COMMENT = 1;
const BLOCK_COMMENT = 2;
const QUOTED = 3;
const DOLLAR_QUOTED = 4;
const DIRECTIVE = 5;

const SEMICOLON = 59;
const DASH = 45;
const SLASH = 47;
const STAR = 42;
const SINGLE_QUOTE = 39;
const BACKSLASH = 92;
const DOLLAR = 36;
const OPEN_PAREN = 40;
const CLOSE_PAREN = 41;
const COMMA = 44;

// Cuanto puede mirar el escaner mas alla del corte de un trozo: "--", "/*",
// "''" y los $tag$ se leen enteros aunque crucen el corte.
export const SCAN_OVERLAP = 64;

const HASH = 35;
const CLOSE_BRACKET = 93;

const DOLLAR_TAG = /\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/y;


// Lo que, al final de una linea, dice que la sentencia sigue abajo aunque
// haya una linea en blanco en medio.
// El "*" no siempre: tras SELECT es "todas las columnas" (SELECT *); tras
// un valor es una multiplicacion (MULTIPLY, ver el tramo en scanChunk).
const CONTINUES = new Set([COMMA, OPEN_PAREN, 43, DASH, SLASH, 61, 60, 62, 124, 38, 37]);
const MULTIPLY = -2;
const ALL_COLUMNS_AFTER = new Set(["SELECT", "DISTINCT", "ALL"]);

// Lo que, al principio de la linea que sigue a una linea en blanco, dice
// que es la misma sentencia: palabras que no pueden empezar una consulta.
// SET y VALUES si pueden (SET @x = 1; VALUES (1)): solo siguen a un UPDATE
// o a un INSERT (FOLLOWS_LEAD).
const CONTINUE_WORDS = new Set([
  "FROM", "WHERE", "JOIN", "INNER", "LEFT", "RIGHT", "FULL", "CROSS", "NATURAL", "OUTER", "STRAIGHT_JOIN",
  "ON", "USING", "GROUP", "ORDER", "BY", "HAVING", "LIMIT", "OFFSET", "FETCH", "UNION", "INTERSECT",
  "EXCEPT", "MINUS", "AND", "OR", "RETURNING", "WINDOW", "QUALIFY", "INTO", "AS", "FOR", "LATERAL",
  "WHEN", "THEN", "ELSE", "END",
]);

// Segun la primera palabra de la sentencia, que otras la siguen tras una
// linea en blanco, mientras no haya empezado su parte principal
// (mainStarted): "INSERT INTO t (a)", linea en blanco, "VALUES (1)" es una
// sola; "INSERT INTO t VALUES (1)", linea en blanco, "SELECT 1" son dos.
// (INSERT ... SET es de MySQL.)
const FOLLOWS_LEAD = new Map<string, Set<string>>([
  ["INSERT", new Set(["VALUES", "VALUE", "SELECT", "WITH", "SET"])],
  ["REPLACE", new Set(["VALUES", "VALUE", "SELECT", "WITH", "SET"])],
  ["UPDATE", new Set(["SET"])],
]);

// Y las que la siguen siempre: el "DO UPDATE" / "DO NOTHING" de un
// INSERT ... ON CONFLICT (PostgreSQL). DO suelto si empieza una sentencia
// (DO $$ ... $$), por eso solo tras un INSERT.
const ALWAYS_FOLLOWS_LEAD = new Map<string, Set<string>>([["INSERT", new Set(["DO"])]]);

// Lo que, a profundidad 0, empieza la parte principal de la sentencia: la
// consulta despues de las CTE de un WITH, los valores de un INSERT, el SET
// de un UPDATE.
const MAIN_PART = new Map<string, RegExp>([
  ["WITH", /\b(SELECT|INSERT|UPDATE|DELETE|MERGE|VALUES|TABLE)\b/i],
  ["INSERT", /\b(VALUES?|SELECT|SET)\b/i],
  ["REPLACE", /\b(VALUES?|SELECT|SET)\b/i],
  ["UPDATE", /\bSET\b/i],
]);

const WORD = /[A-Za-z0-9_]+/y;

// Palabras con las que una linea no puede terminar la sentencia (piden algo
// despues): "SELECT 1 UNION ALL", linea en blanco, "SELECT 2" es una sola.
const INCOMPLETE_WORDS = new Set([
  "SELECT", "DISTINCT", "ALL", "FROM", "WHERE", "JOIN", "INNER", "LEFT", "RIGHT", "FULL", "CROSS", "OUTER",
  "NATURAL", "ON", "USING", "AND", "OR", "NOT", "BY", "GROUP", "ORDER", "HAVING", "UNION", "INTERSECT",
  "EXCEPT", "MINUS", "SET", "VALUES", "INTO", "AS", "IN", "LIKE", "BETWEEN", "IS", "CASE", "WHEN", "THEN",
  "ELSE", "WITH", "UPDATE", "INSERT", "DELETE", "LIMIT", "OFFSET",
]);

function isWordChar(code: number): boolean {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 48 && code <= 57) || code === 95;
}

function opensDashComment(text: string, at: number, mysql: boolean): boolean {
  if (text.charCodeAt(at + 1) !== DASH) return false;
  if (!mysql) return true;
  const after = text.charCodeAt(at + 2);
  return after <= 32 || after === 127;
}

// Las reglas de un motor, ya compiladas: lo que puede abrir o cerrar algo en
// codigo (una regex para saltar rapido lo demas) y, por cada comilla, la
// que la cierra y como buscarla.
interface ScanRules {
  special: RegExp;
  closeOf: Map<number, number>;
  closer: Map<number, RegExp>;
  hash: boolean;
  dollar: boolean;
  escapePrefix: boolean;
}

// Dentro de un E'...': la comilla o la barra invertida.
const ESCAPED_SINGLE = /['\\]/g;

// "E" o "e" pegada a la comilla, y que no sea el final de otra palabra.
function opensEscapeString(text: string, quoteAt: number): boolean {
  const prefix = text.charCodeAt(quoteAt - 1);
  if (prefix !== 69 && prefix !== 101) return false;
  const before = text.charCodeAt(quoteAt - 2);
  return !(
    (before >= 48 && before <= 57) ||
    (before >= 65 && before <= 90) ||
    (before >= 97 && before <= 122) ||
    before === 95 ||
    before === DOLLAR
  );
}

const compiled = new WeakMap<SqlLexical, ScanRules>();

function escapeClass(char: string): string {
  return char.replace(/[\\\]\[^-]/g, "\\$&");
}

function rulesFor(lexical: SqlLexical): ScanRules {
  const cached = compiled.get(lexical);
  if (cached) return cached;
  const closeOf = new Map<number, number>([[SINGLE_QUOTE, SINGLE_QUOTE]]);
  for (const quote of lexical.identifierQuotes) {
    closeOf.set(quote.charCodeAt(0), quote === "[" ? CLOSE_BRACKET : quote.charCodeAt(0));
  }
  const closer = new Map<number, RegExp>();
  for (const close of new Set(closeOf.values())) {
    const char = escapeClass(String.fromCharCode(close));
    // En '...', tambien la barra invertida si el motor la usa de escape.
    const escape = close === SINGLE_QUOTE && lexical.backslashEscapes ? "\\\\" : "";
    closer.set(close, new RegExp(`[${char}${escape}]`, "g"));
  }
  const opens = [...closeOf.keys()].map((code) => escapeClass(String.fromCharCode(code))).join("");
  const special = new RegExp(`[;()\\-/${opens}${lexical.dollarQuotes ? "$" : ""}${lexical.hashComments ? "#" : ""}]`, "g");
  const rules = {
    special,
    closeOf,
    closer,
    hash: lexical.hashComments,
    dollar: lexical.dollarQuotes,
    escapePrefix: lexical.escapeStringPrefix,
  };
  compiled.set(lexical, rules);
  return rules;
}

// Lo mismo que /\s/ (espacios de Unicode incluidos), sin regex por caracter.
function isSpace(code: number): boolean {
  if (code <= 32) return code === 32 || (code >= 9 && code <= 13);
  if (code < 160) return false;
  return (
    code === 160 ||
    code === 0x1680 ||
    (code >= 0x2000 && code <= 0x200a) ||
    code === 0x2028 ||
    code === 0x2029 ||
    code === 0x202f ||
    code === 0x205f ||
    code === 0x3000 ||
    code === 0xfeff
  );
}

export function initialScanState(): ScanState {
  return {
    mode: CODE,
    quote: 0,
    tag: "",
    escaping: false,
    codeStart: -1,
    lastNonSpace: -1,
    depth: 0,
    tail: -1,
    tailWord: "",
    lead: "",
    mainStarted: false,
    wordOpen: false,
    leadOpen: false,
    delimiter: ";",
    sqlWord: "",
    createHead: false,
    objectKind: "",
    blockDepth: 0,
    caseDepth: 0,
    pendingEnd: false,
    versionedComment: false,
    bodyComplete: false,
    languagePending: false,
    languageValueSeen: false,
    directiveText: "",
    awaitingBodyQuote: false,
    bodyQuote: false,
    commentDepth: 0,
    recovery: [],
    dollarRecovery: [],
  };
}

// Si lo que empieza en text[from] (despues de una linea en blanco, saltando
// espacios y comentarios) sigue la sentencia que empieza con `lead`. null:
// el trozo termina antes de poder saberlo (hay que verlo con el siguiente).
function nextLineContinues(
  text: string,
  from: number,
  final: boolean,
  hash: boolean,
  follows: ReadonlySet<string> | undefined,
  alwaysFollows: ReadonlySet<string> | undefined,
): boolean | null {
  const unknown = final ? false : null;
  let at = from;
  for (;;) {
    while (at < text.length && isSpace(text.charCodeAt(at))) at += 1;
    if (at >= text.length) return unknown;
    const code = text.charCodeAt(at);
    const next = text.charCodeAt(at + 1);
    if ((code === DASH || code === SLASH) && at + 1 >= text.length) return unknown;
    if ((code === DASH && opensDashComment(text, at, hash)) || (code === HASH && hash)) {
      const end = text.indexOf("\n", at);
      if (end === -1) return unknown;
      at = end + 1;
      continue;
    }
    if (code === SLASH && next === STAR) {
      const end = text.indexOf("*/", at + 2);
      if (end === -1) return unknown;
      at = end + 2;
      continue;
    }
    break;
  }
  const code = text.charCodeAt(at);
  if (code === CLOSE_PAREN || code === COMMA) return true;
  WORD.lastIndex = at;
  const word = WORD.exec(text)?.[0];
  if (!word) return false;
  if (at + word.length >= text.length && !final) return null;
  const upper = word.toUpperCase();
  return CONTINUE_WORDS.has(upper) || (follows?.has(upper) ?? false) || (alwaysFollows?.has(upper) ?? false);
}

// El salto de linea que abre una linea en blanco (con espacios o no, y con
// \r\n) dentro de text[from, to), o -1. El salto tiene que estar en ese
// tramo; el que la cierra puede estar despues (en el margen que trae cada
// trozo mas alla de su limite): si no, una linea en blanco partida entre dos
// trozos no se veria.
// Una sentencia de nivel superior que empieza tras lineas en blanco: lo que
// cierra una rutina o un cuerpo $$ que se quedo abierto mientras se escribe.
const RESTART_KEYWORDS = "SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|WITH|CALL|SET|USE|SHOW|EXPLAIN|TRUNCATE|GRANT";
const BLANK_LINES = "(?:[ \\t]*\\r?\\n)+";

function blankLineIn(text: string, from: number, to: number): number {
  for (let newline = text.indexOf("\n", from); newline !== -1 && newline < to; newline = text.indexOf("\n", newline + 1)) {
    let next = newline + 1;
    while (next < text.length) {
      const code = text.charCodeAt(next);
      if (code === 10) return newline;
      if (code !== 32 && (code < 9 || code > 13)) break;
      next += 1;
    }
  }
  return -1;
}

// Ultimo caracter que no es espacio en text[from, to), absoluto; o `fallback`.
function trimmedEnd(text: string, from: number, to: number, base: number, fallback: number): number {
  let end = to;
  while (end > from && isSpace(text.charCodeAt(end - 1))) end -= 1;
  return end > from ? base + end : fallback;
}

// Escanea `text` (que empieza en `base` del documento) desde `state` hasta
// `limit`; un token empezado antes del limite se lee hasta su fin si cabe
// en `text`. Agrega a `out` las sentencias completas y devuelve donde seguir
// (relativo a `text`). Con `final`, `text` llega al fin del documento y la
// sentencia en curso se cierra ahi.
export function scanChunk(
  text: string,
  base: number,
  limit: number,
  final: boolean,
  state: ScanState,
  out: ScannedStatement[],
  lexical: SqlLexical,
  // Donde empezar dentro de `text`: lo anterior es contexto (la "E" de un
  // E'...' que quedo al final del trozo previo).
  start = 0,
): number {
  const rules = rulesFor(lexical);
  const SPECIAL = rules.special;
  const length = text.length;
  // En variables locales: leer y escribir `state` en cada caracter es lo
  // que mas cuesta en un documento de 30 MB.
  let { mode, codeStart, lastNonSpace, depth, tail, tailWord, lead, mainStarted, wordOpen, leadOpen,
    delimiter, sqlWord, createHead, objectKind, blockDepth, caseDepth, pendingEnd, versionedComment,
    bodyComplete, languagePending, languageValueSeen, directiveText, awaitingBodyQuote, bodyQuote,
    commentDepth } = state;
  let index = start;

  const finishEnd = () => {
    if (!pendingEnd) return;
    if (caseDepth > 0) caseDepth -= 1;
    else {
      blockDepth = Math.max(0, blockDepth - 1);
      if (blockDepth === 0) bodyComplete = true;
    }
    pendingEnd = false;
  };
  const word = (value: string) => {
    const upper = value.toUpperCase();
    if (languagePending) {
      languageValueSeen = true;
      languagePending = false;
    }
    if (objectKind && upper === "LANGUAGE") languagePending = true;
    if (objectKind && rules.dollar && upper === "AS") awaitingBodyQuote = true;
    if (pendingEnd) {
      if (upper === "CASE") {
        caseDepth = Math.max(0, caseDepth - 1);
        pendingEnd = false;
        return;
      }
      if (["IF", "WHILE", "LOOP", "REPEAT"].includes(upper)) {
        pendingEnd = false;
        return;
      }
      finishEnd();
    }
    if (upper === "CREATE" && codeStart >= 0 && !objectKind && (lead === "CREATE" || versionedComment)) createHead = true;
    else if (createHead && !objectKind) {
      if (["PROCEDURE", "FUNCTION", "TRIGGER", "EVENT", "RULE"].includes(upper)) objectKind = upper;
      else if (["TABLE", "VIEW", "INDEX", "DATABASE", "SCHEMA", "TYPE", "MATERIALIZED"].includes(upper)) createHead = false;
    }
    if (objectKind && upper === "BEGIN") blockDepth += 1;
    else if (objectKind && upper === "CASE") caseDepth += 1;
    else if (objectKind && upper === "END") pendingEnd = true;
  };
  const feed = (from: number, to: number) => {
    for (let at = from; at < to; at += 1) {
      const code = text.charCodeAt(at);
      if (isWordChar(code)) sqlWord += text[at];
      else if (sqlWord) {
        word(sqlWord);
        sqlWord = "";
      }
    }
  };
  const flushWord = () => {
    if (sqlWord) word(sqlWord);
    sqlWord = "";
  };
  const resetStatement = () => {
    state.recovery = [];
    state.dollarRecovery = [];
    codeStart = -1;
    lastNonSpace = -1;
    depth = 0;
    tail = -1;
    tailWord = "";
    lead = "";
    wordOpen = false;
    leadOpen = false;
    createHead = false;
    objectKind = "";
    blockDepth = 0;
    caseDepth = 0;
    pendingEnd = false;
    sqlWord = "";
    bodyComplete = false;
    languagePending = false;
    languageValueSeen = false;
    awaitingBodyQuote = false;
    bodyQuote = false;
  };

  scan: while (index < limit) {
    switch (mode) {
      case LINE_COMMENT: {
        const end = text.indexOf("\n", index);
        const stop = end === -1 ? length : end;
        lastNonSpace = trimmedEnd(text, index, stop, base, lastNonSpace);
        index = stop;
        if (end === -1) break scan;
        mode = CODE;
        continue;
      }
      case DIRECTIVE: {
        const end = text.indexOf("\n", index);
        directiveText += text.slice(index, end === -1 ? length : end);
        if (end === -1) {
          index = length;
          break scan;
        }
        delimiter = directiveText.trim().split(/\s/)[0] || ";";
        directiveText = "";
        mode = CODE;
        index = end + 1;
        continue;
      }
      case BLOCK_COMMENT: {
        if (rules.dollar) {
          let at = index;
          while (at < length) {
            const open = text.indexOf("/*", at);
            const close = text.indexOf("*/", at);
            if (open !== -1 && (close === -1 || open < close)) {
              commentDepth += 1;
              at = open + 2;
            } else if (close !== -1) {
              commentDepth -= 1;
              at = close + 2;
              if (commentDepth === 0) {
                index = at;
                lastNonSpace = base + index;
                mode = CODE;
                continue scan;
              }
            } else {
              break;
            }
          }
          index = final ? length : Math.max(index, length - 1);
          break scan;
        }
        const end = text.indexOf("*/", index);
        if (end === -1) {
          if (versionedComment) feed(index, final ? length : Math.max(index, length - 1));
          lastNonSpace = trimmedEnd(text, index, length, base, lastNonSpace);
          // El "*" del final puede cerrar con el "/" del trozo siguiente.
          index = final ? length : Math.max(index, length - 1);
          break scan;
        }
        if (versionedComment) {
          feed(index, end);
          flushWord();
          versionedComment = false;
        }
        index = end + 2;
        lastNonSpace = base + index;
        mode = CODE;
        continue;
      }
      case DOLLAR_QUOTED: {
        const end = text.indexOf(state.tag, index);
        if (end === -1) {
          // Sin cierre a la vista: si nunca llega, cada sentencia que empieza
          // tras una linea en blanco es una consulta nueva y no parte del cuerpo.
          const restart = new RegExp(`(\\S)[ \\t]*\\r?\\n${BLANK_LINES}(?=(?:${RESTART_KEYWORDS})\\b)`, "gi");
          restart.lastIndex = index;
          // Un candidato cuya palabra clave no cabe en el trozo se retoma en el
          // siguiente desde su inicio.
          let pending = length;
          for (let found = restart.exec(text); found; found = restart.exec(text)) {
            const at = found.index + found[0].length;
            if (!final && at + 16 > length) {
              pending = found.index;
              break;
            }
            if (!state.dollarRecovery.some((item) => item.from === base + at)) {
              state.dollarRecovery.push({ from: base + at, previousTo: base + found.index + 1 });
            }
          }
          lastNonSpace = trimmedEnd(text, index, length, base, lastNonSpace);
          index = final ? length : Math.max(index, Math.min(length - state.tag.length + 1, pending));
          break scan;
        }
        state.dollarRecovery = [];
        index = end + state.tag.length;
        lastNonSpace = base + index;
        if (bodyQuote) bodyComplete = true;
        bodyQuote = false;
        mode = CODE;
        continue;
      }
      case QUOTED: {
        const quote = state.quote;
        // La comilla que cierra (y en '...' la barra invertida, si escapa).
        const pattern = state.escaping ? ESCAPED_SINGLE : rules.closer.get(quote)!;
        for (;;) {
          if (index >= length) break scan;
          pattern.lastIndex = index;
          const at = pattern.exec(text)?.index ?? -1;
          if (at === -1) {
            lastNonSpace = trimmedEnd(text, index, length, base, lastNonSpace);
            index = length;
            break scan;
          }
          if (text.charCodeAt(at) === BACKSLASH) {
            index = at + 2;
            lastNonSpace = base + Math.min(index, length);
            continue;
          }
          // Comilla doble ('it''s'): hay que ver la siguiente.
          if (at + 1 >= length && !final) {
            lastNonSpace = trimmedEnd(text, index, at, base, lastNonSpace);
            index = at;
            break scan;
          }
          if (text.charCodeAt(at + 1) === quote) {
            index = at + 2;
            lastNonSpace = base + index;
            continue;
          }
          index = at + 1;
          lastNonSpace = base + index;
          if (bodyQuote) bodyComplete = true;
          bodyQuote = false;
          mode = CODE;
          state.escaping = false;
          continue scan;
        }
      }
    }

    // Codigo: se salta con una regex (nativa, mucho mas rapida que ir
    // caracter por caracter) hasta el proximo que abre o cierra algo; del
    // tramo intermedio solo importan su primer y su ultimo caracter que no
    // son espacio.
    while (index < limit) {
      if (rules.hash && codeStart < 0) {
        const directive = /^[ \t]*(?:\r?\n[ \t]*)*DELIMITER[ \t]+/i.exec(text.slice(index));
        if (directive) {
          index += directive[0].length;
          mode = DIRECTIVE;
          directiveText = "";
          continue scan;
        }
      }
      SPECIAL.lastIndex = index;
      const found = SPECIAL.exec(text);
      const nextDelimiter = delimiter === ";" ? -1 : text.indexOf(delimiter, index);
      let specialAt = found === null || found.index >= limit ? limit : found.index;
      if (delimiter !== ";" && !final && nextDelimiter === -1) {
        for (let candidate = Math.max(index, length - delimiter.length + 1); candidate < Math.min(limit, length); candidate++) {
          if (delimiter.startsWith(text.slice(candidate)) && candidate + delimiter.length > length) {
            specialAt = Math.min(specialAt, candidate);
            break;
          }
        }
      }
      const at = nextDelimiter >= 0 && nextDelimiter < specialAt ? nextDelimiter : specialAt;
      while (at > index) {
        // Una linea en blanco en el tramo parte en dos lo que hay a cada lado.
        const blank = depth === 0 ? blankLineIn(text, index, at) : -1;
        const cut = blank === -1 ? at : blank;
        let first = index;
        while (first < cut && isSpace(text.charCodeAt(first))) first += 1;
        let end = cut;
        while (end > first && isSpace(text.charCodeAt(end - 1))) end -= 1;
        if (first < end) {
          // La primera y la ultima palabra del tramo (a lo sumo el tramo
          // entero); si el tramo empieza donde termino el trozo anterior en
          // medio de una palabra, la continua.
          const joins = wordOpen && first === index && index === start && isWordChar(text.charCodeAt(first));
          let leadEnd = first;
          while (leadEnd < end && isWordChar(text.charCodeAt(leadEnd))) leadEnd += 1;
          const starts = codeStart < 0;
          // Como terminaba la sentencia antes de este tramo.
          const previousTail = tail;
          const previousTailWord = tailWord;
          // Solo hace falta leer la primera palabra si empieza la sentencia
          // (o continua la primera, partida entre trozos).
          if (starts) {
            codeStart = base + first;
            lead = text.slice(first, leadEnd).toUpperCase();
            mainStarted = false;
          } else if (joins && leadOpen) {
            lead += text.slice(first, leadEnd).toUpperCase();
          }
          feed(index, cut);
          tail = text.charCodeAt(end - 1);
          if (isWordChar(tail)) {
            let wordStart = end;
            while (wordStart > first && isWordChar(text.charCodeAt(wordStart - 1))) wordStart -= 1;
            // Tal cual (sin pasar a mayusculas: se hace solo al decidir).
            const word = text.slice(wordStart, end);
            tailWord = wordStart === first && joins ? tailWord + word : word;
          } else {
            tailWord = "";
            if (tail === STAR) {
              // "total *" es una multiplicacion; "SELECT *", todas las
              // columnas. Se mira lo que hay antes del "*" en el tramo.
              let before = end - 1;
              while (before > first && isSpace(text.charCodeAt(before - 1))) before -= 1;
              let wordStart = before;
              while (wordStart > first && isWordChar(text.charCodeAt(wordStart - 1))) wordStart -= 1;
              let previous = text.slice(wordStart, before);
              // Lo de antes del "*" puede estar en el tramo anterior (o en
              // el trozo anterior, partido en medio de la palabra).
              if (wordStart === first && joins) previous = previousTailWord + previous;
              const valueBefore =
                before > first
                  ? previous !== "" || text.charCodeAt(before - 1) === CLOSE_PAREN
                  : !starts && (previousTailWord !== "" || previousTail === CLOSE_PAREN);
              if (before === first && !starts) previous = previousTailWord;
              if (valueBefore && !ALL_COLUMNS_AFTER.has(previous.toUpperCase())) tail = MULTIPLY;
            }
          }
          if (!mainStarted && depth === 0 && MAIN_PART.has(lead)) {
            const main = MAIN_PART.get(lead);
            // En el tramo que la empieza, sin contar la primera palabra.
            if (main) mainStarted = main.test(starts ? text.slice(leadEnd, end) : text.slice(first, end));
          }
          // Termina justo en el limite del trozo en medio de una palabra.
          const open = !final && cut === limit && end === cut && isWordChar(tail);
          leadOpen = open && leadEnd === end && (starts || (joins && leadOpen));
          wordOpen = open;
        } else {
          wordOpen = false;
          leadOpen = false;
        }
        lastNonSpace = trimmedEnd(text, index, cut, base, lastNonSpace);
        index = cut;
        if (cut === at) break;
        flushWord();
        if (objectKind && blockDepth > 0 && !bodyComplete) {
          const following = text.slice(cut + 1).match(new RegExp(`^${BLANK_LINES}(${RESTART_KEYWORDS})\\b`, "i"));
          if (following) {
            const from = base + cut + 1 + following[0].length - following[1].length;
            if (!state.recovery.some((item) => item.from === from)) state.recovery.push({ from, previousTo: lastNonSpace });
          }
        }
        if (codeStart >= 0 && depth === 0 &&
          (!objectKind || (rules.dollar && bodyComplete && blockDepth === 0 && languageValueSeen))) {
          let continues =
            CONTINUES.has(tail) ||
            tail === MULTIPLY ||
            (lead === "WITH" && !mainStarted && tail === CLOSE_PAREN) ||
            (tailWord !== "" && INCOMPLETE_WORDS.has(tailWord.toUpperCase()));
          if (!continues) {
            const next = nextLineContinues(
              text,
              cut + 1,
              final,
              rules.hash,
              mainStarted ? undefined : FOLLOWS_LEAD.get(lead),
              ALWAYS_FOLLOWS_LEAD.get(lead),
            );
            // Sin texto para decidir: se sigue desde aqui en el trozo
            // siguiente (si ya se avanzo algo; si no, se corta).
            if (next === null && cut > start) break scan;
            continues = next === true;
          }
          if (!continues) {
            out.push({ from: codeStart, to: lastNonSpace, terminated: false });
            resetStatement();
          }
        }
        index = cut + 1;
      }
      if (index >= limit) break;

      const code = text.charCodeAt(index);
      if (delimiter !== ";" && !final && index + delimiter.length > length && delimiter.startsWith(text.slice(index))) break scan;
      flushWord();
      if (code === SEMICOLON) finishEnd();
      const customEnd = delimiter !== ";" && text.startsWith(delimiter, index);
      if (customEnd || (code === SEMICOLON && delimiter === ";" &&
        (!objectKind || (blockDepth === 0 && caseDepth === 0 && !(objectKind === "RULE" && depth > 0))))) {
        finishEnd();
        if (codeStart >= 0) {
          if (customEnd && objectKind && blockDepth > 0 && state.recovery.length > 0) {
            let from = codeStart;
            for (const candidate of state.recovery) {
              if (candidate.previousTo > from) out.push({ from, to: candidate.previousTo, terminated: false });
              from = candidate.from;
            }
            if (lastNonSpace > from) out.push({ from, to: lastNonSpace, terminated: false });
          } else out.push({ from: codeStart, to: customEnd ? lastNonSpace : base + index + 1, terminated: !customEnd });
        }
        resetStatement();
        index += customEnd ? delimiter.length : 1;
        continue;
      }
      if (code === SEMICOLON) {
        lastNonSpace = base + index + 1;
        index += 1;
        continue;
      }
      if (code === OPEN_PAREN || code === CLOSE_PAREN) {
        depth = code === OPEN_PAREN ? depth + 1 : Math.max(0, depth - 1);
        if (codeStart < 0) {
          codeStart = base + index;
          lead = "";
          mainStarted = false;
        }
        tail = code;
        tailWord = "";
        wordOpen = false;
        leadOpen = false;
        lastNonSpace = base + index + 1;
        index += 1;
        continue;
      }
      // Un comentario, una comilla o un simbolo cortan la palabra en curso.
      wordOpen = false;
      leadOpen = false;
      if (code === DASH && opensDashComment(text, index, rules.hash)) {
        mode = LINE_COMMENT;
        index += 2;
        continue scan;
      }
      if (code === SLASH && text.charCodeAt(index + 1) === STAR) {
        versionedComment = rules.hash && text.charCodeAt(index + 2) === 33;
        if (versionedComment && codeStart < 0) codeStart = base + index;
        commentDepth = 1;
        mode = BLOCK_COMMENT;
        index += 2;
        continue scan;
      }
      if (code === HASH && rules.hash) {
        mode = LINE_COMMENT;
        index += 1;
        continue scan;
      }
      const close = rules.closeOf.get(code);
      if (close !== undefined) {
        if (codeStart < 0) {
          codeStart = base + index;
          lead = "";
          mainStarted = false;
        }
        // La sentencia termina (por ahora) en un texto entre comillas.
        tail = code;
        tailWord = "";
        mode = QUOTED;
        bodyQuote = awaitingBodyQuote && rules.dollar;
        awaitingBodyQuote = false;
        state.quote = close;
        state.escaping = rules.escapePrefix && code === SINGLE_QUOTE && opensEscapeString(text, index);
        index += 1;
        lastNonSpace = base + index;
        continue scan;
      }
      if (code === DOLLAR && rules.dollar) {
        DOLLAR_TAG.lastIndex = index;
        const tag = DOLLAR_TAG.exec(text)?.[0];
        if (tag) {
          if (codeStart < 0) {
            codeStart = base + index;
            lead = "";
            mainStarted = false;
          }
          tail = code;
          tailWord = "";
          mode = DOLLAR_QUOTED;
          bodyQuote = awaitingBodyQuote;
          awaitingBodyQuote = false;
          state.tag = tag;
          index += tag.length;
          lastNonSpace = base + index;
          continue scan;
        }
      }
      // Un "-", "/" o "$" sueltos: codigo comun.
      if (codeStart < 0) {
        codeStart = base + index;
        lead = "";
        mainStarted = false;
      }
      tail = code;
      tailWord = "";
      lastNonSpace = base + index + 1;
      index += 1;
    }
  }

  if (final) {
    if (mode === DIRECTIVE) delimiter = directiveText.trim().split(/\s/)[0] || ";";
    flushWord();
    finishEnd();
    if (codeStart >= 0) {
      const cuts = mode === DOLLAR_QUOTED ? state.dollarRecovery : objectKind && blockDepth > 0 ? state.recovery : [];
      if (cuts.length > 0) {
        let from = codeStart;
        for (const candidate of cuts) {
          if (candidate.previousTo > from) out.push({ from, to: candidate.previousTo, terminated: false });
          from = candidate.from;
        }
        if (lastNonSpace > from) out.push({ from, to: lastNonSpace, terminated: false });
      } else out.push({ from: codeStart, to: lastNonSpace, terminated: false });
    }
    state.recovery = [];
    state.dollarRecovery = [];
    state.mode = mode;
    state.codeStart = -1;
    state.lastNonSpace = -1;
    state.depth = 0;
    state.tail = -1;
    state.tailWord = "";
    state.lead = "";
    state.mainStarted = false;
    state.wordOpen = false;
    state.leadOpen = false;
    state.delimiter = delimiter;
    state.sqlWord = "";
    state.versionedComment = false;
    state.directiveText = "";
    return length;
  }
  state.mode = mode;
  state.codeStart = codeStart;
  state.lastNonSpace = lastNonSpace;
  state.depth = depth;
  state.tail = tail;
  state.tailWord = tailWord;
  state.lead = lead;
  state.mainStarted = mainStarted;
  state.wordOpen = wordOpen;
  state.leadOpen = leadOpen;
  state.delimiter = delimiter;
  state.sqlWord = sqlWord;
  state.createHead = createHead;
  state.objectKind = objectKind;
  state.blockDepth = blockDepth;
  state.caseDepth = caseDepth;
  state.pendingEnd = pendingEnd;
  state.versionedComment = versionedComment;
  state.bodyComplete = bodyComplete;
  state.languagePending = languagePending;
  state.languageValueSeen = languageValueSeen;
  state.directiveText = directiveText;
  state.awaitingBodyQuote = awaitingBodyQuote;
  state.bodyQuote = bodyQuote;
  state.commentDepth = commentDepth;
  return index;
}

// Las sentencias de `text` con las reglas de un motor (`lexical`, de su
// perfil).
export function splitStatements(text: string, lexical: SqlLexical): StatementRange[] {
  const out: ScannedStatement[] = [];
  scanChunk(text, 0, text.length, true, initialScanState(), out, lexical);
  return out.map(({ from, to }) => ({ from, to }));
}

function lineOf(text: string, offset: number): number {
  let line = 0;
  let index = text.indexOf("\n");
  while (index !== -1 && index < offset) {
    line += 1;
    index = text.indexOf("\n", index + 1);
  }
  return line;
}

// La sentencia a ejecutar para el cursor en `offset`:
// - la que contiene el cursor (incluido justo despues de su ";");
// - si el cursor esta entre sentencias: la que empieza en su misma linea
//   (cursor al inicio de la linea), si no la que termina en su misma linea
//   (cursor despues del ";"), si no la mas cercana en lineas (a igual
//   distancia, la anterior);
// - null si no hay ninguna.
//
// `ranges` en orden; basta con las vecinas del cursor. `lineAt` da el numero
// de linea de una posicion.
export function chooseStatement<T extends StatementRange>(
  ranges: readonly T[],
  offset: number,
  lineAt: (pos: number) => number,
): T | null {
  const inside = ranges.find((range) => offset >= range.from && offset <= range.to);
  if (inside) return inside;

  const after = ranges.find((range) => range.from > offset);
  const before = ranges.findLast((range) => range.to < offset);
  if (!after && !before) return null;

  const cursorLine = lineAt(offset);
  if (after && lineAt(after.from) === cursorLine) return after;
  if (before && lineAt(before.to) === cursorLine) return before;
  if (!after) return before ?? null;
  if (!before) return after;
  const distanceAfter = lineAt(after.from) - cursorLine;
  const distanceBefore = cursorLine - lineAt(before.to);
  return distanceAfter < distanceBefore ? after : before;
}

export function statementAt(text: string, offset: number, lexical: SqlLexical): StatementRange | null {
  return chooseStatement(splitStatements(text, lexical), offset, (pos) => lineOf(text, pos));
}
