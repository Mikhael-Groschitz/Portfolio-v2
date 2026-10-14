"use client";

import {
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { MoreIcon } from "@/components/icons";
import { arrowTarget } from "@/components/interaction";
import { MenuButton, type PopupMenuItem } from "@/components/menu/menu-button";
import { COMPACT_MEDIA_QUERY } from "@/components/shell/breakpoints";
import { useMediaQuery } from "@/components/shell/use-media-query";
import {
  type EntryLayout,
  type ToolbarEntry,
  hiddenEntries,
  overflowMenu,
} from "./toolbar-model";
import styles from "./toolbar.module.css";

export interface RenderedEntry extends ToolbarEntry {
  render?: () => ReactNode;
}

interface ToolbarStripProps {
  label: string;
  moreLabel: ReactNode;
  entries: readonly RenderedEntry[];
  compactExtras?: () => readonly PopupMenuItem[];
  trailing?: () => readonly PopupMenuItem[];
  collapse?: boolean;
  variant?: "bar" | "panel";
  className?: string;
}

const CONTROLS = "button, select, a[href]";

function isControl(element: EventTarget | null): element is HTMLElement {
  return (
    element instanceof HTMLElement &&
    element.matches(CONTROLS) &&
    element.closest('[role="menu"]') === null
  );
}

function controlsIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll(CONTROLS)).filter(isControl);
}

function isShown(entry: HTMLElement | null, compact: boolean): boolean {
  if (!entry) {
    return true;
  }
  const { overflow, essential } = entry.dataset;
  if (overflow !== undefined) {
    return false;
  }
  const collapsed = entry.closest("[data-collapse]") !== null;
  return !(compact && collapsed && essential === undefined);
}

function usableControls(root: HTMLElement): HTMLElement[] {
  const compact = root.dataset.compact !== undefined;
  return controlsIn(root).filter(
    (control) =>
      !(control as HTMLButtonElement).disabled &&
      isShown(control.closest<HTMLElement>("[data-entry]"), compact),
  );
}

function syncTabStops(
  root: HTMLElement | null,
  stop: RefObject<HTMLElement | null>,
) {
  if (!root) {
    return;
  }
  const controls = controlsIn(root);
  const usable = usableControls(root);
  const chosen =
    stop.current && usable.includes(stop.current) ? stop.current : usable[0];
  for (const control of controls) {
    const tabIndex = control === chosen ? 0 : -1;
    if (control.tabIndex !== tabIndex) {
      control.tabIndex = tabIndex;
    }
  }
}

function sameKeys(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  return a.size === b.size && [...a].every((key) => b.has(key));
}

function measure(items: HTMLElement): Set<string> {
  const limit = items.clientHeight;
  const layout: EntryLayout[] = Array.from(items.children, (child) => {
    const element = child as HTMLElement;
    return {
      key: element.dataset.entry ?? "",
      separator: element.dataset.separator !== undefined,
      shown:
        element.getClientRects().length > 0 &&
        element.offsetTop + element.offsetHeight / 2 <= limit,
    };
  });
  return hiddenEntries(layout);
}

export function ToolbarStrip({
  label,
  moreLabel,
  entries,
  compactExtras,
  trailing,
  collapse = false,
  variant = "bar",
  className,
}: Readonly<ToolbarStripProps>) {
  const compact = useMediaQuery(COMPACT_MEDIA_QUERY);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef<HTMLElement | null>(null);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  const keys = entries.map((entry) => entry.key).join(" ");

  useLayoutEffect(() => {
    const items = itemsRef.current;
    if (!items) {
      return;
    }
    function update() {
      if (items) {
        const next = measure(items);
        setHidden((current) => (sameKeys(current, next) ? current : next));
      }
    }
    update();
    const observer = new ResizeObserver(update);
    observer.observe(items);
    for (const child of Array.from(items.children)) {
      observer.observe(child);
    }
    return () => observer.disconnect();
  }, [keys]);

  useLayoutEffect(() => {
    syncTabStops(rootRef.current, stopRef);
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const observer = new MutationObserver(() =>
      syncTabStops(rootRef.current, stopRef),
    );
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributeFilter: ["disabled"],
    });
    return () => observer.disconnect();
  }, []);

  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    if (isControl(event.target)) {
      stopRef.current = event.target;
      syncTabStops(rootRef.current, stopRef);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const root = rootRef.current;
    if (!root || !isControl(event.target)) {
      return;
    }
    const usable = usableControls(root);
    const index = usable.indexOf(event.target);
    if (index === -1) {
      return;
    }
    const target = arrowTarget(event.key, index, usable.length, "horizontal");
    if (target === undefined) {
      return;
    }
    event.preventDefault();
    usable[target].focus();
  }

  function menuItems(): PopupMenuItem[] {
    const extras = [
      compact && compactExtras ? compactExtras() : [],
      trailing ? trailing() : [],
    ];
    return overflowMenu(entries, hidden, extras);
  }

  return (
    <div
      ref={rootRef}
      role="toolbar"
      aria-label={label}
      className={className ? `${styles.toolbar} ${className}` : styles.toolbar}
      data-collapse={collapse || undefined}
      data-compact={compact || undefined}
      data-variant={variant}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
    >
      <div ref={itemsRef} className={styles.items}>
        {entries.map((entry) =>
          entry.separator ? (
            <span
              key={entry.key}
              className={styles.separator}
              aria-hidden="true"
              data-entry={entry.key}
              data-separator=""
              data-overflow={hidden.has(entry.key) || undefined}
            />
          ) : (
            <div
              key={entry.key}
              className={styles.entry}
              data-entry={entry.key}
              data-essential={entry.essential || undefined}
              data-overflow={hidden.has(entry.key) || undefined}
            >
              {entry.render?.()}
            </div>
          ),
        )}
      </div>
      <MenuButton
        label={moreLabel}
        className={`${styles.button} ${styles.more}`}
        items={menuItems}
        triggerData={{ "data-more": "" }}
      >
        <MoreIcon />
      </MenuButton>
    </div>
  );
}
