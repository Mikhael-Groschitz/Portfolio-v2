import {
  DAMAGE,
  DROP_KNIGHT,
  ENEMY_DYING_FRAMES,
  ENEMY_HURT_FRAMES,
  ENEMY_KNOCKBACK,
  GC,
  MOVEMENT,
  SYNTAX_ERROR,
  WATCHDOG,
  ZOMBIE,
} from "../balance";
import { type Body, type Box, moveBody } from "../core/collision";
import type { Cue } from "../core/cues";
import { type Cell, type Level, TILE, isFloor, isSolid } from "../levels/level";
import type { Hero } from "./hero";
import type { Loot } from "./items";
import type { Spark } from "./particles";
import type { Projectile } from "./projectiles";

export type EnemyKind = "syntaxError" | "watchdog" | "zombie" | "dropKnight";

export type EnemyState =
  | "patrol"
  | "windup"
  | "drift"
  | "charge"
  | "buried"
  | "rise"
  | "shamble"
  | "march"
  | "throw";

export interface Enemy extends Body {
  kind: EnemyKind;
  home: Cell;
  summoned: boolean;
  alive: boolean;
  dying: number;
  health: number;
  facing: 1 | -1;
  knock: 1 | -1;
  state: EnemyState;
  timer: number;
  cooldown: number;
  hurt: number;
  struck: number;
  hitToken: number;
  baseY: number;
  phase: number;
  shots: number;
  zone: number;
  order: number;
  spawns: number;
}

export interface Zone {
  left: number;
  right: number;
  floor: number;
}

export interface Surroundings {
  room: {
    level: Level;
    enemies: readonly Enemy[];
    zones: readonly Zone[];
  };
  hero: Hero;
  projectiles: readonly Projectile[];
}

export interface Entrance {
  cue?: Cue;
  spark?: Spark;
}

interface EnemyTraits {
  width: number;
  height: number;
  health: number;
  touch: number;
  rest: "floor" | "air";
  start: EnemyState;
  knockback: number;
  spark: Spark;
  hit: Cue;
  defeat: Cue;
  loot: Loot;
  spawns: number;
  regrow: number;
  entrances: Readonly<Partial<Record<EnemyState, Entrance>>>;
}

const COMMON_LOOT: Loot = {
  backup: 0,
  boost: 0,
  energy: GC.enemyEnergyChance,
};

export const ENEMY_TRAITS: Readonly<Record<EnemyKind, EnemyTraits>> = {
  syntaxError: {
    width: 12,
    height: 22,
    health: SYNTAX_ERROR.health,
    touch: DAMAGE.syntaxError,
    rest: "floor",
    start: "patrol",
    knockback: ENEMY_KNOCKBACK,
    spark: "bone",
    hit: "hit",
    defeat: "smash",
    loot: COMMON_LOOT,
    spawns: 1,
    regrow: 0,
    entrances: {},
  },
  watchdog: {
    width: 14,
    height: 12,
    health: WATCHDOG.health,
    touch: DAMAGE.watchdog,
    rest: "air",
    start: "drift",
    knockback: ENEMY_KNOCKBACK,
    spark: "ember",
    hit: "hit",
    defeat: "smash",
    loot: COMMON_LOOT,
    spawns: 1,
    regrow: 0,
    entrances: {},
  },
  zombie: {
    width: 10,
    height: 22,
    health: ZOMBIE.health,
    touch: DAMAGE.zombie,
    rest: "floor",
    start: "buried",
    knockback: ENEMY_KNOCKBACK,
    spark: "log",
    hit: "hit",
    defeat: "sink",
    loot: { backup: 0, boost: 0, energy: ZOMBIE.energyChance },
    spawns: ZOMBIE.perGrave,
    regrow: ZOMBIE.regrowFrames,
    entrances: { rise: { cue: "rise", spark: "dirt" } },
  },
  dropKnight: {
    width: 14,
    height: 28,
    health: DROP_KNIGHT.health,
    touch: DAMAGE.dropKnight,
    rest: "floor",
    start: "march",
    knockback: ENEMY_KNOCKBACK * DROP_KNIGHT.knockback,
    spark: "metal",
    hit: "clank",
    defeat: "smash",
    loot: {
      backup: DROP_KNIGHT.backupChance,
      boost: DROP_KNIGHT.boostChance,
      energy: DROP_KNIGHT.energyChance,
    },
    spawns: 1,
    regrow: 0,
    entrances: { windup: { cue: "windup" }, throw: { cue: "axe" } },
  },
};

export const ENEMY_KINDS = Object.keys(ENEMY_TRAITS) as readonly EnemyKind[];

export const ENEMY_HEALTH = Object.fromEntries(
  ENEMY_KINDS.map((kind) => [kind, ENEMY_TRAITS[kind].health]),
) as Readonly<Record<EnemyKind, number>>;

export function centerX(box: Box): number {
  return box.x + box.width / 2;
}

