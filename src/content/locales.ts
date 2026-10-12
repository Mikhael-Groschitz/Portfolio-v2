export const LOCALES = ["pt-BR", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export type Localized<T = string> = Record<Locale, T>;

export const DEFAULT_LOCALE: Locale = "pt-BR";

export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((locale) => locale === value);
}
