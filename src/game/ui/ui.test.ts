import { describe, expect, it } from "vitest";
import { getTexts } from "@/content";
import { formatCount } from "@/content/format";
import { LOCALES } from "@/content/locales";
import { pixelPath } from "./pixel-path";
import { readMuted, rememberMuted } from "./sound-preference";
import { GAME_TEXTS } from "./texts";

describe("pixelPath", () => {
  it("draws one rectangle per horizontal run of pixels", () => {
    expect(pixelPath(["XX.X", ".X.."])).toBe(
      "M0 0h2v1h-2zM3 0h1v1h-1zM1 1h1v1h-1z",
    );
  });

  it("draws nothing for an empty mask", () => {
    expect(pixelPath(["...", "..."])).toBe("");
  });
});

function memory(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

const broken = {
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("blocked");
  },
} as unknown as Storage;

describe("sound preference", () => {
  it("remembers the choice for the rest of the session", () => {
    const storage = memory();
    expect(readMuted(storage)).toBe(false);
    rememberMuted(true, storage);
    expect(readMuted(storage)).toBe(true);
    rememberMuted(false, storage);
    expect(readMuted(storage)).toBe(false);
  });

  it("plays with sound when the storage is blocked or missing", () => {
    expect(() => rememberMuted(true, broken)).not.toThrow();
    expect(readMuted(broken)).toBe(false);
    expect(readMuted(null)).toBe(false);
  });
});

function shapeOf(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(shapeOf);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, shapeOf(entry)]),
    );
  }
  return typeof value;
}

function strings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).flatMap(strings);
  }
  return [];
}

describe("game texts", () => {
  it("has the same structure in both languages", () => {
    expect(shapeOf(GAME_TEXTS.en)).toEqual(shapeOf(GAME_TEXTS["pt-BR"]));
  });

  it("fills every text", () => {
    for (const locale of LOCALES) {
      for (const text of strings(GAME_TEXTS[locale])) {
        expect(text.trim()).not.toBe("");
      }
    }
  });

  it("speaks the same SSMS language as the rest of the site", () => {
    for (const locale of LOCALES) {
      const { results, connection, game } = getTexts(locale).shell;
      const { crash, exit, victory } = GAME_TEXTS[locale];
      expect(crash.header).toBe(
        results.errorHeader
          .replace("{number}", "701")
          .replace("{level}", "17")
          .replace("{state}", "1")
          .replace("{line}", "1"),
      );
      expect(crash.completionTime).toBe(results.completionTime);
      expect(crash.status).toBe(connection.failed);
      expect(exit).toBe(game.exit);
      expect(victory.rows).toBe(formatCount(results.rowsAffected, 1));
      expect(victory.completionTime).toBe(results.completionTime);
      expect(victory.status).toBe(connection.succeeded);
    }
  });

  it("tells the run time when announcing the victory", () => {
    for (const locale of LOCALES) {
      expect(GAME_TEXTS[locale].victory.announcement).toContain("{time}");
    }
  });
});
