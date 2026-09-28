import { browser } from "$app/environment";
import { derived, get, writable, type Readable } from "svelte/store";
import {
  FALLBACK_LOCALE,
  SOURCE_LOCALE,
  isLocale,
  matchSystemLocale,
  type Locale,
  type LocalePreference,
} from "./locales";
import { messages, type MessageKey } from "./messages";

export { LOCALES, LOCALE_NAMES, type Locale, type LocalePreference } from "./locales";
export type { MessageKey } from "./messages";

export type MessageParams = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: MessageParams) => string;

const STORAGE_KEY = "khipu:locale";

function systemLocale(): Locale {
  // Fuera del navegador (tests en Node) no hay idioma del sistema: se usa el
  // español para que los tests comparen contra los textos fuente.
  if (!browser || typeof navigator === "undefined") return SOURCE_LOCALE;
  return matchSystemLocale(navigator.languages?.length ? navigator.languages : [navigator.language ?? FALLBACK_LOCALE]);
}

// Sin eleccion guardada (o con la vieja "system"), el idioma se detecta del
// sistema entre los disponibles; si no coincide ninguno, ingles.
function loadPreference(): LocalePreference {
  if (!browser) return systemLocale();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : systemLocale();
  } catch {
    return systemLocale();
  }
}

export const localePreference = writable<LocalePreference>(loadPreference());

if (browser) {
  localePreference.subscribe((preference) => {
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Sin almacenamiento el idioma elegido dura lo que dura la ventana.
    }
  });
  // Cada conexión abre su propia ventana: si el idioma cambia en una, las
  // demás lo toman del evento storage que dispara esa escritura.
  globalThis.window?.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    const value = event.newValue;
    if (isLocale(value)) localePreference.set(value);
  });
}


export const locale: Readable<Locale> = derived(localePreference, (preference) => preference);

function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

function lookup(target: Locale, key: MessageKey): string {
  const dot = key.indexOf(".");
  const namespace = key.slice(0, dot) as keyof typeof messages;
  const name = key.slice(dot + 1);
  const table = messages[namespace] as Record<Locale, Record<string, string>>;
  return table[target][name] ?? table[SOURCE_LOCALE][name] ?? key;
}

export function translator(target: Locale): Translate {
  return (key, params) => interpolate(lookup(target, key), params);
}

/** Traductor reactivo para componentes: `$t("settings.title")`. */
export const t: Readable<Translate> = derived(locale, translator);

/** Traducción puntual desde módulos .ts, con el idioma vigente en ese momento. */
export function translate(key: MessageKey, params?: MessageParams): string {
  return translator(get(locale))(key, params);
}

/** Formato de números con separadores del idioma activo. */
export const numberFormat: Readable<Intl.NumberFormat> = derived(locale, (current) => new Intl.NumberFormat(current));

/**
 * Mantiene `<html lang>` al día con el idioma activo (lectores de pantalla,
 * corrector ortográfico). Se llama una vez desde +layout.svelte.
 */
export function initLocaleEffects(): () => void {
  if (!browser) return () => {};
  return locale.subscribe((current) => {
    document.documentElement.lang = current;
  });
}
