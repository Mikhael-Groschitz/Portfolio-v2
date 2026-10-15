import { describe, expect, it } from "vitest";
import { getTexts } from "@/content";
import { formatCount } from "@/content/format";
import { LOCALES } from "@/content/locales";
import { pixelPath } from "./pixel-path";
import { readMuted, rememberMuted } from "./sound-preference";
import { BOSS_KINDS } from "../entities/boss";
import { GAME_TEXTS, arrivalText, fill, slotTitle } from "./texts";

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
      expect(victory.rows).toBe(
        formatCount(results.rowsAffected, BOSS_KINDS.length),
      );
      for (const kind of BOSS_KINDS) {
        expect(victory.bosses[kind].trim()).not.toBe("");
      }
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

describe("Vibe Coder texts", () => {
  const BUBBLE_LIMIT = 42;

  it("keeps every line and every tagline short enough for one bubble", () => {
    for (const locale of LOCALES) {
      const { vibe, taglines } = GAME_TEXTS[locale];
      for (const line of [
        ...Object.values(vibe.lines),
        ...Object.values(taglines),
      ]) {
        expect([...line].length).toBeLessThanOrEqual(BUBBLE_LIMIT);
      }
    }
  });

  it("names the boss and the reward when the costume comes off", () => {
    for (const locale of LOCALES) {
      const { bosses, notices } = GAME_TEXTS[locale];
      expect(notices.unmasked.toUpperCase()).toContain(bosses.vibe);
      expect(notices.unmasked).toContain("README");
    }
  });
});

describe("campaign texts", () => {
  const stage = { kind: "stage", stage: "lab", number: 4, total: 6 } as const;
  const boss = { kind: "boss", boss: "vibe" } as const;

  it("fills the placeholders it knows and leaves the others alone", () => {
    expect(fill("{a} + {b} = {c}", { a: 1, b: "2" })).toBe("1 + 2 = {c}");
  });

  it("names the stage by its number and the boss by its name", () => {
    expect(slotTitle(stage, GAME_TEXTS["pt-BR"])).toBe("FASE 4 DE 6");
    expect(slotTitle(stage, GAME_TEXTS.en)).toBe("STAGE 4 OF 6");
    expect(slotTitle(boss, GAME_TEXTS["pt-BR"])).toBe("VIBE CODAS");
    expect(slotTitle(boss, GAME_TEXTS.en)).toBe("VIBE CODER");
  });

  it("tells screen readers the number and the name of the stage", () => {
    expect(arrivalText(stage, GAME_TEXTS["pt-BR"])).toBe(
      "Fase 4 de 6: Laboratório de Testes.",
    );
    expect(arrivalText(stage, GAME_TEXTS.en)).toBe("Stage 4 of 6: Test Lab.");
    expect(arrivalText(boss, GAME_TEXTS.en)).toBe("VIBE CODER");
  });

  it("fills the numbers of every new item from the balance", () => {
    for (const locale of LOCALES) {
      const { notices, hud } = GAME_TEXTS[locale];
      expect(notices.drop).toContain("{cost}");
      expect(notices.index).toContain("{seconds}");
      expect(notices.cache).toContain("{seconds}");
      expect(notices.backup).toContain("{relief}");
      expect(notices.readme).toContain("{percent}");
      expect(hud.seconds).toContain("{seconds}");
    }
  });

  it("keeps every placeholder in both languages", () => {
    for (const locale of LOCALES) {
      const { hud, notices } = GAME_TEXTS[locale];
      for (const template of [hud.stage, notices.arrival]) {
        expect(template).toContain("{current}");
        expect(template).toContain("{total}");
      }
      expect(notices.arrival).toContain("{name}");
    }
  });
});
