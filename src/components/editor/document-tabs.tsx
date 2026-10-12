"use client";

import {
  type FocusEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useCommands } from "@/components/commands/command-context";
import { CaretDownIcon, CloseIcon, PinIcon } from "@/components/icons";
import { arrowTarget } from "@/components/interaction";
import { LocaleText } from "@/components/locale/locale-text";
import { MenuButton } from "@/components/menu/menu-button";
import {
  DOCUMENT_PANEL_ID,
  documentTabId,
} from "@/components/shell/element-ids";
import {
  type DocumentId,
  documentFileName,
  isDocumentId,
} from "@/components/shell/section-routes";
import { useWorkspace } from "@/components/shell/workspace-context";
import { neighborAfterClose } from "@/components/shell/workspace-state";
import type { Localized } from "@/content/locales";
import styles from "./editor.module.css";

const NEW_QUERY_SELECTOR = '[data-tour="new-query"]';

function focusNewQueryButton() {
  document.querySelector<HTMLElement>(NEW_QUERY_SELECTOR)?.focus();
}

function revealInStrip(tab: HTMLElement) {
  const strip = tab.closest<HTMLElement>('[role="tablist"]');
  if (!strip) {
    return;
  }
  const tabBox = tab.getBoundingClientRect();
  const stripBox = strip.getBoundingClientRect();
  if (tabBox.left < stripBox.left) {
    strip.scrollLeft -= stripBox.left - tabBox.left;
  } else if (tabBox.right > stripBox.right) {
    strip.scrollLeft += tabBox.right - stripBox.right;
  }
}

interface DocumentTabsProps {
  label: Localized;
  openTabsLabel: Localized;
}

export function DocumentTabs({
  label,
  openTabsLabel,
}: Readonly<DocumentTabsProps>) {
  const { tabs, activeDocument, activateDocument, closeDocument } =
    useWorkspace();
  const commands = useCommands();
  const [focusedId, setFocusedId] = useState<DocumentId | null>(null);
  const tabRefs = useRef(new Map<DocumentId, HTMLButtonElement>());
  const labelId = useId();
  const tabStop =
    focusedId !== null && tabs.includes(focusedId)
      ? focusedId
      : (activeDocument ?? tabs[0]);

  useEffect(() => {
    if (activeDocument === null) {
      return;
    }
    const tab = tabRefs.current.get(activeDocument)?.parentElement;
    if (tab) {
      revealInStrip(tab);
    }
  }, [activeDocument]);

  function focusTab(document: DocumentId | null | undefined) {
    if (document) {
      tabRefs.current.get(document)?.focus();
    } else {
      focusNewQueryButton();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = arrowTarget(
      event.key,
      tabs.indexOf(tabStop),
      tabs.length,
      "horizontal",
    );
    if (target !== undefined) {
      event.preventDefault();
      focusTab(tabs[target]);
      return;
    }
    switch (event.key) {
      case "Delete":
        focusTab(neighborAfterClose(tabs, tabStop));
        closeDocument(tabStop);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    const { document } = (event.target as HTMLElement).dataset;
    if (isDocumentId(document)) {
      setFocusedId(document);
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setFocusedId(null);
    }
  }

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className={styles.tabStrip}>
      <span id={labelId} className="visually-hidden">
        <LocaleText text={label} />
      </span>
      <div
        role="tablist"
        aria-labelledby={labelId}
        className={styles.tabs}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {tabs.map((document) => {
          const selected = document === activeDocument;
          return (
            <div
              key={document}
              role="presentation"
              className={
                selected ? `${styles.tab} ${styles.activeTab}` : styles.tab
              }
            >
              <button
                ref={(element) => {
                  if (element) {
                    tabRefs.current.set(document, element);
                  }
                  return () => {
                    tabRefs.current.delete(document);
                  };
                }}
                id={documentTabId(document)}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={selected ? DOCUMENT_PANEL_ID : undefined}
                aria-keyshortcuts="Delete"
                tabIndex={document === tabStop ? 0 : -1}
                data-document={document}
                className={styles.tabButton}
                onClick={() => activateDocument(document)}
              >
                {documentFileName(document)}
              </button>
              <span className={styles.tabIcons} aria-hidden="true">
                {selected && (
                  <span
                    className={styles.pinTab}
                    data-pin-tab=""
                    data-tip-text={commands.label("pinTab")}
                    onClick={() => commands.run("pinTab")}
                  >
                    <PinIcon size={14} />
                  </span>
                )}
                <span
                  className={styles.closeTab}
                  onClick={() => closeDocument(document)}
                >
                  <CloseIcon size={14} />
                </span>
              </span>
            </div>
          );
        })}
      </div>
      <MenuButton
        label={<LocaleText text={openTabsLabel} />}
        className={styles.stripMenu}
        triggerData={{ "data-open-tabs": "" }}
        items={() =>
          tabs.map((document) => ({
            key: document,
            label: documentFileName(document),
            role: "menuitemradio" as const,
            checked: document === activeDocument,
            onSelect: () => activateDocument(document),
          }))
        }
      >
        <CaretDownIcon />
      </MenuButton>
    </div>
  );
}
