import type { DocumentId } from "./section-routes";

export const EXPLORER_ID = "object-explorer";
export const EXPLORER_PANEL_ID = "object-explorer-panel";
export const EXPLORER_TITLE_ID = "object-explorer-title";
export const DOCUMENT_PANEL_ID = "document-panel";

export function documentTabId(document: DocumentId): string {
  return `document-tab-${document}`;
}
