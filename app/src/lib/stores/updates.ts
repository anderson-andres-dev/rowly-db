import { browser } from "$app/environment";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { derived, get, writable } from "svelte/store";

// Estado de Ajustes > Actualizaciones. La lista sale de los GitHub Releases
// (updates.rs); instalar una versión, más nueva o más vieja, siempre lo pide
// el usuario.

export type InstallKind = "appImage" | "deb" | "rpm" | "pacman" | "windows" | "macos" | "source";

export interface UpdateContext {
  currentVersion: string;
  installKind: InstallKind;
  canInstall: boolean;
  releasesPage: string;
}

export interface ReleaseInfo {
  tag: string;
  version: string;
  name: string;
  notes: string;
  publishedAt: string | null;
  prerelease: boolean;
  url: string;
  relation: "current" | "newer" | "older";
  installable: boolean;
}

export type UpdateErrorCode =
  | "offline"
  | "rateLimited"
  | "network"
  | "unavailable"
  | "signature"
  | "cancelled"
  | "noPkexec"
  | "installFailed"
  | "notInstallable";

export interface UpdatePrefs {
  autoCheck: boolean;
  includePrereleases: boolean;
  // "No volver a preguntar por esta versión" en el aviso al abrir: esa
  // versión ya no lo muestra; una más nueva, sí.
  skippedTag: string | null;
}

export type InstallState =
  | { phase: "idle" }
  | { phase: "downloading"; tag: string; version: string; downloaded: number; total: number | null }
  | { phase: "installing"; tag: string; version: string }
  | { phase: "done"; tag: string; version: string }
  | { phase: "error"; tag: string; version: string; code: UpdateErrorCode };

const PREFS_KEY = "khipu:updates:v1";
const CACHE_KEY = "khipu:updates:releases:v1";
const AUTO_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const ERROR_RETRY_INTERVAL_MS = 60 * 60 * 1000;
const RATE_LIMIT_FALLBACK_MS = 15 * 60 * 1000;
const DEFAULT_PREFS: UpdatePrefs = { autoCheck: true, includePrereleases: false, skippedTag: null };

interface CachedCheck {
  version: string;
  releases: ReleaseInfo[] | null;
  checkedAt: number | null;
  attemptedAt: number | null;
  lastError: UpdateErrorCode | null;
  retryAt: number | null;
}

function loadCache(): CachedCheck | null {
  if (!browser) return null;
  try {
    const value = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null") as CachedCheck | null;
    if (!value || typeof value.version !== "string") return null;
    return value;
  } catch {
    return null;
  }
}

let cachedCheck = loadCache();
let attemptedAt: number | null = null;
let contextPromise: Promise<UpdateContext> | null = null;

function loadPrefs(): UpdatePrefs {
  if (!browser) return DEFAULT_PREFS;
  try {
    const parsed = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") as Partial<UpdatePrefs> | null;
    return {
      autoCheck: parsed?.autoCheck !== false,
      includePrereleases: parsed?.includePrereleases === true,
      skippedTag: typeof parsed?.skippedTag === "string" ? parsed.skippedTag : null,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export const updatePrefs = writable<UpdatePrefs>(loadPrefs());

if (browser) {
  updatePrefs.subscribe((prefs) => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // Sin almacenamiento, las preferencias duran lo que la ventana.
    }
  });
}

export const updateContext = writable<UpdateContext | null>(null);
export const releases = writable<ReleaseInfo[] | null>(null);
export const releasesError = writable<UpdateErrorCode | null>(
  cachedCheck?.lastError === "rateLimited" && cachedCheck.retryAt && cachedCheck.retryAt > Date.now()
    ? "rateLimited" : null,
);
export const checking = writable(false);
export const lastChecked = writable<Date | null>(null);
export const retryAt = writable<number | null>(cachedCheck?.retryAt && cachedCheck.retryAt > Date.now() ? cachedCheck.retryAt : null);
export const installState = writable<InstallState>({ phase: "idle" });

function saveCache(): void {
  const context = get(updateContext);
  if (!context || !browser) return;
  cachedCheck = {
    version: context.currentVersion,
    releases: get(releases),
    checkedAt: get(lastChecked)?.getTime() ?? null,
    attemptedAt,
    lastError: get(releasesError),
    retryAt: get(retryAt),
  };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cachedCheck));
  } catch {
    // La comprobacion sigue funcionando durante esta sesion.
  }
}

let retryTimer: ReturnType<typeof setTimeout> | null = null;

function setRetryAt(value: number | null): void {
  if (retryTimer) clearTimeout(retryTimer);
  const next = value && value > Date.now() ? value : null;
  retryAt.set(next);
  if (next) retryTimer = setTimeout(() => {
    retryAt.set(null);
    saveCache();
  }, next - Date.now());
}

setRetryAt(get(retryAt));

