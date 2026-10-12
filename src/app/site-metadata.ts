import type { Metadata } from "next";
import { localizedPath } from "@/components/locale/locale-routing";
import { getTexts } from "@/content";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/content/locales";
import { SECTION_IDS, type SectionId, type Texts } from "@/content/types";

export const SITE_URL = "https://mgroschitz.dev";

export const HOME_PAGE = "home";

export type SitePage = typeof HOME_PAGE | SectionId | "query";

export const INDEXED_PAGES: readonly SitePage[] = [HOME_PAGE, ...SECTION_IDS];

const OPEN_GRAPH_LOCALES: Record<Locale, string> = {
  "pt-BR": "pt_BR",
  en: "en_US",
};

function withName(template: string, texts: Texts): string {
  return template.replaceAll("{name}", texts.about.name);
}

function pageLabel(
  page: Exclude<SitePage, typeof HOME_PAGE>,
  texts: Texts,
): string {
  return page === "query"
    ? texts.shell.query.editorLabel
    : texts.sections[page];
}

export function pageTitle(page: SitePage, texts: Texts): string {
  const { name, role } = texts.about;
  if (page === HOME_PAGE) {
    return `${name} | ${role}`;
  }
  return `${pageLabel(page, texts)} | ${name}`;
}

export function pageDescription(page: SitePage, texts: Texts): string {
  const { seo } = texts;
  if (page === HOME_PAGE || page === "query") {
    return withName(seo.description, texts);
  }
  return withName(seo.sections[page], texts);
}

export function titleTemplate(texts: Texts): string {
  return `%s | ${texts.about.name}`;
}

export function imageAlt(texts: Texts): string {
  return withName(texts.seo.imageAlt, texts);
}

export function pagePath(page: SitePage, locale: Locale): string {
  return localizedPath(page === HOME_PAGE ? "/" : `/${page}`, locale);
}

export function pageAlternates(page: SitePage): Record<string, string> {
  return {
    ...Object.fromEntries(
      LOCALES.map((locale) => [locale, pagePath(page, locale)]),
    ),
    "x-default": pagePath(page, DEFAULT_LOCALE),
  };
}

export function pageMetadata(page: SitePage, locale: Locale): Metadata {
  const texts = getTexts(locale);
  return {
    title:
      page === HOME_PAGE
        ? { absolute: pageTitle(page, texts) }
        : pageLabel(page, texts),
    description: pageDescription(page, texts),
    alternates: {
      canonical: pagePath(page, locale),
      languages: pageAlternates(page),
    },
  };
}

export function openGraphLocales(locale: Locale) {
  return {
    locale: OPEN_GRAPH_LOCALES[locale],
    alternateLocale: LOCALES.filter((other) => other !== locale).map(
      (other) => OPEN_GRAPH_LOCALES[other],
    ),
  };
}
