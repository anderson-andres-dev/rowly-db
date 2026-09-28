export const LOCALES = ["es", "en", "pt-BR", "fr", "de"] as const;
export type Locale = (typeof LOCALES)[number];
// Lo que se guarda: siempre un idioma concreto. La primera vez se detecta
// del sistema (matchSystemLocale) y queda elegido.
export type LocalePreference = Locale;

// El español es la fuente: sus textos definen las claves que los demás idiomas
// deben cubrir, y es el idioma de respaldo si falta alguna en tiempo de ejecución.
export const SOURCE_LOCALE: Locale = "es";
// Idioma del sistema no soportado: inglés, lo más probable de entender.
export const FALLBACK_LOCALE: Locale = "en";

// Cada idioma se muestra con su propio nombre, así se reconoce aunque la
// interfaz esté en otro idioma que no se entiende.
export const LOCALE_NAMES: Record<Locale, string> = {
  es: "Español",
  en: "English",
  "pt-BR": "Português (Brasil)",
  fr: "Français",
  de: "Deutsch",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Primer idioma de la lista del sistema que Khipu soporta, por código completo o por idioma base. */
export function matchSystemLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const exact = LOCALES.find((locale) => locale.toLowerCase() === tag.toLowerCase());
    if (exact) return exact;
    const base = tag.split("-")[0].toLowerCase();
    const byBase = LOCALES.find((locale) => locale.split("-")[0].toLowerCase() === base);
    if (byBase) return byBase;
  }
  return FALLBACK_LOCALE;
}
