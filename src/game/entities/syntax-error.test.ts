import { describe, expect, it } from "vitest";
import { SYNTAX_ERROR } from "../balance";
import { TILE, parseLevel } from "../levels/level";
import {
  type Enemy,
  type Surroundings,
  createEnemies,
  createZones,
} from "./enemy";
import { createHero } from "./hero";
import { createProjectiles, moveProjectile } from "./projectiles";
import { throwSpeed, updateSyntaxError } from "./syntax-error";

function setup(map: readonly string[], heroColumn: number) {
  const level = parseLevel(map);
  const enemies = createEnemies(level);
  const surroundings: Surroundings = {
    room: { level, enemies, zones: createZones(level) },
    hero: createHero({ column: heroColumn, row: map.length - 2 }),
    projectiles: createProjectiles(),
  };
  const [enemy] = enemies;
  return { surroundings, enemy };
}

function run(enemy: Enemy, surroundings: Surroundings, frames: number) {
  for (let frame = 0; frame < frames; frame++) {
    updateSyntaxError(enemy, surroundings);
  }
}

describe("Syntax Error", () => {
  it("patrols its platform and turns around at the edges", () => {
    const { surroundings, enemy } = setup(
      [
        "##############################",
        "#                            #",
        "#         x                  #",
        "#      ########              #",
        "#                            #",
        "#S                          E#",
        "##############################",
      ],
      27,
    );
    const turns = new Set<number>();
    let lowest = Infinity;
    let highest = -Infinity;
    for (let frame = 0; frame < 600; frame++) {
      run(enemy, surroundings, 1);
      turns.add(enemy.facing);
      lowest = Math.min(lowest, enemy.x);
      highest = Math.max(highest, enemy.x + enemy.width);
    }
    expect(turns).toEqual(new Set([1, -1]));
    expect(lowest).toBeGreaterThanOrEqual(7 * TILE - 1);
    expect(highest).toBeLessThanOrEqual(15 * TILE + 1);
    expect(enemy.y + enemy.height).toBe(3 * TILE);
  });

  it("stops, winds up and throws a glyph at a hero in sight", () => {
    const { surroundings, enemy } = setup(
      [
        "##############################",
        "#                            #",
        "#                            #",
        "#S           x              E#",
        "##############################",
      ],
      6,
    );
    run(enemy, surroundings, 1);
    expect(enemy.state).toBe("windup");
    expect(enemy.facing).toBe(-1);
    run(enemy, surroundings, SYNTAX_ERROR.windupFrames);
    const glyph = surroundings.projectiles.find((shot) => shot.active);
    expect(glyph).toMatchObject({ kind: "glyph", facing: -1 });
    expect(glyph?.vx).toBeLessThan(0);
    expect(glyph?.vy).toBeLessThan(0);
    expect(enemy.state).toBe("patrol");
    expect(enemy.cooldown).toBe(SYNTAX_ERROR.cooldownFrames);
  });

  it("aims the arc to land close to the hero", () => {
    const { surroundings, enemy } = setup(
      [
        "##############################",
        "#                            #",
        "#                            #",
        "#                            #",
        "#S           x              E#",
        "##############################",
      ],
      7,
    );
    run(enemy, surroundings, SYNTAX_ERROR.windupFrames + 2);
    const glyph = surroundings.projectiles.find((shot) => shot.active);
    const { hero } = surroundings;
    while (glyph?.active && glyph.y < hero.y + hero.height) {
      moveProjectile(glyph, surroundings.room.level, hero);
    }
    const landing = (glyph?.x ?? 0) + (glyph?.width ?? 0) / 2;
    expect(Math.abs(landing - (hero.x + hero.width / 2))).toBeLessThan(TILE);
  });

  it("throws softly at close range and never past its strongest arm", () => {
    expect(throwSpeed(0, 0)).toBe(SYNTAX_ERROR.minThrowSpeed);
    expect(throwSpeed(10_000, 0)).toBe(SYNTAX_ERROR.maxThrowSpeed);
    expect(throwSpeed(60, 30)).toBeLessThan(throwSpeed(60, 0));
  });

  it("ignores a hero who is far away", () => {
    const { surroundings, enemy } = setup(
      [
        "########################################",
        "#                                      #",
        "#S                                 x  E#",
        "########################################",
      ],
      1,
    );
    run(enemy, surroundings, 300);
    expect(surroundings.projectiles.some((shot) => shot.active)).toBe(false);
  });
});
