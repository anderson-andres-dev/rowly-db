import { isFilterOperator, type FilterCondition } from "$lib/filterBuilder";
import { browser } from "$app/environment";
import { get, writable } from "svelte/store";
import { translate, type Translate } from "$lib/i18n";
import { invoke } from "$lib/backend";
import { notifyError } from "$lib/stores/notifications";
import type { DestructiveStatement, QueryExecutionResult, ResultPage, SortKey } from "$lib/types";

const STORAGE_KEY = "khipu:query-consoles:v1";

export interface QueryConsole {
  id: string;
  profileId: string;
  title: string;
  sql: string;
  // Ruta absoluta del .sql en disco si la pestaña es un archivo; null para
  // una consola. Consolas y archivos usan el mismo editor y se ejecutan
  // igual contra la conexion activa.
  filePath: string | null;
  // Contenido del archivo tal como esta en disco (ultimo abierto/guardado).
  // El texto en edicion (sql) se persiste igual para no perder nada al
  // recargar; la pestaña marca cambios mientras difieren. En una consola no
  // se usa.
  savedSql: string;
  // Al arrancar, el texto de una consola grande todavia se esta leyendo del
  // disco (ver hydrateLargeTexts): no se monta el editor hasta tenerlo.
  textPending?: boolean;
  // Pestaña de TABLA (doble clic en el explorador): muestra los datos de la
  // tabla a pantalla completa, sin editor, con filtros WHERE / ORDER BY. En
  // una consola o un archivo es null.
  table: TableTab | null;
}

export interface TableTab {
  schema: string;
  name: string;
  // El WHERE aplicado (lo que se ejecuta), armado por el constructor.
  where: string;
  // Las condiciones del constructor visual.
  conditions: FilterCondition[];
}

function parseCondition(value: unknown): FilterCondition | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<FilterCondition>;
  if (typeof candidate.column !== "string" || !isFilterOperator(candidate.operator)) return null;
  return {
    id: typeof candidate.id === "string" ? candidate.id : crypto.randomUUID(),
    join: candidate.join === "or" ? "or" : "and",
    column: candidate.column,
    operator: candidate.operator,
    value: typeof candidate.value === "string" ? candidate.value : "",
    value2: typeof candidate.value2 === "string" ? candidate.value2 : "",
  };
}

export interface PendingQueryConfirmation {
  sql: string;
  statement: DestructiveStatement;
  // Un script: se confirma una sola vez antes de ejecutar nada. Cada
  // sentencia lleva su confirmacion (null = no la necesita).
  script?: { statements: string[]; confirmations: (DestructiveStatement | null)[] };
}

// Estado transitorio de ejecucion por consola. Vive en el mismo store que
// QueryConsole por comodidad, pero nunca se persiste (ver el subscribe() mas
// abajo, que serializa solo un subconjunto de campos): resultados y
// confirmaciones pendientes no deben sobrevivir a un refresh ni ocupar
// localStorage con datos de la base.
export interface QueryExecutionState {
  isExecuting: boolean;
  result: QueryExecutionResult | null;
  // El SQL que produjo `result`, capturado en la ejecucion — no el texto
  // vigente del editor, que puede haber cambiado desde entonces. Sirve para
  // rotular a que consulta pertenece el resultado (p.ej. de que tabla es).
  resultSql: string | null;
  // Momento (epoch ms) en que termino la ejecucion que produjo `result`:
  // el panel de resultados lo muestra como marca de tiempo del log.
  resultAt: number | null;
  // Pagina que muestra `result` (null si no es un conjunto de filas).
  page: ResultPage | null;
  // Total de filas de resultSql, si se conoce: porque la consulta cupo en
  // una pagina, porque se llego a la ultima, o porque el usuario pidio el
  // COUNT(*). Se conserva al cambiar de pagina (es la misma consulta).
  totalRows: number | null;
  counting: boolean;
  // Orden elegido en los encabezados (vacio = el de la consulta). Se
  // mantiene al paginar y recargar; una ejecucion nueva lo vacia.
  sort: SortKey[];
  pendingConfirmation: PendingQueryConfirmation | null;
}

