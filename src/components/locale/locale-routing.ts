import {
  DEFAULT_LOCALE,
  LOCALES,
  type Locale,
  isLocale,
} from "@/content/locales";

export const LOCALE_COOKIE = "locale";

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const FALLBACK_LOCALE: Locale = "en";
const DEFAULT_LOCALE_ONLY = new Set(["/palette"]);
const CRAWLER =
  /bot|crawler|spider|facebookexternalhit|whatsapp|slack|discord|telegram|preview/i;

export type Route =
  { kind: "next" } | { kind: "rewrite" | "redirect"; pathname: string };

interface RouteRequest {
  pathname: string;
  choice?: string;
  acceptLanguage: string | null;
  userAgent: string | null;
}

function primarySubtag(tag: string): string {
  return tag.trim().split("-")[0].toLowerCase();
}

function prefixOf(locale: Locale): string {
  return `/${locale}`;
}

function hasPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function withoutPrefix(pathname: string, prefix: string): string {
  return pathname.slice(prefix.length) || "/";
}

export function matchLocale(tag: string): Locale | null {
  const subtag = primarySubtag(tag);
  return LOCALES.find((locale) => primarySubtag(locale) === subtag) ?? null;
}

export function nextLocale(current: Locale): Locale {
  return LOCALES[(LOCALES.indexOf(current) + 1) % LOCALES.length];
}

export function localeOfPath(pathname: string): Locale {
  return (
    LOCALES.find(
      (locale) =>
        locale !== DEFAULT_LOCALE && hasPrefix(pathname, prefixOf(locale)),
    ) ?? DEFAULT_LOCALE
  );
}

export function localizedPath(pathname: string, locale: Locale): string {
  const current = localeOfPath(pathname);
  const base =
    current === DEFAULT_LOCALE
      ? pathname
      : withoutPrefix(pathname, prefixOf(current));
  if (locale === DEFAULT_LOCALE) {
    return base;
  }
  return base === "/" ? prefixOf(locale) : `${prefixOf(locale)}${base}`;
}

export function languageOf(acceptLanguage: string | null): Locale | null {
  const ranked = (acceptLanguage ?? "")
    .split(",")
    .map((entry, order) => {
      const [tag, ...parameters] = entry.split(";");
      const quality = parameters
        .map((parameter) => parameter.trim())
        .find((parameter) => parameter.startsWith("q="));
      return {
        tag: tag.trim(),
        quality: quality ? Number(quality.slice(2)) : 1,
        order,
      };
    })
    .filter(({ tag, quality }) => tag !== "" && tag !== "*" && quality > 0)
    .sort((a, b) => b.quality - a.quality || a.order - b.order);
  if (ranked.length === 0) {
    return null;
  }
  return matchLocale(ranked[0].tag) ?? FALLBACK_LOCALE;
}

function preferredLocale(
  choice: string | undefined,
  acceptLanguage: string | null,
): Locale | null {
  return isLocale(choice) ? choice : languageOf(acceptLanguage);
}

export function routeRequest({
  pathname,
  choice,
  acceptLanguage,
  userAgent,
}: RouteRequest): Route {
  const defaultPrefix = prefixOf(DEFAULT_LOCALE);
  const image = pathname.includes("/opengraph-image");
  if (hasPrefix(pathname, defaultPrefix)) {
    return image
      ? { kind: "next" }
      : { kind: "redirect", pathname: withoutPrefix(pathname, defaultPrefix) };
  }
  const current = localeOfPath(pathname);
  const base = localizedPath(pathname, DEFAULT_LOCALE);
  const follows =
    !image && !DEFAULT_LOCALE_ONLY.has(base) && !CRAWLER.test(userAgent ?? "");
  const preferred = follows ? preferredLocale(choice, acceptLanguage) : null;
  if (preferred && preferred !== current) {
    return { kind: "redirect", pathname: localizedPath(pathname, preferred) };
  }
  if (current !== DEFAULT_LOCALE) {
    return { kind: "next" };
  }
  return {
    kind: "rewrite",
    pathname: pathname === "/" ? defaultPrefix : `${defaultPrefix}${pathname}`,
  };
}

export function localeCookie(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
}
