import { getTexts, inputText } from "@/content";
import { LOCALES, type Locale } from "@/content/locales";
import type { ByInput, Input, SectionId } from "@/content/types";
import {
  CATALOG,
  type CatalogObject,
  catalogIdentifiers,
} from "@/engine/catalog";
import { sectionScript } from "@/engine/scripts";
import { type CodeToken, highlightTsql } from "./highlight";

export type ScriptLine = CodeToken[] | ByInput<CodeToken[]>;

const identifiers = catalogIdentifiers();

function scriptKey(section: SectionId, locale: Locale): string {
  return `${section}:${locale}`;
}

function highlightedScript(
  object: CatalogObject,
  locale: Locale,
  input: Input,
): CodeToken[][] {
  const comments = getTexts(locale).shell.scripts[object.section].map((line) =>
    inputText(line, input),
  );
  return highlightTsql(sectionScript(object, comments), identifiers);
}

function lineText(tokens: readonly CodeToken[]): string {
  return tokens.map((token) => token.content).join("");
}

const highlighted = new Map(
  CATALOG.flatMap((object) =>
    LOCALES.map((locale) => {
      const touchLines = highlightedScript(object, locale, "touch");
      const lines = highlightedScript(object, locale, "keyboard").map(
        (keyboard, index): ScriptLine => {
          const touch = touchLines[index];
          return lineText(keyboard) === lineText(touch)
            ? keyboard
            : { keyboard, touch };
        },
      );
      return [scriptKey(object.section, locale), lines] as const;
    }),
  ),
);

export function scriptLines(
  section: SectionId,
  locale: Locale,
): readonly ScriptLine[] {
  return highlighted.get(scriptKey(section, locale)) ?? [];
}
