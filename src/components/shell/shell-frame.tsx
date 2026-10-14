"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CHEATSHEET_WINDOW_ID,
  useGuide,
} from "@/components/cheatsheet/guide-context";
import { setFlag } from "@/components/cheatsheet/session-flags";
import { CommandProvider } from "@/components/commands/command-context";
import { useConnectionStatus } from "@/components/connect/use-connection-status";
import { useEasterEggs } from "@/components/easter-eggs/easter-egg-context";
import { COMPACT_MEDIA_QUERY } from "./breakpoints";
import {
  EXPLORER_ID,
  EXPLORER_PANEL_ID,
  EXPLORER_TITLE_ID,
} from "./element-ids";
import { keepFloatingInside } from "./layout-model";
import { updateLayout } from "./layout-store";
import { FloatingResizer, WindowSplitter, useAutoHide } from "./tool-window";
import { concealWindow, revealWindow, viewport } from "./tool-window-actions";
import { useMediaQuery } from "./use-media-query";
import styles from "./shell.module.css";

const MIN_USABLE_HEIGHT = 240;

interface ShellContextValue {
  compact: boolean;
  explorerOpen: boolean;
  openExplorer: () => void;
  closeExplorer: () => void;
  showExplorer: () => void;
  hideExplorer: () => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

interface ExplorerLabels {
  title: string;
  resize: string;
}

interface ShellFrameProps {
  titleBar: ReactNode;
  toolbar: ReactNode;
  explorer: ReactNode;
  explorerLabels: ExplorerLabels;
  workspace: ReactNode;
  guide: ReactNode;
  statusBar: ReactNode;
  tour: ReactNode;
  dialog: ReactNode;
  easterEggs: ReactNode;
}

const WITHOUT_SCROLLING: FocusOptions = { preventScroll: true };

function focusTree(container: HTMLElement | null, options?: FocusOptions) {
  const target =
    container?.querySelector<HTMLElement>('[role="treeitem"][tabindex="0"]') ??
    container?.querySelector<HTMLElement>("[data-explorer-connect]");
  target?.focus(options);
}

function focusStart(container: HTMLElement | null) {
  const target =
    container?.querySelector<HTMLElement>("[data-editor]") ??
    document.querySelector<HTMLElement>('[data-tour="new-query"]');
  target?.focus();
}

export function ShellFrame({
  titleBar,
  toolbar,
  explorer,
  explorerLabels,
  workspace,
  guide,
  statusBar,
  tour,
  dialog,
  easterEggs,
}: Readonly<ShellFrameProps>) {
  const compact = useMediaQuery(COMPACT_MEDIA_QUERY);
  const connection = useConnectionStatus();
  const { sheetOpen, closeCheatsheet } = useGuide();
  const { traveling, regenerating, playing } = useEasterEggs();
  const blocked = connection === "pending";
  const frozen = blocked || traveling || playing;
  const [drawerRequested, setDrawerRequested] = useState(false);
  const explorerOpen = compact && drawerRequested;
  const overlayOpen = explorerOpen || sheetOpen;
  const explorerRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLButtonElement>(null);
  const wasBlocked = useRef(false);
  const autoHide = useAutoHide("explorer", {
    containerRef: explorerRef,
    tabRef,
    focusInside: () => focusTree(explorerRef.current, WITHOUT_SCROLLING),
  });

  useEffect(() => {
    if (blocked) {
      wasBlocked.current = true;
      return;
    }
    if (!wasBlocked.current) {
      return;
    }
    wasBlocked.current = false;
    if (connection !== "connected") {
      return;
    }
    if (compact) {
      focusStart(workspaceRef.current);
    } else {
      focusTree(explorerRef.current);
    }
  }, [blocked, connection, compact]);

  useEffect(() => {
    if (!explorerOpen) {
      return;
    }
    setFlag("workspace-started");
    const returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    focusTree(explorerRef.current);
    return () => returnFocus?.focus();
  }, [explorerOpen]);

  useEffect(() => {
    function keepInside() {
      const size = viewport();
      const usable =
        !window.matchMedia(COMPACT_MEDIA_QUERY).matches &&
        size.height >= MIN_USABLE_HEIGHT &&
        document.visibilityState === "visible";
      if (usable) {
        updateLayout((layout) => keepFloatingInside(layout, size));
      }
    }
    keepInside();
    window.addEventListener("resize", keepInside);
    return () => window.removeEventListener("resize", keepInside);
  }, []);

  const openExplorer = useCallback(() => setDrawerRequested(true), []);
  const closeExplorer = useCallback(() => setDrawerRequested(false), []);

  const showExplorer = useCallback(() => {
    if (compact) {
      setDrawerRequested(true);
      return;
    }
    revealWindow("explorer", () =>
      focusTree(explorerRef.current, WITHOUT_SCROLLING),
    );
  }, [compact]);

  const hideExplorer = useCallback(() => {
    if (compact) {
      setDrawerRequested(false);
      return;
    }
    concealWindow("explorer");
  }, [compact]);

  const value = useMemo(
    () => ({
      compact,
      explorerOpen,
      openExplorer,
      closeExplorer,
      showExplorer,
      hideExplorer,
    }),
    [
      compact,
      explorerOpen,
      openExplorer,
      closeExplorer,
      showExplorer,
      hideExplorer,
    ],
  );

  useEffect(() => {
    function showOnF8(event: globalThis.KeyboardEvent) {
      const plain =
        !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
      if (event.key === "F8" && plain && !frozen) {
        event.preventDefault();
        showExplorer();
      }
    }
    document.addEventListener("keydown", showOnF8);
    return () => document.removeEventListener("keydown", showOnF8);
  }, [frozen, showExplorer]);

  function handleExplorerKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && explorerOpen) {
      event.preventDefault();
      closeExplorer();
      return;
    }
    autoHide.handleKeyDown(event);
  }

  return (
    <ShellContext value={value}>
      <CommandProvider>
        <div
          className={styles.shell}
          data-traveling={traveling || undefined}
          data-regenerating={regenerating || undefined}
        >
          <header className={styles.chrome} inert={overlayOpen || frozen}>
            {titleBar}
            {toolbar}
          </header>
          <nav
            id={EXPLORER_ID}
            ref={explorerRef}
            aria-labelledby={EXPLORER_TITLE_ID}
            className={styles.explorer}
            data-open={explorerOpen}
            inert={sheetOpen || frozen}
            onKeyDown={handleExplorerKeyDown}
            {...autoHide.containerProps}
          >
            <button
              type="button"
              className={styles.explorerTab}
              aria-controls={EXPLORER_PANEL_ID}
              data-explorer-tab=""
              {...autoHide.tabProps}
            >
              {explorerLabels.title}
            </button>
            <div id={EXPLORER_PANEL_ID} className={styles.explorerPanel}>
              {explorer}
              <FloatingResizer
                windowId="explorer"
                className={styles.floatingResizer}
              />
            </div>
            <WindowSplitter
              windowId="explorer"
              side="start"
              containerId={EXPLORER_ID}
              controls={EXPLORER_PANEL_ID}
              label={explorerLabels.resize}
              className={styles.explorerSplitter}
            />
          </nav>
          <div
            className={styles.backdrop}
            hidden={!overlayOpen}
            onClick={explorerOpen ? closeExplorer : closeCheatsheet}
          />
          <div
            ref={workspaceRef}
            className={styles.workspace}
            inert={overlayOpen || frozen}
          >
            {workspace}
          </div>
          <div
            id={CHEATSHEET_WINDOW_ID}
            className={styles.guide}
            inert={explorerOpen || frozen}
          >
            {guide}
          </div>
          <div className={styles.status} inert={overlayOpen || frozen}>
            {statusBar}
          </div>
          {tour}
          {dialog}
        </div>
        {easterEggs}
      </CommandProvider>
    </ShellContext>
  );
}

export function useShell(): ShellContextValue {
  const value = useContext(ShellContext);
  if (!value) {
    throw new Error("useShell must be used inside ShellFrame");
  }
  return value;
}
