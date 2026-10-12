"use client";

import { type ReactNode, createContext, useContext, useMemo } from "react";
import type { Locale } from "@/content/locales";
import { localeCookie, localizedPath } from "./locale-routing";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function openTwinPage(locale: Locale) {
  document.cookie = localeCookie(locale);
  const twin = new URL(window.location.href);
  twin.pathname = localizedPath(twin.pathname, locale);
  window.location.assign(twin);
}

export function LanguageProvider({
  locale,
  children,
}: Readonly<{ locale: Locale; children: ReactNode }>) {
  const value = useMemo(
    () => ({
      locale,
      setLocale: (next: Locale) => {
        if (next !== locale) {
          openTwinPage(next);
        }
      },
    }),
    [locale],
  );

  return <LanguageContext value={value}>{children}</LanguageContext>;
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return value;
}
