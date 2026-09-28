import type { DatabaseExplorer, ExplorerTable, SchemaObjects } from "$lib/types";

// Arbol del explorador de base de datos (SchemaTree.svelte), armado de forma
// pura a partir de lo que devuelve el backend para que el componente solo
// tenga que pintarlo. La estructura sigue a DataGrip:
//
//   schema
//     tables / views / materialized views   → columns, keys, foreign keys,
//                                              indexes, triggers, checks
//     routines / sequences / events
//
// Solo aparecen las carpetas con algo adentro, cada una con su contador.

export type ExplorerIcon =
  | "pinned"
  | "schema"
  | "folder"
  | "table"
  | "view"
  | "materializedView"
  | "column"
  | "columnPrimaryKey"
  | "key"
  | "primaryKey"
  | "foreignKey"
  | "index"
  | "trigger"
  | "check"
  | "procedure"
  | "function"
  | "sequence"
  | "event";

export interface ExplorerNode {
  // Unica en todo el arbol y estable entre recargas: identifica el nodo
  // para recordar si esta abierto.
  key: string;
  label: string;
  icon: ExplorerIcon;
  // Texto secundario en gris (tipo de columna, firma de rutina...).
  detail?: string;
  count?: number;
  // Tooltip: comentario del objeto, o el texto completo si se recorta.
  title?: string;
  // Solo en schemas: avisos de categorias que no se pudieron leer.
  warnings?: string[];
  // Abierto al cargar el arbol sin filtro (schema y su carpeta "tables").
  defaultOpen?: boolean;
  // Abierto mientras hay un filtro activo, para ver las coincidencias sin
  // desplegar el interior de cada tabla (schemas y carpetas por tipo).
  openOnFilter?: boolean;
  // Solo en tablas y vistas: cual es (doble clic la abre en una pestaña).
  relation?: { schema: string; name: string };
  // Tabla o vista fijada (se marca con un alfiler, y en la carpeta de
  // fijadas el mismo boton la quita).
  pinned?: boolean;
  children?: ExplorerNode[];
}

function folder(
  key: string,
  label: string,
  children: ExplorerNode[],
  options: Partial<ExplorerNode> = {},
): ExplorerNode[] {
  if (children.length === 0) return [];
  return [{ key, label, icon: "folder", count: children.length, children, ...options }];
}

function columnList(columns: string[]): string {
  return `(${columns.join(", ")})`;
}

function tableNode(table: ExplorerTable, parentKey: string): ExplorerNode {
  const key = `${parentKey}/${table.name}`;

  const columns = table.columns.map(
    (column): ExplorerNode => ({
      key: `${key}/column:${column.name}`,
      label: column.name,
      icon: column.isPrimaryKey ? "columnPrimaryKey" : "column",
      detail: column.dataType + (column.nullable ? "" : " not null"),
      title: column.comment ?? undefined,
    }),
  );

  const keys = table.keys.map(
    (tableKey): ExplorerNode => ({
      key: `${key}/key:${tableKey.name}`,
      label: tableKey.name,
      icon: tableKey.primary ? "primaryKey" : "key",
      detail: columnList(tableKey.columns),
    }),
  );

  // Una FK de varias columnas llega como una fila por columna con el mismo
  // nombre (asi la quiere el autocompletado); aca se vuelve a agrupar.
  const foreignKeysByName = new Map<string, { columns: string[]; table: string; referenced: string[] }>();
  for (const fk of table.foreignKeys) {
    const entry = foreignKeysByName.get(fk.name) ?? { columns: [], table: fk.referencedTable, referenced: [] };
    entry.columns.push(fk.column);
    entry.referenced.push(fk.referencedColumn);
    foreignKeysByName.set(fk.name, entry);
  }
  const foreignKeys = [...foreignKeysByName].map(
    ([name, fk]): ExplorerNode => ({
      key: `${key}/fk:${name}`,
      label: name,
      icon: "foreignKey",
      detail: `${columnList(fk.columns)} → ${fk.table}${columnList(fk.referenced)}`,
    }),
  );

  const indexes = table.indexes.map(
    (index): ExplorerNode => ({
      key: `${key}/index:${index.name}`,
      label: index.name,
      icon: "index",
      detail: (index.unique ? "unique " : "") + columnList(index.columns),
    }),
  );

  const triggers = table.triggers.map(
    (trigger): ExplorerNode => ({
      key: `${key}/trigger:${trigger.name}`,
      label: trigger.name,
      icon: "trigger",
      detail: `${trigger.timing} ${trigger.events.join(" OR ")}`,
    }),
  );

  const checks = table.checks.map(
    (check): ExplorerNode => ({
      key: `${key}/check:${check.name}`,
      label: check.name,
      icon: "check",
      detail: check.expression,
      title: check.expression,
    }),
  );

  return {
    relation: { schema: table.schema, name: table.name },
    key,
    label: table.name,
    icon: table.kind,
    title: table.comment ?? undefined,
    children: [
      ...folder(`${key}/columns`, "columns", columns),
      ...folder(`${key}/keys`, "keys", keys),
      ...folder(`${key}/foreign keys`, "foreign keys", foreignKeys),
      ...folder(`${key}/indexes`, "indexes", indexes),
      ...folder(`${key}/triggers`, "triggers", triggers),
      ...folder(`${key}/checks`, "checks", checks),
    ],
  };
}

