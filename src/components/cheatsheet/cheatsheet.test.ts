import { describe, expect, it, vi } from "vitest";
import { getTexts } from "@/content";
import { DEFAULT_LOCALE, LOCALES } from "@/content/locales";
import { execute } from "@/engine/execute";
import {
  clearFlag,
  readFlag,
  setFlag,
  subscribeToFlags,
} from "./session-flags";
import { placeCard } from "./tour-placement";

const examples = getTexts(DEFAULT_LOCALE).shell.cheatsheet.examples;
const commands = examples.map((example) => example.command);

describe("cheat sheet examples", () => {
  it("use the same commands in every language", () => {
    for (const locale of LOCALES) {
      expect(
        getTexts(locale).shell.cheatsheet.examples.map(
          (example) => example.command,
        ),
      ).toEqual(commands);
    }
  });

  it("run as written, except the mistake shown on purpose", () => {
    const [mistake, ...valid] = [...commands].reverse();
    for (const command of valid) {
      expect(execute(command, { locale: "pt-BR" }).kind, command).toBe(
        "results",
      );
    }
    expect(
      execute(mistake, { locale: "pt-BR", random: () => 0 }),
    ).toMatchObject({
      kind: "error",
      hint: { kind: "similar", command: "SELECT * FROM dbo.Career" },
    });
  });
});

const blockedStorage = {
  getItem: (): string | null => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

describe("session flags", () => {
  it("reads what the session already stored", () => {
    expect(readFlag("workspace-started", { getItem: () => "1" })).toBe(true);
    expect(readFlag("tour-seen", { getItem: () => null })).toBe(false);
  });

  it("remembers a flag in memory when storage is blocked", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToFlags(listener);
    expect(readFlag("tour-seen", blockedStorage)).toBe(false);
    expect(setFlag("tour-seen", blockedStorage)).toBe(false);
    expect(readFlag("tour-seen", blockedStorage)).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("stores the flag for the rest of the session", () => {
    const values = new Map<string, string>();
    expect(
      setFlag("workspace-started", {
        setItem: (key, value) => {
          values.set(key, value);
        },
      }),
    ).toBe(true);
    expect(values.get("workspace-started")).toBe("1");
  });

  it("forgets a flag when asked, even with storage blocked", () => {
    const values = new Map([["cheatsheet-placed", "1"]]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    setFlag("cheatsheet-placed", blockedStorage);
    expect(clearFlag("cheatsheet-placed", storage)).toBe(true);
    expect(readFlag("cheatsheet-placed", storage)).toBe(false);
    expect(
      clearFlag("cheatsheet-placed", {
        removeItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toBe(false);
  });
});

const desktop = { width: 1600, height: 1000 };
const phone = { width: 360, height: 740 };
const box = (top: number, left: number, right: number, bottom: number) => ({
  top,
  left,
  right,
  bottom,
});

describe("placeCard", () => {
  it("sits to the right of the target when there is room", () => {
    expect(placeCard(box(200, 10, 300, 224), desktop, "right", 320)).toEqual({
      top: 200,
      left: 312,
    });
  });

  it("falls below the target when the right side is too narrow", () => {
    expect(placeCard(box(100, 10, 300, 140), phone, "right", 320)).toEqual({
      top: 152,
      left: 12,
    });
  });

  it("sits to the left of a panel docked on the right", () => {
    expect(placeCard(box(90, 1320, 1590, 900), desktop, "left", 320)).toEqual({
      top: 90,
      left: 988,
    });
  });

  it("falls below the target when the left side is too narrow", () => {
    expect(placeCard(box(100, 40, 300, 140), desktop, "left", 320)).toEqual({
      top: 152,
      left: 40,
    });
  });

  it("goes above the target when asked and there is room", () => {
    expect(placeCard(box(600, 320, 1500, 900), desktop, "above", 320)).toEqual({
      bottom: 412,
      left: 320,
    });
  });

  it("goes below instead when the target is near the top", () => {
    expect(placeCard(box(80, 320, 1500, 400), desktop, "above", 320)).toEqual({
      top: 412,
      left: 320,
    });
  });

  it("never leaves the screen sideways", () => {
    expect(placeCard(box(40, 300, 340, 70), phone, "below", 320)).toEqual({
      top: 82,
      left: 28,
    });
  });

  it("centers near the top when the target is missing", () => {
    expect(placeCard(null, desktop, "below", 320)).toEqual({
      top: 72,
      left: 640,
    });
  });
});
