import { SYNTAX_ERROR } from "../balance";
import {
  type Enemy,
  type Surroundings,
  blockedAhead,
  centerX,
  faceToward,
  fall,
  recoil,
} from "./enemy";
import type { Hero } from "./hero";
import { PROJECTILE_SIZE, launch } from "./projectiles";

const GLYPH_VARIANTS = 3;

const VERTICAL_SIGHT = 48;

function sees(enemy: Enemy, hero: Hero): boolean {
  return (
    Math.abs(centerX(hero) - centerX(enemy)) < SYNTAX_ERROR.sight &&
    Math.abs(hero.y + hero.height - (enemy.y + enemy.height)) < VERTICAL_SIGHT
  );
}

export function throwSpeed(distance: number, drop: number): number {
  const lift = SYNTAX_ERROR.throwLift;
  const gravity = SYNTAX_ERROR.glyphGravity;
  const airtime =
    (lift + Math.sqrt(lift * lift + 2 * gravity * Math.max(drop, 0))) / gravity;
  return Math.min(
    Math.max(Math.abs(distance) / airtime, SYNTAX_ERROR.minThrowSpeed),
    SYNTAX_ERROR.maxThrowSpeed,
  );
}

function throwGlyph(enemy: Enemy, { hero, projectiles }: Surroundings) {
  const { width, height } = PROJECTILE_SIZE.glyph;
  const top = enemy.y - height / 2;
  const drop = hero.y + hero.height - (top + height);
  launch(projectiles, {
    kind: "glyph",
    x: centerX(enemy) - width / 2,
    y: top,
    vx: enemy.facing * throwSpeed(centerX(hero) - centerX(enemy), drop),
    vy: -SYNTAX_ERROR.throwLift,
    facing: enemy.facing,
    variant: enemy.shots % GLYPH_VARIANTS,
    token: 0,
  });
  enemy.shots += 1;
}

function act(enemy: Enemy, surroundings: Surroundings): void {
  const {
    room: { level },
    hero,
  } = surroundings;
  if (recoil(enemy)) {
    return;
  }
  if (enemy.state === "windup") {
    enemy.vx = 0;
    enemy.timer -= 1;
    if (enemy.timer <= 0) {
      throwGlyph(enemy, surroundings);
      enemy.state = "patrol";
      enemy.cooldown = SYNTAX_ERROR.cooldownFrames;
    }
    return;
  }
  if (enemy.cooldown === 0 && sees(enemy, hero)) {
    enemy.state = "windup";
    enemy.timer = SYNTAX_ERROR.windupFrames;
    enemy.vx = 0;
    faceToward(enemy, centerX(hero));
    return;
  }
  if (enemy.grounded && blockedAhead(enemy, level)) {
    enemy.facing = enemy.facing > 0 ? -1 : 1;
  }
  enemy.vx = enemy.facing * SYNTAX_ERROR.walkSpeed;
}

export function updateSyntaxError(
  enemy: Enemy,
  surroundings: Surroundings,
): void {
  enemy.cooldown = Math.max(enemy.cooldown - 1, 0);
  act(enemy, surroundings);
  fall(enemy, surroundings.room.level);
}
