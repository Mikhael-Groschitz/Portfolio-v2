import { describe, expect, it } from "vitest";
import { RANKING } from "@/game/balance";
import { formatRankingTime } from "./format";

describe("ranking time format", () => {
  it("writes minutes, seconds and hundredths", () => {
    expect(formatRankingTime(343_250)).toBe("05:43.25");
    expect(formatRankingTime(60_000)).toBe("01:00.00");
  });

  it("cuts the thousandths instead of rounding up", () => {
    expect(formatRankingTime(59_999)).toBe("00:59.99");
    expect(formatRankingTime(1_009)).toBe("00:01.00");
  });

  it("reaches the longest accepted time", () => {
    expect(formatRankingTime(RANKING.maxTimeMs)).toBe("99:59.99");
  });

  it("never shows negative or fractional values", () => {
    expect(formatRankingTime(-5)).toBe("00:00.00");
    expect(formatRankingTime(123_456.9)).toBe("02:03.45");
  });
});
