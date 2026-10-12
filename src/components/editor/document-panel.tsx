"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useConnectionStatus } from "@/components/connect/use-connection-status";
import {
  DOCUMENT_PANEL_ID,
  documentTabId,
} from "@/components/shell/element-ids";
import { useWorkspace } from "@/components/shell/workspace-context";
import { isProvisional } from "@/components/shell/workspace-state";
import { helpCall } from "@/engine/sp-help";
import { isExecuteShortcut, isHelpShortcut } from "./editor-keys";
import styles from "./editor.module.css";

function selectedText(target: HTMLElement, editor: HTMLElement): string {
  if (target instanceof HTMLTextAreaElement) {
    return target.value.slice(target.selectionStart, target.selectionEnd);
  }
  const selection = window.getSelection();
  return selection && editor.contains(selection.anchorNode)
    ? selection.toString()
    : "";
}

export function DocumentPanel({ children }: Readonly<{ children: ReactNode }>) {
  const { activeDocument, activeRun, runDocument } = useWorkspace();
  const disconnected = useConnectionStatus() === "disconnected";
  const hasResults =
    activeRun !== null && !(disconnected && isProvisional(activeRun));

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const editor = target.closest<HTMLElement>("[data-editor]");
    if (activeDocument === null || !editor) {
      return;
    }
    if (isExecuteShortcut(event)) {
      event.preventDefault();
      runDocument(activeDocument);
    } else if (isHelpShortcut(event)) {
      event.preventDefault();
      runDocument(activeDocument, helpCall(selectedText(target, editor)));
    }
  }

  if (activeDocument === null) {
    return <div className={styles.panel}>{children}</div>;
  }

  return (
    <div
      id={DOCUMENT_PANEL_ID}
      role="tabpanel"
      aria-labelledby={documentTabId(activeDocument)}
      className={styles.panel}
      data-has-results={hasResults || undefined}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}
