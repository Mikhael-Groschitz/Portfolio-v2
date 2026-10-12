import type { Effect } from "@/engine/easter-eggs";
import type { ExecutionOutcome } from "@/engine/execute";
import {
  NO_VISITS,
  type Visits,
  forget,
  goTo,
  visit,
} from "./navigation-history";
import {
  type DocumentId,
  QUERY_ROUTE,
  type QueryDocumentId,
  type Route,
  isQueryDocument,
  queryDocument,
  queryNumber,
} from "./section-routes";

interface PendingRun {
  id: number;
  status: "executing";
}

export interface FinishedRun {
  id: number;
  status: "done" | "error" | "canceled";
  origin: "connection" | "user";
  outcome: ExecutionOutcome;
  completedAt: Date | null;
  elapsedMs: number;
}

export type Run = PendingRun | FinishedRun;

export interface RunEffect {
  id: number;
  kind: Effect;
}

export interface WorkspaceState {
  tabs: readonly DocumentId[];
  runs: Partial<Record<DocumentId, Run>>;
  effect: RunEffect | null;
  activeQuery: QueryDocumentId | null;
  queryCount: number;
  visits: Visits;
}

export type WorkspaceAction =
  | { type: "open"; document: DocumentId; active: DocumentId | null }
  | {
      type: "close";
      document: DocumentId;
      active: DocumentId | null;
      next: DocumentId | null;
    }
  | { type: "closeAll" }
  | { type: "navigate"; index: number }
  | { type: "start"; document: DocumentId; id: number }
  | { type: "finish"; document: DocumentId; run: FinishedRun }
  | { type: "connect"; document: DocumentId; run: FinishedRun };

const EMPTY_WORKSPACE: WorkspaceState = {
  tabs: [],
  runs: {},
  effect: null,
  activeQuery: null,
  queryCount: 0,
  visits: NO_VISITS,
};

export function connectionRun(
  outcome: ExecutionOutcome,
  {
    id = 0,
    completedAt = null,
  }: { id?: number; completedAt?: Date | null } = {},
): FinishedRun {
  return {
    id,
    status: "done",
    origin: "connection",
    outcome,
    completedAt,
    elapsedMs: 0,
  };
}

export function userRun(
  id: number,
  outcome: ExecutionOutcome,
  completedAt: Date,
  elapsedMs: number,
): FinishedRun {
  return {
    id,
    status: outcome.kind === "error" ? "error" : "done",
    origin: "user",
    outcome,
    completedAt,
    elapsedMs,
  };
}

export function isProvisional(run: Run | null): boolean {
  return run?.status === "done" && run.completedAt === null;
}

function withDocument(
  state: WorkspaceState,
  document: DocumentId | null,
): WorkspaceState {
  if (document === null) {
    return state;
  }
  const tabs = state.tabs.includes(document)
    ? state.tabs
    : [...state.tabs, document];
  if (!isQueryDocument(document)) {
    return tabs === state.tabs ? state : { ...state, tabs };
  }
  return {
    ...state,
    tabs,
    activeQuery: document,
    queryCount: Math.max(state.queryCount, queryNumber(document)),
  };
}

function startedWith(document: DocumentId): WorkspaceState {
  return {
    ...withDocument(EMPTY_WORKSPACE, document),
    visits: visit(NO_VISITS, document),
  };
}

export function initialWorkspace(
  route: Route,
  outcome: ExecutionOutcome | null,
): WorkspaceState {
  if (route === null) {
    return EMPTY_WORKSPACE;
  }
  if (route === QUERY_ROUTE) {
    return startedWith(queryDocument(1));
  }
  return {
    ...startedWith(route),
    runs: outcome ? { [route]: connectionRun(outcome) } : {},
  };
}

export function activeDocumentOf(
  state: WorkspaceState,
  route: Route,
): DocumentId | null {
  if (route === QUERY_ROUTE) {
    return state.activeQuery ?? queryDocument(state.queryCount + 1);
  }
  return route;
}

export function nextQueryDocument(
  state: WorkspaceState,
  active: DocumentId | null,
): QueryDocumentId {
  return queryDocument(withDocument(state, active).queryCount + 1);
}

function effectOf({ id, outcome }: FinishedRun): RunEffect | null {
  return outcome.kind === "results" && outcome.effect
    ? { id, kind: outcome.effect }
    : null;
}

export function withActive(
  tabs: readonly DocumentId[],
  active: DocumentId | null,
): readonly DocumentId[] {
  return active === null || tabs.includes(active) ? tabs : [...tabs, active];
}

export function neighborAfterClose(
  tabs: readonly DocumentId[],
  closed: DocumentId,
): DocumentId | null {
  const index = tabs.indexOf(closed);
  return tabs[index + 1] ?? tabs[index - 1] ?? null;
}

function withoutRun(
  runs: WorkspaceState["runs"],
  document: DocumentId,
): WorkspaceState["runs"] {
  return Object.fromEntries(
    Object.entries(runs).filter(([key]) => key !== document),
  );
}

function queryAfterClose(
  state: WorkspaceState,
  closed: DocumentId,
  tabs: readonly DocumentId[],
): QueryDocumentId | null {
  if (state.activeQuery !== closed) {
    return state.activeQuery;
  }
  const neighbor = neighborAfterClose(state.tabs, closed);
  if (neighbor !== null && isQueryDocument(neighbor)) {
    return neighbor;
  }
  return tabs.findLast(isQueryDocument) ?? null;
}

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case "open":
      return {
        ...withDocument(withDocument(state, action.active), action.document),
        visits: visit(visit(state.visits, action.active), action.document),
      };
    case "close": {
      const registered = withDocument(state, action.active);
      const tabs = registered.tabs.filter((tab) => tab !== action.document);
      const visits = forget(
        visit(state.visits, action.active),
        action.document,
      );
      return {
        ...registered,
        tabs,
        runs: withoutRun(registered.runs, action.document),
        activeQuery: queryAfterClose(registered, action.document, tabs),
        visits:
          action.document === action.active
            ? visit(visits, action.next)
            : visits,
      };
    }
    case "closeAll":
      return {
        ...state,
        tabs: [],
        runs: {},
        activeQuery: null,
        visits: NO_VISITS,
      };
    case "navigate": {
      const visits = goTo(state.visits, action.index);
      const target = visits.entries[visits.index];
      return visits === state.visits || target === undefined
        ? state
        : { ...withDocument(state, target), visits };
    }
    case "start":
      return {
        ...state,
        runs: {
          ...state.runs,
          [action.document]: { id: action.id, status: "executing" },
        },
      };
    case "finish":
      if (state.runs[action.document]?.id !== action.run.id) {
        return state;
      }
      return {
        ...state,
        runs: { ...state.runs, [action.document]: action.run },
        effect: effectOf(action.run) ?? state.effect,
      };
    case "connect": {
      const registered = withDocument(state, action.document);
      return {
        ...registered,
        runs: { ...registered.runs, [action.document]: action.run },
      };
    }
  }
}
