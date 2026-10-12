"use client";

import { type KeyboardEvent, type MouseEvent, useId, useRef } from "react";
import { useConnectionStatus } from "@/components/connect/use-connection-status";
import { NewQueryIcon, ProcedureIcon, TableIcon } from "@/components/icons";
import { isPlainClick } from "@/components/interaction";
import { LocaleText } from "@/components/locale/locale-text";
import { documentPath } from "@/components/shell/section-routes";
import {
  FloatingResizer,
  WindowSplitter,
  useAutoHide,
} from "@/components/shell/tool-window";
import {
  ToolWindowControls,
  type ToolWindowText,
} from "@/components/shell/tool-window-controls";
import { useWorkspace } from "@/components/shell/workspace-context";
import {
  DEFAULT_LOCALE,
  type Localized,
  mapLocalized,
} from "@/content/locales";
import type { CheatsheetText, SectionId } from "@/content/types";
import { CATALOG } from "@/engine/catalog";
import { commandFor } from "@/engine/hints";
import { CHEATSHEET_ID, CHEATSHEET_WINDOW_ID, useGuide } from "./guide-context";
import styles from "./cheatsheet.module.css";

interface CheatsheetPanelProps {
  text: Localized<CheatsheetText>;
  windowText: Localized<ToolWindowText>;
}

function focusFirstItem() {
  document
    .querySelector<HTMLElement>(`#${CHEATSHEET_ID} [data-cheatsheet-item]`)
    ?.focus({ preventScroll: true });
}

export function CheatsheetPanel({
  text,
  windowText,
}: Readonly<CheatsheetPanelProps>) {
  const { openSection, openQuery, writeQuery, requestConnection } =
    useWorkspace();
  const { docked, sheetOpen, closeCheatsheet, chooseCheatsheet, stepDone } =
    useGuide();
  const connected = useConnectionStatus() === "connected";
  const titleId = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLButtonElement>(null);
  const autoHide = useAutoHide("cheatsheet", {
    containerRef: frameRef,
    tabRef,
    focusInside: focusFirstItem,
  });
  const sheet = !docked;

  function label(pick: (entry: CheatsheetText) => string) {
    return <LocaleText text={mapLocalized(text, pick)} />;
  }

  function leaveSheet() {
    if (sheet) {
      closeCheatsheet();
    }
  }

  function startQuery() {
    leaveSheet();
    if (!connected) {
      requestConnection({ kind: "query" });
      return;
    }
    openQuery();
    stepDone("query");
  }

  function openFromList(event: MouseEvent, section: SectionId) {
    if (!isPlainClick(event)) {
      return;
    }
    event.preventDefault();
    leaveSheet();
    if (!connected) {
      requestConnection({ kind: "section", section });
      return;
    }
    openSection(section);
    stepDone("tables");
  }

  function insertExample(command: string) {
    leaveSheet();
    if (connected) {
      writeQuery(command);
    } else {
      requestConnection({ kind: "query", text: command });
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (sheetOpen && event.key === "Escape") {
      event.preventDefault();
      closeCheatsheet();
      return;
    }
    autoHide.handleKeyDown(event);
  }

  return (
    <div
      ref={frameRef}
      role="complementary"
      aria-labelledby={titleId}
      className={styles.frame}
      onKeyDown={handleKeyDown}
      {...autoHide.containerProps}
    >
      <button
        type="button"
        className={styles.edgeTab}
        data-cheatsheet-tab=""
        aria-controls={CHEATSHEET_ID}
        {...autoHide.tabProps}
      >
        <span className={styles.edgeLabel}>
          {label((entry) => entry.title)}
        </span>
      </button>
      <div
        id={CHEATSHEET_ID}
        role={sheetOpen ? "dialog" : undefined}
        aria-modal={sheetOpen || undefined}
        aria-labelledby={sheetOpen ? titleId : undefined}
        className={styles.panel}
        data-sheet-open={sheetOpen}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {label((entry) => entry.title)}
          </h2>
          <ToolWindowControls
            windowId="cheatsheet"
            panelId={CHEATSHEET_ID}
            text={windowText}
            onChoice={chooseCheatsheet}
            onClose={closeCheatsheet}
          />
        </div>
        <div className={styles.body}>
          <p className={styles.intro}>{label((entry) => entry.intro)}</p>
          <h3 className={styles.heading}>
            {label((entry) => entry.sectionsTitle)}
          </h3>
          <ul className={styles.list}>
            <li>
              <button
                type="button"
                className={styles.item}
                data-cheatsheet-item=""
                onClick={startQuery}
              >
                <span className={styles.itemIcon}>
                  <NewQueryIcon />
                </span>
                <span className={styles.itemText}>
                  {label((entry) => entry.newQuery.label)}
                  <span className={styles.itemNote}>
                    {label((entry) => entry.newQuery.description)}
                  </span>
                </span>
              </button>
            </li>
            {CATALOG.map((object) => (
              <li key={object.section}>
                <a
                  href={documentPath(object.section)}
                  className={styles.item}
                  onClick={(event) => openFromList(event, object.section)}
                >
                  <span className={styles.itemIcon}>
                    {object.kind === "table" ? (
                      <TableIcon />
                    ) : (
                      <ProcedureIcon />
                    )}
                  </span>
                  <span className={styles.itemText}>
                    {label((entry) => entry.sections[object.section])}
                    <code className={styles.itemCode}>
                      {commandFor(object)}
                    </code>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <h3 className={styles.heading}>
            {label((entry) => entry.exploreTitle)}
          </h3>
          <p className={styles.intro}>{label((entry) => entry.exploreIntro)}</p>
          <ul className={styles.list}>
            {text[DEFAULT_LOCALE].examples.map(({ command }, index) => (
              <li key={command}>
                <button
                  type="button"
                  className={styles.item}
                  onClick={() => insertExample(command)}
                >
                  <span className={styles.itemIcon}>
                    <NewQueryIcon />
                  </span>
                  <span className={styles.itemText}>
                    <code className={styles.itemCode}>{command}</code>
                    {label((entry) => entry.examples[index].description)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <FloatingResizer
          windowId="cheatsheet"
          className={styles.floatingResizer}
        />
      </div>
      <WindowSplitter
        windowId="cheatsheet"
        side="end"
        containerId={CHEATSHEET_WINDOW_ID}
        controls={CHEATSHEET_ID}
        label={mapLocalized(text, (entry) => entry.resize)}
        className={styles.windowSplitter}
      />
    </div>
  );
}
