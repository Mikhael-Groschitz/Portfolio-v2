import { V1_URL } from "@/components/easter-eggs/v1-url";
import { getTexts } from "@/content";
import { type Localized, byLocale } from "@/content/locales";
import type { SectionId } from "@/content/types";
import { catalogObject } from "@/engine/catalog";
import { type ExecutionOutcome, execute, parse } from "@/engine/execute";
import { sectionScript } from "@/engine/scripts";

export function executeQuery(
  input: string,
  seed: number,
): Localized<ExecutionOutcome> {
  const now = new Date();
  return byLocale((locale) =>
    execute(input, {
      locale,
      random: () => seed,
      now,
      v1Available: V1_URL !== null,
    }),
  );
}

export function executeSection(
  section: SectionId,
): Localized<ExecutionOutcome> {
  const object = catalogObject(section);
  return byLocale((locale) =>
    execute(sectionScript(object, getTexts(locale).shell.scripts[section]), {
      locale,
    }),
  );
}

export function sectionText(section: SectionId): string {
  return sectionScript(
    catalogObject(section),
    getTexts().shell.scripts[section],
  );
}

export function parseQuery(
  input: string,
  seed: number,
): Localized<ExecutionOutcome> {
  const now = new Date();
  return byLocale((locale) =>
    parse(input, {
      locale,
      random: () => seed,
      now,
      v1Available: V1_URL !== null,
    }),
  );
}
