import { browser } from "$app/environment";
import { writable } from "svelte/store";
import type { ConnectionDriver } from "$lib/connections";
import type { PasswordPolicy } from "$lib/credentials";
import type { TlsMode } from "$lib/types";

const STORAGE_KEY = "khipu:connection-profiles";

export interface ConnectionProfile {
  id: string;
  name: string;
  driver: ConnectionDriver;
  host: string;
  port: number;
  database: string;
  username: string;
  passwordPolicy: PasswordPolicy;
  tlsMode: TlsMode;
  // Solo tiene efecto con los modos que verifican el certificado.
  caCertificatePath?: string;
  // Grupo para ordenar la pantalla de conexiones ("Produccion", "Clientes").
  group?: string;
  // Color de identidad de la conexion, "#rrggbb": tiñe el topbar y su tarjeta.
  color?: string;
  // Para que es la base. A diferencia del grupo y el color, cambia el
  // comportamiento: en "production" toda escritura pide confirmacion.
  // Sin valor = sin especificar.
  environment?: ConnectionEnvironment;
}

export type ConnectionEnvironment = "local" | "development" | "testing" | "production";

export const CONNECTION_ENVIRONMENTS: readonly ConnectionEnvironment[] = [
  "local",
  "development",
  "testing",
  "production",
];

function isEnvironment(value: unknown): value is ConnectionEnvironment {
  return CONNECTION_ENVIRONMENTS.includes(value as ConnectionEnvironment);
}

function isDriver(value: unknown): value is ConnectionDriver {
  return value === "mysql" || value === "mariadb" || value === "postgres";
}

const TLS_MODES: readonly TlsMode[] = ["auto", "required", "verifyCa", "verifyIdentity", "disabled"];

function isTlsMode(value: unknown): value is TlsMode {
  return TLS_MODES.includes(value as TlsMode);
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function isPasswordPolicy(value: unknown): value is PasswordPolicy {
  return value === "never" || value === "restart" || value === "forever";
}

export function parseProfile(value: unknown): ConnectionProfile | null {
  if (!value || typeof value !== "object") return null;

  const profile = value as Partial<ConnectionProfile>;
  if (!(
    typeof profile.id === "string" &&
    typeof profile.name === "string" &&
    isDriver(profile.driver) &&
    typeof profile.host === "string" &&
    typeof profile.port === "number" &&
    typeof profile.database === "string" &&
    typeof profile.username === "string"
  )) return null;

  return {
    id: profile.id,
    name: profile.name,
    driver: profile.driver,
    host: profile.host,
    port: profile.port,
    database: profile.database,
    username: profile.username,
    passwordPolicy: isPasswordPolicy(profile.passwordPolicy)
      ? profile.passwordPolicy
      : "forever",
    // Perfiles guardados antes de que existiera el modo SSL: Automatico,
    // que es lo que mas se parece a como conectaban (TLS si se podia).
    tlsMode: isTlsMode(profile.tlsMode) ? profile.tlsMode : "auto",
    caCertificatePath: optionalText(profile.caCertificatePath),
    group: optionalText(profile.group),
    color: isHexColor(profile.color) ? profile.color.toLowerCase() : undefined,
    environment: isEnvironment(profile.environment) ? profile.environment : undefined,
  };
}

function loadProfiles(): ConnectionProfile[] {
  if (!browser) return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(parseProfile)
      .filter((profile): profile is ConnectionProfile => profile !== null);
  } catch {
    return [];
  }
}

export const connectionProfiles = writable<ConnectionProfile[]>(loadProfiles());

if (browser) {
  connectionProfiles.subscribe((profiles) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    } catch {
      // La falta de almacenamiento no debe impedir conectar.
    }
  });
}

export function createConnectionProfileId(): string {
  return crypto.randomUUID();
}

export function saveConnectionProfile(profile: Omit<ConnectionProfile, "id"> & { id?: string }) {
  const saved: ConnectionProfile = {
    ...profile,
    id: profile.id ?? crypto.randomUUID(),
  };

  connectionProfiles.update((profiles) => {
    const existingIndex = profiles.findIndex((candidate) => candidate.id === saved.id);
    if (existingIndex === -1) return [...profiles, saved];

    return profiles.map((candidate) => (candidate.id === saved.id ? saved : candidate));
  });

  return saved;
}

export function removeConnectionProfile(id: string): void {
  connectionProfiles.update((profiles) => profiles.filter((candidate) => candidate.id !== id));
}
