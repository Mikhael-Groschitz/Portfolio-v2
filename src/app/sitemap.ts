import type { MetadataRoute } from "next";
import { LOCALES } from "@/content/locales";
import {
  INDEXED_PAGES,
  SITE_URL,
  pageAlternates,
  pagePath,
} from "./site-metadata";

function absolute(path: string): string {
  return new URL(path, SITE_URL).href;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXED_PAGES.flatMap((page) => {
    const languages = Object.fromEntries(
      Object.entries(pageAlternates(page)).map(([language, path]) => [
        language,
        absolute(path),
      ]),
    );
    return LOCALES.map((locale) => ({
      url: absolute(pagePath(page, locale)),
      alternates: { languages },
    }));
  });
}
