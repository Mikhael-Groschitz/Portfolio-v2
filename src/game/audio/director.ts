import type { World } from "../core/world";
import type { Boss } from "../entities/boss";
import { centerX } from "../entities/enemy";
import type { BossSlot } from "../levels/campaign";
import { TILE } from "../levels/level";
import type { TrackName } from "./tracks";

function bossTrack(boss: Boss, slot: BossSlot): TrackName | null {
  switch (boss.state) {
    case "dormant":
      return slot.calm;
    case "gone":
      return "stage";
    case "defeat":
    case "commit":
      return null;
    default:
      return slot.fight;
  }
}

function stageTrack(
  world: World,
  music: TrackName,
  current: TrackName | null,
): TrackName {
  const [arch] = world.room.level.places.arch;
  if (!arch || current === music) {
    return music;
  }
  return centerX(world.hero) >= (arch.column + 1) * TILE ? music : "title";
}

export function chooseTrack(
  world: World,
  current: TrackName | null,
): TrackName | null {
  switch (world.mode) {
    case "title":
      return null;
    case "intro":
      return "title";
    case "crash":
      return "defeat";
    case "victory":
      return "victory";
    case "paused":
      return current;
    case "playing":
      break;
  }
  if (world.passage > 0) {
    return current;
  }
  const { boss, slot } = world.room;
  if (slot.kind === "stage") {
    return stageTrack(world, slot.music, current);
  }
  return boss ? bossTrack(boss, slot) : slot.calm;
}
