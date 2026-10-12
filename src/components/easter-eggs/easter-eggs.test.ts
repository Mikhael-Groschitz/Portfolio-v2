import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KONAMI_CODE, LETTERS_FROM, nextKonamiStep } from "./konami";
import {
  TIME_TRAVEL_STORAGE_KEY,
  markDeparture,
  takeArrival,
} from "./time-travel-runtime";
import { parseV1Url } from "./v1-url";

function follow(keys: readonly string[]): number {
  return keys.reduce((step, key) => {
    const next = nextKonamiStep(step, key);
    return next === KONAMI_CODE.length ? 0 : next;
  }, 0);
}

function completes(keys: readonly string[]): boolean {
  let step = 0;
  for (const key of keys) {
    step = nextKonamiStep(step, key);
    if (step === KONAMI_CODE.length) {
      return true;
    }
  }
  return false;
}

describe("Konami code", () => {
  it("recognizes the whole sequence, letters in any case", () => {
    expect(completes(KONAMI_CODE)).toBe(true);
    expect(completes([...KONAMI_CODE.slice(0, LETTERS_FROM), "B", "A"])).toBe(
      true,
    );
  });

  it("starts over on a wrong key", () => {
    expect(
      completes([...KONAMI_CODE.slice(0, 5), "x", ...KONAMI_CODE.slice(5)]),
    ).toBe(false);
    expect(follow(["ArrowUp", "ArrowDown"])).toBe(0);
  });

  it("keeps the start when up is pressed too many times", () => {
    expect(completes(["ArrowUp", ...KONAMI_CODE])).toBe(true);
    expect(completes(["ArrowUp", "ArrowUp", ...KONAMI_CODE])).toBe(true);
    expect(completes(["ArrowDown", "ArrowUp", ...KONAMI_CODE.slice(1)])).toBe(
      true,
    );
  });

  it("recovers when a later step is interrupted by up", () => {
    const interrupted = [...KONAMI_CODE.slice(0, 6), ...KONAMI_CODE];
    expect(completes(interrupted)).toBe(true);
  });
});

const css = readFileSync(
  new URL("./tardis.module.css", import.meta.url),
  "utf8",
);

interface Stop {
  at: number;
  opacity: number;
}

function seconds(animation: string): number {
  const match = new RegExp(`animation:\\s*${animation}\\s+([\\d.]+)s`).exec(
    css,
  );
  if (!match) {
    throw new Error(`no animation ${animation}`);
  }
  return Number(match[1]);
}

function stops(name: string): Stop[] {
  const start = css.indexOf(`@keyframes ${name} {`);
  const body = css.slice(start, css.indexOf("\n}\n", start));
  const found: Stop[] = [];
  for (const match of body.matchAll(
    /((?:\d+%,?\s*)+)\{\s*opacity:\s*([\d.]+);/g,
  )) {
    for (const percent of match[1].match(/\d+/g) ?? []) {
      found.push({ at: Number(percent) / 100, opacity: Number(match[2]) });
    }
  }
  return found.sort((a, b) => a.at - b.at);
}

function changes(list: readonly Stop[], duration: number): number[] {
  const turns: number[] = [];
  let direction = 0;
  for (let index = 1; index < list.length; index += 1) {
    const step = Math.sign(list[index].opacity - list[index - 1].opacity);
    if (step !== 0 && step !== direction) {
      turns.push(list[index - 1].at * duration);
      direction = step;
    }
  }
  return turns;
}

function flashesPerSecond(name: string, duration: number): number {
  const turns = changes(stops(name), duration);
  let worst = 0;
  for (const start of turns) {
    const inWindow = turns.filter((at) => at >= start && at < start + 1);
    worst = Math.max(worst, Math.floor(inWindow.length / 2));
  }
  return worst;
}

describe("TARDIS motion", () => {
  it("turns once every six to eight seconds and faster under the pointer", () => {
    expect(seconds("spin")).toBeGreaterThanOrEqual(6);
    expect(seconds("spin")).toBeLessThanOrEqual(8);
    expect(
      css.match(
        /\.(turn|badgeTurn) \{\s*animation: spin [\d.]+s linear infinite paused;/g,
      ),
    ).toHaveLength(2);
  });

  it("keeps the lamp pulse slow", () => {
    expect(seconds("glow")).toBeGreaterThanOrEqual(1);
  });

  it.each([
    ["fade-out", "depart"],
    ["fade-in", "arrive"],
  ])("never flashes more than three times a second while it %s", (name) => {
    const duration = seconds(name);
    expect(stops(name).length).toBeGreaterThan(4);
    expect(flashesPerSecond(name, duration)).toBeLessThanOrEqual(3);
  });

  it("stops every animation when motion is reduced", () => {
    const rule =
      /(:global\(html\[data-motion="reduce"\]\)[^{]+)\{\s*animation: none;/.exec(
        css,
      )?.[1];
    for (const part of [
      ".tardis .spin",
      ".tardis .turn",
      ".tardis .lamp > span",
      ".badge .badgeSpin",
      ".badge .badgeTurn",
      ".badge .badgeLamp",
    ]) {
      expect(rule).toContain(part);
    }
  });
});

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

describe("time travel marks", () => {
  it("remembers the departure until the window lands again", () => {
    const storage = fakeStorage();
    expect(markDeparture(storage)).toBe(true);
    expect(storage.values.get(TIME_TRAVEL_STORAGE_KEY)).toBe("v1");
    expect(takeArrival(storage)).toBe(true);
    expect(takeArrival(storage)).toBe(false);
    expect(storage.values.size).toBe(0);
  });

  it("only lands after a departure", () => {
    const storage = fakeStorage();
    storage.setItem(TIME_TRAVEL_STORAGE_KEY, "elsewhere");
    expect(takeArrival(storage)).toBe(false);
    expect(storage.values.size).toBe(0);
  });

  it("keeps working when storage is blocked", () => {
    expect(markDeparture(blockedStorage)).toBe(false);
    expect(takeArrival(blockedStorage)).toBe(false);
  });
});

describe("parseV1Url", () => {
  it.each([
    ["https://mgroschitz.dev", "https://mgroschitz.dev/"],
    [" https://v1.example.com/path ", "https://v1.example.com/path"],
    ["http://localhost:3999/", "http://localhost:3999/"],
  ])("accepts %j", (value, href) => {
    expect(parseV1Url(value)).toBe(href);
  });

  it.each([
    undefined,
    "",
    "   ",
    "mgroschitz.dev",
    "javascript:alert(1)",
    "ftp://example.com",
  ])("ignores %j", (value) => {
    expect(parseV1Url(value)).toBeNull();
  });
});
