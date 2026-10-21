import { describe, expect, it } from "vitest";
import {
  cycleLetter,
  emptyInitials,
  firstEmpty,
  initialsName,
  toLetter,
  typedLetter,
} from "./initials";

describe("arcade initials", () => {
  it("starts with three empty slots", () => {
    expect(emptyInitials()).toEqual(["", "", ""]);
  });

  it("keeps only the letters A to Z, folding case and accents", () => {
    expect(toLetter("m")).toBe("M");
    expect(toLetter("é")).toBe("E");
    expect(toLetter("ç")).toBe("C");
    expect(toLetter("7")).toBeNull();
    expect(toLetter("ß")).toBeNull();
    expect(toLetter(" ")).toBeNull();
  });

  it("replaces the letter already in the slot with the one typed", () => {
    expect(typedLetter("", "g")).toBe("G");
    expect(typedLetter("M", "MG")).toBe("G");
    expect(typedLetter("M", "GM")).toBe("G");
    expect(typedLetter("M", "MM")).toBe("M");
    expect(typedLetter("M", "M1")).toBeNull();
  });

  it("walks the alphabet with the arrows and wraps around", () => {
    expect(cycleLetter("", 1)).toBe("A");
    expect(cycleLetter("", -1)).toBe("Z");
    expect(cycleLetter("A", 1)).toBe("B");
    expect(cycleLetter("Z", 1)).toBe("A");
    expect(cycleLetter("A", -1)).toBe("Z");
  });

  it("only makes a name out of three letters", () => {
    expect(initialsName(["M", "G", "C"])).toBe("MGC");
    expect(initialsName(["M", "", "C"])).toBeNull();
    expect(initialsName(["M", "G"])).toBeNull();
  });

  it("points at the first empty slot, or the last one when all are full", () => {
    expect(firstEmpty(["M", "", ""])).toBe(1);
    expect(firstEmpty(["M", "G", "C"])).toBe(2);
  });
});
