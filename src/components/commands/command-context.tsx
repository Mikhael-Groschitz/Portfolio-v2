"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useGuide } from "@/components/cheatsheet/guide-context";
import { useConnectionStatus } from "@/components/connect/use-connection-status";
import {
  type LineCommand,
  applyLineCommand,
} from "@/components/editor/line-commands";
import {
  type QueryHistory,
  type QueryStore,
  replaceSelection,
} from "@/components/editor/query-store";
import { useLanguage } from "@/components/locale/language-context";
import {
  setResultsFormat,
  toggleResultsCollapse,
} from "@/components/shell/layout-model";
import { resetLayout, updateLayout } from "@/components/shell/layout-store";
import { canGoBack, canGoForward } from "@/components/shell/navigation-history";
import { sectionText } from "@/components/shell/section-execution";
import {
  type DocumentId,
  documentFileName,
  isQueryDocument,
} from "@/components/shell/section-routes";
import { useShell } from "@/components/shell/shell-frame";
import { useLayout } from "@/components/shell/use-layout";
import { useInput } from "@/components/shell/use-media-query";
import { useWorkspace } from "@/components/shell/workspace-context";
import { getTexts, inputText } from "@/content";
import type { CommandId, EditAction } from "@/content/types";
import { AboutDialog } from "./about-dialog";
import {
  COMMANDS,
  type CommandContext,
  type DocumentKind,
  FULL_SCREEN_SHORTCUT,
  SAVE_SHORTCUT,
  commandLabel,
  isAvailable,
} from "./command-model";
import { readClipboard, writeClipboard } from "./clipboard";
import { OptionsDialog } from "./options-dialog";
import { githubProfileUrl } from "./site-links";
import { type ToastMessage, ToastRegion, toastOf } from "./toast";
import { TooltipLayer } from "./tooltip-layer";

type Dialog = "options" | "about";

export interface CommandsValue {
  context: CommandContext;
  isEnabled: (id: CommandId) => boolean;
  isChecked: (id: CommandId) => boolean | undefined;
  label: (id: CommandId) => string;
  run: (id: CommandId) => void;
  notify: (text: string) => void;
}

const CommandsContext = createContext<CommandsValue | null>(null);

const NO_HISTORY: QueryHistory = { canUndo: false, canRedo: false };

const LINE_ACTIONS: Record<LineCommand, EditAction> = {
  comment: "comment",
  uncomment: "uncomment",
  indent: "indent",
  outdent: "outdent",
};

function noHistory(): QueryHistory {
  return NO_HISTORY;
}

function ignore(): () => void {
  return () => undefined;
}

function useQueryHistory(store: QueryStore | null): QueryHistory {
  return useSyncExternalStore(
    store?.subscribe ?? ignore,
    store?.getHistory ?? noHistory,
    noHistory,
  );
}

function subscribeToFullScreen(listener: () => void): () => void {
  document.addEventListener("fullscreenchange", listener);
  return () => document.removeEventListener("fullscreenchange", listener);
}

function useFullScreen(): boolean {
  return useSyncExternalStore(
    subscribeToFullScreen,
    () => document.fullscreenElement !== null,
    () => false,
  );
}

function download(fileName: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/sql;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function currentLine(text: string, caret: number): [number, number] {
  const start = text.lastIndexOf("\n", caret - 1) + 1;
  const newline = text.indexOf("\n", caret);
  return [start, newline === -1 ? text.length : newline + 1];
}

function sectionCode(): HTMLElement | null {
  return (
    Array.from(
      document.querySelectorAll<HTMLElement>(
        "#document-panel [data-editor] code",
      ),
    ).find((code) => code.getClientRects().length > 0) ?? null
  );
}

function insideModal(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('dialog, [aria-modal="true"]') !== null
  );
}

function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.split("+");
  const key = parts.at(-1)?.toLowerCase();
  const pressed = event.key.toLowerCase();
  return (
    event.ctrlKey === parts.includes("Ctrl") &&
    event.altKey === parts.includes("Alt") &&
    event.shiftKey === parts.includes("Shift") &&
    !event.metaKey &&
    (pressed === key || event.code === `Key${key?.toUpperCase()}`)
  );
}

