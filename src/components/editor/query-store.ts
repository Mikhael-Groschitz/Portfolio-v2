import type { EditAction } from "@/content/types";

export interface QuerySnapshot {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface QueryHistory {
  canUndo: boolean;
  canRedo: boolean;
}

interface HistoryActions {
  undo: EditAction[];
  redo: EditAction[];
}

export interface QueryStore {
  getSnapshot: () => QuerySnapshot;
  getHistory: () => QueryHistory;
  getHistoryActions: () => HistoryActions;
  subscribe: (listener: () => void) => () => void;
  update: (next: Partial<QuerySnapshot>, action?: EditAction) => void;
  undo: (steps?: number) => boolean;
  redo: (steps?: number) => boolean;
  reset: () => void;
  requestFocus: () => void;
  takeFocusRequest: () => boolean;
  requestFind: () => void;
  takeFindRequest: () => boolean;
}

interface StoreOptions {
  now?: () => number;
}

interface HistoryEntry {
  snapshot: QuerySnapshot;
  action: EditAction;
}

const EMPTY_QUERY: QuerySnapshot = {
  text: "",
  selectionStart: 0,
  selectionEnd: 0,
};

const MERGE_WINDOW_MS = 1000;
const HISTORY_LIMIT = 100;
const MERGING: ReadonlySet<EditAction> = new Set(["typing", "delete"]);

function sameSnapshot(a: QuerySnapshot, b: QuerySnapshot): boolean {
  return (
    a.text === b.text &&
    a.selectionStart === b.selectionStart &&
    a.selectionEnd === b.selectionEnd
  );
}

function guessAction(before: string, after: string): EditAction {
  if (after.length > before.length) {
    return "typing";
  }
  return after.length < before.length ? "delete" : "insert";
}

function actionsOf(entries: readonly HistoryEntry[]): EditAction[] {
  return entries.map((entry) => entry.action).reverse();
}

export function createQueryStore({
  now = Date.now,
}: StoreOptions = {}): QueryStore {
  let snapshot = EMPTY_QUERY;
  let past: HistoryEntry[] = [];
  let future: HistoryEntry[] = [];
  let history: QueryHistory = { canUndo: false, canRedo: false };
  let lastEdit: { action: EditAction; at: number } | null = null;
  let focusRequested = false;
  let findRequested = false;
  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  function refreshHistory() {
    const canUndo = past.length > 0;
    const canRedo = future.length > 0;
    if (history.canUndo !== canUndo || history.canRedo !== canRedo) {
      history = { canUndo, canRedo };
    }
  }

  function record(
    previous: QuerySnapshot,
    next: QuerySnapshot,
    given: EditAction | undefined,
  ) {
    const action = given ?? guessAction(previous.text, next.text);
    const at = now();
    const merged =
      MERGING.has(action) &&
      Math.abs(next.text.length - previous.text.length) === 1 &&
      lastEdit !== null &&
      lastEdit.action === action &&
      at - lastEdit.at < MERGE_WINDOW_MS;
    if (!merged) {
      past = [...past, { snapshot: previous, action }].slice(-HISTORY_LIMIT);
    }
    future = [];
    lastEdit = { action, at };
    refreshHistory();
  }

  function travel(steps: number, backward: boolean): boolean {
    let moved = false;
    for (let step = 0; step < steps; step += 1) {
      const from = backward ? past : future;
      const target = from.at(-1);
      if (!target) {
        break;
      }
      const pushed = { snapshot, action: target.action };
      if (backward) {
        past = past.slice(0, -1);
        future = [...future, pushed];
      } else {
        future = future.slice(0, -1);
        past = [...past, pushed];
      }
      snapshot = target.snapshot;
      moved = true;
    }
    if (moved) {
      lastEdit = null;
      refreshHistory();
      notify();
    }
    return moved;
  }

  return {
    getSnapshot: () => snapshot,
    getHistory: () => history,
    getHistoryActions: () => ({
      undo: actionsOf(past),
      redo: actionsOf(future),
    }),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update(next, action) {
      const merged = { ...snapshot, ...next };
      if (sameSnapshot(merged, snapshot)) {
        return;
      }
      if (merged.text !== snapshot.text) {
        record(snapshot, merged, action);
      }
      snapshot = merged;
      notify();
    },
    undo: (steps = 1) => travel(steps, true),
    redo: (steps = 1) => travel(steps, false),
    reset() {
      snapshot = EMPTY_QUERY;
      past = [];
      future = [];
      lastEdit = null;
      refreshHistory();
      notify();
    },
    requestFocus() {
      focusRequested = true;
      notify();
    },
    takeFocusRequest() {
      const requested = focusRequested;
      focusRequested = false;
      return requested;
    },
    requestFind() {
      findRequested = true;
      notify();
    },
    takeFindRequest() {
      const requested = findRequested;
      findRequested = false;
      return requested;
    },
  };
}

export function cursorOf(
  text: string,
  offset: number,
): { line: number; column: number } {
  const lines = text.slice(0, offset).split("\n");
  return { line: lines.length, column: (lines.at(-1) ?? "").length + 1 };
}

export function queryToRun({
  text,
  selectionStart,
  selectionEnd,
}: QuerySnapshot): string {
  return selectionEnd > selectionStart
    ? text.slice(selectionStart, selectionEnd)
    : text;
}

export function replaceSelection(
  { text, selectionStart, selectionEnd }: QuerySnapshot,
  insert: string,
): QuerySnapshot {
  const caret = selectionStart + insert.length;
  return {
    text: text.slice(0, selectionStart) + insert + text.slice(selectionEnd),
    selectionStart: caret,
    selectionEnd: caret,
  };
}
