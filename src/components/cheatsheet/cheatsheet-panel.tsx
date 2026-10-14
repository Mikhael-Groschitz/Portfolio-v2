"use client";

import { type KeyboardEvent, type MouseEvent, useId, useRef } from "react";
import { useConnectionStatus } from "@/components/connect/use-connection-status";
import { NewQueryIcon, ProcedureIcon, TableIcon } from "@/components/icons";
import { InputAware } from "@/components/input-variants";
import { isPlainClick } from "@/components/interaction";
import { useLanguage } from "@/components/locale/language-context";
import { localizedPath } from "@/components/locale/locale-routing";
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
import type { CheatsheetText, SectionId } from "@/content/types";
import { CATALOG } from "@/engine/catalog";
import { commandFor } from "@/engine/hints";
import { CHEATSHEET_ID, CHEATSHEET_WINDOW_ID, useGuide } from "./guide-context";
import styles from "./cheatsheet.module.css";

interface CheatsheetPanelProps {
  text: CheatsheetText;
  windowText: ToolWindowText;
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
  const { locale } = useLanguage();

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
        <span className={styles.edgeLabel}>{text.title}</span>
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
            {text.title}
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
          <p className={styles.intro}>
            <InputAware text={text.intro} />
          </p>
          <h3 className={styles.heading}>{text.sectionsTitle}</h3>
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
                  {text.newQuery.label}
                  <span className={styles.itemNote}>
                    {text.newQuery.description}
                  </span>
                </span>
              </button>
            </li>
            {CATALOG.map((object) => (
              <li key={object.section}>
                <a
                  href={localizedPath(documentPath(object.section), locale)}
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
                    {text.sections[object.section]}
                    <code className={styles.itemCode}>
                      {commandFor(object)}
                    </code>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <h3 className={styles.heading}>{text.exploreTitle}</h3>
          <p className={styles.intro}>
            <InputAware text={text.exploreIntro} />
          </p>
          <ul className={styles.list}>
            {text.examples.map(({ command }, index) => (
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
                    <InputAware text={text.examples[index].description} />
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
        label={text.resize}
        className={styles.windowSplitter}
      />
    </div>
  );
}
