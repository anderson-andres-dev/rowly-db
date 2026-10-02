import { commentAwareWrap } from "$lib/sqlCommentHighlight";
import type { Completion, CompletionResult, CompletionSource } from "@codemirror/autocomplete";
import {
  keywordCompletionSource,
  schemaCompletionSource,
  type SQLDialect,
  type SQLNamespace,
} from "@codemirror/lang-sql";
import { foldNodeProp } from "@codemirror/language";
import type { CatalogTable, ForeignKey, RelationKind, SchemaObjects } from "$lib/types";
import { boostFor, recordUsage } from "$lib/usageStats";
import { classifyContext, sqlTokens } from "$lib/sqlContext";
import { statementTextAt } from "$lib/sqlStatementIndex";
import { aliasFor, relationRef, statementRelations, takenNames, type StatementRelation } from "$lib/sqlRelations";
import type { TableAliasMode } from "$lib/stores/editorSettings";
import { translate, type MessageKey } from "$lib/i18n";
import { completionPolicy, type CompletionPolicy } from "$lib/sqlCompletionPolicy";
import { standardSql, type SqlProfile } from "$lib/engines";
import type { SqlLexical } from "$lib/sqlStatements";
import { buildCatalogCompletions, catalogPosition, prefixStartForNames } from "$lib/sqlCatalogCompletions";

// @codemirror/lang-sql pliega cada "Statement" de nivel superior desde
// min(inicio + 100, fin de su primera linea) hasta su fin. Con una consulta
// escrita a mano cuya primera linea es solo "SELECT" (formato habitual, ej.
// DataGrip), ese min() cae en el fin de la linea 1 - dejando TODA la
// sentencia como una unica region plegable anclada ahi (chevron en la
// linea 1, la consulta entera "colapsable" como si fuera una sola linea).
// Se anula solo el fold de Statement via configureLanguage (BlockComment
// se preserva), sin tocar basicSetup ni foldGutter/foldKeymap.
const NO_STATEMENT_FOLD = foldNodeProp.add({ Statement: () => null });
const dialectCache = new WeakMap<SqlProfile, SQLDialect>();

// El dialecto del editor para el SQL de un motor (o el estandar), con lo de
// la app encima: los comentarios como los lee el motor (sqlCommentHighlight.ts).
export function dialectFor(engine: SqlProfile): SQLDialect {
  const cached = dialectCache.get(engine);
  if (cached) return cached;
  const wrap = commentAwareWrap(engine.lexical, engine.editorDialect.language.parser);
  const configured = engine.editorDialect.configureLanguage({ props: [NO_STATEMENT_FOLD], ...(wrap ? { wrap } : {}) });
  dialectCache.set(engine, configured);
  return configured;
}

// Relacion inversa de una FK: otra tabla que apunta a la que estamos
// resolviendo (p.ej. parados en "users", "orders.user_id -> users.id" es
// una relacion reverse con table="orders").
export interface FkRelation {
  table: string;
  column: string;
  referencedColumn: string;
}

interface TableFks {
  forward: ForeignKey[];
  reverse: FkRelation[];
}

export type FkIndex = Map<string, TableFks>;

function buildFkIndex(tables: CatalogTable[]): FkIndex {
  const index: FkIndex = new Map();
  const ensure = (name: string): TableFks => {
    let entry = index.get(name);
    if (!entry) {
      entry = { forward: [], reverse: [] };
      index.set(name, entry);
    }
    return entry;
  };

  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      ensure(table.name).forward.push(fk);
      ensure(fk.referencedTable).reverse.push({
        table: table.name,
        column: fk.column,
        referencedColumn: fk.referencedColumn,
      });
    }
  }

  return index;
}

// Inserta `text` (el nombre como lo escribe el motor, con comillas si las
// necesita) y cuenta el uso. La etiqueta que se ve y se filtra sigue siendo
// el nombre tal cual.
function applyAndRecord(key: string, text: string): NonNullable<Completion["apply"]> {
  return (view, _completion, from, to) => {
    recordUsage(key);
    view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length }, userEvent: "input.complete" });
  };
}

