import type { Metadata } from "next";
import { getTexts } from "@/content";
import {
  DEFAULT_LOCALE,
  LOCALES,
  type Locale,
  type Localized,
  byLocale,
} from "@/content/locales";
import { SECTION_IDS, type SectionId, type Texts } from "@/content/types";

export const SITE_URL = "https://mgroschitz.dev";

export const HOME_PAGE = "home";

export type SitePage = typeof HOME_PAGE | SectionId | "query";

export const SITE_PAGES: readonly SitePage[] = [
  HOME_PAGE,
  ...SECTION_IDS,
  "query",
];

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

export function imageAlt(texts: Texts): string {
  return withName(texts.seo.imageAlt, texts);
}

export function canonicalPath(page: SitePage): string {
  return page === HOME_PAGE ? "/" : `/${page}`;
}

export function pageMetadata(page: SitePage): Metadata {
  const texts = getTexts(DEFAULT_LOCALE);
  return {
    title: pageTitle(page, texts),
    description: pageDescription(page, texts),
    alternates: { canonical: canonicalPath(page) },
  };
}

export function siteMetadata(): Metadata {
  const texts = getTexts(DEFAULT_LOCALE);
  return {
    metadataBase: new URL(SITE_URL),
    title: pageTitle(HOME_PAGE, texts),
    description: pageDescription(HOME_PAGE, texts),
    authors: [{ name: texts.about.name, url: SITE_URL }],
    openGraph: {
      type: "website",
      siteName: texts.about.name,
      locale: OPEN_GRAPH_LOCALES[DEFAULT_LOCALE],
      alternateLocale: LOCALES.filter(
        (locale) => locale !== DEFAULT_LOCALE,
      ).map((locale) => OPEN_GRAPH_LOCALES[locale]),
    },
    twitter: { card: "summary_large_image" },
  };
}

export function pageTitlesByPath(): Record<string, Localized> {
  return Object.fromEntries(
    SITE_PAGES.map((page) => [
      canonicalPath(page),
      byLocale((locale) => pageTitle(page, getTexts(locale))),
    ]),
  );
}
