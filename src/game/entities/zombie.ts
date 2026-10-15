import { ZOMBIE } from "../balance";
import { TILE } from "../levels/level";
import {
  ENEMY_TRAITS,
  type Enemy,
  type Surroundings,
  type Zone,
  blockedAhead,
  centerX,
  faceToward,
  fall,
  recoil,
  resetEnemy,
} from "./enemy";
import type { Hero } from "./hero";

const FULL_HEIGHT = ENEMY_TRAITS.zombie.height;

export function inZone(zone: Zone, hero: Hero): boolean {
  const feet = hero.y + hero.height;
  return (
    centerX(hero) >= zone.left &&
    centerX(hero) <= zone.right &&
    Math.abs(feet - zone.floor) <= ZOMBIE.zoneHeight * TILE
  );
}

export function risenInZone(enemies: readonly Enemy[], zone: number): number {
  let count = 0;
  for (const other of enemies) {
    if (
      other.kind === "zombie" &&
      other.zone === zone &&
      other.alive &&
      other.state !== "buried"
    ) {
      count += 1;
    }
  }
  return count;
}

function wait(enemy: Enemy, { room, hero }: Surroundings): void {
  const zone = room.zones[enemy.zone];
  if (!zone || !inZone(zone, hero)) {
    return;
  }
  enemy.cooldown = Math.max(enemy.cooldown - 1, 0);
  if (
    enemy.cooldown === 0 &&
    risenInZone(room.enemies, enemy.zone) < ZOMBIE.aliveCap
  ) {
    const floor = enemy.y + enemy.height;
    enemy.state = "rise";
    enemy.timer = ZOMBIE.riseFrames;
    enemy.height = 1;
    enemy.y = floor - 1;
    faceToward(enemy, centerX(hero));
  }
}

function rise(enemy: Enemy): void {
  const floor = enemy.y + enemy.height;
  enemy.hurt = Math.max(enemy.hurt - 1, 0);
  enemy.timer -= 1;
  const progress = 1 - enemy.timer / ZOMBIE.riseFrames;
  enemy.height = Math.max(Math.round(FULL_HEIGHT * progress), 1);
  enemy.y = floor - enemy.height;
  if (enemy.timer <= 0) {
    enemy.state = "shamble";
    enemy.timer = ZOMBIE.turnFrames;
  }
}

function shamble(enemy: Enemy, { room, hero }: Surroundings): void {
  enemy.timer -= 1;
  if (enemy.timer <= 0) {
    faceToward(enemy, centerX(hero));
    enemy.timer = ZOMBIE.turnFrames;
  }
  enemy.vx =
    enemy.grounded && blockedAhead(enemy, room.level)
      ? 0
      : enemy.facing * ZOMBIE.walkSpeed;
}

export function pasteZombie(enemy: Enemy, health: number): void {
  resetEnemy(enemy);
  enemy.alive = true;
  enemy.state = "shamble";
  enemy.health = health;
  enemy.timer = ZOMBIE.turnFrames;
}

export function updateZombie(enemy: Enemy, surroundings: Surroundings): void {
  switch (enemy.state) {
    case "buried":
      wait(enemy, surroundings);
      return;
    case "rise":
      rise(enemy);
      return;
    default:
      if (!recoil(enemy)) {
        shamble(enemy, surroundings);
      }
      fall(enemy, surroundings.room.level);
  }
}