export function resetEnemy(enemy: Enemy): void {
  const traits = ENEMY_TRAITS[enemy.kind];
  const { column, row } = enemy.home;
  enemy.width = traits.width;
  enemy.height = traits.height;
  enemy.x = column * TILE + (TILE - traits.width) / 2;
  enemy.y =
    traits.rest === "air"
      ? row * TILE + (TILE - traits.height) / 2
      : (row + 1) * TILE - traits.height;
  enemy.vx = 0;
  enemy.vy = 0;
  enemy.grounded = false;
  enemy.alive = !enemy.summoned;
  enemy.dying = 0;
  enemy.health = traits.health;
  enemy.facing = -1;
  enemy.knock = 1;
  enemy.state = traits.start;
  enemy.timer = 0;
  enemy.cooldown = enemy.order * ZOMBIE.riseStagger;
  enemy.hurt = 0;
  enemy.struck = 0;
  enemy.hitToken = 0;
  enemy.baseY = enemy.y;
  enemy.phase = column * 17;
  enemy.shots = 0;
  enemy.spawns = traits.spawns;
}

function createEnemy(
  kind: EnemyKind,
  home: Cell,
  summoned = false,
  zone = -1,
  order = 0,
): Enemy {
  const enemy: Enemy = {
    kind,
    home,
    summoned,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    vx: 0,
    vy: 0,
    grounded: false,
    alive: true,
    dying: 0,
    health: 0,
    facing: -1,
    knock: 1,
    state: "patrol",
    timer: 0,
    cooldown: 0,
    hurt: 0,
    struck: 0,
    hitToken: 0,
    baseY: 0,
    phase: 0,
    shots: 0,
    zone,
    order,
    spawns: 0,
  };
  resetEnemy(enemy);
  return enemy;
}

function zombieGroups(level: Level): Cell[][] {
  const cells = [...level.places.zombie].sort(
    (a, b) => a.row - b.row || a.column - b.column,
  );
  const groups: Cell[][] = [];
  for (const cell of cells) {
    const group = groups.at(-1);
    const last = group?.at(-1);
    if (
      group &&
      last?.row === cell.row &&
      cell.column - last.column <= ZOMBIE.zoneGap
    ) {
      group.push(cell);
    } else {
      groups.push([cell]);
    }
  }
  return groups;
}

export function createZones(level: Level): Zone[] {
  return zombieGroups(level).map((group) => ({
    left: (group[0].column - ZOMBIE.zoneMargin) * TILE,
    right: ((group.at(-1)?.column ?? 0) + 1 + ZOMBIE.zoneMargin) * TILE,
    floor: (group[0].row + 1) * TILE,
  }));
}

export function createEnemies(level: Level): Enemy[] {
  return [
    ...level.places.syntaxError.map((home) => createEnemy("syntaxError", home)),
    ...level.places.watchdog.map((home) => createEnemy("watchdog", home)),
    ...zombieGroups(level).flatMap((group, zone) =>
      group.map((home, order) =>
        createEnemy("zombie", home, false, zone, order),
      ),
    ),
    ...level.places.dropKnight.map((home) => createEnemy("dropKnight", home)),
    ...level.places.summon.map((home) =>
      createEnemy("syntaxError", home, true),
    ),
    ...level.places.paste.map((home) => createEnemy("zombie", home, true)),
  ];
}

export function summon(enemy: Enemy): void {
  resetEnemy(enemy);
  enemy.alive = true;
}

export function isFree(enemy: Enemy): boolean {
  return enemy.summoned && !enemy.alive && enemy.dying === 0;
}

export function revive(enemy: Enemy): boolean {
  if (enemy.alive || enemy.dying > 0 || enemy.summoned || enemy.spawns <= 1) {
    return false;
  }
  const spawns = enemy.spawns - 1;
  resetEnemy(enemy);
  enemy.spawns = spawns;
  enemy.cooldown = ENEMY_TRAITS[enemy.kind].regrow;
  return true;
}

export function isTangible(enemy: Enemy): boolean {
  return enemy.alive && enemy.state !== "buried";
}

export function damageEnemy(
  enemy: Enemy,
  amount: number,
  fromX: number,
): boolean {
  enemy.health -= amount;
  enemy.hurt = ENEMY_HURT_FRAMES;
  enemy.knock = centerX(enemy) >= fromX ? 1 : -1;
  if (enemy.health <= 0 && enemy.alive) {
    enemy.alive = false;
    enemy.dying = ENEMY_DYING_FRAMES;
  }
  return !enemy.alive;
}

export function faceToward(enemy: Enemy, x: number): void {
  enemy.facing = x >= centerX(enemy) ? 1 : -1;
}

export function blockedAhead(enemy: Enemy, level: Level): boolean {
  const front = enemy.facing > 0 ? enemy.x + enemy.width + 1 : enemy.x - 1;
  const column = Math.floor(front / TILE);
  const feet = enemy.y + enemy.height;
  return (
    isSolid(level, column, Math.floor((feet - 1) / TILE)) ||
    !isFloor(level, column, Math.floor((feet + 1) / TILE))
  );
}

export function recoil(enemy: Enemy): boolean {
  if (enemy.hurt <= 0) {
    return false;
  }
  enemy.vx =
    (enemy.knock * ENEMY_TRAITS[enemy.kind].knockback * enemy.hurt) /
    ENEMY_HURT_FRAMES;
  enemy.hurt -= 1;
  return true;
}

export function fall(enemy: Enemy, level: Level): void {
  enemy.vy = Math.min(enemy.vy + MOVEMENT.gravity, MOVEMENT.maxFallSpeed);
  moveBody(level, enemy);
}