// Traduce relaciones y columnas al SQLNamespace que espera
// @codemirror/lang-sql, para que el completado de tablas/columnas y la
// resolucion de "alias.columna" los resuelva la libreria en vez de
// reinventarlo en Rust. Tambien arma el indice de FK (ver buildFkIndex) que
// alimenta el completado de JOIN.
//
// Ojo: completeFromSchema (la funcion de la libreria que resuelve esto) NO
// distingue clausulas SQL (FROM vs WHERE vs SELECT) - solo resuelve rutas
// con punto ("alias.columna"). Sin punto, siempre devuelve el nivel
// superior (todas las tablas), sin importar si estas despues de FROM o de
// WHERE. Por eso extractDefaultTable() existe: detecta la tabla del FROM
// actual con un heuristico de texto y se pasa como defaultTable a
// buildCompletionSource(), que si mezcla las columnas de esa tabla puntual
// en el nivel superior.
//
// La restriccion por clausula en si (nada de tablas sueltas en "SELECT *
// fro|", nada de catalogo al inicio de sentencia, WHERE priorizado justo
// despues de un FROM completo) la resuelve sqlContext.ts +
// sqlCompletionPolicy.ts, consumidos aca mismo en buildCompletionSource.
//
// `defaultSchema`: el de la conexion (current_schema: search_path en
// Postgres, la base elegida en MySQL). Sus relaciones van sin prefijo; las de
// los demas schemas, calificadas. `engine` decide cuando un nombre necesita
// comillas al insertarlo.
export function buildSqlSchema(
  tables: CatalogTable[],
  options: { defaultSchema?: string; engine?: SqlProfile; explorerSchemas?: readonly SchemaObjects[]; availableSchemas?: readonly string[] } = {},
): {
  schema: SQLNamespace;
  defaultSchema?: string;
  fkIndex: FkIndex;
  tableIndex: TableIndex;
} {
  const engine = options.engine ?? standardSql;
  const schema: Record<string, Record<string, { self: Completion; children: Completion[] }>> = {};
  const schemaNames = new Set<string>();
  const byKey = new Map<string, TableEntry>();
  const byName = new Map<string, TableEntry[]>();

  for (const name of options.availableSchemas ?? []) {
    schemaNames.add(name);
    schema[name] ??= {};
  }

  const kinds = new Map((options.explorerSchemas ?? []).flatMap((objects) =>
    objects.tables.map((relation) => [tableKey(objects.schema, relation.name), relation.kind] as const),
  ));
  const relations: (CatalogTable & { kind: RelationKind })[] = tables.map((table) => ({
    ...table,
    kind: kinds.get(tableKey(table.schema, table.name)) ?? "table",
  }));
  const known = new Set(tables.map((table) => tableKey(table.schema, table.name)));
  for (const objects of options.explorerSchemas ?? []) {
    schemaNames.add(objects.schema);
    schema[objects.schema] ??= {};
    for (const relation of objects.tables) {
      const key = tableKey(objects.schema, relation.name);
      if (known.has(key)) continue;
      known.add(key);
      relations.push({
        schema: objects.schema,
        name: relation.name,
        kind: relation.kind,
        columns: relation.columns.map((column) => ({ ...column, comment: column.comment ?? undefined })),
        foreignKeys: relation.foreignKeys.map((fk) => ({ column: fk.column, referencedTable: fk.referencedTable, referencedColumn: fk.referencedColumn })),
      });
    }
  }

  for (const table of relations) {
    schemaNames.add(table.schema);
    schema[table.schema] ??= {};
    // "type" distingue PK/FK (icono propio en el tooltip de autocompletado,
    // ver sqlEditorIcons.css) del resto de columnas - mismo criterio que
    // ColumnCatalogInfo en Workspace.svelte para el grid de resultados.
    const fkColumns = new Set(table.foreignKeys.map((fk) => fk.column.toLowerCase()));
    schema[table.schema][table.name] = {
      self: {
        label: table.name,
        type: table.kind,
        detail: table.schema,
        boost: boostFor(`table:${table.name}`),
        apply: applyAndRecord(`table:${table.name}`, engine.identifier(table.name)),
      },
      children: table.columns.map((column) => ({
        label: column.name,
        type: column.isPrimaryKey ? "column-pk" : fkColumns.has(column.name.toLowerCase()) ? "column-fk" : "column",
        detail: column.dataType,
        boost: boostFor(`column:${table.name}.${column.name}`),
        apply: applyAndRecord(`column:${table.name}.${column.name}`, engine.identifier(column.name)),
      })),
    };
    const entry: TableEntry = { schema: table.schema, name: table.name, kind: table.kind, columns: schema[table.schema][table.name].children };
    byKey.set(tableKey(table.schema, table.name), entry);
    byName.set(table.name.toLowerCase(), [...(byName.get(table.name.toLowerCase()) ?? []), entry]);
  }

  // El de la conexion; sin el, el unico que haya. Aplanarlo evita escribir
  // "core.tabla" para lo de todos los dias.
  const defaultSchema =
    options.defaultSchema && schemaNames.has(options.defaultSchema)
      ? options.defaultSchema
      : schemaNames.size === 1
        ? [...schemaNames][0]
        : undefined;
  return { schema, defaultSchema, fkIndex: buildFkIndex(tables), tableIndex: { byKey, byName, defaultSchema } };
}

interface TableEntry {
  schema: string;
  name: string;
  kind: RelationKind;
  columns: Completion[];
}

// Las tablas del catalogo por schema y nombre exactos (en Postgres `users` y
// `"Users"` son dos tablas) y, para buscar lo escrito, por nombre en
// minusculas (todas las que se llaman igual sin mirar mayusculas).
export interface TableIndex {
  byKey: Map<string, TableEntry>;
  byName: Map<string, TableEntry[]>;
  defaultSchema?: string;
}

export const EMPTY_TABLE_INDEX: TableIndex = { byKey: new Map(), byName: new Map() };

function tableKey(schema: string, name: string): string {
  return `${schema}\u0000${name}`;
}

// De varias con el nombre pedido: la del schema por defecto o la unica.
function preferDefault(index: TableIndex, candidates: TableEntry[]): TableEntry | undefined {
  return candidates.find((entry) => entry.schema === index.defaultSchema) ?? (candidates.length === 1 ? candidates[0] : undefined);
}

// Una tabla por su nombre del catalogo (el de una FK, exacto).
export function catalogTable(index: TableIndex, name: string, schema?: string): TableEntry | undefined {
  if (schema) return index.byKey.get(tableKey(schema, name));
  return preferDefault(index, (index.byName.get(name.toLowerCase()) ?? []).filter((entry) => entry.name === name));
}

// La tabla que nombra lo escrito en la sentencia, como la resuelve el motor
// (`matches`: nameMatches del perfil): con schema, en ese; sin el, la del
// schema por defecto o la unica.
export function resolveTable(
  index: TableIndex,
  relation: Pick<StatementRelation, "table" | "quoted" | "schema" | "schemaQuoted">,
  matches: SqlProfile["nameMatches"],
): TableEntry | undefined {
  const candidates = (index.byName.get(relation.table.toLowerCase()) ?? []).filter(
    (entry) =>
      matches(relation.table, relation.quoted, entry.name) &&
      (relation.schema === undefined || matches(relation.schema, !!relation.schemaQuoted, entry.schema)),
  );
  return preferDefault(index, candidates);
}

