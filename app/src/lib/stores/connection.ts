import { derived, get, writable } from "svelte/store";
import { engineFor } from "$lib/engines";
import { backendText, invoke } from "$lib/backend";
import { browser } from "$app/environment";
import type { CatalogTable, ConnectionFailure, DatabaseExplorer, TestConnectionReport, TlsMode } from "$lib/types";
import { toConnectionFailure } from "$lib/connectionErrors";
import { forgetQueryHistory } from "./queryHistory";
import { getDriver } from "$lib/connections";
import { forgetConnectionPassword, loadConnectionPassword } from "$lib/credentials";
import { connectionProfiles, removeConnectionProfile, type ConnectionProfile } from "./connectionProfiles";
import { forgetProfileConsoles } from "./queryConsoles";
import { closeSqlFolder } from "./sqlFolders";
import { forgetPinnedTables } from "./pinnedTables";

export interface ConnectionState {
  // true = el ultimo connect() cargo un catalogo con exito. El backend
  // mantiene vivo ese pool (ActiveConnection en src-tauri/src/lib.rs) para
  // execute_query y el explorador hasta el proximo connect().
  connected: boolean;
  connecting: boolean;
  tableCount: number | null;
  profileId: string | null;
  error: ConnectionFailure | null;
}

const initialState: ConnectionState = {
  connected: false,
  connecting: false,
  tableCount: null,
  profileId: null,
  error: null,
};

export const connection = writable<ConnectionState>(initialState);

// Perfil de la conexion activa de esta ventana (null sin conexion).
export const activeProfile = derived(
  [connection, connectionProfiles],
  ([$connection, $profiles]) =>
    ($connection.connected && $profiles.find((profile) => profile.id === $connection.profileId)) || null,
);

// El perfil del motor de la conexion activa (lib/engines); null sin
// conexion.
export const activeEngine = derived(activeProfile, ($profile) => ($profile ? engineFor($profile.driver) : null));

// La conexion activa es de produccion: el backend ya pide confirmar cada
// escritura; la interfaz lo hace visible y confirma tambien los cambios del
// grid antes de aplicarlos.
export const isProduction = derived(activeProfile, ($profile) => $profile?.environment === "production");

// Tablas del catalogo cargado por el ultimo connect() exitoso. Se usa tanto
// para el arbol de tablas del sidebar (SchemaTree.svelte) como para el
// autocompletado del editor (SqlEditor.svelte via sqlSchema.ts) - no hay
// comando de Tauri aparte para sugerencias, el catalogo ya viaja completo.
export const catalogTables = writable<CatalogTable[]>([]);

// Todo lo que muestra el arbol del sidebar (SchemaTree.svelte): schemas
// visibles con sus tablas, vistas, rutinas, etc. null = sin conexion.
export const databaseExplorer = writable<DatabaseExplorer | null>(null);
// true mientras set_visible_schemas introspecta schemas recien elegidos.
export const explorerLoading = writable(false);

// Schemas extra elegidos en el selector, por perfil, para volver a
// mostrarlos al reconectar. El schema por defecto no se guarda: el backend
// lo incluye siempre.
const VISIBLE_SCHEMAS_KEY = "khipu:visible-schemas:v1";