const EMPTY_EXECUTION_STATE: QueryExecutionState = {
  isExecuting: false,
  result: null,
  resultSql: null,
  resultAt: null,
  page: null,
  totalRows: null,
  counting: false,
  sort: [],
  pendingConfirmation: null,
};

interface QueryConsoleState {
  consoles: QueryConsole[];
  activeByProfile: Record<string, string>;
  nextOrdinal: number;
  executionByConsole: Record<string, QueryExecutionState>;
}

const EMPTY_STATE: QueryConsoleState = {
  consoles: [],
  activeByProfile: {},
  nextOrdinal: 1,
  executionByConsole: {},
};

function parseTableTab(value: unknown): TableTab | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<TableTab>;
  if (typeof candidate.schema !== "string" || typeof candidate.name !== "string") return null;
  return {
    schema: candidate.schema,
    name: candidate.name,
    // Lo aplicado solo se conserva si salio del constructor: un WHERE escrito
    // a mano (versiones anteriores) no se puede mostrar como condiciones, y
    // aplicarlo oculto confundiria.
    where:
      (candidate as { mode?: unknown }).mode === "builder" && typeof candidate.where === "string" ? candidate.where : "",
    conditions: Array.isArray(candidate.conditions)
      ? candidate.conditions.map(parseCondition).filter((item): item is FilterCondition => item !== null)
      : [],
  };
}

function consoleTitle(ordinal: number): string {
  return `consola_${ordinal}`;
}

/**
 * El nombre por defecto se guarda siempre como "consola_N", porque de ese
 * formato depende la numeración; solo se traduce al mostrarlo.
 */
export function consoleDisplayTitle(title: string, t: Translate = translate): string {
  const ordinal = /^consola_(\d+)$/.exec(title)?.[1];
  return ordinal ? t("workspace.defaultConsoleName", { n: ordinal }) : title;
}

// Como se guarda una consola: los textos grandes van aparte (ver
// LARGE_TEXT) y un archivo sin cambios no repite su texto.
interface PersistedConsole extends Omit<QueryConsole, "sql" | "savedSql" | "textPending"> {
  sql?: string;
  savedSql?: string;
  sqlOnDisk?: boolean;
  savedOnDisk?: boolean;
  savedSame?: boolean;
}

// Consolas cuyo texto quedo en disco, tal como se leyeron: mientras se
// cargan se vuelven a guardar igual, sin pisar nada.
const pendingPersisted = new Map<string, PersistedConsole>();

function parseConsole(value: unknown): QueryConsole | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as PersistedConsole;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.profileId !== "string" ||
    typeof candidate.title !== "string" ||
    (typeof candidate.sql !== "string" && candidate.sqlOnDisk !== true)
  ) return null;
  const sql = typeof candidate.sql === "string" ? candidate.sql : "";
  const pending = candidate.sqlOnDisk === true || candidate.savedOnDisk === true;
  if (pending) pendingPersisted.set(candidate.id, candidate);
  // Consolas de antes del nombre "consola_N" pasan al formato nuevo; las
  // renombradas a mano se respetan.
  const legacyOrdinal = /^Consola (\d+)$/.exec(candidate.title)?.[1];
  return {
    id: candidate.id,
    profileId: candidate.profileId,
    title: legacyOrdinal ? consoleTitle(Number(legacyOrdinal)) : candidate.title,
    sql,
    filePath: typeof candidate.filePath === "string" ? candidate.filePath : null,
    table: parseTableTab(candidate.table),
    savedSql: typeof candidate.savedSql === "string" && !candidate.savedSame ? candidate.savedSql : sql,
    ...(pending ? { textPending: true } : {}),
  };
}