function matches(name: string, query: string): boolean {
  return query === "" || name.toLowerCase().includes(query);
}

type PinnedSet = ReadonlySet<string>;

function pinKey(schema: string, name: string): string {
  return `${schema}\u0000${name}`;
}

function schemaNode(objects: SchemaObjects, isDefault: boolean, query: string, pinned: PinnedSet): ExplorerNode | null {
  const key = `schema:${objects.schema}`;
  const relations = (kind: ExplorerTable["kind"], folderKey: string) =>
    objects.tables
      .filter((table) => table.kind === kind && matches(table.name, query))
      .map((table) => ({
        ...tableNode(table, `${key}/${folderKey}`),
        pinned: pinned.has(pinKey(table.schema, table.name)),
      }));

  const routines = objects.routines
    .filter((routine) => matches(routine.name, query))
    .map((routine): ExplorerNode => {
      const signature = `(${routine.arguments})` + (routine.returnType ? `: ${routine.returnType}` : "");
      return {
        // Postgres admite sobrecargas: el nombre solo no es unico.
        key: `${key}/routines/${routine.name}${signature}`,
        label: routine.name,
        icon: routine.kind,
        detail: signature,
        title: `${routine.name}${signature}`,
      };
    });

  const sequences = objects.sequences
    .filter((sequence) => matches(sequence.name, query))
    .map(
      (sequence): ExplorerNode => ({
        key: `${key}/sequences/${sequence.name}`,
        label: sequence.name,
        icon: "sequence",
        detail: sequence.dataType ?? undefined,
      }),
    );

  const events = objects.events
    .filter((event) => matches(event.name, query))
    .map(
      (event): ExplorerNode => ({
        key: `${key}/events/${event.name}`,
        label: event.name,
        icon: "event",
        detail: event.status === "ENABLED" ? event.schedule : `${event.schedule} · ${event.status.toLowerCase()}`,
      }),
    );

  const children = [
    ...folder(`${key}/tables`, "tables", relations("table", "tables"), {
      defaultOpen: isDefault,
      openOnFilter: true,
    }),
    ...folder(`${key}/views`, "views", relations("view", "views"), { openOnFilter: true }),
    ...folder(`${key}/materialized views`, "materialized views", relations("materializedView", "materialized views"), {
      openOnFilter: true,
    }),
    ...folder(`${key}/routines`, "routines", routines, { openOnFilter: true }),
    ...folder(`${key}/sequences`, "sequences", sequences, { openOnFilter: true }),
    ...folder(`${key}/events`, "events", events, { openOnFilter: true }),
  ];

  // Con filtro, un schema sin coincidencias se oculta; sin filtro se muestra
  // aunque este vacio (p.ej. uno recien creado, o uno que no se pudo leer).
  if (query !== "" && children.length === 0) return null;

  return {
    key,
    label: objects.schema,
    icon: "schema",
    warnings: objects.warnings.length > 0 ? objects.warnings : undefined,
    defaultOpen: isDefault,
    openOnFilter: true,
    children,
  };
}

// `pinned`: tablas fijadas de la conexion (en el orden en que se fijaron).
// Van primero, en una carpeta propia abierta, y ademas quedan marcadas en su
// lugar del arbol. Las que no estan cargadas (schema oculto, tabla borrada)
// no aparecen. `pinnedLabel`: el nombre de la carpeta, ya traducido.
export function buildExplorerTree(
  explorer: DatabaseExplorer,
  filter: string,
  pinned: { schema: string; name: string }[] = [],
  pinnedLabel = "pinned",
): ExplorerNode[] {
  const query = filter.trim().toLowerCase();
  const pinnedSet = new Set(pinned.map((item) => pinKey(item.schema, item.name)));
  const manySchemas = explorer.schemas.length > 1;
  const pinnedNodes = pinned
    .map((item): ExplorerNode | null => {
      const table = explorer.schemas
        .find((objects) => objects.schema === item.schema)
        ?.tables.find((candidate) => candidate.name === item.name);
      if (!table || !matches(table.name, query)) return null;
      return {
        ...tableNode(table, "pinned"),
        // Con varios schemas, el de la tabla va al lado para distinguirla.
        detail: manySchemas ? table.schema : undefined,
        pinned: true,
      };
    })
    .filter((node): node is ExplorerNode => node !== null);
  const schemas = explorer.schemas
    .map((objects) => schemaNode(objects, objects.schema === explorer.defaultSchema, query, pinnedSet))
    .filter((node): node is ExplorerNode => node !== null);
  return [
    ...folder("pinned", pinnedLabel, pinnedNodes, { icon: "pinned", defaultOpen: true, openOnFilter: true }),
    ...schemas,
  ];
}

// Todas las claves de nodos con hijos, recorriendo el arbol completo (para
// "colapsar todo"). `maxDepth` corta el recorrido: 0 = solo la raiz.
export function expandableKeys(nodes: ExplorerNode[], maxDepth = Infinity, depth = 0): string[] {
  const keys: string[] = [];
  for (const node of nodes) {
    if (!node.children || node.children.length === 0) continue;
    keys.push(node.key);
    if (depth < maxDepth) keys.push(...expandableKeys(node.children, maxDepth, depth + 1));
  }
  return keys;
}
