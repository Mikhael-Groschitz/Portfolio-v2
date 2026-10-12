import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { getTexts } from "@/content";
import { DEFAULT_LOCALE, type Locale, isLocale } from "@/content/locales";
import type { Texts } from "@/content/types";

export async function addressLocale(): Promise<Locale> {
  const value = await lang();
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function pageLocale(): Promise<Locale> {
  const value = await lang();
  if (!isLocale(value)) {
    notFound();
  }
  return value;
}

export async function pageTexts(): Promise<Texts> {
  return getTexts(await pageLocale());
}