// Mismo patron de "nombre de tabla (con schema opcional) + alias opcional"
// en ambas — duplicado en vez de compartido via un string armado a mano
// (concatenar el .source de un regex con comillas/backtick adentro es
// mucho mas facil de romper por un escape mal puesto que de leer).
const FROM_CONTEXT =
  /\bfrom\s+["'`[]?([a-zA-Z_]\w*)(?:["'`\]])?(?:\.["'`[]?([a-zA-Z_]\w*))?(?:\s+(?:as\s+)?([a-zA-Z_]\w*))?/i;
const JOIN_CONTEXT =
  /\bjoin\s+["'`[]?([a-zA-Z_]\w*)(?:["'`\]])?(?:\.["'`[]?([a-zA-Z_]\w*))?(?:\s+(?:as\s+)?([a-zA-Z_]\w*))?/gi;

const RESERVED_AFTER_FROM = new Set([
  "where",
  "join",
  "inner",
  "left",
  "right",
  "full",
  "cross",
  "on",
  "group",
  "order",
  "having",
  "limit",
  "union",
  "as",
]);

// La sentencia SQL completa que contiene `cursor` (separadas por ";"), no
// solo lo anterior al cursor: mientras se escribe la lista de SELECT antes
// de haber llegado al FROM, este todavia esta "adelante" del cursor, y un
// heuristico que solo mira hacia atras nunca lo encontraria.
function currentStatement(doc: string, cursor: number): string {
  const start = doc.lastIndexOf(";", Math.max(0, cursor - 1)) + 1;
  const nextSemicolon = doc.indexOf(";", cursor);
  const end = nextSemicolon === -1 ? doc.length : nextSemicolon;
  return doc.slice(start, end);
}

function toRelation(match: RegExpExecArray): { table: string; alias?: string } {
  const table = match[2] ?? match[1];
  const alias = match[3];
  const validAlias = alias && !RESERVED_AFTER_FROM.has(alias.toLowerCase()) ? alias : undefined;
  return { table, alias: validAlias };
}

// Heuristico de texto (no un parser real, ver comentario de arriba): la
// primera tabla que aparece despues de un FROM en la sentencia donde esta
// el cursor (sin el prefijo de schema si vino calificada), junto con su
// alias si tiene uno valido. Alcanza para el caso comun de un FROM con una
// sola tabla; para JOINs ver extractFromTables().
export function extractFromContext(doc: string, cursor: number): { table: string; alias?: string } | undefined {
  const match = FROM_CONTEXT.exec(currentStatement(doc, cursor));
  return match ? toRelation(match) : undefined;
}

export function extractDefaultTable(doc: string, cursor: number): string | undefined {
  return extractFromContext(doc, cursor)?.table;
}

// Como extractFromContext, pero incluye ademas cada tabla de un JOIN de la
// misma sentencia (con su propio alias si tiene) — para sugerir columnas
// sin calificar de TODAS las tablas involucradas, no solo la del FROM.
export function extractFromTables(doc: string, cursor: number): { table: string; alias?: string }[] {
  const statement = currentStatement(doc, cursor);
  const relations: { table: string; alias?: string }[] = [];

  const fromMatch = FROM_CONTEXT.exec(statement);
  if (!fromMatch) return relations;
  relations.push(toRelation(fromMatch));

  JOIN_CONTEXT.lastIndex = 0;
  let joinMatch: RegExpExecArray | null;
  while ((joinMatch = JOIN_CONTEXT.exec(statement))) {
    relations.push(toRelation(joinMatch));
  }
  return relations;
}

// Busca una tabla por nombre (sin importar mayus/minus) dentro del
// SQLNamespace armado por buildSqlSchema. Si hay un unico schema (caso
// normal, ver comentario de buildSqlSchema) busca solo ahi; si no, recorre
// todos los niveles top-level. Devuelve el nombre real del schema/tabla (con
// el casing que vino del catalogo, no el del texto escrito) junto con sus
// columnas.
function findTableEntry(
  schema: SQLNamespace,
  defaultSchema: string | undefined,
  tableName: string,
): { schemaName: string; tableName: string; children: Completion[] } | undefined {
  const target = tableName.toLowerCase();
  const roots = defaultSchema ? [defaultSchema] : Object.keys(schema as Record<string, unknown>);

  for (const schemaName of roots) {
    const level = (schema as Record<string, unknown>)[schemaName];
    if (!level || typeof level !== "object") continue;

    for (const [name, entry] of Object.entries(level as Record<string, unknown>)) {
      if (name.toLowerCase() !== target) continue;
      const children = (entry as { children?: readonly (Completion | string)[] } | undefined)?.children;
      if (!children) continue;
      return {
        schemaName,
        tableName: name,
        children: children.filter((child): child is Completion => typeof child !== "string"),
      };
    }
  }

  return undefined;
}

// Resuelve una palabra del editor (p.ej. lo que hay bajo el cursor con
// Ctrl/Cmd sostenido) contra el catalogo: si coincide con una tabla
// conocida, devuelve su schema/nombre reales para pedirle al backend su
// definicion (ver sqlDefinitionLink.ts). undefined si la palabra no es una
// tabla del catalogo activo - esa es la señal de "no aplica" que usa el
// enlace tipo Ctrl+clic (no confundir con un error de acceso, que es un
// fallo real del backend al pedir la definicion).
export function resolveCatalogTable(
  schema: SQLNamespace,
  defaultSchema: string | undefined,
  word: string,
): { schema: string; table: string } | undefined {
  const entry = findTableEntry(schema, defaultSchema, word);
  return entry ? { schema: entry.schemaName, table: entry.tableName } : undefined;
}

// --- Completado inteligente (docs/specs/v0.2-autocompletado.md) -------------
//
// Todo sale del texto de la sentencia actual (statementTextAt) y del
// catalogo ya cargado: el JOIN completo con alias y condicion, el alias al
// elegir una tabla, las condiciones del ON y las columnas calificadas cuando
// su nombre existe en mas de una tabla de la sentencia.

// Con una sentencia enorme (un INSERT de varios MB) no se analizan sus
// relaciones en cada tecla.
const MAX_SMART_STATEMENT = 128 * 1024;

interface SmartEnv {
  lexical: SqlLexical;
  // Si un nombre escrito nombra una tabla o columna del catalogo (el motor).
  nameMatches: SqlProfile["nameMatches"];
  // El nombre como lo escribe el motor (comillas si las necesita).
  identifier: (name: string) => string;
  fkIndex: Map<string, TableFks>;
  tableIndex: TableIndex;
  defaultSchema?: string;
  reserved: ReadonlySet<string>;
  tableAliases: TableAliasMode;
}

interface StatementInfo {
  relations: StatementRelation[];
  taken: Set<string>;
  isQuery: boolean;
}

const reservedCache = new WeakMap<SQLDialect, ReadonlySet<string>>();

// Las palabras clave del dialecto: un alias igual a una rompe la consulta.
function reservedWords(dialect: SQLDialect): ReadonlySet<string> {
  let words = reservedCache.get(dialect);
  if (!words) {
    words = new Set((dialect.spec.keywords ?? "").toLowerCase().split(/\s+/).filter(Boolean));
    reservedCache.set(dialect, words);
  }
  return words;
}

// Las relaciones de la sentencia sin la palabra que se esta escribiendo (si
// no, "FROM a jo|" veria "jo" como alias de "a").
function statementInfo(text: string, word: { from: number; to: number }, lexical: SqlLexical): StatementInfo {
  const masked = text.slice(0, word.from) + " ".repeat(word.to - word.from) + text.slice(word.to);
  const { relations, aliases } = statementRelations(masked, lexical);
  return { relations, taken: takenNames(relations, aliases), isQuery: /^\s*(select|with)\b/i.test(text) };
}

// El nombre para escribir una tabla: con su schema solo si no es el de la
// conexion, y cada parte con comillas si el motor las necesita.
function writtenName(env: SmartEnv, table: string, schema?: string): string {
  const entry = catalogTable(env.tableIndex, table, schema);
  if (!entry) return env.identifier(table);
  const name = env.identifier(entry.name);
  return env.defaultSchema && entry.schema === env.defaultSchema ? name : `${env.identifier(entry.schema)}.${name}`;
}

// Inserta la etiqueta tal cual (ya escrita como la lee el motor).
function insertText(key: string): NonNullable<Completion["apply"]> {
  return (view, completion, from, to) => {
    recordUsage(key);
    view.dispatch({
      changes: { from, to, insert: completion.label },
      selection: { anchor: from + completion.label.length },
      userEvent: "input.complete",
    });
  };
}

interface JoinCandidate {
  origin: StatementRelation;
  originIndex: number;
  target: string;
  originColumn: string;
  targetColumn: string;
  // La tabla nueva es la referenciada (su columna es la clave): va primero
  // en la condicion, como DataGrip.
  targetIsReferenced: boolean;
}

// Cada relacion por FK (en las dos direcciones) de cada tabla ya presente
// hacia una tabla que todavia no esta (una tabla consigo misma si: es un
// self join).
function joinCandidates(env: SmartEnv, relations: StatementRelation[]): JoinCandidate[] {
  const resolved = relations.map((relation) => resolveTable(env.tableIndex, relation, env.nameMatches));
  const present = new Set(resolved.filter((entry) => entry).map((entry) => tableKey(entry!.schema, entry!.name)));
  const seen = new Set<string>();
  const candidates: JoinCandidate[] = [];
  relations.forEach((origin, originIndex) => {
    const originEntry = resolved[originIndex];
    const fks = originEntry && env.fkIndex.get(originEntry.name);
    if (!originEntry || !fks) return;
    const originKey = tableKey(originEntry.schema, originEntry.name);
    const add = (candidate: JoinCandidate) => {
      const targetEntry = catalogTable(env.tableIndex, candidate.target);
      const targetKey = targetEntry ? tableKey(targetEntry.schema, targetEntry.name) : candidate.target;
      if (present.has(targetKey) && targetKey !== originKey) return;
      const key = `${targetKey}|${relationRef(origin)}|${candidate.originColumn}|${candidate.targetColumn}`;
      if (seen.has(key)) return;
      seen.add(key);
      candidates.push(candidate);
    };
    for (const fk of fks.forward) {
      add({ origin, originIndex, target: fk.referencedTable, originColumn: fk.column, targetColumn: fk.referencedColumn, targetIsReferenced: true });
    }
    for (const reverse of fks.reverse) {
      add({ origin, originIndex, target: reverse.table, originColumn: reverse.referencedColumn, targetColumn: reverse.column, targetIsReferenced: false });
    }
  });
  return candidates;
}

// `JOIN tabla alias ON a.col = alias.col`, una opcion por relacion FK. Con
// `withKeyword`, se esta escribiendo la palabra JOIN; sin ella, ya esta
// escrita y falta la tabla. Las de la tabla mas reciente de la sentencia van
// primero, despues por uso.
function joinOptions(env: SmartEnv, info: StatementInfo, withKeyword: boolean): Completion[] {
  const { relations, taken } = info;
  const aliases = new Map<string, string | undefined>();
  const last = relations.length - 1;
  // Un JOIN ya deja dos tablas en la consulta: "multiple" tambien lleva alias.
  const withAliases = env.tableAliases !== "never";
  return joinCandidates(env, relations).map((candidate) => {
    if (!aliases.has(candidate.target)) {
      aliases.set(candidate.target, withAliases ? aliasFor(candidate.target, taken, env.reserved) : undefined);
    }
    const alias = aliases.get(candidate.target);
    const name = writtenName(env, candidate.target);
    const ref = alias ?? env.identifier(candidate.target);
    const originRef = relationRef(candidate.origin);
    const newSide = `${ref}.${env.identifier(candidate.targetColumn)}`;
    const oldSide = `${originRef}.${env.identifier(candidate.originColumn)}`;
    const condition = candidate.targetIsReferenced ? `${newSide} = ${oldSide}` : `${oldSide} = ${newSide}`;
    const label = `${withKeyword ? "JOIN " : ""}${name}${alias ? ` ${alias}` : ""} ON ${condition}`;
    const recent = candidate.originIndex === last ? 3 : 0;
    return {
      label,
      type: "keyword-join",
      detail: "FK",
      // Con la palabra JOIN a medio escribir, por debajo de la keyword sola
      // (que queda primera); despues de JOIN, por encima de las tablas
      // sueltas.
      boost: (withKeyword ? 4 : 20) + recent + boostFor(`table:${candidate.target}`),
      apply: insertText(`table:${candidate.target}`),
    };
  });
}

// Palabras que, justo despues de la tabla, dicen que ya tiene alias.
const ALIAS_AFTER = /^\s+(?:as\s+)?([A-Za-z_][A-Za-z0-9_]*)/i;

// Una tabla elegida en el FROM o en un JOIN escrito a mano: con su alias
// (si la sentencia es una consulta y la tabla no tiene ya uno escrito).
// Solo se agrega al elegir la sugerencia: una tabla escrita a mano nunca se
// toca, y un alias que el usuario borra no vuelve. Con "multiple", la
// primera tabla de la consulta va sin alias.
// `table`: el nombre del que sale el alias; `text`: como se inserta.
function withAlias(
  option: Completion,
  env: SmartEnv,
  info: StatementInfo,
  table = option.label,
  text = env.identifier(table),
): Completion {
  if (env.tableAliases === "never" || (env.tableAliases === "multiple" && info.relations.length === 0)) return option;
  const alias = aliasFor(table, info.taken, env.reserved);
  if (!alias) return option;
  return {
    ...option,
    apply: (view, _completion, from, to) => {
      recordUsage(`table:${table}`);
      const after = ALIAS_AFTER.exec(view.state.sliceDoc(to, Math.min(view.state.doc.length, to + 80)));
      const hasAlias = !!after && !NOT_ALIAS_WORDS.has(after[1].toLowerCase());
      const insert = hasAlias ? text : `${text} ${alias}`;
      view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + insert.length }, userEvent: "input.complete" });
    },
  };
}

