export interface CatalogColumn {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  comment?: string;
}

// Metadata de catalogo emparejada a una columna del RESULTADO de una
// consulta (por nombre, contra la tabla principal del FROM) — no viene del
// backend en QueryColumn, se resuelve en el frontend a partir de lo que ya
// hay en catalogTables. Ver Workspace.svelte.
export interface ColumnCatalogInfo {
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  comment?: string;
}

export interface ForeignKey {
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface CatalogTable {
  schema: string;
  name: string;
  columns: CatalogColumn[];
  foreignKeys: ForeignKey[];
}

// --- Explorador de base de datos -------------------------------------------
// Espejo de SchemaObjects y compañia en khipu-driver-core (serde camelCase).
// A diferencia de CatalogTable (pensado para el autocompletado), trae todo
// lo que muestra el arbol del sidebar: tipo de relacion, claves, indices,
// triggers, rutinas...

export type RelationKind = "table" | "view" | "materializedView";

export interface ExplorerColumn {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  comment?: string | null;
}

export interface ExplorerForeignKey {
  name: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface ExplorerKey {
  name: string;
  columns: string[];
  primary: boolean;
}

export interface ExplorerIndex {
  name: string;
  columns: string[];
  unique: boolean;
  primary: boolean;
  method?: string | null;
}

export interface ExplorerTrigger {
  name: string;
  timing: string;
  events: string[];
}

export interface ExplorerCheck {
  name: string;
  expression: string;
}

export interface ExplorerTable {
  schema: string;
  name: string;
  kind: RelationKind;
  comment?: string | null;
  columns: ExplorerColumn[];
  foreignKeys: ExplorerForeignKey[];
  keys: ExplorerKey[];
  indexes: ExplorerIndex[];
  triggers: ExplorerTrigger[];
  checks: ExplorerCheck[];
}

export interface ExplorerRoutine {
  name: string;
  kind: "procedure" | "function";
  arguments: string;
  returnType?: string | null;
  // Uno por uno, para los hints de parametros (sqlCallHints.ts). Puede faltar
  // con un backend viejo.
  parameters?: RoutineParameter[];
}

export interface RoutineParameter {
  // Postgres permite parametros sin nombre.
  name: string | null;
  mode: "in" | "out" | "inOut" | "variadic";
  dataType: string;
  // Se puede omitir en la llamada (DEFAULT en Postgres).
  hasDefault: boolean;
}

export interface ExplorerSequence {
  name: string;
  dataType?: string | null;
}

export interface ExplorerEvent {
  name: string;
  status: string;
  schedule: string;
}

export interface SchemaObjects {
  schema: string;
  tables: ExplorerTable[];
  routines: ExplorerRoutine[];
  sequences: ExplorerSequence[];
  events: ExplorerEvent[];
  warnings: string[];
}

// Espejo de TlsMode / TlsStatus en khipu-driver-core. "auto" intenta TLS y,
// si la negociacion falla, conecta sin cifrar (fellBack = true).
export type TlsMode = "auto" | "required" | "verifyCa" | "verifyIdentity" | "disabled";

export interface TlsStatus {
  // null = no se pudo averiguar (sin permisos para leer el estado).
  encrypted: boolean | null;
  // Protocolo y cifrado, p.ej. "TLSv1.3 · TLS_AES_256_GCM_SHA384".
  detail: string | null;
  fellBack: boolean;
}

// Por que fallo conectar (ConnectionErrorKind en driver-core): la app lo
// explica en su idioma (connectionErrors.ts) y el detalle tecnico queda para
// copiar.
export type ConnectionErrorKind =
  | "authFailed"
  | "accessDenied"
  | "unknownDatabase"
  | "hostNotFound"
  | "refused"
  | "unreachable"
  | "timeout"
  | "tlsUnavailable"
  | "tlsIncompatible"
  | "tlsCertificate"
  | "other";

export interface ConnectionFailure {
  kind: ConnectionErrorKind;
  detail: string;
}

// Lo que devuelve "Probar conexion" (test_connection en src-tauri).
export interface TestConnectionReport {
  serverVersion: string;
  defaultSchema: string | null;
  latencyMs: number | null;
  tls: TlsStatus;
}

export interface DatabaseExplorer {
  serverVersion: string;
  tls: TlsStatus;
  defaultSchema: string;
  availableSchemas: string[];
  // El schema por defecto primero, el resto en orden alfabetico.
  schemas: SchemaObjects[];
}

export interface QueryColumn {
  name: string;
  type: string;
  nullable?: boolean;
}

// `null` es un NULL real; toda otra celda (incluyendo los strings literales
// "NULL", "" y "0") llega como string, para no perder precision en
// DECIMAL/enteros grandes ni confundir un NULL real con su representacion
// textual.
export type QueryValue = string | null;
export type QueryRow = QueryValue[];

export type QueryExecutionResult =
  | {
      type: "resultSet";
      columns: QueryColumn[];
      rows: QueryRow[];
      rowCount: number;
      executionTimeMs: number;
      truncated: boolean;
    }
  | {
      type: "command";
      affectedRows: number;
      executionTimeMs: number;
    }
  | {
      type: "error";
      message: string;
      code?: string;
      position?: number;
    };

export type DestructiveStatement =
  | "deleteWithoutWhere"
  | "updateWithoutWhere"
  | "truncate"
  | "dropTable"
  | "dropSchema"
  | "dropDatabase"
  | "dropColumn"
  // Cualquier escritura en una conexion marcada como Produccion.
  | "writeInProduction";

// Como se ubican las filas devueltas dentro del resultado completo.
// pageable: false -> la sentencia no se pudo paginar (SHOW, FOR UPDATE...),
// solo existe la primera pagina.
export interface ResultPage {
  offset: number;
  pageSize: number;
  pageable: boolean;
  // Se puede ordenar desde los encabezados (la consulta admite ORDER BY).
  sortable?: boolean;
}

// Orden pedido desde un encabezado del grid: columna (base 0) y sentido.
export interface SortKey {
  column: number;
  descending: boolean;
}

export type ExecuteQueryResponse =
  | { type: "confirmationRequired"; statement: DestructiveStatement }
  | { type: "completed"; result: QueryExecutionResult; page?: ResultPage };
