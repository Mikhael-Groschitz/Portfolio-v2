import type { DocumentId } from "./section-routes";

export interface Visits {
  entries: readonly DocumentId[];
  index: number;
}

interface Visit {
  document: DocumentId;
  index: number;
}

export const NO_VISITS: Visits = { entries: [], index: -1 };

const VISIT_LIMIT = 20;

export function visit(visits: Visits, document: DocumentId | null): Visits {
  if (document === null || visits.entries[visits.index] === document) {
    return visits;
  }
  const entries = [
    ...visits.entries.slice(0, visits.index + 1),
    document,
  ].slice(-VISIT_LIMIT);
  return { entries, index: entries.length - 1 };
}

export function forget(visits: Visits, document: DocumentId): Visits {
  if (!visits.entries.includes(document)) {
    return visits;
  }
  const entries: DocumentId[] = [];
  let index = -1;
  visits.entries.forEach((entry, position) => {
    if (entry !== document && entry !== entries.at(-1)) {
      entries.push(entry);
    }
    if (position <= visits.index) {
      index = entries.length - 1;
    }
  });
  return { entries, index: entries.length === 0 ? -1 : Math.max(index, 0) };
}

export function canGoBack(visits: Visits): boolean {
  return visits.index > 0;
}

export function canGoForward(visits: Visits): boolean {
  return visits.index < visits.entries.length - 1;
}

export function backVisits(visits: Visits): Visit[] {
  return visits.entries
    .slice(0, Math.max(visits.index, 0))
    .map((document, index) => ({ document, index }))
    .reverse();
}

export function goTo(visits: Visits, index: number): Visits {
  return index >= 0 && index < visits.entries.length && index !== visits.index
    ? { ...visits, index }
    : visits;
}
