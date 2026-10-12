import type { ReactNode } from "react";
import { LOCALES, type Locale, type Localized } from "@/content/locales";

export function LocaleText({ text }: Readonly<{ text: Localized }>) {
  return LOCALES.map((locale) => (
    <span key={locale} lang={locale} data-locale-block={locale}>
      {text[locale]}
    </span>
  ));
}

export function LocaleBlocks({
  children,
}: Readonly<{ children: (locale: Locale) => ReactNode }>) {
  return LOCALES.map((locale) => (
    <div key={locale} lang={locale} data-locale-block={locale}>
      {children(locale)}
    </div>
  ));
}
