import { describe, expect, it } from "vitest";
import { CAMPAIGN, parseCampaign } from "./campaign";
import { parseLevel } from "./level";
import { canStand, crowding, survey } from "./reach";

function chasm(width: number) {
  const inner = 4 + width + 4;
  const open = `#${" ".repeat(inner)}#`;
  const ground = `#####${" ".repeat(width)}#####`;
  return parseLevel([
    "#".repeat(inner + 2),
    open,
    open,
    open,
    `#S${" ".repeat(inner - 2)}E#`,
    ground,
    ground,
  ]);
}

function ledge(height: number) {
  const rows = ["##########"];
  for (let row = 1; row < 10 - height; row++) {
    rows.push(row === 9 - height ? "#     E  #" : "#        #");
  }
  for (let row = 10 - height; row < 10; row++) {
    rows.push(row === 9 ? "#S   #####" : "#    #####");
  }
  rows.push("##########");
  return parseLevel(rows);
}

function pit(depth: number) {
  const rows = ["##########", "#        #", "#        #", "#S  %% E #"];
  rows.push("####  ####");
  for (let row = 1; row < depth; row++) {
    rows.push("###    ###");
  }
  rows.push("##########");
  return parseLevel(rows);
}

describe("map format", () => {
  it("draws every slot as a rectangle with one entry and one exit", () => {
    CAMPAIGN.forEach(({ map }, index) => {
      const symbols = map.join("");
      expect(new Set(map.map((row) => row.length)).size).toBe(1);
      expect(symbols.split("S")).toHaveLength(2);
      expect(symbols.split("E")).toHaveLength(
        index < CAMPAIGN.length - 1 ? 2 : 1,
      );
    });
  });
});

describe("map validator", () => {
  it("reaches every exit, item and savepoint of the campaign, with no way to get stuck", () => {
    for (const { slot, level } of parseCampaign()) {
      const name = slot.kind === "stage" ? slot.stage : slot.boss;
      expect(survey(level).stranded, name).toEqual([]);
    }
  });

  it("keeps every item clear of walls, platforms and other pieces", () => {
    for (const { slot, level } of parseCampaign()) {
      const name = slot.kind === "stage" ? slot.stage : slot.boss;
      expect(crowding(level), name).toEqual([]);
    }
  });

  it("flags an item glued to a ledge or floating on the head of whoever stands below", () => {
    const glued = parseLevel([
      "##########",
      "#        #",
      "#   u    #",
      "#        #",
      "#  f==   #",
      "#        #",
      "#S      E#",
      "##########",
    ]);
    expect(crowding(glued)).toEqual([
      "disk at 3,4 touches 4,4",
      "pen at 4,2 blocks a head",
    ]);
  });

  it("jumps gaps of up to three tiles, but not four", () => {
    expect(survey(chasm(3)).stranded).toEqual([]);
    expect(survey(chasm(4)).stranded).toContain("exit at 12,4");
  });

  it("climbs three rows at once, but not four", () => {
    expect(survey(ledge(3)).stranded).toEqual([]);
    expect(survey(ledge(4)).stranded.length).toBeGreaterThan(0);
  });

  it("does not walk through walls", () => {
    const sealed = parseLevel([
      "##########",
      "#   #    #",
      "#   #    #",
      "#S  #   E#",
      "##########",
    ]);
    expect(survey(sealed).stranded).toContain("exit at 8,3");
  });

  it("only counts containers the whip can reach", () => {
    const shelf = parseLevel([
      "############",
      "#   f      #",
      "#          #",
      "#          #",
      "#          #",
      "#        u #",
      "#S       E #",
      "############",
    ]);
    expect(survey(shelf).stranded).toEqual(["disk at 4,1"]);
  });

  it("stands on bad sectors and scheduled platforms, but not while they are gone", () => {
    const level = parseLevel(["#####", "#   #", "#S E#", "#%-_#", "#####"]);
    for (const column of [1, 2, 3]) {
      expect(canStand(level, column, 2)).toBe(true);
      expect(canStand(level, column, 2, true)).toBe(false);
    }
  });

  it("flags a pit too deep to climb out of once its bad sectors fall", () => {
    expect(survey(pit(2)).stranded).toEqual([]);
    expect(
      survey(pit(5)).stranded.some((line) => line.startsWith("dead end")),
    ).toBe(true);
  });
});