const NOT_ALIAS_WORDS = new Set([
  "where", "join", "inner", "left", "right", "full", "outer", "cross", "natural", "on", "using",
  "group", "order", "having", "limit", "union", "except", "intersect", "window", "for", "lock",
]);

// Despues de "ON " (o de "AND " dentro del ON): las condiciones por FK entre
// la tabla del JOIN y las anteriores; despues, las columnas con el mismo
// nombre en las dos (pista para tablas sin FK declarada).
function onOptions(env: SmartEnv, text: string, wordFrom: number): Completion[] {
  const tokens = sqlTokens(text, env.lexical, wordFrom);
  const previous = tokens[tokens.length - 1];
  if (!previous || previous.kind !== "word" || (previous.text !== "on" && previous.text !== "and")) return [];
  const { relations } = statementRelations(text.slice(0, wordFrom), env.lexical);
  if (relations.length < 2) return [];
  const target = relations[relations.length - 1];
  const earlier = relations.slice(0, -1);
  const targetRef = relationRef(target);
  const options: Completion[] = [];
  const seen = new Set<string>();
  const push = (label: string, boost: number) => {
    if (seen.has(label)) return;
    seen.add(label);
    options.push({ label, type: "keyword-join", detail: "ON", boost, apply: insertText(`table:${target.table}`) });
  };

  const targetEntry = resolveTable(env.tableIndex, target, env.nameMatches);
  const fks = targetEntry && env.fkIndex.get(targetEntry.name);
  const originEntries = earlier.map((origin) => resolveTable(env.tableIndex, origin, env.nameMatches));
  earlier.forEach((origin, index) => {
    const originEntry = originEntries[index];
    if (!originEntry) return;
    const originRef = relationRef(origin);
    for (const fk of fks?.forward ?? []) {
      if (fk.referencedTable === originEntry.name) {
        push(`${originRef}.${env.identifier(fk.referencedColumn)} = ${targetRef}.${env.identifier(fk.column)}`, 30);
      }
    }
    for (const reverse of fks?.reverse ?? []) {
      if (reverse.table === originEntry.name) {
        push(`${targetRef}.${env.identifier(reverse.referencedColumn)} = ${originRef}.${env.identifier(reverse.column)}`, 30);
      }
    }
  });
  const targetColumns = targetEntry?.columns ?? [];
  for (const [index, origin] of earlier.entries()) {
    const originColumns = originEntries[index]?.columns ?? [];
    for (const column of targetColumns) {
      // El mismo nombre como lo ve el motor (en Postgres, "Id" no es id).
      const same = originColumns.find((candidate) => env.nameMatches(column.label, true, candidate.label));
      if (same) {
        push(`${relationRef(origin)}.${env.identifier(same.label)} = ${targetRef}.${env.identifier(column.label)}`, 10);
      }
    }
  }
  return options;
}

