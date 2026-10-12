import type { MouseEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readStorage, removeStorage, writeStorage } from "./browser-storage";
import { arrowTarget, isPlainClick, wrapIndex } from "./interaction";

function fakeStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

const blockedStorage = {
  getItem: (): string | null => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

describe("browser storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads, writes and removes a value", () => {
    const storage = fakeStorage();
    expect(readStorage("session", "key", storage)).toBeNull();
    expect(writeStorage("session", "key", "value", storage)).toBe(true);
    expect(readStorage("session", "key", storage)).toBe("value");
    expect(removeStorage("session", "key", storage)).toBe(true);
    expect(storage.values.size).toBe(0);
  });

  it("uses the window storage of the chosen area by default", () => {
    const session = fakeStorage();
    const local = fakeStorage();
    vi.stubGlobal("window", { sessionStorage: session, localStorage: local });
    expect(writeStorage("session", "key", "tab")).toBe(true);
    expect(writeStorage("local", "key", "browser")).toBe(true);
    expect(session.values.get("key")).toBe("tab");
    expect(local.values.get("key")).toBe("browser");
    expect(readStorage("local", "key")).toBe("browser");
    expect(removeStorage("session", "key")).toBe(true);
    expect(session.values.size).toBe(0);
  });

  it("keeps working when storage is blocked", () => {
    expect(readStorage("local", "key", blockedStorage)).toBeNull();
    expect(writeStorage("local", "key", "value", blockedStorage)).toBe(false);
    expect(removeStorage("local", "key", blockedStorage)).toBe(false);
  });

  it("treats the server, which has no window, like blocked storage", () => {
    expect(readStorage("session", "key")).toBeNull();
    expect(writeStorage("session", "key", "value")).toBe(false);
    expect(removeStorage("session", "key")).toBe(false);
  });
});

describe("wrapIndex", () => {
  it("wraps around both ends", () => {
    expect(wrapIndex(-1, 4)).toBe(3);
    expect(wrapIndex(4, 4)).toBe(0);
    expect(wrapIndex(2, 4)).toBe(2);
  });
});

describe("arrowTarget", () => {
  it("moves along the row and wraps at both ends", () => {
    expect(arrowTarget("ArrowRight", 0, 3, "horizontal")).toBe(1);
    expect(arrowTarget("ArrowRight", 2, 3, "horizontal")).toBe(0);
    expect(arrowTarget("ArrowLeft", 0, 3, "horizontal")).toBe(2);
  });

  it("moves along the column and wraps at both ends", () => {
    expect(arrowTarget("ArrowDown", 1, 3, "vertical")).toBe(2);
    expect(arrowTarget("ArrowDown", 2, 3, "vertical")).toBe(0);
    expect(arrowTarget("ArrowUp", 0, 3, "vertical")).toBe(2);
  });

  it("jumps to the ends with Home and End", () => {
    expect(arrowTarget("Home", 2, 3, "horizontal")).toBe(0);
    expect(arrowTarget("End", 0, 3, "vertical")).toBe(2);
  });

  it("starts at the first item when nothing is focused yet", () => {
    expect(arrowTarget("ArrowDown", -1, 3, "vertical")).toBe(0);
    expect(arrowTarget("ArrowRight", -1, 3, "horizontal")).toBe(0);
  });

  it("ignores other keys, the other axis and empty lists", () => {
    expect(arrowTarget("Enter", 0, 3, "horizontal")).toBeUndefined();
    expect(arrowTarget("ArrowDown", 0, 3, "horizontal")).toBeUndefined();
    expect(arrowTarget("ArrowRight", 0, 3, "vertical")).toBeUndefined();
    expect(arrowTarget("Home", 0, 0, "vertical")).toBeUndefined();
  });
});

describe("isPlainClick", () => {
  function click(change: Partial<MouseEvent> = {}): MouseEvent {
    return {
      button: 0,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      ...change,
    } as MouseEvent;
  }

  it("accepts a left click without modifiers", () => {
    expect(isPlainClick(click())).toBe(true);
  });

  it.each([
    { button: 1 },
    { ctrlKey: true },
    { metaKey: true },
    { shiftKey: true },
    { altKey: true },
  ])("leaves %o to the browser", (change) => {
    expect(isPlainClick(click(change))).toBe(false);
  });
});
