import { describe, expect, it } from "vitest";
import { getTexts } from "@/content";
import { LOCALES } from "@/content/locales";
import { SECTION_IDS } from "@/content/types";
import robots from "./robots";
import {
  HOME_PAGE,
  INDEXED_PAGES,
  SITE_URL,
  type SitePage,
  imageAlt,
  openGraphLocales,
  pageDescription,
  pageMetadata,
  pagePath,
  pageTitle,
  titleTemplate,
} from "./site-metadata";
import sitemap from "./sitemap";

const SITE_PAGES: readonly SitePage[] = [HOME_PAGE, ...SECTION_IDS, "query"];

describe("page titles", () => {
  it("names the home page after the person and the headline", () => {
    expect(pageTitle(HOME_PAGE, getTexts("pt-BR"))).toBe(
      "Mikhael Groschitz Costa | Engenheiro de dados",
    );
    expect(pageTitle(HOME_PAGE, getTexts("en"))).toBe(
      "Mikhael Groschitz Costa | Data Engineer",
    );
  });

  it("puts the page name before the person's name", () => {
    expect(pageTitle("career", getTexts("pt-BR"))).toBe(
      "Carreira | Mikhael Groschitz Costa",
    );
    expect(pageTitle("career", getTexts("en"))).toBe(
      "Career | Mikhael Groschitz Costa",
    );
    expect(pageTitle("about", getTexts("pt-BR"))).toBe(
      "Sobre | Mikhael Groschitz Costa",
    );
    expect(pageTitle("query", getTexts("en"))).toBe(
      "New query | Mikhael Groschitz Costa",
    );
  });

  it("builds each title from the page name and the layout template", () => {
    for (const locale of LOCALES) {
      const texts = getTexts(locale);
      for (const page of SITE_PAGES.filter((item) => item !== HOME_PAGE)) {
        const { title } = pageMetadata(page, locale);
        expect(titleTemplate(texts).replace("%s", String(title))).toBe(
          pageTitle(page, texts),
        );
      }
      expect(pageMetadata(HOME_PAGE, locale).title).toEqual({
        absolute: pageTitle(HOME_PAGE, texts),
      });
    }
  });

  it("gives every page its own title in every language", () => {
    for (const locale of LOCALES) {
      const titles = SITE_PAGES.map((page) =>
        pageTitle(page, getTexts(locale)),
      );
      expect(new Set(titles).size).toBe(titles.length);
    }
  });
});

describe("page descriptions", () => {
  it("fills in the name and leaves no placeholder behind", () => {
    for (const locale of LOCALES) {
      const texts = getTexts(locale);
      for (const text of [
        ...SITE_PAGES.map((page) => pageDescription(page, texts)),
        imageAlt(texts),
      ]) {
        expect(text).toContain(texts.about.name);
        expect(text).not.toMatch(/[{}]/);
      }
    }
  });

  it("describes each indexed page in its own words", () => {
    for (const locale of LOCALES) {
      const descriptions = INDEXED_PAGES.map((page) =>
        pageDescription(page, getTexts(locale)),
      );
      expect(new Set(descriptions).size).toBe(descriptions.length);
    }
  });
});

describe("addresses", () => {
  it("keeps Portuguese at the root and English under /en", () => {
    expect(pagePath(HOME_PAGE, "pt-BR")).toBe("/");
    expect(pagePath(HOME_PAGE, "en")).toBe("/en");
    expect(pagePath("career", "pt-BR")).toBe("/career");
    expect(pagePath("career", "en")).toBe("/en/career");
    expect(pagePath("query", "en")).toBe("/en/query");
  });

  it("describes each page in its own language and links the twin", () => {
    expect(pageMetadata("projects", "en")).toMatchObject({
      title: "Projects",
      alternates: {
        canonical: "/en/projects",
        languages: {
          "pt-BR": "/projects",
          en: "/en/projects",
          "x-default": "/projects",
        },
      },
    });
    expect(pageMetadata(HOME_PAGE, "pt-BR")).toMatchObject({
      title: { absolute: "Mikhael Groschitz Costa | Engenheiro de dados" },
      alternates: { canonical: "/" },
    });
  });
});

describe("site metadata", () => {
  it("shares each page in its language, with the other as the alternate", () => {
    expect(openGraphLocales("pt-BR")).toEqual({
      locale: "pt_BR",
      alternateLocale: ["en_US"],
    });
    expect(openGraphLocales("en")).toEqual({
      locale: "en_US",
      alternateLocale: ["pt_BR"],
    });
  });

  it("lists keywords in every language, each one once", () => {
    for (const locale of LOCALES) {
      const { keywords } = getTexts(locale).seo;
      expect(keywords.length).toBeGreaterThan(0);
      expect(new Set(keywords).size).toBe(keywords.length);
    }
  });
});

describe("sitemap and robots", () => {
  it("lists the start page and every section in both languages, without /query", () => {
    expect(sitemap().map((entry) => entry.url)).toEqual(
      INDEXED_PAGES.flatMap((page) => [
        `${SITE_URL}${page === HOME_PAGE ? "/" : `/${page}`}`,
        `${SITE_URL}/en${page === HOME_PAGE ? "" : `/${page}`}`,
      ]),
    );
  });

  it("tells search engines which page is the twin in the other language", () => {
    const career = sitemap().find(
      (entry) => entry.url === `${SITE_URL}/en/career`,
    );
    expect(career?.alternates?.languages).toEqual({
      "pt-BR": `${SITE_URL}/career`,
      en: `${SITE_URL}/en/career`,
      "x-default": `${SITE_URL}/career`,
    });
  });

  it("lets every crawler in and points to the sitemap", () => {
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: `${SITE_URL}/sitemap.xml`,
    });
  });
});
