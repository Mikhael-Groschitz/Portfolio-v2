"use client";

import { useRouter, useSelectedLayoutSegment } from "next/navigation";
import {
  type ReactNode,
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import {
  type SettledStatus,
  applyStatus,
  readConnectionStatus,
  storeDisconnected,
} from "@/components/connect/connection-runtime";
import {
  type QueryStore,
  createQueryStore,
  queryToRun,
} from "@/components/editor/query-store";
import { getTexts } from "@/content";
import { type Localized, byLocale } from "@/content/locales";
import { SECTION_IDS, type SectionId } from "@/content/types";
import { DATABASE } from "@/engine/catalog";
import { arrivalOutcome } from "@/engine/easter-eggs";
import type { ExecutionOutcome } from "@/engine/execute";
import type { Visits } from "./navigation-history";
import {
  executeQuery,
  executeSection,
  parseQuery,
  sectionText,
} from "./section-execution";
import {
  type DocumentId,
  QUERY_ROUTE,
  type QueryDocumentId,
  documentPath,
  isQueryDocument,
  routeFromSegment,
} from "./section-routes";
import {
  type FinishedRun,
  type Run,
  type RunEffect,
  activeDocumentOf,
  connectionRun,
  initialWorkspace,
  isProvisional,
  neighborAfterClose,
  nextQueryDocument,
  userRun,
  withActive,
  workspaceReducer,
} from "./workspace-state";

const EXECUTION_DELAY_MS = 150;

const HOME_PATH = "/";

type ConnectionIntent =
  { kind: "query"; text?: string } | { kind: "section"; section: SectionId };

interface WorkspaceContextValue {
  tabs: readonly DocumentId[];
  activeDocument: DocumentId | null;
  activeRun: Run | null;
  effect: RunEffect | null;
  queryStore: (document: QueryDocumentId) => QueryStore;
  activateDocument: (document: DocumentId) => void;
  openSection: (section: SectionId) => void;
  openQuery: (text?: string) => void;
  writeQuery: (text: string) => void;
  runDocument: (document: DocumentId, input?: string) => void;
  parseDocument: (document: DocumentId) => void;
  cancelRun: (document: DocumentId) => void;
  visits: Visits;
  navigate: (index: number) => void;
  closeDocument: (document: DocumentId) => void;
  closeAllDocuments: () => void;
  requestConnection: (intent?: ConnectionIntent) => void;
  connect: () => void;
  cancelConnection: () => void;
  disconnect: () => void;
  arrive: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function startWorkspace(segment: string | null) {
  const route = routeFromSegment(segment);
  const section = route === null || route === QUERY_ROUTE ? null : route;
  return initialWorkspace(route, section ? executeSection(section) : null);
}

function isNewQueryShortcut(event: KeyboardEvent): boolean {
  return (
    event.code === "KeyN" &&
    event.altKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.metaKey
  );
}

function pathOf(document: DocumentId | null): string {
  return document === null ? HOME_PATH : documentPath(document);
}

function canceledOutcome(): Localized<ExecutionOutcome> {
  return byLocale((locale) => ({
    kind: "results",
    database: DATABASE,
    results: [
      {
        kind: "info",
        text: getTexts(locale).shell.results.canceled,
        statement: 0,
      },
    ],
  }));
}

export function WorkspaceProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const segment = useSelectedLayoutSegment();
  const [state, dispatch] = useReducer(
    workspaceReducer,
    segment,
    startWorkspace,
  );
  const activeDocument = activeDocumentOf(state, routeFromSegment(segment));
  const tabs = withActive(state.tabs, activeDocument);
  const storedRun =
    activeDocument === null ? undefined : state.runs[activeDocument];
  const activeRun = useMemo(() => {
    if (storedRun) {
      return storedRun;
    }
    if (activeDocument === null || isQueryDocument(activeDocument)) {
      return null;
    }
    return connectionRun(executeSection(activeDocument));
  }, [storedRun, activeDocument]);
  const stores = useRef(new Map<QueryDocumentId, QueryStore>());
  const runIds = useRef(0);
  const timers = useRef(new Map<number, number>());
  const started = useRef(new Map<number, number>());
  const intent = useRef<ConnectionIntent | null>(null);
  const returnStatus = useRef<SettledStatus | null>(null);

  useEffect(() => {
    for (const section of SECTION_IDS) {
      router.prefetch(documentPath(section));
    }
  }, [router]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  const queryStore = useCallback((document: QueryDocumentId) => {
    const existing = stores.current.get(document);
    if (existing) {
      return existing;
    }
    const created = createQueryStore();
    stores.current.set(document, created);
    return created;
  }, []);

  const startRun = useCallback(
    (document: DocumentId, outcomes: () => Localized<ExecutionOutcome>) => {
      runIds.current += 1;
      const id = runIds.current;
      const startedAt = performance.now();
      dispatch({ type: "start", document, id });
      const timer = window.setTimeout(() => {
        timers.current.delete(id);
        started.current.delete(id);
        dispatch({
          type: "finish",
          document,
          run: userRun(
            id,
            outcomes(),
            new Date(),
            performance.now() - startedAt,
          ),
        });
      }, EXECUTION_DELAY_MS);
      timers.current.set(id, timer);
      started.current.set(id, startedAt);
    },
    [],
  );

  const runDocument = useCallback(
    (document: DocumentId, given?: string) => {
      const seed = Math.random();
      const input =
        given ??
        (isQueryDocument(document)
          ? queryToRun(queryStore(document).getSnapshot())
          : null);
      startRun(document, () =>
        input !== null || isQueryDocument(document)
          ? executeQuery(input ?? "", seed)
          : executeSection(document),
      );
    },
    [queryStore, startRun],
  );

  const parseDocument = useCallback(
    (document: DocumentId) => {
      const seed = Math.random();
      const input = isQueryDocument(document)
        ? queryToRun(queryStore(document).getSnapshot())
        : sectionText(document);
      startRun(document, () => parseQuery(input, seed));
    },
    [queryStore, startRun],
  );

  const cancelRun = useCallback(
    (document: DocumentId) => {
      const run = state.runs[document];
      if (run?.status !== "executing") {
        return;
      }
      window.clearTimeout(timers.current.get(run.id));
      timers.current.delete(run.id);
      const startedAt = started.current.get(run.id) ?? performance.now();
      started.current.delete(run.id);
      const canceled: FinishedRun = {
        id: run.id,
        status: "canceled",
        origin: "user",
        outcomes: canceledOutcome(),
        completedAt: new Date(),
        elapsedMs: performance.now() - startedAt,
      };
      dispatch({ type: "finish", document, run: canceled });
    },
    [state.runs],
  );

  const activateDocument = useCallback(
    (document: DocumentId) => {
      startTransition(() => {
        dispatch({ type: "open", document, active: activeDocument });
        if (pathOf(document) !== pathOf(activeDocument)) {
          router.push(documentPath(document), { scroll: false });
        }
      });
    },
    [activeDocument, router],
  );

  const openSection = useCallback(
    (section: SectionId) => {
      activateDocument(section);
      runDocument(section);
    },
    [activateDocument, runDocument],
  );

  const openQuery = useCallback(
    (text?: string) => {
      const document = nextQueryDocument(state, activeDocument);
      const store = queryStore(document);
      if (text) {
        store.update(
          {
            text,
            selectionStart: text.length,
            selectionEnd: text.length,
          },
          "insert",
        );
      }
      store.requestFocus();
      activateDocument(document);
    },
    [activateDocument, activeDocument, queryStore, state],
  );

  const writeQuery = useCallback(
    (text: string) => {
      if (activeDocument === null || !isQueryDocument(activeDocument)) {
        openQuery(text);
        return;
      }
      const store = queryStore(activeDocument);
      const current = store.getSnapshot().text.trimEnd();
      const next = current ? `${current}\n${text}` : text;
      store.update(
        {
          text: next,
          selectionStart: next.length,
          selectionEnd: next.length,
        },
        "insert",
      );
      store.requestFocus();
    },
    [activeDocument, openQuery, queryStore],
  );

  const navigate = useCallback(
    (index: number) => {
      const target = state.visits.entries[index];
      if (target === undefined || index === state.visits.index) {
        return;
      }
      startTransition(() => {
        dispatch({ type: "navigate", index });
        if (pathOf(target) !== pathOf(activeDocument)) {
          router.push(documentPath(target), { scroll: false });
        }
      });
    },
    [activeDocument, router, state.visits],
  );

  const closeDocument = useCallback(
    (document: DocumentId) => {
      const next = neighborAfterClose(tabs, document);
      if (isQueryDocument(document)) {
        stores.current.delete(document);
      }
      startTransition(() => {
        dispatch({ type: "close", document, active: activeDocument, next });
        if (document === activeDocument && pathOf(next) !== pathOf(document)) {
          router.replace(pathOf(next), { scroll: false });
        }
      });
    },
    [activeDocument, router, tabs],
  );

  const closeAllDocuments = useCallback(() => {
    stores.current.clear();
    startTransition(() => {
      dispatch({ type: "closeAll" });
      if (activeDocument !== null) {
        router.replace(HOME_PATH, { scroll: false });
      }
    });
  }, [activeDocument, router]);

  const requestConnection = useCallback((next?: ConnectionIntent) => {
    const status = readConnectionStatus();
    if (status === "pending") {
      return;
    }
    returnStatus.current =
      status === "connected" ? "connected" : "disconnected";
    intent.current = next ?? null;
    applyStatus("pending");
  }, []);

  const connect = useCallback(() => {
    const requested = intent.current;
    intent.current = null;
    returnStatus.current = null;
    if (
      activeDocument !== null &&
      !isQueryDocument(activeDocument) &&
      isProvisional(activeRun)
    ) {
      runIds.current += 1;
      dispatch({
        type: "connect",
        document: activeDocument,
        run: connectionRun(executeSection(activeDocument), {
          id: runIds.current,
          completedAt: new Date(),
        }),
      });
    }
    if (requested?.kind === "section") {
      openSection(requested.section);
    } else if (requested?.kind === "query") {
      if (requested.text) {
        writeQuery(requested.text);
      } else {
        openQuery();
      }
    }
  }, [activeDocument, activeRun, openQuery, openSection, writeQuery]);

  const cancelConnection = useCallback(() => {
    const back = returnStatus.current ?? "disconnected";
    intent.current = null;
    returnStatus.current = null;
    if (back === "disconnected") {
      storeDisconnected();
    }
    applyStatus(back);
  }, []);

  const disconnect = useCallback(() => {
    storeDisconnected();
    applyStatus("disconnected");
  }, []);

  const arrive = useCallback(() => {
    runIds.current += 1;
    const document =
      activeDocument !== null && isQueryDocument(activeDocument)
        ? activeDocument
        : nextQueryDocument(state, activeDocument);
    dispatch({
      type: "connect",
      document,
      run: connectionRun(
        byLocale(() => arrivalOutcome()),
        { id: runIds.current, completedAt: new Date() },
      ),
    });
    if (document !== activeDocument) {
      activateDocument(document);
    }
  }, [activateDocument, activeDocument, state]);

  useEffect(() => {
    function openOnShortcut(event: KeyboardEvent) {
      if (!isNewQueryShortcut(event)) {
        return;
      }
      const status = readConnectionStatus();
      if (status === "pending") {
        return;
      }
      event.preventDefault();
      if (status === "connected" || status === "unknown") {
        openQuery();
      } else {
        requestConnection({ kind: "query" });
      }
    }
    document.addEventListener("keydown", openOnShortcut);
    return () => document.removeEventListener("keydown", openOnShortcut);
  }, [openQuery, requestConnection]);

  const value = useMemo(
    () => ({
      tabs,
      activeDocument,
      activeRun,
      effect: state.effect,
      queryStore,
      activateDocument,
      openSection,
      openQuery,
      writeQuery,
      runDocument,
      parseDocument,
      cancelRun,
      visits: state.visits,
      navigate,
      closeDocument,
      closeAllDocuments,
      requestConnection,
      connect,
      cancelConnection,
      disconnect,
      arrive,
    }),
    [
      tabs,
      activeDocument,
      activeRun,
      state.effect,
      queryStore,
      activateDocument,
      openSection,
      openQuery,
      writeQuery,
      runDocument,
      parseDocument,
      cancelRun,
      state.visits,
      navigate,
      closeDocument,
      closeAllDocuments,
      requestConnection,
      connect,
      cancelConnection,
      disconnect,
      arrive,
    ],
  );

  return <WorkspaceContext value={value}>{children}</WorkspaceContext>;
}

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }
  return value;
}
