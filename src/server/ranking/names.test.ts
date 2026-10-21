import { describe, expect, it } from "vitest";
import { isAllowedName, normalizeName } from "./names";

describe("name filter", () => {
  it("normalizes case, accents and look-alike characters", () => {
    expect(normalizeName("fdp")).toBe("FDP");
    expect(normalizeName("Vçt")).toBe("VCT");
    expect(normalizeName("4$5")).toBe("ASS");
    expect(normalizeName("k1t")).toBe("KIT");
  });

  it("refuses offensive combinations in Portuguese and English", () => {
    for (const name of [
      "FDP",
      "PQP",
      "VSF",
      "TNC",
      "ASS",
      "FUK",
      "KKK",
      "NZI",
      "PUT",
      "WTF",
      "XVD",
      "XXX",
    ]) {
      expect(isAllowedName(name), name).toBe(false);
    }
  });

  it("catches them after normalizing", () => {
    for (const name of ["fdp", "Fdp", "4SS", "5EX", "XxX"]) {
      expect(isAllowedName(name), name).toBe(false);
    }
  });

  it("lets ordinary initials through", () => {
    for (const name of [
      "MGC",
      "ABC",
      "AAA",
      "BOB",
      "ZEN",
      "PAZ",
      "SOL",
      "ANA",
    ]) {
      expect(isAllowedName(name), name).toBe(true);
    }
  });
});
