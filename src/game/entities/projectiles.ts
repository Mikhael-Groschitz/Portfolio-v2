import {
  DROP_KNIGHT,
  LEGACY,
  MOVEMENT,
  SUBWEAPONS,
  SYNTAX_ERROR,
  VIBE,
  WATCHDOG,
} from "../balance";
import { type Box, hitsSolid, overlaps } from "../core/collision";
import { type Pooled, claim, createPool } from "../core/pool";
import type { Level } from "../levels/level";
import type { Spark } from "./particles";

export type ProjectileKind =
  | "select"
  | "join"
  | "drop"
  | "glyph"
  | "beam"
  | "card"
  | "dropAxe"
  | "code"
  | "hallucination"
  | "wave"
  | "bug";

export interface Projectile extends Box, Pooled {
  kind: ProjectileKind;
  vx: number;
  vy: number;
  age: number;
  travelled: number;
  facing: 1 | -1;
  variant: number;
  returning: boolean;
  token: number;
}

export const PROJECTILE_SIZE: Readonly<
  Record<ProjectileKind, { width: number; height: number }>
> = {
  select: { width: 10, height: 4 },
  join: { width: 10, height: 10 },
  drop: { width: 10, height: 10 },
  glyph: { width: 6, height: 10 },
  beam: { width: 22, height: 6 },
  card: { width: 10, height: 6 },
  dropAxe: { width: 10, height: 10 },
  code: { width: 10, height: 8 },
  hallucination: { width: 10, height: 8 },
  wave: { width: 14, height: 10 },
  bug: { width: 8, height: 6 },
};

export const FADE_SPARKS: Readonly<Partial<Record<ProjectileKind, Spark>>> = {
  code: "data",
  hallucination: "data",
  wave: "ember",
  bug: "log",
};

const POOL_SIZE = 32;
const JOIN_LIFETIME = 150;
const JOIN_ARC = 0.08;
const JOIN_HOMING = 0.12;

export function createProjectiles(): Projectile[] {
  return createPool(POOL_SIZE, () => ({
    active: false,
    kind: "select",
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    vx: 0,
    vy: 0,
    age: 0,
    travelled: 0,
    facing: 1,
    variant: 0,
    returning: false,
    token: 0,
  }));
}

export function isHostile(projectile: Projectile): boolean {
  return (
    projectile.kind === "glyph" ||
    projectile.kind === "beam" ||
    projectile.kind === "card" ||
    projectile.kind === "dropAxe" ||
    projectile.kind === "code" ||
    projectile.kind === "wave" ||
    projectile.kind === "bug"
  );
}

export function isFriendly(projectile: Projectile): boolean {
  return (
    projectile.kind === "select" ||
    projectile.kind === "join" ||
    projectile.kind === "drop"
  );
}

export function isWhippable(projectile: Projectile): boolean {
  return (
    projectile.kind === "glyph" ||
    projectile.kind === "card" ||
    projectile.kind === "dropAxe" ||
    projectile.kind === "code" ||
    projectile.kind === "bug"
  );
}

export function countFlying(
  projectiles: readonly Projectile[],
  kind: ProjectileKind,
): number {
  let count = 0;
  for (const projectile of projectiles) {
    if (projectile.active && projectile.kind === kind) {
      count += 1;
    }
  }
  return count;
}

export interface Launch {
  kind: ProjectileKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  variant: number;
  token: number;
}

export function launch(
  projectiles: readonly Projectile[],
  shot: Readonly<Launch>,
): Projectile | null {
  const projectile = claim(projectiles);
  if (!projectile) {
    return null;
  }
  const size = PROJECTILE_SIZE[shot.kind];
  projectile.kind = shot.kind;
  projectile.width = size.width;
  projectile.height = size.height;
  projectile.x = shot.x;
  projectile.y = shot.y;
  projectile.vx = shot.vx;
  projectile.vy = shot.vy;
  projectile.facing = shot.facing;
  projectile.variant = shot.variant;
  projectile.token = shot.token;
  projectile.age = 0;
  projectile.travelled = 0;
  projectile.returning = false;
  return projectile;
}

function flyStraight(projectile: Projectile, level: Level, range: number) {
  projectile.x += projectile.vx;
  projectile.travelled += Math.abs(projectile.vx);
  if (projectile.travelled > range || hitsSolid(level, projectile)) {
    projectile.active = false;
  }
}

function boomerang(projectile: Projectile, home: Box) {
  const { speed, turnFrames } = SUBWEAPONS.join;
  if (!projectile.returning && projectile.age >= turnFrames) {
    projectile.returning = true;
    projectile.token = -projectile.token;
  }
  if (projectile.returning) {
    const targetX = home.x + home.width / 2 - projectile.width / 2;
    const targetY = home.y + home.height / 2 - projectile.height / 2;
    projectile.vx = Math.sign(targetX - projectile.x) * speed;
    projectile.vy = (targetY - projectile.y) * JOIN_HOMING;
  } else {
    projectile.vx =
      projectile.facing * speed * (1 - projectile.age / turnFrames);
    projectile.vy += JOIN_ARC;
  }
  projectile.x += projectile.vx;
  projectile.y += projectile.vy;
  const caught = projectile.returning && overlaps(projectile, home);
  if (caught || projectile.age > JOIN_LIFETIME) {
    projectile.active = false;
  }
}

function arc(projectile: Projectile, level: Level, gravity: number) {
  projectile.x += projectile.vx;
  projectile.y += projectile.vy;
  projectile.vy += gravity;
  if (hitsSolid(level, projectile) || projectile.y > level.height) {
    projectile.active = false;
  }
}

function fade(projectile: Projectile) {
  projectile.x += projectile.vx;
  projectile.y += projectile.vy;
  projectile.vy += VIBE.blockGravity;
  if (projectile.vy > 0) {
    projectile.active = false;
  }
}

function drop(projectile: Projectile, level: Level) {
  if (projectile.age <= VIBE.bugWarnFrames) {
    return;
  }
  projectile.vy = Math.min(
    projectile.vy + VIBE.bugGravity,
    MOVEMENT.maxFallSpeed,
  );
  projectile.y += projectile.vy;
  if (hitsSolid(level, projectile) || projectile.y > level.height) {
    projectile.active = false;
  }
}

function lob(projectile: Projectile, level: Level) {
  const { gravity, lifetime } = SUBWEAPONS.drop;
  projectile.x += projectile.vx;
  projectile.y += projectile.vy;
  projectile.vy += gravity;
  if (projectile.age > lifetime || projectile.y > level.height) {
    projectile.active = false;
  }
}

export function moveProjectile(
  projectile: Projectile,
  level: Level,
  home: Box,
): void {
  projectile.age += 1;
  switch (projectile.kind) {
    case "select":
      flyStraight(projectile, level, SUBWEAPONS.select.range);
      break;
    case "beam":
      flyStraight(projectile, level, WATCHDOG.beamRange);
      break;
    case "card":
      flyStraight(projectile, level, LEGACY.cardRange);
      break;
    case "join":
      boomerang(projectile, home);
      break;
    case "drop":
      lob(projectile, level);
      break;
    case "glyph":
      arc(projectile, level, SYNTAX_ERROR.glyphGravity);
      break;
    case "dropAxe":
      arc(projectile, level, DROP_KNIGHT.axeGravity);
      break;
    case "code":
      arc(projectile, level, VIBE.blockGravity);
      break;
    case "hallucination":
      fade(projectile);
      break;
    case "wave":
      flyStraight(projectile, level, level.width);
      break;
    case "bug":
      drop(projectile, level);
      break;
  }
}
