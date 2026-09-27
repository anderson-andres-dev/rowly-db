import type { Completion, CompletionResult, CompletionSource } from "@codemirror/autocomplete";
import {
  MariaSQL,
  MySQL,
  PostgreSQL,
  keywordCompletionSource,
  schemaCompletionSource,
  type SQLDialect,
  type SQLNamespace,
} from "@codemirror/lang-sql";
import { foldNodeProp } from "@codemirror/language";
import type { ConnectionDriver } from "$lib/connections";
import type { CatalogTable, ForeignKey } from "$lib/types";
import { boostFor, recordUsage } from "$lib/usageStats";
import { classifyContext } from "$lib/sqlContext";
import { statementTextAt } from "$lib/sqlStatementIndex";
import { translate, type MessageKey } from "$lib/i18n";
import { completionPolicy, type CompletionPolicy } from "$lib/sqlCompletionPolicy";

// @codemirror/lang-sql pliega cada "Statement" de nivel superior desde
// min(inicio + 100, fin de su primera linea) hasta su fin. Con una consulta
// escrita a mano cuya primera linea es solo "SELECT" (formato habitual, ej.
// DataGrip), ese min() cae en el fin de la linea 1 - dejando TODA la
// sentencia como una unica region plegable anclada ahi (chevron en la
// linea 1, la consulta entera "colapsable" como si fuera una sola linea).
// Se anula solo el fold de Statement via configureLanguage (BlockComment
// se preserva), sin tocar basicSetup ni foldGutter/foldKeymap.
const NO_STATEMENT_FOLD = foldNodeProp.add({ Statement: () => null });
const dialectCache = new Map<ConnectionDriver, SQLDialect>();

export function dialectFor(driver: ConnectionDriver): SQLDialect {
  const cached = dialectCache.get(driver);
  if (cached) return cached;
  const base = driver === "mariadb" ? MariaSQL : driver === "postgres" ? PostgreSQL : MySQL;
  const configured = base.configureLanguage({ props: [NO_STATEMENT_FOLD] });
  dialectCache.set(driver, configured);
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

function applyAndRecord(key: string): NonNullable<Completion["apply"]> {
  return (view, completion, from, to) => {
    recordUsage(key);
    view.dispatch({
      changes: { from, to, insert: completion.label },
      selection: { anchor: from + completion.label.length },
    });
  };
}

// Traduce el catalogo (tablas + columnas) al SQLNamespace que espera
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
export function buildSqlSchema(tables: CatalogTable[]): {
  schema: SQLNamespace;
  defaultSchema?: string;
  fkIndex: FkIndex;
} {
  const schema: Record<string, Record<string, { self: Completion; children: Completion[] }>> = {};
  const schemaNames = new Set<string>();

  for (const table of tables) {
    schemaNames.add(table.schema);
    schema[table.schema] ??= {};
    // "type" distingue PK/FK (icono propio en el tooltip de autocompletado,
    // ver sqlEditorIcons.css) del resto de columnas - mismo criterio que
    // ColumnCatalogInfo en Workspace.svelte para el grid de resultados.
    const fkColumns = new Set(table.foreignKeys.map((fk) => fk.column.toLowerCase()));
    schema[table.schema][table.name] = {
      self: {
        label: table.name,
        type: "table",
        detail: table.schema,
        boost: boostFor(`table:${table.name}`),
        apply: applyAndRecord(`table:${table.name}`),
      },
      children: table.columns.map((column) => ({
        label: column.name,
        type: column.isPrimaryKey ? "column-pk" : fkColumns.has(column.name.toLowerCase()) ? "column-fk" : "column",
        detail: column.dataType,
        boost: boostFor(`column:${table.name}.${column.name}`),
        apply: applyAndRecord(`column:${table.name}.${column.name}`),
      })),
    };
  }

  // Hoy cada conexion introspecta un unico schema (el nombre de la BD en
  // MySQL, "public" en Postgres, ver catalog_adapter.rs), asi que aplanarlo
  // como defaultSchema evita tener que escribir "core.tabla". Si el catalogo
  // llega a traer varios, se completan calificados sin tocar este codigo.
  const defaultSchema = schemaNames.size === 1 ? [...schemaNames][0] : undefined;
  return { schema, defaultSchema, fkIndex: buildFkIndex(tables) };
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

function applyForwardJoin(fromRef: string, fk: ForeignKey): NonNullable<Completion["apply"]> {
  return (view, _completion, from, to) => {
    recordUsage(`table:${fk.referencedTable}`);
    const insert = `${fk.referencedTable} ON ${fromRef}.${fk.column} = ${fk.referencedTable}.${fk.referencedColumn}`;
    view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + insert.length } });
  };
}

function applyReverseJoin(fromRef: string, rel: FkRelation): NonNullable<Completion["apply"]> {
  return (view, _completion, from, to) => {
    recordUsage(`table:${rel.table}`);
    const insert = `${rel.table} ON ${fromRef}.${rel.referencedColumn} = ${rel.table}.${rel.column}`;
    view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + insert.length } });
  };
}