// Columnas sin calificar con varias tablas en la sentencia: las de todas;
// si un nombre existe en mas de una, calificado (`tac.abon_codi`) para que la
// consulta no quede ambigua. Por encima del resto de lo que se ofrece.
function relationColumnOptions(env: SmartEnv, relations: StatementRelation[]): Completion[] {
  const tables = relations
    .map((relation) => ({
      relation,
      columns: resolveTable(env.tableIndex, relation, env.nameMatches)?.columns ?? [],
    }))
    .filter((item) => item.columns.length > 0);
  // Dos columnas son la misma como las ve el motor: en Postgres "Id" e id
  // son distintas; en MySQL, la misma.
  const caseSensitive = !env.nameMatches("A", true, "a");
  const nameKey = (name: string) => (caseSensitive ? name : name.toLowerCase());
  const count = new Map<string, number>();
  for (const { columns } of tables) {
    for (const column of columns) count.set(nameKey(column.label), (count.get(nameKey(column.label)) ?? 0) + 1);
  }
  const options: Completion[] = [];
  const seen = new Set<string>();
  for (const { relation, columns } of tables) {
    for (const column of columns) {
      const ambiguous = (count.get(nameKey(column.label)) ?? 0) > 1;
      const label = ambiguous ? `${relationRef(relation)}.${column.label}` : column.label;
      if (seen.has(nameKey(label))) continue;
      seen.add(nameKey(label));
      options.push({
        ...column,
        label,
        boost: (column.boost ?? 0) + 2,
        // Calificada: la referencia como se escribio y la columna como la lee
        // el motor.
        ...(ambiguous ? { apply: insertAs(`${relationRef(relation)}.${env.identifier(column.label)}`) } : {}),
      });
    }
  }
  return options;
}

