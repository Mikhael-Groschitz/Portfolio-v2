"use client";

import { LocaleText } from "@/components/locale/locale-text";
import { type Localized, mapLocalized } from "@/content/locales";
import type { SectionId } from "@/content/types";
import { isQueryDocument } from "./section-routes";
import { useWorkspace } from "./workspace-context";

interface Headings {
  sections: Record<SectionId, string>;
  query: string;
}

export function PageHeading({
  headings,
}: Readonly<{ headings: Localized<Headings> }>) {
  const { activeDocument } = useWorkspace();
  if (activeDocument === null) {
    return null;
  }

  return (
    <h1 className="visually-hidden">
      <LocaleText
        text={mapLocalized(headings, (heading) =>
          isQueryDocument(activeDocument)
            ? heading.query
            : heading.sections[activeDocument],
        )}
      />
    </h1>
  );
}
