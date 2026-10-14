import { V1_URL } from "@/components/easter-eggs/v1-url";
import { getTexts, inputText } from "@/content";
import type { Locale } from "@/content/locales";
import type { Input, SectionId } from "@/content/types";
import { catalogObject } from "@/engine/catalog";
import { type ExecutionOutcome, execute, parse } from "@/engine/execute";
import { sectionScript } from "@/engine/scripts";

export function executeQuery(
  input: string,
  locale: Locale,
  inputMethod: Input,
): ExecutionOutcome {
  return execute(input, {
    locale,
    now: new Date(),
    v1Available: V1_URL !== null,
    inputMethod,
  });
}

export function sectionText(
  section: SectionId,
  locale: Locale,
  inputMethod: Input,
): string {
  return sectionScript(
    catalogObject(section),
    getTexts(locale).shell.scripts[section].map((line) =>
      inputText(line, inputMethod),
    ),
  );
}

export function executeSection(
  section: SectionId,
  locale: Locale,
): ExecutionOutcome {
  return execute(sectionText(section, locale, "keyboard"), { locale });
}

export function parseQuery(input: string, locale: Locale): ExecutionOutcome {
  return parse(input, {
    locale,
    now: new Date(),
    v1Available: V1_URL !== null,
  });
}
