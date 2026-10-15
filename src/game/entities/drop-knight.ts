import { DROP_KNIGHT } from "../balance";
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
import { PROJECTILE_SIZE, type Projectile, launch } from "./projectiles";

const VERTICAL_SIGHT = 56;
const KEEP_AWAY_SLACK = 12;
const HAND = { x: 4, y: 6 } as const;

export const VOLLEYS = [
  [DROP_KNIGHT.lowAxe],
  [DROP_KNIGHT.lowAxe, DROP_KNIGHT.highAxe],
] as const;

function sees(enemy: Enemy, hero: Hero): boolean {
  return (
    Math.abs(centerX(hero) - centerX(enemy)) < DROP_KNIGHT.sight &&
    Math.abs(hero.y + hero.height - (enemy.y + enemy.height)) < VERTICAL_SIGHT
  );
}

export function volleyOf(enemy: Enemy) {
  return VOLLEYS[enemy.shots % VOLLEYS.length];
}

function throwAxes(enemy: Enemy, projectiles: readonly Projectile[]): void {
  const { width, height } = PROJECTILE_SIZE.dropAxe;
  const x =
    enemy.facing > 0
      ? enemy.x + enemy.width + HAND.x - width / 2
      : enemy.x - HAND.x - width / 2;
  volleyOf(enemy).forEach((axe, variant) => {
    launch(projectiles, {
      kind: "dropAxe",
      x,
      y: enemy.y + HAND.y - height / 2,
      vx: enemy.facing * axe.speed,
      vy: -axe.lift,
      facing: enemy.facing,
      variant,
      token: 0,
    });
  });
  enemy.shots += 1;
}

function march(enemy: Enemy, { room, hero }: Surroundings): void {
  if (!sees(enemy, hero)) {
    if (enemy.grounded && blockedAhead(enemy, room.level)) {
      enemy.facing = enemy.facing > 0 ? -1 : 1;
    }
    enemy.vx = enemy.facing * DROP_KNIGHT.walkSpeed;
    return;
  }
  faceToward(enemy, centerX(hero));
  const gap = Math.abs(centerX(hero) - centerX(enemy));
  if (enemy.cooldown === 0 && gap <= DROP_KNIGHT.keepAway + KEEP_AWAY_SLACK) {
    enemy.state = "windup";
    enemy.timer = DROP_KNIGHT.windupFrames;
    enemy.vx = 0;
    return;
  }
  const blocked = enemy.grounded && blockedAhead(enemy, room.level);
  enemy.vx =
    gap > DROP_KNIGHT.keepAway && !blocked
      ? enemy.facing * DROP_KNIGHT.walkSpeed
      : 0;
}

function act(enemy: Enemy, surroundings: Surroundings): void {
  switch (enemy.state) {
    case "windup":
      enemy.vx = 0;
      enemy.timer -= 1;
      if (enemy.timer <= 0) {
        throwAxes(enemy, surroundings.projectiles);
        enemy.state = "throw";
        enemy.timer = DROP_KNIGHT.throwFrames;
      }
      return;
    case "throw":
      enemy.vx = 0;
      enemy.timer -= 1;
      if (enemy.timer <= 0) {
        enemy.state = "march";
        enemy.cooldown = DROP_KNIGHT.cooldownFrames;
      }
      return;
    default:
      march(enemy, surroundings);
  }
}

export function updateDropKnight(
  enemy: Enemy,
  surroundings: Surroundings,
): void {
  enemy.cooldown = Math.max(enemy.cooldown - 1, 0);
  if (!recoil(enemy)) {
    act(enemy, surroundings);
  }
  fall(enemy, surroundings.room.level);
}
