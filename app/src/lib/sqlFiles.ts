import { invoke } from "$lib/backend";
import { open, save } from "@tauri-apps/plugin-dialog";
import { get } from "svelte/store";
import { translate } from "$lib/i18n";
import {
  consoleDisplayTitle,
  currentQueryConsole,
  detachQueryConsoleFile,
  fileNameFromPath,
  markQueryConsoleSaved,
  openSqlFileConsole,
  queryConsoles,
  retargetQueryConsoleFile,
  type QueryConsole,
} from "$lib/stores/queryConsoles";

export interface SqlDirEntry {
  name: string;
  path: string;
  isDir: boolean;
}

// Puente entre las pestañas y los .sql del disco: dialogos nativos de
// abrir/guardar y los comandos del backend (que solo aceptan rutas .sql).
// Cada funcion devuelve false/null si el usuario cancela el dialogo y lanza
// un Error con un mensaje legible si falla el disco.

const SQL_FILTERS = [{ name: "SQL", extensions: ["sql"] }];

function withSqlExtension(path: string): string {
  return /\.sql$/i.test(path) ? path : `${path}.sql`;
}

async function writeFile(item: QueryConsole, path: string): Promise<void> {
  // Se guarda el texto tal como estaba al empezar: si el usuario sigue
  // escribiendo mientras tanto, esos cambios quedan como pendientes.
  // El editor manda su texto con un retraso: se pide el de ahora.
  const contents = currentQueryConsole(item.id)?.sql ?? item.sql;
  await invoke("write_sql_file", { path, contents });
  markQueryConsoleSaved(item.id, path, contents);
}

export async function saveConsoleAs(item: QueryConsole): Promise<boolean> {
  const title = consoleDisplayTitle(item.title);
  const suggested = item.filePath ?? (/\.sql$/i.test(title) ? title : `${title}.sql`);
  const picked = await save({ title: translate("workspace.dialog.saveAs"), defaultPath: suggested, filters: SQL_FILTERS });
  if (!picked) return false;
  await writeFile(item, withSqlExtension(picked));
  return true;
}

// Ctrl+S: un archivo se sobrescribe en su ruta; una consola todavia no
// tiene ruta, asi que pide una (como un archivo "sin titulo" de un editor).
export async function saveConsole(item: QueryConsole): Promise<boolean> {
  if (!item.filePath) return saveConsoleAs(item);
  await writeFile(item, item.filePath);
  return true;
}

// Abre (o activa, si ya esta abierto) el archivo en una pestaña. Si ya
// hay una pestaña con ese archivo no se relee el disco: pisaria lo que se
// este editando.
export async function openSqlFileAtPath(profileId: string, path: string): Promise<void> {
  const alreadyOpen = get(queryConsoles).consoles.some(
    (item) => item.profileId === profileId && item.filePath === path,
  );
  const contents = alreadyOpen ? "" : await invoke<string>("read_sql_file", { path });
  openSqlFileConsole(profileId, path, contents);
}

export async function openSqlFileWithDialog(profileId: string): Promise<boolean> {
  const picked = await open({ title: translate("workspace.dialog.openFile"), multiple: false, directory: false, filters: SQL_FILTERS });
  if (typeof picked !== "string") return false;
  await openSqlFileAtPath(profileId, picked);
  return true;
}

export async function pickSqlFolder(): Promise<string | null> {
  const picked = await open({ title: translate("workspace.dialog.openFolder"), multiple: false, directory: true });
  return typeof picked === "string" ? picked : null;
}

export function listSqlDir(path: string): Promise<SqlDirEntry[]> {
  return invoke<SqlDirEntry[]>("list_sql_dir", { path });
}

export function createSqlFile(dir: string, name: string): Promise<string> {
  return invoke<string>("create_sql_file", { dir, name });
}

export async function renameSqlFile(path: string, newName: string): Promise<string> {
  const newPath = await invoke<string>("rename_sql_file", { path, newName });
  if (newPath !== path) retargetQueryConsoleFile(path, newPath);
  return newPath;
}

export async function trashSqlFile(path: string): Promise<void> {
  await invoke("trash_sql_file", { path });
  detachQueryConsoleFile(path);
}

// Renombra el archivo en disco y actualiza la pestaña con la ruta nueva.
export async function renameConsoleFile(id: string, newName: string): Promise<void> {
  const item = get(queryConsoles).consoles.find((candidate) => candidate.id === id);
  if (!item?.filePath) return;
  if (newName.trim() === fileNameFromPath(item.filePath)) return;
  await renameSqlFile(item.filePath, newName);
}
