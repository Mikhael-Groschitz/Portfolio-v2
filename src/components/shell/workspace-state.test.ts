import { describe, expect, it } from "vitest";
import type { ExecutionOutcome } from "@/engine/execute";
import { NO_VISITS } from "./navigation-history";
import { queryDocument } from "./section-routes";
import {
  type WorkspaceAction,
  type WorkspaceState,
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

const rows: ExecutionOutcome = {
  kind: "results",
  database: "Portfolio",
  results: [
    {
      kind: "rows",
      resultSet: { source: "dbo.About", columns: [], rows: [] },
      statement: 0,
    },
  ],
};
const failure: ExecutionOutcome = {
  kind: "error",
  database: "Portfolio",
  error: { number: 404, level: 16, state: 1, line: 1, message: "x" },
  hint: { kind: "help", command: "SELECT * FROM dbo.About" },
};
const travel: ExecutionOutcome = {
  kind: "results",
  database: "Portfolio_v1",
  results: [],
  effect: "travel",
};
const moment = new Date(0);
const first = queryDocument(1);
const second = queryDocument(2);

function apply(state: WorkspaceState, ...actions: WorkspaceAction[]) {
  return actions.reduce(workspaceReducer, state);
}

describe("starting the workspace", () => {
  it("opens without any tab on the home page", () => {
    const state = initialWorkspace(null, null);
    expect(state).toEqual({
      tabs: [],
      runs: {},
      effect: null,
      activeQuery: null,
      queryCount: 0,
      visits: NO_VISITS,
    });
    expect(activeDocumentOf(state, null)).toBeNull();
  });

  it("opens the tab of a section address with results still to confirm", () => {
    const state = initialWorkspace("career", rows);
    expect(state.tabs).toEqual(["career"]);
    expect(state.runs.career).toMatchObject({
      status: "done",
      origin: "connection",
      completedAt: null,
    });
    expect(isProvisional(state.runs.career ?? null)).toBe(true);
  });

  it("opens SQLQuery1 on the query address", () => {
    const state = initialWorkspace("query", null);
    expect(state).toMatchObject({
      tabs: [first],
      runs: {},
      activeQuery: first,
      queryCount: 1,
    });
    expect(activeDocumentOf(state, "query")).toBe(first);
  });
});

describe("tabs", () => {
  it("opens a tab once and never duplicates it", () => {
    const state = apply(
      initialWorkspace("about", rows),
      { type: "open", document: "career", active: "about" },
      { type: "open", document: "career", active: "career" },
    );
    expect(state.tabs).toEqual(["about", "career"]);
  });

  it("numbers every new query, even after one was closed", () => {
    const empty = initialWorkspace(null, null);
    expect(nextQueryDocument(empty, null)).toBe(first);
    const opened = apply(empty, {
      type: "open",
      document: first,
      active: null,
    });
    expect(nextQueryDocument(opened, first)).toBe(second);
    const closed = apply(opened, {
      type: "close",
      document: first,
      active: first,
      next: null,
    });
    expect(nextQueryDocument(closed, null)).toBe(second);
  });

  it("counts the query reached through the address before opening another", () => {
    const empty = initialWorkspace(null, null);
    const reached = activeDocumentOf(empty, "query");
    expect(reached).toBe(first);
    expect(nextQueryDocument(empty, reached)).toBe(second);
    const state = apply(empty, {
      type: "open",
      document: "about",
      active: reached,
    });
    expect(state).toMatchObject({
      tabs: [first, "about"],
      activeQuery: first,
      queryCount: 1,
    });
  });

  it("remembers which query the query address shows", () => {
    const state = apply(
      initialWorkspace(null, null),
      { type: "open", document: first, active: null },
      { type: "open", document: "career", active: first },
    );
    expect(activeDocumentOf(state, "query")).toBe(first);
    const later = apply(state, {
      type: "open",
      document: second,
      active: "career",
    });
    expect(activeDocumentOf(later, "query")).toBe(second);
  });

  it("keeps the tab reached through back and forward", () => {
    const state = apply(initialWorkspace("about", rows), {
      type: "open",
      document: "contact",
      active: "projects",
    });
    expect(state.tabs).toEqual(["about", "projects", "contact"]);
  });

  it("closes every tab with its results, the last one too", () => {
    const state = apply(
      initialWorkspace("about", rows),
      { type: "open", document: "career", active: "about" },
      { type: "close", document: "about", active: "career", next: null },
    );
    expect(state.tabs).toEqual(["career"]);
    expect(state.runs.about).toBeUndefined();
    expect(
      apply(state, {
        type: "close",
        document: "career",
        active: "career",
        next: null,
      }).tabs,
    ).toEqual([]);
  });

  it("shows the neighbor query when the active query closes", () => {
    const two = apply(
      initialWorkspace(null, null),
      { type: "open", document: first, active: null },
      { type: "open", document: second, active: first },
    );
    const closedSecond = apply(two, {
      type: "close",
      document: second,
      active: second,
      next: first,
    });
    expect(closedSecond.activeQuery).toBe(first);
    const mixed = apply(
      initialWorkspace(null, null),
      { type: "open", document: first, active: null },
      { type: "open", document: "career", active: first },
      { type: "close", document: first, active: "career", next: null },
    );
    expect(mixed.activeQuery).toBeNull();
  });
});

describe("navigation between tabs", () => {
  it("remembers the tabs in the order they were visited", () => {
    const state = apply(
      initialWorkspace("about", rows),
      { type: "open", document: first, active: "about" },
      { type: "open", document: "career", active: first },
    );
    expect(state.visits).toEqual({
      entries: ["about", first, "career"],
      index: 2,
    });
  });

  it("goes back to a query and shows it on the query address", () => {
    const state = apply(
      initialWorkspace(null, null),
      { type: "open", document: first, active: null },
      { type: "open", document: second, active: first },
      { type: "open", document: "career", active: second },
      { type: "navigate", index: 0 },
    );
    expect(state.visits.index).toBe(0);
    expect(state.activeQuery).toBe(first);
    expect(apply(state, { type: "navigate", index: 0 })).toBe(state);
    expect(apply(state, { type: "navigate", index: 7 })).toBe(state);
  });

  it("forgets closed tabs and follows the tab shown next", () => {
    const state = apply(
      initialWorkspace("about", rows),
      { type: "open", document: "career", active: "about" },
      { type: "open", document: "contact", active: "career" },
      { type: "navigate", index: 1 },
      { type: "close", document: "career", active: "career", next: "contact" },
    );
    expect(state.visits).toEqual({
      entries: ["about", "contact"],
      index: 1,
    });
    expect(apply(state, { type: "closeAll" }).visits).toEqual(NO_VISITS);
  });
});

describe("runs", () => {
  it("goes from executing to done", () => {
    const started = apply(initialWorkspace("about", rows), {
      type: "start",
      document: "about",
      id: 1,
    });
    expect(started.runs.about).toEqual({ id: 1, status: "executing" });
    const finished = apply(started, {
      type: "finish",
      document: "about",
      run: userRun(1, rows, moment, 150),
    });
    expect(finished.runs.about).toMatchObject({
      status: "done",
      origin: "user",
      elapsedMs: 150,
    });
    expect(isProvisional(finished.runs.about ?? null)).toBe(false);
  });

  it("marks failed runs as errors", () => {
    expect(userRun(1, failure, moment, 1).status).toBe("error");
  });

  it("ignores a run that was replaced or closed", () => {
    const stale = apply(
      initialWorkspace("about", rows),
      { type: "start", document: "about", id: 1 },
      { type: "start", document: "about", id: 2 },
      {
        type: "finish",
        document: "about",
        run: userRun(1, rows, moment, 1),
      },
    );
    expect(stale.runs.about).toEqual({ id: 2, status: "executing" });
  });

  it("confirms the results of a section address when the visitor connects", () => {
    const connected = apply(initialWorkspace("career", rows), {
      type: "connect",
      document: "career",
      run: connectionRun(rows, { id: 3, completedAt: moment }),
    });
    expect(connected.tabs).toEqual(["career"]);
    expect(connected.runs.career).toMatchObject({
      id: 3,
      origin: "connection",
      completedAt: moment,
    });
    expect(isProvisional(connected.runs.career ?? null)).toBe(false);
  });
});

describe("effects", () => {
  function finish(
    state: WorkspaceState,
    id: number,
    outcome: ExecutionOutcome,
  ) {
    return apply(
      state,
      { type: "start", document: first, id },
      {
        type: "finish",
        document: first,
        run: userRun(id, outcome, moment, 150),
      },
    );
  }

  it("remembers the effect of the last run that asked for one", () => {
    const traveled = finish(initialWorkspace("query", null), 4, travel);
    expect(traveled.effect).toEqual({ id: 4, kind: "travel" });
    expect(finish(traveled, 5, rows).effect).toEqual({
      id: 4,
      kind: "travel",
    });
  });

  it("ignores the effect of a run that was replaced", () => {
    const stale = apply(
      initialWorkspace("query", null),
      { type: "start", document: first, id: 2 },
      {
        type: "finish",
        document: first,
        run: userRun(1, travel, moment, 150),
      },
    );
    expect(stale.effect).toBeNull();
  });

  it("keeps the effect when a connection run arrives", () => {
    const traveled = finish(initialWorkspace("query", null), 4, travel);
    const connected = apply(traveled, {
      type: "connect",
      document: first,
      run: connectionRun(rows, { id: 5, completedAt: moment }),
    });
    expect(connected.effect).toEqual({ id: 4, kind: "travel" });
  });
});

describe("withActive", () => {
  it("adds the active tab only when it is missing", () => {
    expect(withActive(["about"], "about")).toEqual(["about"]);
    expect(withActive(["about"], "resume")).toEqual(["about", "resume"]);
    expect(withActive(["about"], null)).toEqual(["about"]);
  });
});

describe("neighborAfterClose", () => {
  it("prefers the tab on the right, then the one on the left", () => {
    const tabs = ["about", "career", "contact"] as const;
    expect(neighborAfterClose(tabs, "career")).toBe("contact");
    expect(neighborAfterClose(tabs, "contact")).toBe("career");
  });

  it("finds nothing when the last tab closes", () => {
    expect(neighborAfterClose(["about"], "about")).toBeNull();
  });
});