/** Versiones que se muestran: las preliminares solo si el usuario las pidió, salvo la instalada. */
export const visibleReleases = derived([releases, updatePrefs], ([$releases, $prefs]) =>
  ($releases ?? []).filter((release) => $prefs.includePrereleases || !release.prerelease || release.relation === "current"),
);

/** La versión más nueva que la instalada, si la hay; alimenta el punto de aviso en Ajustes. */
export const newerRelease = derived(visibleReleases, ($visible) =>
  $visible.find((release) => release.relation === "newer") ?? null,
);

export function errorCode(error: unknown): UpdateErrorCode {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code as UpdateErrorCode;
  }
  return "network";
}

export async function loadUpdateContext(): Promise<UpdateContext> {
  const current = get(updateContext);
  if (current) return current;
  contextPromise ??= invoke<UpdateContext>("update_context").then((context) => {
    updateContext.set(context);
    if (cachedCheck?.version === context.currentVersion) {
      releases.set(Array.isArray(cachedCheck.releases) ? cachedCheck.releases : null);
      lastChecked.set(typeof cachedCheck.checkedAt === "number" ? new Date(cachedCheck.checkedAt) : null);
      releasesError.set(cachedCheck.lastError ?? null);
      attemptedAt = typeof cachedCheck.attemptedAt === "number" ? cachedCheck.attemptedAt : null;
    } else {
      attemptedAt = null;
    }
    return context;
  }).finally(() => (contextPromise = null));
  return contextPromise;
}

export async function checkForUpdates({ automatic = false }: { automatic?: boolean } = {}): Promise<void> {
  if (get(checking)) return;
  checking.set(true);
  try {
    if (!get(updateContext)) await loadUpdateContext();
    if (get(retryAt) && get(retryAt)! > Date.now()) return;
    if (automatic && attemptedAt !== null) {
      const age = Date.now() - attemptedAt;
      const interval = get(releasesError) ? ERROR_RETRY_INTERVAL_MS : AUTO_CHECK_INTERVAL_MS;
      if (age >= 0 && age < interval) return;
    }
    releasesError.set(null);
    attemptedAt = Date.now();
    releases.set(await invoke<ReleaseInfo[]>("list_releases"));
    lastChecked.set(new Date());
    setRetryAt(null);
    saveCache();
  } catch (error) {
    const code = errorCode(error);
    releasesError.set(code);
    if (code === "rateLimited") {
      const indicated = error && typeof error === "object" && "retryAt" in error && typeof error.retryAt === "number"
        ? error.retryAt : Date.now() + RATE_LIMIT_FALLBACK_MS;
      setRetryAt(Math.max(Date.now() + 60_000, indicated));
    }
    saveCache();
  } finally {
    checking.set(false);
  }
}

/**
 * La versión por la que se pregunta al abrir la app (UpdatePrompt): la que
 * encontró la búsqueda del arranque, si el usuario no la omitió. Una vez por
 * sesión: cerrarlo la deja en null.
 */
export const updatePrompt = writable<ReleaseInfo | null>(null);

/** Búsqueda silenciosa al arrancar: solo si el usuario la dejó activada. */
export async function checkOnStartup(): Promise<void> {
  if (!get(updatePrefs).autoCheck) return;
  await checkForUpdates({ automatic: true });
  const newer = get(newerRelease);
  if (newer && newer.tag !== get(updatePrefs).skippedTag) updatePrompt.set(newer);
}

/** Cierra el aviso; con `skip`, esa versión no vuelve a preguntar. */
export function dismissUpdatePrompt(skip: boolean): void {
  const release = get(updatePrompt);
  if (skip && release) updatePrefs.update((prefs) => ({ ...prefs, skippedTag: release.tag }));
  updatePrompt.set(null);
}

export async function installRelease(release: ReleaseInfo): Promise<void> {
  const state = get(installState);
  if (state.phase === "downloading" || state.phase === "installing") return;
  // Ya instalada, falta reiniciar: volver a instalarla fallaria.
  if (state.phase === "done" && state.tag === release.tag) return;
  const { tag, version } = release;
  installState.set({ phase: "downloading", tag, version, downloaded: 0, total: null });
  const unlisten = await listen<{ downloaded: number; total: number | null }>("update-progress", (event) => {
    const { downloaded, total } = event.payload;
    // Con la descarga completa, lo que sigue es instalar (y pedir la contraseña).
    if (total !== null && downloaded >= total) installState.set({ phase: "installing", tag, version });
    else installState.set({ phase: "downloading", tag, version, downloaded, total });
  });
  try {
    await invoke("install_release", { tag });
    installState.set({ phase: "done", tag, version });
  } catch (error) {
    installState.set({ phase: "error", tag, version, code: errorCode(error) });
  } finally {
    unlisten();
  }
}

export function restartApp(): Promise<void> {
  return invoke("restart_app");
}
