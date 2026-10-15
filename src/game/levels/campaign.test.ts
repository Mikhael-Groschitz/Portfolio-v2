import { describe, expect, it } from "vitest";
import { LOCALES } from "@/content/locales";
import { TRACKS } from "../audio/tracks";
import { BOSS_KINDS, bossPlace } from "../entities/boss";
import { BOOSTS } from "../entities/items";
import { ENEMY_HEALTH, type EnemyKind } from "../entities/enemy";
import { GLYPHS } from "../render/font";
import { GAME_TEXTS } from "../ui/texts";
import {
  CAMPAIGN,
  parseCampaign,
  stageCount,
  boostsOf,
  stageNumber,
  summarize,
} from "./campaign";

const ENEMY_KINDS = Object.keys(ENEMY_HEALTH) as EnemyKind[];
const rooms = parseCampaign();

function nameOf(index: number): string {
  const slot = CAMPAIGN[index];
  return slot.kind === "stage" ? slot.stage : slot.boss;
}

describe("campaign", () => {
  it("lines up six stages and three bosses in the agreed order", () => {
    expect(CAMPAIGN.map((_, index) => nameOf(index))).toEqual([
      "racks",
      "catacombs",
      "vibe",
      "tapes",
      "lab",
      "collector",
      "stairs",
      "cron",
      "legacy",
    ]);
    expect(stageCount(CAMPAIGN)).toBe(6);
  });

  it("fights each boss once and ends with the one that rolls back", () => {
    const bosses = CAMPAIGN.flatMap((slot) =>
      slot.kind === "boss" ? [slot.boss] : [],
    );
    expect(bosses).toEqual(["vibe", "collector", "legacy"]);
    expect(new Set(bosses)).toEqual(new Set(BOSS_KINDS));
    expect(CAMPAIGN.at(-1)).toMatchObject({ kind: "boss", boss: "legacy" });
  });

  it("parses every map and leaves a door in every slot but the last", () => {
    expect(rooms).toHaveLength(CAMPAIGN.length);
    for (const { level } of rooms.slice(0, -1)) {
      expect(level.exit).not.toBeNull();
    }
    expect(rooms.at(-1)?.level.exit).toBeNull();
  });

  it("puts each boss in its own room and none in the stages", () => {
    rooms.forEach(({ slot, level }, index) => {
      for (const kind of BOSS_KINDS) {
        const expected = slot.kind === "boss" && slot.boss === kind ? 1 : 0;
        expect(level.places[bossPlace(kind)], nameOf(index)).toHaveLength(
          expected,
        );
      }
    });
  });

  it("labels the doors with plaques the pixel font can draw", () => {
    expect(CAMPAIGN.map(({ plaque }) => plaque)).toEqual([
      "BKP",
      "VIBE",
      "TAPE",
      "TEST",
      "GC",
      null,
      "CRON",
      "PROD",
      null,
    ]);
    for (const { plaque } of CAMPAIGN) {
      if (plaque) {
        expect(plaque.length).toBeLessThanOrEqual(4);
        expect(
          [...plaque].every((letter) => Object.hasOwn(GLYPHS, letter)),
        ).toBe(true);
      }
    }
  });

  it("plays only tracks that exist", () => {
    for (const slot of CAMPAIGN) {
      const music =
        slot.kind === "stage" ? [slot.music] : [slot.calm, slot.fight];
      for (const track of music) {
        if (track !== null) {
          expect(TRACKS).toHaveProperty(track);
        }
      }
    }
  });

  it("casts in every stage exactly the enemies its map places", () => {
    rooms.forEach(({ slot, level }) => {
      if (slot.kind !== "stage") {
        return;
      }
      const placed = ENEMY_KINDS.filter(
        (kind) => level.places[kind].length > 0,
      );
      expect(new Set(slot.cast)).toEqual(new Set(placed));
    });
  });

  it("brings in the boosts stage by stage, as the catalog says", () => {
    const offered = CAMPAIGN.flatMap((slot) =>
      slot.kind === "stage" ? [[slot.stage, [...boostsOf(slot)]]] : [],
    );
    expect(Object.fromEntries(offered)).toEqual({
      racks: [],
      catacombs: ["firewall"],
      tapes: ["firewall", "index"],
      lab: [...BOOSTS],
      stairs: [...BOOSTS],
      cron: [...BOOSTS],
    });
    for (const slot of CAMPAIGN) {
      if (slot.kind === "boss") {
        expect(boostsOf(slot)).toEqual([]);
      }
    }
  });

  it("names every stage and every boss in both languages", () => {
    for (const locale of LOCALES) {
      const text = GAME_TEXTS[locale];
      for (const slot of CAMPAIGN) {
        const name =
          slot.kind === "stage"
            ? text.stages[slot.stage]
            : text.bosses[slot.boss];
        expect(name.trim()).not.toBe("");
      }
    }
  });

  it("numbers the stages and leaves the bosses unnumbered", () => {
    expect(summarize(CAMPAIGN, 0)).toEqual({
      kind: "stage",
      stage: "racks",
      number: 1,
      total: 6,
    });
    expect(summarize(CAMPAIGN, 2)).toEqual({ kind: "boss", boss: "vibe" });
    expect(summarize(CAMPAIGN, 3)).toMatchObject({ stage: "tapes", number: 3 });
    expect(summarize(CAMPAIGN, 7)).toMatchObject({ stage: "cron", number: 6 });
    expect(stageNumber(CAMPAIGN, 8)).toBe(6);
  });
});
