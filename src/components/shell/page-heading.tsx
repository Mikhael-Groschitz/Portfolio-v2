"use client";

import type { SectionId } from "@/content/types";
import { isQueryDocument } from "./section-routes";
import { useWorkspace } from "./workspace-context";

interface Headings {
  sections: Record<SectionId, string>;
  query: string;
}

export function PageHeading({ headings }: Readonly<{ headings: Headings }>) {
  const { activeDocument } = useWorkspace();
  if (activeDocument === null) {
    return null;
  }

  return (
    <h1 className="visually-hidden">
      {isQueryDocument(activeDocument)
        ? headings.query
        : headings.sections[activeDocument]}
    </h1>
  );
}