function loadVisibleSchemaSelections(): Record<string, string[]> {
  if (!browser) return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(VISIBLE_SCHEMAS_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveVisibleSchemas(profileId: string, schemas: string[]): void {
  if (!browser) return;
  try {
    const selections = loadVisibleSchemaSelections();
    if (schemas.length === 0) delete selections[profileId];
    else selections[profileId] = schemas;
    localStorage.setItem(VISIBLE_SCHEMAS_KEY, JSON.stringify(selections));
  } catch {
    // Sin almacenamiento, la seleccion dura lo que dure la sesion.
  }
}

// Los avisos de cada schema (una categoria que no se pudo leer, una version
// no soportada) llegan como mensajes del backend: se traducen al recibirlos.
function withTranslatedWarnings(explorer: DatabaseExplorer): DatabaseExplorer {
  return {
    ...explorer,
    schemas: explorer.schemas.map((objects) => ({ ...objects, warnings: objects.warnings.map(backendText) })),
  };
}

// Pide al backend que muestre exactamente `schemas` (mas el por defecto) y
// refresca el arbol y el autocompletado, que tambien ve los schemas nuevos.
export async function setVisibleSchemas(schemas: string[]): Promise<void> {
  const profileId = get(connection).profileId;
  explorerLoading.set(true);
  try {
    const explorer = withTranslatedWarnings(await invoke<DatabaseExplorer>("set_visible_schemas", { names: schemas }));
    databaseExplorer.set(explorer);
    catalogTables.set(await invoke<CatalogTable[]>("list_tables"));
    if (profileId) {
      saveVisibleSchemas(
        profileId,
        explorer.schemas.map((objects) => objects.schema).filter((name) => name !== explorer.defaultSchema),
      );
    }
  } finally {
    explorerLoading.set(false);
  }
}

export interface ConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  tlsMode: TlsMode;
  caCertificatePath?: string;
}

export async function connect(
  kind: "mysql" | "postgres",
  config: ConnectionConfig,
  production = false,
): Promise<number | null> {
  connection.update((state) => ({ ...state, connecting: true, error: null }));

  try {
    const tableCount = await invoke<number>("connect", { kind, config, production });
    catalogTables.set(await invoke<CatalogTable[]>("list_tables"));
    const explorer = await invoke<DatabaseExplorer | null>("database_explorer");
    databaseExplorer.set(explorer && withTranslatedWarnings(explorer));
    return tableCount;
  } catch (e) {
    connection.update((state) => ({
      ...state,
      connected: false,
      error: toConnectionFailure(e),
    }));
    return null;
  } finally {
    connection.update((state) => ({ ...state, connecting: false }));
  }
}

export function completeConnection(tableCount: number, profileId: string): void {
  connection.update((state) => ({
    ...state,
    connected: true,
    tableCount,
    profileId,
    error: null,
  }));
  saveLastProfileId(profileId);
}

// Ultimo perfil al que se conecto con exito. La pantalla de conexiones lo
// resalta y le da el foco (Enter conecta); nunca se conecta solo, para no
// abrir sin querer una base de produccion al iniciar la app.
const LAST_PROFILE_KEY = "khipu:last-connection:v1";

export function loadLastProfileId(): string | null {
  if (!browser) return null;
  try {
    return localStorage.getItem(LAST_PROFILE_KEY);
  } catch {
    return null;
  }
}

function saveLastProfileId(profileId: string | null): void {
  if (!browser) return;
  try {
    if (profileId) localStorage.setItem(LAST_PROFILE_KEY, profileId);
    else localStorage.removeItem(LAST_PROFILE_KEY);
  } catch {
    // Sin almacenamiento, simplemente no se resalta ninguna.
  }
}

type ConnectResult =
  | { ok: true }
  | { ok: false; reason: "no-password" }
  | { ok: false; reason: "connect-failed"; error: ConnectionFailure };

// Orquesta el flujo completo de conectar a un perfil guardado (carga de
// contrasena + connect() + completeConnection()) para que la tarjeta de la
// landing y el selector del topbar compartan exactamente la misma logica.
export async function connectToProfile(profile: ConnectionProfile): Promise<ConnectResult> {
  let password: string | null;
  try {
    password = await loadConnectionPassword(profile.id, profile.passwordPolicy);
  } catch {
    password = null;
  }
  if (password === null) return { ok: false, reason: "no-password" };

  const driver = getDriver(profile.driver);
  const tableCount = await connect(driver.backendKind, {
    host: profile.host,
    port: profile.port,
    database: profile.database,
    username: profile.username,
    password,
    tlsMode: profile.tlsMode,
    caCertificatePath: profile.caCertificatePath,
  }, profile.environment === "production");
  if (tableCount === null) {
    return { ok: false, reason: "connect-failed", error: get(connection).error ?? { kind: "other", detail: "" } };
  }

  completeConnection(tableCount, profile.id);

  // Los schemas extra se cargan despues de marcar la conexion como lista:
  // el arbol ya muestra el schema por defecto mientras tanto.
  const savedSchemas = loadVisibleSchemaSelections()[profile.id];
  if (Array.isArray(savedSchemas) && savedSchemas.length > 0) {
    void setVisibleSchemas(savedSchemas).catch(() => {
      // Si fallan (p.ej. se borraron del servidor), queda el por defecto.
    });
  }
  return { ok: true };
}

// Puente para que el selector de conexiones del topbar (+layout.svelte) le
// pida a +page.svelte que abra el modal de edicion con contexto cuando un
// cambio de conexion falla, sin acoplar el layout al estado local de la
// pagina.
export const pendingEdit = writable<{ profile: ConnectionProfile; error: ConnectionFailure | null } | null>(
  null,
);

// Version del servidor, schema, latencia y TLS negociado: lo que muestra (y
// copia) el popover de "Probar conexion".
export async function testConnection(
  kind: "mysql" | "postgres",
  config: ConnectionConfig,
): Promise<TestConnectionReport> {
  return await invoke<TestConnectionReport>("test_connection", { kind, config });
}

// reset() SOLO limpia el estado del lado del frontend. No existe un comando
// de Tauri para "desconectar" o descartar el catalogo en AppState hoy, asi
// que esto no llama a invoke(): reconectar es simplemente volver a llamar a
// connect().
export function reset(): void {
  connection.set(initialState);
  catalogTables.set([]);
  databaseExplorer.set(null);
}

// Elimina un perfil y todo lo que la app guarda asociado a el. La contraseña
// va primero: si el keyring falla, el perfil se conserva para no dejar una
// contraseña huerfana imposible de borrar desde la interfaz. Los archivos
// .sql de la carpeta vinculada no se tocan, solo se olvida el vinculo.
export async function deleteConnectionProfile(profileId: string): Promise<void> {
  await forgetConnectionPassword(profileId);
  saveVisibleSchemas(profileId, []);
  if (loadLastProfileId() === profileId) saveLastProfileId(null);
  closeSqlFolder(profileId);
  forgetProfileConsoles(profileId);
  forgetPinnedTables(profileId);
  forgetQueryHistory(profileId);
  removeConnectionProfile(profileId);
}
