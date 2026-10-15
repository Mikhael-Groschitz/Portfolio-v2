import { describe, expect, it } from "vitest";
import { DROP_KNIGHT, ENEMY_KNOCKBACK } from "../balance";
import { TILE, parseLevel } from "../levels/level";
import { VOLLEYS, updateDropKnight, volleyOf } from "./drop-knight";
import {
  type Enemy,
  type Surroundings,
  centerX,
  createEnemies,
  createZones,
  damageEnemy,
} from "./enemy";
import { createHero } from "./hero";
import {
  type Projectile,
  countFlying,
  createProjectiles,
  moveProjectile,
} from "./projectiles";

const HALL = [
  "########################################",
  "#                                      #",
  "#                                      #",
  "#                                      #",
  "#S                         k           #",
  "########################################",
];

function setup(map: readonly string[] = HALL, heroColumn = 1) {
  const level = parseLevel(map);
  const enemies = createEnemies(level);
  const surroundings: Surroundings = {
    room: { level, enemies, zones: createZones(level) },
    hero: createHero({ column: heroColumn, row: map.length - 2 }),
    projectiles: createProjectiles(),
  };
  const [knight] = enemies;
  return { level, knight, surroundings };
}

function run(knight: Enemy, surroundings: Surroundings, frames: number) {
  for (let frame = 0; frame < frames; frame++) {
    updateDropKnight(knight, surroundings);
  }
}

function axes(projectiles: readonly Projectile[]): Projectile[] {
  return projectiles.filter(
    (projectile) => projectile.active && projectile.kind === "dropAxe",
  );
}

function settle(knight: Enemy, surroundings: Surroundings) {
  run(knight, surroundings, 30);
}

describe("DROP Knight", () => {
  it("patrols its floor while the Admin is out of sight", () => {
    const { knight, surroundings } = setup();
    settle(knight, surroundings);
    const { x } = knight;
    run(knight, surroundings, 60);
    expect(knight.state).toBe("march");
    expect(Math.abs(knight.x - x)).toBeCloseTo(60 * DROP_KNIGHT.walkSpeed, 0);
  });

  it("walks up to throwing range, stops and raises the axe for a while", () => {
    const { knight, surroundings } = setup(HALL, 15);
    settle(knight, surroundings);
    knight.cooldown = 10_000;
    run(knight, surroundings, 400);
    const gap = Math.abs(centerX(surroundings.hero) - centerX(knight));
    expect(gap).toBeLessThanOrEqual(DROP_KNIGHT.keepAway + 1);
    expect(knight.vx).toBe(0);
    expect(knight.facing).toBe(-1);
    knight.cooldown = 1;
    run(knight, surroundings, 1);
    expect(knight.state).toBe("windup");
    run(knight, surroundings, DROP_KNIGHT.windupFrames - 1);
    expect(knight.state).toBe("windup");
    expect(axes(surroundings.projectiles)).toHaveLength(0);
  });

  it("throws one low axe, then a low and a high one", () => {
    const { knight, surroundings } = setup(HALL, 20);
    settle(knight, surroundings);
    knight.state = "windup";
    knight.timer = 1;
    run(knight, surroundings, 1);
    expect(knight.state).toBe("throw");
    const first = axes(surroundings.projectiles);
    expect(first).toHaveLength(1);
    expect(first[0].vy).toBe(-DROP_KNIGHT.lowAxe.lift);
    expect(Math.sign(first[0].vx)).toBe(knight.facing);
    for (const axe of first) {
      axe.active = false;
    }
    run(knight, surroundings, DROP_KNIGHT.throwFrames);
    expect(knight.state).toBe("march");
    expect(knight.cooldown).toBe(DROP_KNIGHT.cooldownFrames);
    expect(volleyOf(knight)).toBe(VOLLEYS[1]);
    knight.state = "windup";
    knight.timer = 1;
    run(knight, surroundings, 1);
    const second = axes(surroundings.projectiles).map((axe) => axe.vy);
    expect(second.sort((a, b) => a - b)).toEqual([
      -DROP_KNIGHT.highAxe.lift,
      -DROP_KNIGHT.lowAxe.lift,
    ]);
  });

  it("sends its axes up in an arc that breaks on the floor", () => {
    const { knight, surroundings, level } = setup(HALL, 20);
    settle(knight, surroundings);
    knight.state = "windup";
    knight.timer = 1;
    run(knight, surroundings, 1);
    const [axe] = axes(surroundings.projectiles);
    const start = axe.y;
    let peak = axe.y;
    while (axe.active) {
      moveProjectile(axe, level, surroundings.hero);
      peak = Math.min(peak, axe.y);
    }
    expect(peak).toBeLessThan(start - TILE);
    expect(axe.y + axe.height).toBeGreaterThan(5 * TILE - 2);
    expect(countFlying(surroundings.projectiles, "dropAxe")).toBe(0);
  });

  it("barely moves back when hit, inside its heavy armor", () => {
    const { knight, surroundings } = setup();
    settle(knight, surroundings);
    damageEnemy(knight, 1, 0);
    run(knight, surroundings, 1);
    expect(Math.abs(knight.vx)).toBeLessThan(ENEMY_KNOCKBACK);
    expect(Math.abs(knight.vx)).toBeCloseTo(
      ENEMY_KNOCKBACK * DROP_KNIGHT.knockback,
      1,
    );
    expect(knight.health).toBe(DROP_KNIGHT.health - 1);
  });
});
