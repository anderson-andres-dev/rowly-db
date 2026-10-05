import { writable } from "svelte/store";
import { invoke } from "$lib/backend";
import type { ConnectionDriver } from "$lib/connections";
import type { SupportStatus } from "$lib/types";

// Las lineas de version de cada motor y sus paquetes de soporte
// (app/src-tauri/src/support.rs, SQL_ENGINE.es.md §11). El backend decide
// todo: que revision esta activa, si un paquete es valido, que version esta
// verificada. Aqui solo se muestra y se pide.

export interface SupportLine {
  engine: ConnectionDriver;
  line: string;
  // La revision que trae la app; null si la linea solo llego en un paquete.
  includedRevision: number | null;
  // La descargada instalada, aunque la incluida sea mas nueva.
  downloadedRevision: number | null;
  // La que se usa al conectar; 0 si la linea esta en el indice sin instalar.
  activeRevision: number;
  origin: "included" | "downloaded";
  enabled: boolean;
  // Una revision del indice mas nueva que la activa.
  available?: { revision: number; requiresApp: string; compatible: boolean };
  // Soporte del fabricante: no dice nada de la verificacion.
  support?: SupportStatus;
  // Versiones exactas que pasan la matriz completa (lo compilado en la app).
  verified: string[];
}

export const supportLines = writable<SupportLine[]>([]);
// La accion en curso: "check" o "<motor>/<linea>".
export const supportBusy = writable<string | null>(null);
export const supportError = writable<string | null>(null);

// Cada accion devuelve el estado de todas las lineas; mientras corre,
// `supportBusy` dice cual.
async function run(busy: string, request: () => Promise<SupportLine[]>): Promise<void> {
  supportBusy.set(busy);
  supportError.set(null);
  try {
    supportLines.set(await request());
  } catch (error) {
    supportError.set(typeof error === "string" ? error : String(error));
  } finally {
    supportBusy.set(null);
  }
}

export function loadSupportLines(): Promise<void> {
  return run("load", () => invoke<SupportLine[]>("support_lines"));
}

// Pide el indice: solo cuando el usuario lo pide.
export function checkSupportUpdates(): Promise<void> {
  return run("check", () => invoke<SupportLine[]>("check_support_updates"));
}

export function installSupportPackage(engine: ConnectionDriver, line: string): Promise<void> {
  return run(`${engine}/${line}`, () => invoke<SupportLine[]>("install_support_package", { engine, line }));
}

// Quita la revision descargada: vuelve la incluida.
export function removeSupportPackage(engine: ConnectionDriver, line: string): Promise<void> {
  return run(`${engine}/${line}`, () => invoke<SupportLine[]>("remove_support_package", { engine, line }));
}

export function setSupportLineEnabled(engine: ConnectionDriver, line: string, enabled: boolean): Promise<void> {
  return run(`${engine}/${line}`, () => invoke<SupportLine[]>("set_support_line_enabled", { engine, line, enabled }));
}
