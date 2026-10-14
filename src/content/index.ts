import { texts } from "./globals";
import { DEFAULT_LOCALE, type Locale } from "./locales";
import type { Input, InputText, SectionId, Tables, Texts } from "./types";

const readers: {
  [K in SectionId]: (localeTexts: Texts, locale: Locale) => Tables[K];
} = {
  about: (localeTexts) => [localeTexts.about],
  "tech-stack": (localeTexts) => localeTexts.techStack,
  career: (localeTexts) =>
    [...localeTexts.career].sort((a, b) =>
      b.startDate.localeCompare(a.startDate),
    ),
  projects: (localeTexts) => localeTexts.projects,
  "beyond-the-terminal": (localeTexts) => localeTexts.beyondTheTerminal,
  contact: (localeTexts) => localeTexts.contact.channels,
  resume: (localeTexts) => [localeTexts.resume],
};

export function getTexts(locale: Locale = DEFAULT_LOCALE): Texts {
  return texts[locale];
}

export function inputText(text: InputText, input: Input): string {
  return typeof text === "string" ? text : text[input];
}

export function withLabels(
  text: InputText,
  labels: Readonly<Record<string, string>>,
): InputText {
  const fill = (value: string) =>
    value.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
      Object.hasOwn(labels, key) ? labels[key] : placeholder,
    );
  return typeof text === "string"
    ? fill(text)
    : { keyboard: fill(text.keyboard), touch: fill(text.touch) };
}

export function getTable<K extends SectionId>(
  section: K,
  locale: Locale = DEFAULT_LOCALE,
): Tables[K] {
  return readers[section](texts[locale], locale);
}