function loadState(): QueryConsoleState {
  if (!browser) return EMPTY_STATE;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY_STATE;

    const candidate = parsed as Partial<QueryConsoleState>;
    const consoles = Array.isArray(candidate.consoles)
      ? candidate.consoles.map(parseConsole).filter((item): item is QueryConsole => item !== null)
      : [];
    const ids = new Set(consoles.map((item) => item.id));
    const activeByProfile: Record<string, string> = {};
    if (candidate.activeByProfile && typeof candidate.activeByProfile === "object") {
      for (const [profileId, id] of Object.entries(candidate.activeByProfile)) {
        if (typeof id === "string" && ids.has(id)) activeByProfile[profileId] = id;
      }
    }

    return {
      consoles,
      activeByProfile,
      nextOrdinal:
        typeof candidate.nextOrdinal === "number" && Number.isSafeInteger(candidate.nextOrdinal) && candidate.nextOrdinal > 0
          ? candidate.nextOrdinal
          : consoles.length + 1,
      executionByConsole: {},
    };
  } catch {
    return EMPTY_STATE;
  }
}

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `console-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// El numero libre mas bajo entre las consolas abiertas de esa conexion:
// cerrar consola_2 y abrir otra vuelve a dar consola_2, en vez de seguir
// contando para siempre (consola_12 con una sola pestaña abierta).
function nextConsoleOrdinal(state: QueryConsoleState, profileId: string): number {
  const used = new Set(
    state.consoles
      .filter((item) => item.profileId === profileId)
      .map((item) => /^consola_(\d+)$/.exec(item.title)?.[1])
      .filter((ordinal): ordinal is string => ordinal !== undefined)
      .map(Number),
  );
  let ordinal = 1;
  while (used.has(ordinal)) ordinal++;
  return ordinal;
}

function appendConsole(state: QueryConsoleState, profileId: string): { state: QueryConsoleState; id: string } {
  const item: QueryConsole = {
    id: createId(),
    profileId,
    title: consoleTitle(nextConsoleOrdinal(state, profileId)),
    sql: "",
    filePath: null,
    savedSql: "",
    table: null,
  };
  return {
    id: item.id,
    state: {
      ...state,
      consoles: [...state.consoles, item],
      activeByProfile: { ...state.activeByProfile, [profileId]: item.id },
      nextOrdinal: state.nextOrdinal + 1,
    },
  };
}

export const queryConsoles = writable<QueryConsoleState>(loadState());

// --- Guardado ---------------------------------------------------------------
//
// localStorage admite unos 5–10 MB: un texto de mas de LARGE_TEXT va a un
// archivo en los datos de la app (console_texts.rs), escrito con un retraso,
// y en localStorage queda solo la marca. Diseño en
// docs/specs/v0.2-documentos-grandes.md (15b).
export const LARGE_TEXT = 256 * 1024;
const DISK_DELAY_MS = 1000;

// Lo ultimo escrito (o leido) por clave; el mismo string no se reescribe.
const diskTexts = new Map<string, string>();
const pendingDisk = new Map<string, string>();
let diskTimer: ReturnType<typeof setTimeout> | null = null;
let persistFailureShown = false;

function textKey(id: string, kind: "sql" | "saved"): string {
  return kind === "sql" ? id : `${id}-saved`;
}

function reportPersistFailure() {
  if (persistFailureShown) return;
  persistFailureShown = true;
  notifyError(translate("workspace.persistFailed"));
}

function writeDiskTexts() {
  diskTimer = null;
  const batch = [...pendingDisk];
  pendingDisk.clear();
  for (const [key, contents] of batch) {
    void invoke("write_console_text", { key, contents }).then(
      () => diskTexts.set(key, contents),
      () => reportPersistFailure(),
    );
  }
}

function queueDiskText(key: string, contents: string) {
  if (diskTexts.get(key) === contents || pendingDisk.get(key) === contents) return;
  pendingDisk.set(key, contents);
  // Tras la pausa: mandar 30 MB al backend mientras se escribe se notaria.
  if (diskTimer !== null) clearTimeout(diskTimer);
  diskTimer = setTimeout(writeDiskTexts, DISK_DELAY_MS);
}

function persistedConsole(item: QueryConsole): PersistedConsole {
  const pending = item.textPending ? pendingPersisted.get(item.id) : undefined;
  if (pending) return pending;
  const { sql, savedSql, textPending: _textPending, ...rest } = item;
  const persisted: PersistedConsole = { ...rest };
  if (sql.length > LARGE_TEXT) {
    persisted.sqlOnDisk = true;
    queueDiskText(textKey(item.id, "sql"), sql);
  } else {
    persisted.sql = sql;
  }
  if (savedSql === sql) {
    persisted.savedSame = true;
  } else if (savedSql.length > LARGE_TEXT) {
    persisted.savedOnDisk = true;
    queueDiskText(textKey(item.id, "saved"), savedSql);
  } else {
    persisted.savedSql = savedSql;
  }
  return persisted;
}

// Al arrancar: los textos que quedaron en disco. Hasta tenerlos, esas
// consolas no montan el editor (textPending). Despues se borran los
// archivos de consolas que ya no existen.
async function hydrateLargeTexts() {
  const read = async (key: string): Promise<string> => {
    try {
      const text = (await invoke<string | null>("read_console_text", { key })) ?? "";
      diskTexts.set(key, text);
      return text;
    } catch (error) {
      notifyError(error);
      return "";
    }
  };
  await Promise.all(
    [...pendingPersisted.values()].map(async (persisted) => {
      const sql = persisted.sqlOnDisk ? await read(textKey(persisted.id, "sql")) : (persisted.sql ?? "");
      const savedSql = persisted.savedOnDisk
        ? await read(textKey(persisted.id, "saved"))
        : persisted.savedSame || typeof persisted.savedSql !== "string"
          ? sql
          : persisted.savedSql;
      pendingPersisted.delete(persisted.id);
      queryConsoles.update((state) => ({
        ...state,
        consoles: state.consoles.map((item) =>
          item.id === persisted.id ? { ...item, sql, savedSql, textPending: undefined } : item,
        ),
      }));
    }),
  );
  const keep = get(queryConsoles).consoles.flatMap((item) => [textKey(item.id, "sql"), textKey(item.id, "saved")]);
  void invoke("prune_console_texts", { keep }).catch(() => {});
}

// Se guarda solo cuando cambia lo que se persiste, y a lo sumo una vez cada
// PERSIST_DELAY_MS. executionByConsole (resultados, "ejecutando", orden,
// conteo) cambia varias veces por consulta y nunca se guarda: antes cada uno
// de esos cambios volvia a serializar todas las consolas con su texto, y con
// muchas pestañas abiertas eso pesaba en cada consulta (uso de horas).
const PERSIST_DELAY_MS = 300;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let lastPersisted: Pick<QueryConsoleState, "consoles" | "activeByProfile" | "nextOrdinal"> | null = null;

function writeConsoles() {
  persistTimer = null;
  const { consoles, activeByProfile, nextOrdinal } = get(queryConsoles);
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ consoles: consoles.map(persistedConsole), activeByProfile, nextOrdinal }),
    );
  } catch {
    // Una cuota llena no impide seguir editando durante esta sesion.
    reportPersistFailure();
  }
  // La copia de los textos grandes de consolas que ya se cerraron no hace
  // falta (sus archivos los borra prune_console_texts al abrir).
  if (diskTexts.size > 0) {
    const keep = new Set(consoles.flatMap((item) => [textKey(item.id, "sql"), textKey(item.id, "saved")]));
    for (const key of diskTexts.keys()) if (!keep.has(key)) diskTexts.delete(key);
  }
}

// Lo que esperaba su retraso se guarda ya (al cerrar la ventana; en las
// pruebas, antes de leer localStorage).
export function flushConsolePersistence(): void {
  if (persistTimer === null) return;
  clearTimeout(persistTimer);
  writeConsoles();
}

if (browser) {
  queryConsoles.subscribe((state) => {
    const { consoles, activeByProfile, nextOrdinal } = state;
    if (
      lastPersisted &&
      lastPersisted.consoles === consoles &&
      lastPersisted.activeByProfile === activeByProfile &&
      lastPersisted.nextOrdinal === nextOrdinal
    ) {
      return;
    }
    lastPersisted = { consoles, activeByProfile, nextOrdinal };
    persistTimer ??= setTimeout(writeConsoles, PERSIST_DELAY_MS);
  });
  if (pendingPersisted.size > 0) void hydrateLargeTexts();
  // Al cerrar, lo que esperaba su retraso sale ya. Tambien al ocultarse la
  // ventana (minimizar, cambiar de escritorio): si el webview se destruye
  // sin pagehide, lo ultimo ya quedo guardado.
  globalThis.document?.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden") return;
    flushConsoleTexts();
    flushConsolePersistence();
  });
  globalThis.addEventListener?.("pagehide", () => {
    flushConsoleTexts();
    flushConsolePersistence();
    if (diskTimer !== null) {
      clearTimeout(diskTimer);
      writeDiskTexts();
    }
  });
}

// --- Texto en edicion -------------------------------------------------------
//
// El editor no manda su texto en cada tecla (convertir un documento de 30 MB
// a string cuesta ~100 ms): lo manda con un retraso. Antes de leer `sql` para
// algo que importa (guardar, cerrar), flushConsoleTexts() hace que los
// editores abiertos lo manden ya.
const textFlushers = new Set<() => void>();

export function registerConsoleTextFlush(flush: () => void): () => void {
  textFlushers.add(flush);
  return () => textFlushers.delete(flush);
}

export function flushConsoleTexts(): void {
  for (const flush of textFlushers) flush();
}

// La consola tal como esta ahora, con el texto de los editores al dia.
export function currentQueryConsole(id: string): QueryConsole | undefined {
  flushConsoleTexts();
  return get(queryConsoles).consoles.find((item) => item.id === id);
}

// Estado de ejecucion vigente de una consola dentro de un snapshot del store
// (nunca undefined: una consola sin actividad reciente se ve como "sin
// ejecutar"). Pensado para usarse reactivamente, p.ej.
// `executionForConsole($queryConsoles, activeConsole.id)`.
export function executionForConsole(state: QueryConsoleState, consoleId: string): QueryExecutionState {
  return state.executionByConsole[consoleId] ?? EMPTY_EXECUTION_STATE;
}

function withExecution(
  state: QueryConsoleState,
  consoleId: string,
  patch: Partial<QueryExecutionState>,
): QueryConsoleState {
  return {
    ...state,
    executionByConsole: {
      ...state.executionByConsole,
      [consoleId]: { ...executionForConsole(state, consoleId), ...patch },
    },
  };
}

function withoutExecution(state: QueryConsoleState, consoleId: string): QueryConsoleState {
  const { [consoleId]: _removed, ...rest } = state.executionByConsole;
  return { ...state, executionByConsole: rest };
}

// Marca la consola como ejecutando. Devuelve false (y no toca el estado) si
// esa consola ya esta ocupada (ejecutando o con una confirmacion pendiente),
// para que un doble disparo no inicie una segunda ejecucion superpuesta.
export function beginQueryExecution(consoleId: string): boolean {
  const current = executionForConsole(get(queryConsoles), consoleId);
  if (current.isExecuting || current.pendingConfirmation) return false;

  queryConsoles.update((state) => withExecution(state, consoleId, { isExecuting: true }));
  return true;
}

// `paging`: es otra pagina de la misma consulta (no una ejecucion nueva),
// asi que el total ya conocido sigue valiendo.
export function finishQueryExecution(
  consoleId: string,
  sql: string,
  result: QueryExecutionResult,
  page: ResultPage | null = null,
  paging = false,
): void {
  queryConsoles.update((state) => {
    const previous = executionForConsole(state, consoleId);
    let totalRows = paging && previous.resultSql === sql ? previous.totalRows : null;
    // Si no llego la fila extra, esta es la ultima pagina: el total sale solo.
    if (result.type === "resultSet" && !result.truncated && (page?.pageable || page?.offset === 0)) {
      totalRows = (page?.offset ?? 0) + result.rows.length;
    }
    return withExecution(state, consoleId, {
      isExecuting: false,
      result,
      resultSql: sql,
      resultAt: Date.now(),
      page: result.type === "resultSet" ? page : null,
      totalRows: result.type === "resultSet" ? totalRows : null,
      counting: false,
      pendingConfirmation: null,
    });
  });
}

// El estado de ejecucion se guarda por CLAVE de pestaña de resultado: la
// consola misma para su pestaña normal, y "<consola>#pin<n>" para cada
// pestaña fijada (ver pinnedResults.ts). Fijar mueve el estado de una clave
// a otra; asi una pestaña fijada conserva todo (pagina, total...) y sigue
// funcionando igual.
export function moveExecutionState(fromKey: string, toKey: string): void {
  queryConsoles.update((state) => {
    const moved = state.executionByConsole[fromKey];
    if (!moved) return state;
    const { [fromKey]: _from, ...rest } = state.executionByConsole;
    return { ...state, executionByConsole: { ...rest, [toKey]: moved } };
  });
}

// Termina una ejecucion sin tocar su resultado (p.ej. una recarga fallida de
// una pestaña fijada: se conserva lo que mostraba y el error va a la Salida).
export function stopQueryExecution(key: string): void {
  queryConsoles.update((state) => withExecution(state, key, { isExecuting: false }));
}

export function forgetExecutionState(key: string): void {
  queryConsoles.update((state) => withoutExecution(state, key));
}

// Cierra la pestaña del resultado: la consola queda sin resultado (su
// Salida sigue ahi).
export function clearQueryResult(consoleId: string): void {
  queryConsoles.update((state) =>
    withExecution(state, consoleId, { result: null, page: null, totalRows: null, counting: false }),
  );
}

export function setQuerySort(key: string, sort: SortKey[]): void {
  queryConsoles.update((state) => withExecution(state, key, { sort }));
}

export function setQueryCounting(consoleId: string, counting: boolean): void {
  queryConsoles.update((state) => withExecution(state, consoleId, { counting }));
}

export function setQueryTotalRows(consoleId: string, sql: string, totalRows: number): void {
  queryConsoles.update((state) =>
    executionForConsole(state, consoleId).resultSql === sql
      ? withExecution(state, consoleId, { totalRows, counting: false })
      : state,
  );
}

export function requireQueryConfirmation(consoleId: string, pending: PendingQueryConfirmation): void {
  queryConsoles.update((state) =>
    withExecution(state, consoleId, { isExecuting: false, pendingConfirmation: pending }),
  );
}

export function cancelQueryConfirmation(consoleId: string): void {
  queryConsoles.update((state) => withExecution(state, consoleId, { pendingConfirmation: null }));
}

// Extrae la confirmacion pendiente y la retira en la misma actualizacion, de
// forma atomica: una segunda llamada (p.ej. un doble click) recibe null en
// vez de la misma confirmacion dos veces.
export function takeQueryConfirmation(consoleId: string): PendingQueryConfirmation | null {
  let taken: PendingQueryConfirmation | null = null;
  queryConsoles.update((state) => {
    const pending = executionForConsole(state, consoleId).pendingConfirmation;
    if (!pending) return state;
    taken = pending;
    return withExecution(state, consoleId, { pendingConfirmation: null });
  });
  return taken;
}

export function ensureQueryConsole(profileId: string): string {
  const state = get(queryConsoles);
  const existing = state.consoles.filter((item) => item.profileId === profileId);
  const active = state.activeByProfile[profileId];
  if (active && existing.some((item) => item.id === active)) return active;
  if (existing.length > 0) {
    queryConsoles.update((current) => ({
      ...current,
      activeByProfile: { ...current.activeByProfile, [profileId]: existing[0].id },
    }));
    return existing[0].id;
  }

  const created = appendConsole(state, profileId);
  queryConsoles.set(created.state);
  return created.id;
}

export function createQueryConsole(profileId: string): string {
  const created = appendConsole(get(queryConsoles), profileId);
  queryConsoles.set(created.state);
  return created.id;
}

export function activateQueryConsole(profileId: string, id: string): void {
  queryConsoles.update((state) => {
    if (!state.consoles.some((item) => item.id === id && item.profileId === profileId)) return state;
    return { ...state, activeByProfile: { ...state.activeByProfile, [profileId]: id } };
  });
}

export function updateQueryConsoleSql(id: string, sql: string): void {
  queryConsoles.update((state) => {
    const next = {
      ...state,
      consoles: state.consoles.map((item) => (item.id === id ? { ...item, sql } : item)),
    };
    // Editar el SQL invalida cualquier confirmacion pendiente de esa consola
    // (era para un texto que ya no es el actual); el resultado anterior, en
    // cambio, se conserva hasta la proxima ejecucion.
    return executionForConsole(next, id).pendingConfirmation
      ? withExecution(next, id, { pendingConfirmation: null })
      : next;
  });
}

// Un archivo tiene cambios sin guardar si su texto difiere de lo que hay en
// disco. Una consola, en cuanto tiene texto: todavia no esta en ningun
// archivo (su contenido solo sobrevive dentro de la app mientras siga
// abierta).
export function isQueryConsoleDirty(item: QueryConsole): boolean {
  // Una pestaña de tabla no tiene texto que guardar.
  if (item.table) return false;
  return item.filePath !== null ? item.sql !== item.savedSql : item.sql.trim() !== "";
}

// Doble clic en una tabla del explorador: la abre en su pestaña (o activa la
// que ya estaba abierta para esa tabla en esta conexion).
export function openTableConsole(profileId: string, schema: string, name: string): string {
  const state = get(queryConsoles);
  const existing = state.consoles.find(
    (item) => item.profileId === profileId && item.table?.schema === schema && item.table.name === name,
  );
  if (existing) {
    activateQueryConsole(profileId, existing.id);
    return existing.id;
  }
  const item: QueryConsole = {
    id: createId(),
    profileId,
    title: name,
    sql: "",
    filePath: null,
    savedSql: "",
    table: { schema, name, where: "", conditions: [] },
  };
  queryConsoles.set({
    ...state,
    consoles: [...state.consoles, item],
    activeByProfile: { ...state.activeByProfile, [profileId]: item.id },
  });
  return item.id;
}

export function setTableFilters(
  id: string,
  filters: Pick<TableTab, "where" | "conditions">,
): void {
  queryConsoles.update((state) => ({
    ...state,
    consoles: state.consoles.map((item) =>
      item.id === id && item.table ? { ...item, table: { ...item.table, ...filters } } : item,
    ),
  }));
}

export function fileNameFromPath(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

// Registra que la pestaña se guardo en `filePath` con el contenido `sql`
// (el que efectivamente se escribio, que puede ser anterior al texto actual
// si el usuario siguio tecleando mientras se guardaba). Una consola pasa a
// ser un archivo y toma el nombre de este.
export function markQueryConsoleSaved(id: string, filePath: string, sql: string): void {
  queryConsoles.update((state) => ({
    ...state,
    consoles: state.consoles.map((item) =>
      item.id === id ? { ...item, filePath, savedSql: sql, title: fileNameFromPath(filePath) } : item,
    ),
  }));
}

// El archivo cambio de ruta (renombrado desde la pestaña o desde el arbol
// de archivos): toda pestaña que lo tuviera abierto sigue apuntandolo.
export function retargetQueryConsoleFile(oldPath: string, newPath: string): void {
  queryConsoles.update((state) => ({
    ...state,
    consoles: state.consoles.map((item) =>
      item.filePath === oldPath ? { ...item, filePath: newPath, title: fileNameFromPath(newPath) } : item,
    ),
  }));
}

// El archivo ya no existe (se mando a la papelera): sus pestañas abiertas
// vuelven a ser consolas con el mismo texto, asi no se pierde nada y quedan
// marcadas como sin guardar.
export function detachQueryConsoleFile(path: string): void {
  queryConsoles.update((state) => ({
    ...state,
    consoles: state.consoles.map((item) => (item.filePath === path ? { ...item, filePath: null } : item)),
  }));
}

// Abre un .sql como pestaña. Si ya estaba abierto en esta conexion, solo lo
// activa (sin pisar lo que se este editando).
export function openSqlFileConsole(profileId: string, filePath: string, contents: string): string {
  const state = get(queryConsoles);
  const existing = state.consoles.find((item) => item.profileId === profileId && item.filePath === filePath);
  if (existing) {
    activateQueryConsole(profileId, existing.id);
    return existing.id;
  }
  const item: QueryConsole = {
    id: createId(),
    profileId,
    title: fileNameFromPath(filePath),
    sql: contents,
    filePath,
    savedSql: contents,
    table: null,
  };
  queryConsoles.set({
    ...state,
    consoles: [...state.consoles, item],
    activeByProfile: { ...state.activeByProfile, [profileId]: item.id },
  });
  return item.id;
}

// Reordena las pestañas de consola de una conexion (arrastrar con el mouse).
// El orden vive en el arreglo de consolas, que se persiste: sobrevive a
// recargar la app. Los indices son los de las consolas de ESA conexion.
export function reorderQueryConsoles(profileId: string, from: number, to: number): void {
  queryConsoles.update((state) => {
    const own = state.consoles.filter((item) => item.profileId === profileId);
    if (from < 0 || from >= own.length || to < 0 || to >= own.length || from === to) return state;
    const reordered = [...own];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    // Las de otras conexiones quedan donde estaban; las de esta ocupan sus
    // mismos lugares del arreglo, en el orden nuevo.
    let next = 0;
    return {
      ...state,
      consoles: state.consoles.map((item) => (item.profileId === profileId ? reordered[next++] : item)),
    };
  });
}

export function renameQueryConsole(id: string, title: string): void {
  const trimmed = title.trim();
  if (!trimmed) return;
  queryConsoles.update((state) => ({
    ...state,
    consoles: state.consoles.map((item) => (item.id === id ? { ...item, title: trimmed } : item)),
  }));
}

export function closeQueryConsole(profileId: string, id: string): void {
  const state = withoutExecution(get(queryConsoles), id);
  const profileConsoles = state.consoles.filter((item) => item.profileId === profileId);
  const closedIndex = profileConsoles.findIndex((item) => item.id === id);
  if (closedIndex === -1) return;

  const remaining = profileConsoles.filter((item) => item.id !== id);
  // Cerrar la ultima no crea otra en su lugar: el workspace queda vacio y
  // ofrece crear una consola o abrir un archivo.
  if (remaining.length === 0) {
    const { [profileId]: _closed, ...activeByProfile } = state.activeByProfile;
    queryConsoles.set({
      ...state,
      consoles: state.consoles.filter((item) => item.id !== id),
      activeByProfile,
    });
    return;
  }

  const currentActive = state.activeByProfile[profileId];
  const nextActive = currentActive === id
    ? remaining[Math.min(closedIndex, remaining.length - 1)].id
    : currentActive;
  queryConsoles.set({
    ...state,
    consoles: state.consoles.filter((item) => item.id !== id),
    activeByProfile: { ...state.activeByProfile, [profileId]: nextActive },
  });
}

// Quita todas las consolas de un perfil (y su estado de ejecucion), para
// cuando el perfil se elimina.
export function forgetProfileConsoles(profileId: string): void {
  queryConsoles.update((state) => {
    const removed = new Set(state.consoles.filter((item) => item.profileId === profileId).map((item) => item.id));
    const executionByConsole = Object.fromEntries(
      Object.entries(state.executionByConsole).filter(([key]) => !removed.has(key)),
    );
    const { [profileId]: _active, ...activeByProfile } = state.activeByProfile;
    return {
      ...state,
      consoles: state.consoles.filter((item) => !removed.has(item.id)),
      activeByProfile,
      executionByConsole,
    };
  });
}
