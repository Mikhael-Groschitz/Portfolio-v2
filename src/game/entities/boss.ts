import { COLLECTOR, DAMAGE, LEGACY, VIBE } from "../balance";
import type { Cell, Level, Place } from "../levels/level";
import {
  type Collector,
  createCollector,
  damageCollector,
  isCollectorVulnerable,
  resetCollector,
  updateCollector,
} from "./collector";
import type { Enemy } from "./enemy";
import type { Hero } from "./hero";
import {
  type Legacy,
  createLegacy,
  damageLegacy,
  isLegacyVulnerable,
  resetLegacy,
  updateLegacy,
} from "./legacy";
import type { Particle } from "./particles";
import type { Projectile } from "./projectiles";
import {
  type Vibe,
  type VibeLine,
  createVibe,
  damageVibe,
  isVibeVulnerable,
  resetVibe,
  updateVibe,
  vibeLine,
} from "./vibe";

export type Boss = Vibe | Collector | Legacy;

export type BossKind = Boss["kind"];

export type BossEvent =
  | "awake"
  | "freed"
  | "rollback"
  | "committed"
  | "landing"
  | "finished"
  | "absorbed"
  | "pasted"
  | "unmasked";

export interface BossSurroundings {
  room: { level: Level; enemies: readonly Enemy[] };
  hero: Hero;
  projectiles: readonly Projectile[];
  particles: readonly Particle[];
  seed: number;
}

interface BossBehavior<B extends Boss> {
  place: Place;
  health: number;
  create: (home: Cell, level: Level) => B;
  reset: (boss: B) => void;
  update: (boss: B, surroundings: BossSurroundings) => BossEvent | null;
  isVulnerable: (boss: B) => boolean;
  damage: (boss: B, amount: number) => BossEvent | null;
  touchDamage: (boss: B) => number;
  line: (boss: B) => VibeLine | null;
  said: (boss: B) => number;
  card: (boss: B) => boolean;
}

const BEHAVIORS: {
  readonly [K in BossKind]: BossBehavior<Extract<Boss, { kind: K }>>;
} = {
  vibe: {
    place: "vibe",
    health: VIBE.health,
    create: createVibe,
    reset: resetVibe,
    update: updateVibe,
    isVulnerable: isVibeVulnerable,
    damage: damageVibe,
    touchDamage: () => DAMAGE.vibe,
    line: vibeLine,
    said: (boss) => boss.said,
    card: (boss) => boss.state === "intro",
  },
  collector: {
    place: "collector",
    health: COLLECTOR.health,
    create: createCollector,
    reset: resetCollector,
    update: updateCollector,
    isVulnerable: isCollectorVulnerable,
    damage: (boss, amount) => {
      damageCollector(boss, amount);
      return null;
    },
    touchDamage: () => DAMAGE.collector,
    line: () => null,
    said: () => 0,
    card: (boss) => boss.state === "intro",
  },
  legacy: {
    place: "throne",
    health: LEGACY.health,
    create: createLegacy,
    reset: resetLegacy,
    update: updateLegacy,
    isVulnerable: isLegacyVulnerable,
    damage: damageLegacy,
    touchDamage: (boss) =>
      boss.state === "dive" ? DAMAGE.dive : DAMAGE.legacy,
    line: () => null,
    said: () => 0,
    card: (boss) => boss.state === "intro",
  },
};

export const BOSS_KINDS = Object.keys(BEHAVIORS) as readonly BossKind[];

export const BOSS_HEALTH = Object.fromEntries(
  BOSS_KINDS.map((kind) => [kind, BEHAVIORS[kind].health]),
) as Readonly<Record<BossKind, number>>;

function behaviorOf(boss: Boss): BossBehavior<Boss> {
  return BEHAVIORS[boss.kind] as unknown as BossBehavior<Boss>;
}

export function bossPlace(kind: BossKind): Place {
  return BEHAVIORS[kind].place;
}

export function createBoss(level: Level): Boss | null {
  for (const kind of BOSS_KINDS) {
    const [home] = level.places[bossPlace(kind)];
    if (home) {
      return BEHAVIORS[kind].create(home, level);
    }
  }
  return null;
}

export function resetBoss(boss: Boss): void {
  behaviorOf(boss).reset(boss);
}

export function updateBoss(
  boss: Boss,
  surroundings: BossSurroundings,
): BossEvent | null {
  return behaviorOf(boss).update(boss, surroundings);
}

export function isVulnerable(boss: Boss): boolean {
  return behaviorOf(boss).isVulnerable(boss);
}

export function damageBoss(boss: Boss, amount: number): BossEvent | null {
  return behaviorOf(boss).damage(boss, amount);
}

export function touchDamage(boss: Boss): number {
  return behaviorOf(boss).touchDamage(boss);
}

export function bossLine(boss: Boss): VibeLine | null {
  return behaviorOf(boss).line(boss);
}

export function linesSaid(boss: Boss): number {
  return behaviorOf(boss).said(boss);
}

export function showsCard(boss: Boss): boolean {
  return behaviorOf(boss).card(boss);
}

export function isFighting(boss: Boss): boolean {
  return boss.state !== "dormant" && boss.state !== "gone";
}

export function isCleared(boss: Boss): boolean {
  return boss.state === "gone";
}
