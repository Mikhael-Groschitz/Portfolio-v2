import {
  BACKUP,
  CACHE,
  FIREWALL,
  GC,
  INDEX,
  MOVEMENT,
  QUERY_ENERGY,
  TAPE,
} from "../balance";
import { type Body, type Box, moveBody } from "../core/collision";
import { type Pooled, claim, createPool } from "../core/pool";
import { type Cell, type Level, TILE } from "../levels/level";
import type { Hero, Subweapon } from "./hero";

export type ContainerKind = "disk" | "pen" | "tape";
export type Boost = "firewall" | "index" | "cache";
export type PickupKind = Boost | "backup" | "readme";
export type DropKind = "energy" | "bigEnergy" | "gc" | PickupKind;
export type RelicKind = Exclude<Subweapon, "select">;

export interface Container extends Box {
  kind: ContainerKind;
  broken: boolean;
}

export interface Drop extends Body, Pooled {
  kind: DropKind;
}

export interface Relic extends Box {
  kind: RelicKind;
  taken: boolean;
}

export interface Pickup extends Box {
  kind: PickupKind;
  taken: boolean;
}

export interface Loot {
  backup: number;
  boost: number;
  energy: number;
}

export const BOOSTS: readonly Boost[] = ["firewall", "index", "cache"];

const CONTAINER_KINDS: readonly ContainerKind[] = ["disk", "pen", "tape"];
const RELIC_KINDS: readonly RelicKind[] = ["join", "truncate", "drop"];
const PICKUP_KINDS: readonly PickupKind[] = [...BOOSTS, "backup", "readme"];

const CONTAINER_SIZE = 14;
const RELIC_SIZE = 14;
const POOL_SIZE = 16;
const POP_SPEED = 2.4;

const DROP_SIZE: Readonly<Record<DropKind, number>> = {
  energy: 8,
  bigEnergy: 10,
  gc: 10,
  firewall: 10,
  index: 10,
  cache: 10,
  backup: 12,
  readme: 10,
};

function centered(cell: Cell, size: number): Box {
  return {
    x: cell.column * TILE + (TILE - size) / 2,
    y: cell.row * TILE + (TILE - size) / 2,
    width: size,
    height: size,
  };
}

function resting(cell: Cell, size: number): Box {
  return {
    x: cell.column * TILE + (TILE - size) / 2,
    y: (cell.row + 1) * TILE - size,
    width: size,
    height: size,
  };
}

export function createContainers(level: Level): Container[] {
  return CONTAINER_KINDS.flatMap((kind) =>
    level.places[kind].map((cell) => ({
      ...centered(cell, CONTAINER_SIZE),
      kind,
      broken: false,
    })),
  );
}

export function createRelics(level: Level): Relic[] {
  return RELIC_KINDS.flatMap((kind) =>
    level.places[kind].map((cell) => ({
      ...centered(cell, RELIC_SIZE),
      kind,
      taken: false,
    })),
  );
}

export function createPickups(level: Level): Pickup[] {
  return PICKUP_KINDS.flatMap((kind) =>
    level.places[kind].map((cell) => ({
      ...resting(cell, DROP_SIZE[kind]),
      kind,
      taken: false,
    })),
  );
}

export function createDrops(): Drop[] {
  return createPool(POOL_SIZE, () => ({
    active: false,
    kind: "energy",
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    vx: 0,
    vy: 0,
    grounded: false,
  }));
}

function boostFor(share: number, boosts: readonly Boost[]): Boost | null {
  if (boosts.length === 0) {
    return null;
  }
  return boosts[Math.min(Math.floor(share * boosts.length), boosts.length - 1)];
}

export function dropFor(
  kind: ContainerKind,
  roll: number,
  boosts: readonly Boost[] = [],
): DropKind {
  if (kind === "tape") {
    const boost =
      roll < TAPE.boostChance
        ? boostFor(roll / TAPE.boostChance, boosts)
        : null;
    return boost ?? "bigEnergy";
  }
  const chance = kind === "disk" ? GC.diskChance : GC.penChance;
  if (roll < chance) {
    return "gc";
  }
  return kind === "disk" ? "energy" : "bigEnergy";
}

export function lootFor(
  loot: Readonly<Loot>,
  roll: number,
  boosts: readonly Boost[] = [],
): DropKind | null {
  if (roll < loot.backup) {
    return "backup";
  }
  const boostEdge = loot.backup + loot.boost;
  if (roll < boostEdge) {
    return boostFor((roll - loot.backup) / loot.boost, boosts) ?? "energy";
  }
  return roll < boostEdge + loot.energy ? "energy" : null;
}

export function spawnDrop(
  drops: readonly Drop[],
  kind: DropKind,
  centerX: number,
  centerY: number,
): void {
  const drop = claim(drops);
  if (!drop) {
    return;
  }
  const size = DROP_SIZE[kind];
  drop.kind = kind;
  drop.width = size;
  drop.height = size;
  drop.x = centerX - size / 2;
  drop.y = centerY - size / 2;
  drop.vx = 0;
  drop.vy = -POP_SPEED;
  drop.grounded = false;
}

export function spawnReward(
  drops: readonly Drop[],
  kind: DropKind,
  centerX: number,
  centerY: number,
): void {
  if (drops.every((drop) => drop.active)) {
    const spare = drops.find((drop) => drop.kind === "energy");
    if (spare) {
      spare.active = false;
    }
  }
  spawnDrop(drops, kind, centerX, centerY);
}

export function updateDrops(drops: readonly Drop[], level: Level): void {
  for (const drop of drops) {
    if (drop.active && !drop.grounded) {
      drop.vy = Math.min(drop.vy + MOVEMENT.gravity, MOVEMENT.maxFallSpeed);
      moveBody(level, drop);
      if (drop.y > level.height) {
        drop.active = false;
      }
    }
  }
}

function gainEnergy(hero: Hero, gain: number): void {
  hero.energy = Math.min(hero.energy + gain, QUERY_ENERGY.max);
}

function relieve(hero: Hero, relief: number): void {
  hero.ram = Math.max(hero.ram - relief, 0);
}

export function applyDrop(hero: Hero, kind: DropKind): void {
  switch (kind) {
    case "energy":
      gainEnergy(hero, QUERY_ENERGY.small);
      return;
    case "bigEnergy":
      gainEnergy(hero, QUERY_ENERGY.large);
      return;
    case "gc":
      relieve(hero, GC.relief);
      return;
    case "backup":
      relieve(hero, BACKUP.relief);
      return;
    case "firewall":
      hero.firewall = FIREWALL.charges;
      return;
    case "index":
      hero.index = INDEX.frames;
      return;
    case "cache":
      hero.cache = CACHE.frames;
      return;
    case "readme":
      hero.readme = true;
      return;
  }
}