export function CommandProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const workspace = useWorkspace();
  const shell = useShell();
  const guide = useGuide();
  const layout = useLayout();
  const { locale } = useLanguage();
  const input = useInput();
  const status = useConnectionStatus();
  const fullScreen = useFullScreen();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const { activeDocument, activeRun, tabs, queryStore, visits } = workspace;
  const queryDocument =
    activeDocument !== null && isQueryDocument(activeDocument)
      ? activeDocument
      : null;
  const store = queryDocument === null ? null : queryStore(queryDocument);
  const history = useQueryHistory(store);
  const texts = getTexts(locale).shell;

  const documentKind: DocumentKind =
    activeDocument === null ? "none" : queryDocument ? "query" : "section";

  const context = useMemo<CommandContext>(
    () => ({
      connected: status === "connected",
      document: documentKind,
      canUndo: history.canUndo,
      canRedo: history.canRedo,
      canGoBack: canGoBack(visits),
      canGoForward: canGoForward(visits),
      executing: activeRun?.status === "executing",
      hasResults: activeRun !== null,
      tabs: tabs.length,
    }),
    [status, documentKind, history, visits, activeRun, tabs.length],
  );

  const notify = useCallback((text: string) => setToast(toastOf(text)), []);
  const dismiss = useCallback(() => setToast(null), []);

  const label = useCallback(
    (id: CommandId) => texts.commands[id],
    [texts.commands],
  );

  const checked: Partial<Record<CommandId, boolean>> = {
    objectExplorer: shell.compact
      ? shell.explorerOpen
      : !layout.explorer.hidden,
    resultsPane: layout.results.state !== "collapsed",
    cheatsheet: guide.docked ? !layout.cheatsheet.hidden : guide.sheetOpen,
    fullScreen,
    resultsToGrid: layout.results.format === "grid",
    resultsToText: layout.results.format === "text",
  };

  function toggleFullScreen() {
    const request = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
    request.catch(() => notify(texts.toast.fullScreenBlocked));
  }

  function saveDocument(target: DocumentId) {
    const text = isQueryDocument(target)
      ? queryStore(target).getSnapshot().text
      : sectionText(target, locale, input);
    download(documentFileName(target), text);
  }

  async function copyFromEditor(cut: boolean) {
    if (store) {
      const snapshot = store.getSnapshot();
      const [start, end] =
        snapshot.selectionEnd > snapshot.selectionStart
          ? [snapshot.selectionStart, snapshot.selectionEnd]
          : currentLine(snapshot.text, snapshot.selectionStart);
      const copied = await writeClipboard(snapshot.text.slice(start, end));
      if (copied && cut) {
        store.update(
          replaceSelection(
            { ...snapshot, selectionStart: start, selectionEnd: end },
            "",
          ),
          "cut",
        );
      }
      store.requestFocus();
      return;
    }
    if (activeDocument === null || isQueryDocument(activeDocument)) {
      return;
    }
    const selection = window.getSelection();
    const code = sectionCode();
    const text =
      selection &&
      code?.contains(selection.anchorNode) &&
      !selection.isCollapsed
        ? selection.toString()
        : sectionText(activeDocument, locale, input);
    await writeClipboard(text);
  }

  async function pasteIntoEditor() {
    if (!store) {
      return;
    }
    const pasted = await readClipboard();
    if (pasted === null) {
      notify(inputText(texts.toast.clipboardBlocked, input));
      return;
    }
    store.update(replaceSelection(store.getSnapshot(), pasted), "paste");
    store.requestFocus();
  }

  function selectAll() {
    if (store) {
      const { text } = store.getSnapshot();
      store.update({ selectionStart: 0, selectionEnd: text.length });
      store.requestFocus();
      return;
    }
    const code = sectionCode();
    if (code) {
      const range = document.createRange();
      range.selectNodeContents(code);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      code
        .closest<HTMLElement>("[data-editor]")
        ?.focus({ preventScroll: true });
    }
  }

  function toggleCheatsheet() {
    if (checked.cheatsheet) {
      guide.closeCheatsheet();
    } else {
      guide.openCheatsheet();
    }
  }

  function applyToQuery(command: LineCommand) {
    if (!store) {
      return;
    }
    const next = applyLineCommand(store.getSnapshot(), command);
    if (next) {
      store.update(next, LINE_ACTIONS[command]);
    }
    store.requestFocus();
  }

  function openContact() {
    if (status === "connected") {
      workspace.openSection("contact");
    } else {
      workspace.requestConnection({ kind: "section", section: "contact" });
    }
  }

  async function share() {
    const url = window.location.href;
    const copied = await writeClipboard(url);
    const message = copied ? texts.toast.shared : texts.toast.shareFailed;
    notify(message.replace("{url}", url));
  }

  function forActiveDocument(action: (document: DocumentId) => void) {
    return () => {
      if (activeDocument !== null) {
        action(activeDocument);
      }
    };
  }

  function toggleExplorer() {
    if (checked.objectExplorer) {
      shell.hideExplorer();
    } else {
      shell.showExplorer();
    }
  }

  const actions: Partial<Record<CommandId, () => void>> = {
    connect: () => workspace.requestConnection(),
    explorerConnect: () => workspace.requestConnection(),
    disconnect: workspace.disconnect,
    newQuery: () => {
      if (status !== "connected") {
        workspace.requestConnection({ kind: "query" });
        return;
      }
      workspace.openQuery();
      guide.stepDone("query");
    },
    closeDocument: () => {
      if (activeDocument !== null) {
        workspace.closeDocument(activeDocument);
      }
    },
    save: () => {
      if (activeDocument !== null) {
        saveDocument(activeDocument);
      }
    },
    undo: () => {
      store?.undo();
      store?.requestFocus();
    },
    redo: () => {
      store?.redo();
      store?.requestFocus();
    },
    cut: () => void copyFromEditor(true),
    copy: () => void copyFromEditor(false),
    paste: () => void pasteIntoEditor(),
    find: () => store?.requestFind(),
    selectAll,
    objectExplorer: toggleExplorer,
    resultsPane: () => updateLayout(toggleResultsCollapse),
    cheatsheet: toggleCheatsheet,
    fullScreen: toggleFullScreen,
    openOnGitHub: () =>
      window.open(githubProfileUrl(), "_blank", "noopener,noreferrer"),
    options: () => setDialog("options"),
    closeAllDocuments: workspace.closeAllDocuments,
    resetWindowLayout: () => {
      resetLayout();
      guide.resetCheatsheet();
    },
    openCheatsheet: guide.openCheatsheet,
    tour: guide.startTour,
    about: () => setDialog("about"),
    execute: forActiveDocument(workspace.runDocument),
    parse: forActiveDocument(workspace.parseDocument),
    cancelQuery: forActiveDocument(workspace.cancelRun),
    resultsToGrid: () => updateLayout((next) => setResultsFormat(next, "grid")),
    resultsToText: () => updateLayout((next) => setResultsFormat(next, "text")),
    navigateBackward: () => workspace.navigate(visits.index - 1),
    navigateForward: () => workspace.navigate(visits.index + 1),
    editorConnect: () => workspace.requestConnection(),
    editorDisconnect: workspace.disconnect,
    commentLines: () => applyToQuery("comment"),
    uncommentLines: () => applyToQuery("uncomment"),
    increaseIndent: () => applyToQuery("indent"),
    decreaseIndent: () => applyToQuery("outdent"),
    contact: openContact,
    share: () => void share(),
  };

  function run(id: CommandId): boolean {
    if (!isAvailable(id, context)) {
      return false;
    }
    if (COMMANDS[id].illustrative) {
      notify(
        texts.toast.illustrative.replace("{command}", commandLabel(label(id))),
      );
      return true;
    }
    actions[id]?.();
    return true;
  }

  const runRef = useRef(run);

  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (matchesShortcut(event, FULL_SCREEN_SHORTCUT)) {
        event.preventDefault();
        runRef.current("fullScreen");
        return;
      }
      if (
        matchesShortcut(event, SAVE_SHORTCUT) &&
        !insideModal(event.target) &&
        runRef.current("save")
      ) {
        event.preventDefault();
      }
    }
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  const value: CommandsValue = {
    context,
    isEnabled: (id) => isAvailable(id, context),
    isChecked: (id) =>
      COMMANDS[id].toggle || COMMANDS[id].format
        ? Boolean(checked[id])
        : undefined,
    label,
    run,
    notify,
  };

  return (
    <CommandsContext value={value}>
      {children}
      {dialog === "options" && (
        <OptionsDialog onClose={() => setDialog(null)} />
      )}
      {dialog === "about" && <AboutDialog onClose={() => setDialog(null)} />}
      <ToastRegion toast={toast} onDismiss={dismiss} />
      <TooltipLayer />
    </CommandsContext>
  );
}

export function useCommands(): CommandsValue {
  const value = useContext(CommandsContext);
  if (!value) {
    throw new Error("useCommands must be used inside CommandProvider");
  }
  return value;
}
