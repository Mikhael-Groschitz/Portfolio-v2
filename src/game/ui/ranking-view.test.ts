import { describe, expect, it } from "vitest";
import { RANKING } from "../balance";
import {
  type RankingState,
  EMPTY_NAME,
  EMPTY_TIME,
  canRetry,
  rankingMessage,
  rankingRows,
} from "./ranking-view";
import { GAME_TEXTS } from "./texts";

const text = GAME_TEXTS["pt-BR"];
const entries = [
  { position: 1, name: "MGC", timeMs: 343_250 },
  { position: 2, name: "ABC", timeMs: 401_000 },
];

describe("ranking rows", () => {
  it("always shows ten rows, the empty ones with dashes", () => {
    const states: RankingState[] = [
      { kind: "loading" },
      { kind: "off" },
      { kind: "error" },
      { kind: "ready", entries: [] },
      { kind: "ready", entries },
    ];
    for (const state of states) {
      const rows = rankingRows(state);
      expect(rows).toHaveLength(RANKING.size);
      expect(rows.map(({ position }) => position)).toEqual(
        Array.from({ length: RANKING.size }, (_, index) => index + 1),
      );
    }
    const rows = rankingRows({ kind: "ready", entries });
    expect(rows[0]).toEqual({
      position: 1,
      name: "MGC",
      time: "05:43.25",
      empty: false,
      highlighted: false,
    });
    expect(rows[2]).toMatchObject({
      name: EMPTY_NAME,
      time: EMPTY_TIME,
      empty: true,
    });
  });

  it("highlights only the row asked for, and never an empty one", () => {
    const rows = rankingRows({ kind: "ready", entries }, 2);
    expect(rows.filter(({ highlighted }) => highlighted)).toEqual([
      expect.objectContaining({ position: 2, name: "ABC" }),
    ]);
    expect(
      rankingRows({ kind: "ready", entries }, 5).some(
        ({ highlighted }) => highlighted,
      ),
    ).toBe(false);
  });
});

describe("ranking messages", () => {
  it("says what is going on and offers a retry only after a failure", () => {
    expect(rankingMessage({ kind: "loading" }, text)).toBe(
      text.panels.ranking.loading,
    );
    expect(rankingMessage({ kind: "ready", entries: [] }, text)).toBe(
      "Ninguém no ranking ainda. Que tal ser o primeiro?",
    );
    expect(rankingMessage({ kind: "ready", entries }, text)).toBeNull();
    expect(rankingMessage({ kind: "off" }, text)).toBe(text.panels.ranking.off);
    expect(rankingMessage({ kind: "error" }, text)).toBe(
      text.panels.ranking.error,
    );
    expect(canRetry({ kind: "error" })).toBe(true);
    expect(canRetry({ kind: "off" })).toBe(true);
    expect(canRetry({ kind: "loading" })).toBe(false);
    expect(canRetry({ kind: "ready", entries })).toBe(false);
  });
});
