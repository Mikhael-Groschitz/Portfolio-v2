import type { TrackName } from "../audio/tracks";
import type { BossKind } from "../entities/boss";
import type { EnemyKind } from "../entities/enemy";
import { BOOSTS, type Boost } from "../entities/items";
import { type Level, joinSegments, parseLevel } from "./level";
import {
  CATACOMBS,
  COLLECTOR_ROOM,
  CRON_TOWER,
  HALL_OF_RACKS,
  LOG_CORRIDOR,
  STAIRCASE,
  TAPE_LIBRARY,
  TEST_LAB,
  THRONE_ROOM,
  VIBE_ROOM,
} from "./rooms";

export type StageId =
  "racks" | "catacombs" | "tapes" | "lab" | "stairs" | "cron";

interface SlotPlan {
  map: readonly string[];
  plaque: string | null;
}

export interface StageSlot extends SlotPlan {
  kind: "stage";
  stage: StageId;
  cast: readonly EnemyKind[];
  music: TrackName;
  boosts: readonly Boost[];
}

export interface BossSlot extends SlotPlan {
  kind: "boss";
  boss: BossKind;
  calm: TrackName | null;
  fight: TrackName;
}

export type Slot = StageSlot | BossSlot;

export interface PlannedRoom {
  slot: Slot;
  level: Level;
}

export type SlotSummary =
  | { kind: "stage"; stage: StageId; number: number; total: number }
  | { kind: "boss"; boss: BossKind };

export const ENTRANCE = joinSegments(HALL_OF_RACKS, LOG_CORRIDOR);

const FIRST_CAST: readonly EnemyKind[] = ["syntaxError", "watchdog"];
const FULL_CAST: readonly EnemyKind[] = [
  "syntaxError",
  "watchdog",
  "zombie",
  "dropKnight",
];

export const CAMPAIGN: readonly Slot[] = [
  {
    kind: "stage",
    stage: "racks",
    map: ENTRANCE,
    plaque: "BKP",
    cast: FIRST_CAST,
    music: "stage",
    boosts: [],
  },
  {
    kind: "stage",
    stage: "catacombs",
    map: CATACOMBS,
    plaque: "VIBE",
    cast: ["syntaxError", "zombie"],
    music: "catacombs",
    boosts: ["firewall"],
  },
  {
    kind: "boss",
    boss: "vibe",
    map: VIBE_ROOM,
    plaque: "TAPE",
    calm: "stage",
    fight: "vibe",
  },
  {
    kind: "stage",
    stage: "tapes",
    map: TAPE_LIBRARY,
    plaque: "TEST",
    cast: ["watchdog", "zombie", "dropKnight"],
    music: "tapes",
    boosts: ["firewall", "index"],
  },
  {
    kind: "stage",
    stage: "lab",
    map: TEST_LAB,
    plaque: "GC",
    cast: FULL_CAST,
    music: "lab",
    boosts: BOOSTS,
  },
  {
    kind: "boss",
    boss: "collector",
    map: COLLECTOR_ROOM,
    plaque: null,
    calm: "stage",
    fight: "boss",
  },
  {
    kind: "stage",
    stage: "stairs",
    map: STAIRCASE,
    plaque: "CRON",
    cast: ["syntaxError", "watchdog", "zombie"],
    music: "stage",
    boosts: BOOSTS,
  },
  {
    kind: "stage",
    stage: "cron",
    map: CRON_TOWER,
    plaque: "PROD",
    cast: FULL_CAST,
    music: "cron",
    boosts: BOOSTS,
  },
  {
    kind: "boss",
    boss: "legacy",
    map: THRONE_ROOM,
    plaque: null,
    calm: null,
    fight: "boss",
  },
];

export function parseCampaign(
  campaign: readonly Slot[] = CAMPAIGN,
): PlannedRoom[] {
  return campaign.map((slot) => ({
    slot,
    level: parseLevel(slot.map, slot.plaque),
  }));
}

export function boostsOf(slot: Slot): readonly Boost[] {
  return slot.kind === "stage" ? slot.boosts : [];
}

export function stageCount(campaign: readonly Slot[]): number {
  return campaign.filter((slot) => slot.kind === "stage").length;
}

export function stageNumber(campaign: readonly Slot[], index: number): number {
  return stageCount(campaign.slice(0, index + 1));
}

export function summarize(
  campaign: readonly Slot[],
  index: number,
): SlotSummary {
  const slot = campaign[index];
  if (slot.kind === "boss") {
    return { kind: "boss", boss: slot.boss };
  }
  return {
    kind: "stage",
    stage: slot.stage,
    number: stageNumber(campaign, index),
    total: stageCount(campaign),
  };
}