// Fuente de completado dedicada a "acabas de escribir JOIN": si la tabla del
// FROM actual tiene relaciones FK (en cualquier direccion) con otras tablas
// del catalogo, las sugiere primero y su apply() inserta la clausula JOIN
// completa con el ON ya resuelto, en vez de solo el nombre de la tabla.
function buildJoinCompletionSource(fkIndex: FkIndex): CompletionSource {
  return (context) => {
    const word = context.matchBefore(/\w*/);
    if (!word) return null;
    if (word.from === word.to && !context.explicit) return null;

    const before = context.state.doc.sliceString(Math.max(0, word.from - 10), word.from);
    if (!/\bjoin\s+$/i.test(before)) return null;

    const current = statementTextAt(context.state, word.from);
    const fromContext = extractFromContext(current.text, current.offset);
    if (!fromContext) return null;

    const related = fkIndex.get(fromContext.table);
    if (!related || (related.forward.length === 0 && related.reverse.length === 0)) return null;

    const fromRef = fromContext.alias ?? fromContext.table;
    const options: Completion[] = [
      ...related.forward.map((fk) => ({
        label: fk.referencedTable,
        displayLabel: `${fk.referencedTable} ON ${fromRef}.${fk.column} = ${fk.referencedTable}.${fk.referencedColumn}`,
        type: "table",
        detail: "FK",
        boost: 1,
        apply: applyForwardJoin(fromRef, fk),
      })),
      ...related.reverse.map((rel) => ({
        label: rel.table,
        displayLabel: `${rel.table} ON ${fromRef}.${rel.referencedColumn} = ${rel.table}.${rel.column}`,
        type: "table",
        detail: "FK",
        boost: 1,
        apply: applyReverseJoin(fromRef, rel),
      })),
    ];

    return { from: word.from, options, validFor: /^\w*$/ };
  };
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

function findTableColumns(schema: SQLNamespace, defaultSchema: string | undefined, tableName: string): Completion[] {
  return findTableEntry(schema, defaultSchema, tableName)?.children ?? [];
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

// Fuente de completado para columnas sin calificar cuando hay mas de una
// tabla en la sentencia (JOIN). La primera tabla (la del FROM) ya la
// resuelve schemaCompletionSource via defaultTable (ver comentario grande
// mas arriba); esta fuente cubre el resto - sin ella, "SELECT | FROM a JOIN
// b" solo sugeriria columnas de "a".
function buildMultiTableCompletionSource(schema: SQLNamespace, defaultSchema: string | undefined): CompletionSource {
  return (context) => {
    const word = context.matchBefore(/\w*/);
    if (!word) return null;
    if (word.from === word.to && !context.explicit) return null;

    const current = statementTextAt(context.state, word.from);
    const relations = extractFromTables(current.text, current.offset);
    if (relations.length <= 1) return null;

    const seen = new Set<string>();
    const options: Completion[] = [];
    for (const relation of relations.slice(1)) {
      for (const column of findTableColumns(schema, defaultSchema, relation.table)) {
        if (seen.has(column.label)) continue;
        seen.add(column.label);
        options.push(column);
      }
    }
    if (options.length === 0) return null;

    return { from: word.from, options };
  };
}

// Tablas/columnas del catalogo propio (buildSqlSchema) solo llevan type
// "table"/"column"/"column-pk"/"column-fk"; "type" (nombre de schema
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
    if (option.type === "table" || option.type === "type") return policy.schemaMode === "relations";
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
  driver: ConnectionDriver;
  schema: SQLNamespace;
  defaultSchema?: string;
  defaultTable?: string;
  fkIndex: FkIndex;
}): CompletionSource {
  const { dialect, driver, schema, defaultSchema, defaultTable, fkIndex } = options;
  const schemaSource = schemaCompletionSource({ dialect, schema, defaultSchema, defaultTable });
  // Las keywords se muestran e insertan en mayusculas. Identificadores del
  // catalogo conservan exactamente el nombre que entrega la base de datos.
  const keywordSource = keywordCompletionSource(dialect, true, buildKeywordCompletion);
  const joinSource = buildJoinCompletionSource(fkIndex);
  const multiTableSource = buildMultiTableCompletionSource(schema, defaultSchema);

  return async (context) => {
    // Solo la sentencia actual: con documentos enormes, nunca el texto
    // entero (ni el limite de classifyContext contado desde el inicio).
    const current = statementTextAt(context.state, context.pos);
    const clauseContext = classifyContext(current.text, current.offset);
    const policy = completionPolicy(clauseContext, driver);

    if (policy.allowFkJoin) {
      const joinResult = await joinSource(context);
      if (joinResult) return joinResult;
    }

    // "alias.columna"/"schema.tabla" ya escritos: la libreria resuelve esto
    // mejor de lo que nosotros podriamos, no hay que filtrarlo.
    if (clauseContext.qualified) {
      return schemaSource(context);
    }

    // Columnas sin calificar: solo tienen sentido donde ya se permiten
    // expresiones (mismo criterio que filterSchemaResult para "columna").
    const wantsColumns = policy.schemaMode === "expressions" || policy.schemaMode === "fallback";

    const [schemaResultRaw, keywordResultRaw, multiTableResultRaw] = await Promise.all([
      schemaSource(context),
      keywordSource(context),
      wantsColumns ? multiTableSource(context) : Promise.resolve(null),
    ]);

    const withMultiTable = mergeCompatibleResults(filterSchemaResult(schemaResultRaw, policy), multiTableResultRaw);
    return mergeCompatibleResults(withMultiTable, rankKeywordResult(keywordResultRaw, policy));
  };
}