const COLUMN_TYPES = new Set(["column", "column-pk", "column-fk"]);

function insertAs(text: string): NonNullable<Completion["apply"]> {
  return (view, _completion, from, to) => {
    view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length }, userEvent: "input.complete" });
  };
}

// Las tablas de los schemas que no son el por defecto, calificadas
// (`ventas.orders`), para el FROM y los JOIN: por debajo de las del schema
// de la conexion.
function otherSchemaTables(env: SmartEnv, info: StatementInfo): Completion[] {
  const options: Completion[] = [];
  for (const entry of env.tableIndex.byKey.values()) {
    if (entry.schema === env.defaultSchema) continue;
    const text = writtenName(env, entry.name, entry.schema);
    const option: Completion = {
      label: `${entry.schema}.${entry.name}`,
      type: entry.kind,
      detail: entry.schema,
      boost: boostFor(`table:${entry.name}`) - 2,
      apply: insertAs(text),
    };
    options.push(info.isQuery ? withAlias(option, env, info, entry.name, text) : option);
  }
  return options;
}

// "… ON a.id = b.id jo|": la condicion ya termino (lo anterior es un
// operando: un nombre, un numero, una comilla o un parentesis que cierra, y
// no una palabra que pide otra expresion), asi que "jo" empieza el
// siguiente JOIN.
function afterCompleteCondition(text: string, wordFrom: number): boolean {
  const before = text.slice(Math.max(0, wordFrom - 200), wordFrom);
  if (!/[\w`"')\]]\s+$/.test(before)) return false;
  return !/\b(on|and|or|not|in|is|like|between|when|then|else)\s+$/i.test(before);
}

// Relaciones/columnas del catalogo propio llevan un type por clase de
// objeto; "type" (nombre de schema
// intermedio) y "constant" (alias conocido) los agrega la propia libreria en
// completeFromSchema.
// Filtrar por esto es lo que hace que "SELECT * fro|"/"se|" dejen de
// ofrecer tablas sueltas sin tocar la resolucion de alias.columna (que pasa
// por la rama "qualified" de buildCompletionSource, sin filtrar).
function filterSchemaResult(result: CompletionResult | null, policy: CompletionPolicy): CompletionResult | null {
  if (!result) return null;
  if (policy.schemaMode === "fallback") return result;
  if (policy.schemaMode === "none") return null;

  const options = result.options.filter((option) => {
    if (option.type === "table" || option.type === "view" || option.type === "materializedView" || option.type === "schema" || option.type === "type") return policy.schemaMode === "relations";
    // "constant" (alias) y todo lo demas (columnas) son utiles para armar
    // una expresion ("alias.columna"), no para nombrar una relacion.
    return policy.schemaMode === "expressions";
  });

  if (options.length === 0) return null;
  return { ...result, options };
}

function rankKeywordResult(result: CompletionResult | null, policy: CompletionPolicy): CompletionResult | null {
  if (!result) return null;

  let options = result.options;
  if (policy.allowedKeywords) {
    const allowed = policy.allowedKeywords;
    options = options.filter((option) => allowed.has(option.label.toLowerCase()));
  }
  options = options.map((option) => {
    const extra = policy.keywordBoost(option.label);
    return extra === 0 ? option : { ...option, boost: (option.boost ?? 0) + extra };
  });

  if (options.length === 0) return null;
  return { ...result, options };
}

// Descripcion corta de las keywords mas usadas (texto gris del tooltip de
// autocompletado). Se traduce al armar cada fuente de completado, que
// SqlEditor.svelte vuelve a crear al cambiar el idioma.
const KEYWORD_DETAILS: Record<string, MessageKey> = {
  SELECT: "editor.completion.SELECT",
  INSERT: "editor.completion.INSERT",
  UPDATE: "editor.completion.UPDATE",
  DELETE: "editor.completion.DELETE",
  CREATE: "editor.completion.CREATE",
  ALTER: "editor.completion.ALTER",
  DROP: "editor.completion.DROP",
  FROM: "editor.completion.FROM",
  WHERE: "editor.completion.WHERE",
  JOIN: "editor.completion.JOIN",
  ON: "editor.completion.ON",
  GROUP: "editor.completion.GROUP",
  ORDER: "editor.completion.ORDER",
  HAVING: "editor.completion.HAVING",
  LIMIT: "editor.completion.LIMIT",
  CASE: "editor.completion.CASE",
  WHEN: "editor.completion.WHEN",
  WITH: "editor.completion.WITH",
  UNION: "editor.completion.UNION",
  VALUES: "editor.completion.VALUES",
};

// keywordCompletionSource (lang-sql) clasifica cada palabra del dialecto en
// un unico "type" generico: "keyword", "type" (INT, VARCHAR...) o "variable"
// (comandos de cliente como HELP/SOURCE). Eso deja a SELECT, FROM, WHERE,
// JOIN, etc. compartiendo el mismo icono generico de keyword en el tooltip.
// Este mapa les da un icono propio y con sentido semantico (ver
// sqlEditorIcons.css, clases cm-completionIcon-keyword-*) sin tocar como se
// filtran/rankean (sqlCompletionPolicy.ts sigue usando option.label, no
// option.type, para eso).
const KEYWORD_ICON_TYPES: Record<string, string> = {
  SELECT: "keyword-query",
  FROM: "keyword-source",
  WHERE: "keyword-filter",
  HAVING: "keyword-filter",
  JOIN: "keyword-join",
  ON: "keyword-join",
  GROUP: "keyword-group",
  ORDER: "keyword-sort",
  LIMIT: "keyword-limit",
  INSERT: "keyword-insert",
  VALUES: "keyword-insert",
  UPDATE: "keyword-update",
  DELETE: "keyword-remove",
  DROP: "keyword-remove",
  CREATE: "keyword-ddl",
  ALTER: "keyword-ddl",
  CASE: "keyword-branch",
  WHEN: "keyword-branch",
  WITH: "keyword-cte",
  UNION: "keyword-union",
};

function buildKeywordCompletion(label: string, type: string): Completion {
  const iconType = type === "keyword" ? (KEYWORD_ICON_TYPES[label] ?? type) : type;
  const detailKey = KEYWORD_DETAILS[label] ?? (type === "type" ? "editor.completion.sqlType" : undefined);
  return {
    label,
    type: iconType,
    detail: detailKey ? translate(detailKey) : undefined,
    boost: -1,
  };
}

function mergeCompatibleResults(
  schemaResult: CompletionResult | null,
  keywordResult: CompletionResult | null,
): CompletionResult | null {
  if (!schemaResult && !keywordResult) return null;
  if (!keywordResult) return schemaResult;
  if (!schemaResult) return keywordResult;

  if (schemaResult.from === keywordResult.from && schemaResult.to === keywordResult.to) {
    // Sin validFor a proposito: CodeMirror vuelve a pedir en cada edicion
    // relevante en vez de reusar un resultado ya filtrado para un contexto
    // que pudo haber cambiado (ver plan, fase 4 para un validFor consciente
    // del contexto una vez que esto se mida en uso real).
    return { from: schemaResult.from, to: schemaResult.to, options: [...schemaResult.options, ...keywordResult.options] };
  }

  // Rangos distintos (p.ej. una completion calificada que consume una
  // comilla de cierre extra): no se puede combinar sin romper el reemplazo
  // de texto de alguno de los dos, asi que se prioriza el de catalogo.
  return schemaResult.options.length > 0 ? schemaResult : keywordResult;
}

// Une schemaCompletionSource (tablas/columnas, con alias.columna resuelto),
// keywordCompletionSource (keywords propias del dialecto activo) y el
// completado de JOIN de arriba bajo una sola fuente, filtrando y boosteando
// segun la clausula SQL detectada (sqlContext.ts + sqlCompletionPolicy.ts).
// Es la unica desviacion de "que lo resuelva la libreria sola" de este
// archivo, y es necesaria: autocompletion({override}) es todo o nada, asi
// que una tercera fuente propia no se puede sumar al merge automatico que
// hace sql() por si sola sin que nosotros nos hagamos cargo del filtrado.
export function buildCompletionSource(options: {
  dialect: SQLDialect;
  // El SQL del motor de la conexion (lib/engines), o el estandar sin ella.
  engine: SqlProfile;
  schema: SQLNamespace;
  defaultSchema?: string;
  defaultTable?: string;
  fkIndex: FkIndex;
  tableIndex?: TableIndex;
  tableAliases?: TableAliasMode;
  catalogCompletions?: ReturnType<typeof buildCatalogCompletions>;
}): CompletionSource {
  const { dialect, engine, schema, defaultSchema, defaultTable, fkIndex } = options;
  const schemaSource = schemaCompletionSource({ dialect, schema, defaultSchema, defaultTable });
  const schemaNames = new Set(Object.keys(schema as Record<string, unknown>));
  // Las keywords se muestran e insertan en mayusculas. Identificadores del
  // catalogo conservan exactamente el nombre que entrega la base de datos.
  const keywordSource = keywordCompletionSource(dialect, true, buildKeywordCompletion);
  const catalog = options.catalogCompletions ?? buildCatalogCompletions([], engine, defaultSchema);
  const tablePrefixStart = prefixStartForNames([...(options.tableIndex?.byKey.values() ?? [])].map((entry) => entry.name));
  const env: SmartEnv = {
    lexical: engine.lexical,
    nameMatches: engine.nameMatches,
    identifier: engine.identifier,
    // Por el nombre exacto del catalogo (a una tabla se llega resolviendo lo
    // escrito con resolveTable).
    fkIndex,
    tableIndex: options.tableIndex ?? EMPTY_TABLE_INDEX,
    defaultSchema,
    reserved: new Set([...reservedWords(dialect), ...engine.reservedWords]),
    tableAliases: options.tableAliases ?? "always",
  };

  return async (context) => {
    // Solo la sentencia actual: con documentos enormes, nunca el texto
    // entero (ni el limite de classifyContext contado desde el inicio).
    const current = statementTextAt(context.state, context.pos);
    const clauseContext = classifyContext(current.text, current.offset, engine.lexical);
    const policy = completionPolicy(clauseContext, engine);
    const word = context.matchBefore(/\w*/);
    const catalogStart = catalog.prefixStart(current.text, current.offset);
    const baseWordFrom = current.offset - (context.pos - (word?.from ?? context.pos));
    const wordFrom = Math.min(baseWordFrom, catalogStart, tablePrefixStart(current.text, current.offset));
    const absoluteWordFrom = context.pos - (current.offset - wordFrom);
    const typing = !!word && (absoluteWordFrom < context.pos || context.explicit);
    const smart = current.text.length <= MAX_SMART_STATEMENT && clauseContext.confidence !== "unknown";
    const start = wordFrom;
    const info = smart && word ? statementInfo(current.text, { from: start, to: current.offset }, engine.lexical) : null;
    const target = current.text.length <= MAX_SMART_STATEMENT
      ? catalogPosition(current.text, start, engine, clauseContext.position)
      : { position: "unknown" as const };
    const relationQualifier = !!target.schema && !!info?.relations.some((relation) =>
      engine.nameMatches(target.schema!, target.schemaQuoted ?? false, relation.alias ?? relation.table),
    );
    const schemaQualified = !!target.schema && !relationQualifier && catalog.hasSchema(target.schema, target.schemaQuoted);
    // Tras "schema." en CALL o DDL de rutinas, la lista sale con solo el punto.
    const routineAfterDot = schemaQualified && ["call", "procedure", "function", "routine"].includes(target.position);
    const catalogResult = word && (typing || routineAfterDot) && current.text.length <= MAX_SMART_STATEMENT && clauseContext.lexical === "code" && clauseContext.position !== "statement-start" && clauseContext.position !== "alias" && clauseContext.position !== "select-tail" && clauseContext.position !== "relation-tail" && clauseContext.position !== "keyword-continuation"
      ? catalog.complete(target.position, absoluteWordFrom, schemaQualified ? target.schema : undefined, target.schemaQuoted)
      : null;

    // "alias.columna"/"schema.tabla" ya escritos: la libreria resuelve esto
    // mejor de lo que nosotros podriamos, no hay que filtrarlo.
    if (clauseContext.qualified && !schemaQualified) {
      return schemaSource(context);
    }

    const [rawSchema, keywordResultRaw] = await Promise.all([schemaSource(context), keywordSource(context)]);
    const schemaResultRaw = rawSchema && {
      ...rawSchema,
      options: rawSchema.options.map((option) => option.type === "type" && schemaNames.has(option.label) ? { ...option, type: "schema" } : option),
    };
    const schemaMode = target.position === "relation" ? "relations" : target.position === "expression" || target.position === "function" ? "expressions" : target.position === "unknown" ? policy.schemaMode : "none";
    let schemaResult = filterSchemaResult(schemaResultRaw, { ...policy, schemaMode });
    if (schemaResult && target.position === "relation" && absoluteWordFrom < schemaResult.from) {
      schemaResult = { ...schemaResult, from: absoluteWordFrom };
    }
    if (schemaQualified && target.position === "unknown") schemaResult = filterSchemaResult(schemaResultRaw, { ...policy, schemaMode: "relations" });
    if (schemaQualified && target.position === "relation") schemaResult = filterSchemaResult(schemaResultRaw, { ...policy, schemaMode: "relations" });
    const extra: Completion[] = [];
    // La keyword JOIN sola, por encima de los JOIN completos.
    let joinFirst = false;

    if (info && word && typing) {
      const { position, clause } = clauseContext;
      const writingJoin =
        word.from < word.to &&
        "join".startsWith(current.text.slice(start, current.offset).toLowerCase()) &&
        (position === "relation-tail" ||
          (position === "keyword-continuation" && clauseContext.pendingKeyword === "join") ||
          (position === "expression" && clause === "on" && afterCompleteCondition(current.text, start)));
      if (writingJoin && info.relations.length > 0) {
        extra.push(...joinOptions(env, info, true));
        joinFirst = true;
      }

      if (position === "relation-target") {
        if (clause === "join") extra.push(...joinOptions(env, info, false));
        // Las de otros schemas, calificadas.
        extra.push(...otherSchemaTables(env, info));
        // La tabla elegida, con su alias.
        if (schemaResult && info.isQuery) {
          const result: CompletionResult = schemaResult;
          schemaResult = {
            ...result,
            options: result.options.map((option) => (["table", "view", "materializedView"].includes(option.type ?? "") ? withAlias(option, env, info) : option)),
          };
        }
      }

      if (position === "expression") {
        if (clause === "on") extra.push(...onOptions(env, current.text, start));
        // Varias tablas: sus columnas (calificadas si son ambiguas) en vez de
        // solo las de la primera.
        if (info.relations.length > 1) {
          if (schemaResult) {
            const result: CompletionResult = schemaResult;
            schemaResult = { ...result, options: result.options.filter((option) => !COLUMN_TYPES.has(option.type ?? "")) };
          }
          extra.push(...relationColumnOptions(env, info.relations));
        }
      }
    }

    const extraResult: CompletionResult | null = extra.length > 0 && word ? { from: word.from, options: extra } : null;
    const withExtra = mergeCompatibleResults(mergeCompatibleResults(schemaResult, catalogResult), extraResult);
    let keywordResult = schemaQualified ? null : rankKeywordResult(keywordResultRaw, policy);
    // Tras CALL solo hay procedures; tras DROP|ALTER PROCEDURE|FUNCTION, ademas
    // IF y EXISTS.
    if (keywordResult && (target.position === "call" || target.position === "procedure" || target.position === "function" || target.position === "routine")) {
      const keep = target.position === "call" ? /^$/ : /^(?:IF|EXISTS)$/i;
      const options = keywordResult.options.filter((option) => keep.test(option.label));
      keywordResult = options.length > 0 ? { ...keywordResult, options } : null;
    }
    if (keywordResult && catalogResult) {
      const functions = new Set(catalogResult.options.filter((option) => option.type === "function").map((option) => option.label.toLowerCase()));
      keywordResult = { ...keywordResult, options: keywordResult.options.filter((option) => !functions.has(option.label.toLowerCase())) };
      if (keywordResult.options.length === 0) keywordResult = null;
    }
    if (joinFirst && keywordResult) {
      const result: CompletionResult = keywordResult;
      keywordResult = {
        ...result,
        options: result.options.map((option) =>
          option.label === "JOIN" ? { ...option, boost: Math.max(option.boost ?? 0, 40) } : option,
        ),
      };
    }
    return mergeCompatibleResults(withExtra, keywordResult);
  };
}
