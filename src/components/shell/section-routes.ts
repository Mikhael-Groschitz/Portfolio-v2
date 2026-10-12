import { catalogObject } from "@/engine/catalog";
import { type SectionId, isSectionId } from "@/content/types";

export const QUERY_ROUTE = "query";

const QUERY_PREFIX = "query-";

export type QueryDocumentId = `${typeof QUERY_PREFIX}${number}`;

export type DocumentId = SectionId | QueryDocumentId;

export type Route = SectionId | typeof QUERY_ROUTE | null;

export function queryDocument(number: number): QueryDocumentId {
  return `${QUERY_PREFIX}${number}`;
}

export function isQueryDocument(
  document: DocumentId,
): document is QueryDocumentId {
  return document.startsWith(QUERY_PREFIX);
}

export function queryNumber(document: QueryDocumentId): number {
  return Number(document.slice(QUERY_PREFIX.length));
}

export function queryFileName(document: QueryDocumentId): string {
  return `SQLQuery${queryNumber(document)}.sql`;
}

export function documentFileName(document: DocumentId): string {
  return isQueryDocument(document)
    ? queryFileName(document)
    : `${catalogObject(document).name}.sql`;
}

export function isDocumentId(value: unknown): value is DocumentId {
  return (
    isSectionId(value) ||
    (typeof value === "string" && /^query-[1-9]\d*$/.test(value))
  );
}

export function documentPath(document: DocumentId): string {
  return `/${isQueryDocument(document) ? QUERY_ROUTE : document}`;
}

export function routeFromSegment(segment: string | null): Route {
  if (segment === QUERY_ROUTE) {
    return QUERY_ROUTE;
  }
  return isSectionId(segment) ? segment : null;
}
