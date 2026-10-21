import { describe, expect, it } from "vitest";
import { RANKING } from "@/game/balance";
import {
  type StoredEntry,
  isPlausibleTime,
  isValidName,
  placementOf,
  rankEntries,
} from "./leaderboard";

function entry(id: number, timeMs: number, minute = id): StoredEntry {
  return {
    id,
    name: "AAA",
    timeMs,
    createdAt: new Date(Date.UTC(2026, 9, 20, 12, minute)),
  };
}

const board = Array.from({ length: RANKING.size }, (_, index) =>
  entry(index + 1, 201_000 + index * 1000),
);

describe("top 10 placement", () => {
  it("puts any time first on an empty board", () => {
    expect(placementOf([], 300_000)).toBe(1);
  });

  it("finds the position of a time that enters", () => {
    expect(placementOf(board, 200_000)).toBe(1);
    expect(placementOf(board, 205_500)).toBe(6);
  });

  it("places a tie after the time already there", () => {
    expect(placementOf(board, 203_000)).toBe(4);
  });

  it("leaves the eleventh outside, a tie with the tenth included", () => {
    expect(placementOf(board, 210_000)).toBeNull();
    expect(placementOf(board, 250_000)).toBeNull();
    expect(placementOf(board.slice(0, -1), 250_000)).toBe(RANKING.size);
  });
});

describe("ranking order", () => {
  it("orders by time, then arrival, then id, and keeps ten", () => {
    const entries = [
      entry(3, 220_000, 1),
      entry(1, 220_000, 5),
      entry(2, 220_000, 5),
      entry(4, 210_000, 9),
      ...board.map((item) => ({
        ...item,
        id: item.id + 10,
        timeMs: item.timeMs + 50_000,
      })),
    ];
    const ranked = rankEntries(entries);
    expect(ranked).toHaveLength(RANKING.size);
    expect(ranked.slice(0, 4).map(({ id }) => id)).toEqual([4, 3, 1, 2]);
  });

  it("does not change the array it receives", () => {
    const entries = [entry(2, 230_000), entry(1, 210_000)];
    rankEntries(entries);
    expect(entries.map(({ id }) => id)).toEqual([2, 1]);
  });
});

describe("ranking rules", () => {
  it("accepts three capital letters only", () => {
    expect(isValidName("MGC")).toBe(true);
    for (const name of ["mgc", "MG", "MGCX", "MG1", "MÇC", " MG", 123, null]) {
      expect(isValidName(name)).toBe(false);
    }
  });

  it("accepts whole milliseconds inside the plausible range", () => {
    expect(isPlausibleTime(RANKING.minTimeMs)).toBe(true);
    expect(isPlausibleTime(RANKING.maxTimeMs)).toBe(true);
    for (const time of [
      RANKING.minTimeMs - 1,
      RANKING.maxTimeMs + 1,
      300_000.5,
      Number.NaN,
      "300000",
      null,
    ]) {
      expect(isPlausibleTime(time)).toBe(false);
    }
  });

  it("keeps the database checks wider than the plausible range", () => {
    expect(RANKING.minTimeMs).toBeGreaterThan(0);
    expect(RANKING.maxTimeMs).toBeLessThan(6_000_000);
  });
});
