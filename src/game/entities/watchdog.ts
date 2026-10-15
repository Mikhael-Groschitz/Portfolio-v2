import { WATCHDOG } from "../balance";
import { TILE } from "../levels/level";
import { type Enemy, type Surroundings, centerX, recoil } from "./enemy";
import { HERO_HEIGHT, type Hero } from "./hero";
import { PROJECTILE_SIZE, type Projectile, launch } from "./projectiles";

const BEAM_VARIANTS = 2;

const HEAD_LINE = 5;
const KEEP_AWAY_SLACK = 8;
const ALIGNED = 2;

export function headLine(hero: Hero): number {
  return hero.y + hero.height - HERO_HEIGHT + HEAD_LINE;
}

function fireBeam(enemy: Enemy, projectiles: readonly Projectile[]): void {
  const { width, height } = PROJECTILE_SIZE.beam;
  launch(projectiles, {
    kind: "beam",
    x: enemy.facing > 0 ? enemy.x + enemy.width : enemy.x - width,
    y: enemy.y + enemy.height / 2 - height / 2,
    vx: enemy.facing * WATCHDOG.beamSpeed,
    vy: 0,
    facing: enemy.facing,
    variant: enemy.shots % BEAM_VARIANTS,
    token: 0,
  });
  enemy.shots += 1;
}

function drift(enemy: Enemy, { hero }: Surroundings): void {
  const distance = centerX(hero) - centerX(enemy);
  enemy.facing = distance >= 0 ? 1 : -1;
  const gap = Math.abs(distance);
  if (gap > WATCHDOG.keepAway + KEEP_AWAY_SLACK) {
    enemy.x += enemy.facing * WATCHDOG.driftSpeed;
  } else if (gap < WATCHDOG.keepAway - KEEP_AWAY_SLACK) {
    enemy.x -= enemy.facing * WATCHDOG.driftSpeed;
  }
  const target = Math.max(headLine(hero) - enemy.height / 2, TILE);
  enemy.baseY += Math.min(
    Math.max(target - enemy.baseY, -WATCHDOG.climbSpeed),
    WATCHDOG.climbSpeed,
  );
  enemy.phase += 1;
  enemy.y =
    enemy.baseY +
    Math.sin((enemy.phase * 2 * Math.PI) / WATCHDOG.bobFrames) *
      WATCHDOG.bobHeight;
  if (
    enemy.cooldown === 0 &&
    gap < WATCHDOG.sight &&
    Math.abs(target - enemy.baseY) < ALIGNED
  ) {
    enemy.state = "charge";
    enemy.timer = WATCHDOG.chargeFrames;
    enemy.baseY = target;
    enemy.y = target;
  }
}

export function updateWatchdog(enemy: Enemy, surroundings: Surroundings): void {
  enemy.cooldown = Math.max(enemy.cooldown - 1, 0);
  if (recoil(enemy)) {
    enemy.x += enemy.vx;
    return;
  }
  if (enemy.state === "charge") {
    enemy.timer -= 1;
    if (enemy.timer <= 0) {
      fireBeam(enemy, surroundings.projectiles);
      enemy.state = "drift";
      enemy.cooldown = WATCHDOG.cooldownFrames;
    }
    return;
  }
  drift(enemy, surroundings);
}
