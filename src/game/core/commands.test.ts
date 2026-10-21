import { describe, expect, it } from "vitest";
import { ACTION_KEYS, type Action, COMMANDS } from "./commands";
import { actionFor } from "./input";

describe("command map", () => {
  it("gives every key a single action", () => {
    const codes = Object.values(ACTION_KEYS).flat();
    expect(new Set(codes).size).toBe(codes.length);
    for (const [action, keys] of Object.entries(ACTION_KEYS)) {
      for (const code of keys) {
        expect(actionFor(code), code).toBe(action);
      }
    }
  });

  it("puts every action in at least one command, once per id", () => {
    const ids = COMMANDS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    const used = new Set(COMMANDS.flatMap(({ actions }) => actions));
    for (const action of Object.keys(ACTION_KEYS) as Action[]) {
      expect(used.has(action), action).toBe(true);
    }
  });

  it("opens the ranking with T and leaves the dev keys out", () => {
    expect(actionFor("KeyT")).toBe("ranking");
    for (const code of ["F9", "KeyI", "KeyU", "KeyK", "Equal", "PageDown"]) {
      expect(actionFor(code), code).toBeNull();
    }
  });
});
