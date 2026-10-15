import { describe, expect, it } from "vitest";
import { ZOMBIE } from "../balance";
import { TILE, parseLevel } from "../levels/level";
import {
  ENEMY_TRAITS,
  type Enemy,
  type Surroundings,
  createEnemies,
  createZones,
  damageEnemy,
  isTangible,
  resetEnemy,
  revive,
} from "./enemy";
import { createHero } from "./hero";
import { createProjectiles } from "./projectiles";
import { inZone, risenInZone, updateZombie } from "./zombie";

const FULL_HEIGHT = ENEMY_TRAITS.zombie.height;

function setup(map: readonly string[], heroColumn = 1) {
  const level = parseLevel(map);
  const enemies = createEnemies(level);
  const surroundings: Surroundings = {
    room: { level, enemies, zones: createZones(level) },
    hero: createHero({ column: heroColumn, row: map.length - 2 }),
    projectiles: createProjectiles(),
  };
  return { level, enemies, surroundings };
}

function run(
  enemies: readonly Enemy[],
  surroundings: Surroundings,
  frames: number,
) {
  for (let frame = 0; frame < frames; frame++) {
    for (const enemy of enemies) {
      if (enemy.alive) {
        updateZombie(enemy, surroundings);
      }
    }
  }
}

const PAIR = [
  "##############################",
  "#                            #",
  "#                            #",
  "#S           z z             #",
  "##############################",
];

describe("Zombie Process", () => {
  it("waits underground, out of reach, until the Admin walks into its zone", () => {
    const { enemies, surroundings } = setup(PAIR);
    run(enemies, surroundings, 120);
    for (const zombie of enemies) {
      expect(zombie.state).toBe("buried");
      expect(isTangible(zombie)).toBe(false);
    }
  });

  it("groups nearby graves in one zone and splits far or higher ones", () => {
    const level = parseLevel([
      "########################################",
      "#                                      #",
      "#   z z                                #",
      "#  =====                               #",
      "#S        z  z   z           z         #",
      "########################################",
    ]);
    const zones = createZones(level);
    expect(zones).toHaveLength(3);
    const zombies = createEnemies(level);
    expect(zombies.map(({ zone, order }) => [zone, order])).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
    ]);
    expect(zones[1]).toEqual({
      left: (10 - ZOMBIE.zoneMargin) * TILE,
      right: (17 + 1 + ZOMBIE.zoneMargin) * TILE,
      floor: 5 * TILE,
    });
  });

  it("rises out of the floor one after another once the Admin comes close", () => {
    const { enemies, surroundings } = setup(PAIR);
    const [first, second] = enemies;
    const floor = first.y + first.height;
    surroundings.hero.x = 10 * TILE;
    expect(inZone(surroundings.room.zones[0], surroundings.hero)).toBe(true);
    run(enemies, surroundings, 1);
    expect(first.state).toBe("rise");
    expect(first.height).toBeLessThan(FULL_HEIGHT);
    expect(first.y + first.height).toBe(floor);
    expect(isTangible(first)).toBe(true);
    expect(second.state).toBe("buried");
    run(enemies, surroundings, ZOMBIE.riseStagger);
    expect(second.state).toBe("rise");
    run(enemies, surroundings, ZOMBIE.riseFrames);
    expect(first.state).toBe("shamble");
    expect(first.height).toBe(FULL_HEIGHT);
    expect(first.y + first.height).toBe(floor);
  });

  it("drags itself slowly toward the Admin and turns around only now and then", () => {
    const { enemies, surroundings } = setup(PAIR);
    const [zombie] = enemies;
    surroundings.hero.x = 10 * TILE;
    run([zombie], surroundings, ZOMBIE.riseFrames + 2);
    expect(zombie.facing).toBe(-1);
    expect(zombie.vx).toBeCloseTo(-ZOMBIE.walkSpeed);
    surroundings.hero.x = 26 * TILE;
    run([zombie], surroundings, ZOMBIE.turnFrames - 5);
    expect(zombie.facing).toBe(-1);
    run([zombie], surroundings, 10);
    expect(zombie.facing).toBe(1);
  });

  it("stops at the edge of its floor instead of falling", () => {
    const { enemies, surroundings } = setup([
      "##############################",
      "#                            #",
      "#S   z                       #",
      "#######        ###############",
      "#                            #",
      "##############################",
    ]);
    const [zombie] = enemies;
    surroundings.hero.x = 3 * TILE;
    run([zombie], surroundings, ZOMBIE.riseFrames + 2);
    surroundings.hero.x = 12 * TILE;
    surroundings.hero.y = 4 * TILE - surroundings.hero.height;
    run([zombie], surroundings, 400);
    expect(zombie.y + zombie.height).toBe(3 * TILE);
    expect(zombie.x + zombie.width).toBeLessThanOrEqual(7 * TILE);
  });

  it("keeps at most four up in a zone and lets the next one rise when one falls", () => {
    const { enemies, surroundings } = setup([
      "##############################",
      "#                            #",
      "#S       z z z z z z         #",
      "##############################",
    ]);
    surroundings.hero.x = 7 * TILE;
    surroundings.hero.invulnerable = 100_000;
    run(enemies, surroundings, ZOMBIE.riseStagger * enemies.length);
    expect(risenInZone(enemies, 0)).toBe(ZOMBIE.aliveCap);
    const fallen = enemies.find((zombie) => zombie.state === "shamble");
    if (!fallen) {
      throw new Error("A zombie should be up");
    }
    damageEnemy(fallen, ZOMBIE.health, 0);
    expect(risenInZone(enemies, 0)).toBe(ZOMBIE.aliveCap - 1);
    run(enemies, surroundings, 1);
    expect(risenInZone(enemies, 0)).toBe(ZOMBIE.aliveCap);
  });

  it("raises a second zombie from each grave once the first falls, then stays empty", () => {
    const { enemies, surroundings } = setup(PAIR);
    const [zombie] = enemies;
    surroundings.hero.x = 10 * TILE;
    surroundings.hero.invulnerable = 100_000;
    run([zombie], surroundings, ZOMBIE.riseFrames + 2);
    expect(zombie.spawns).toBe(ZOMBIE.perGrave);
    damageEnemy(zombie, ZOMBIE.health, 0);
    expect(revive(zombie)).toBe(false);
    zombie.dying = 0;
    expect(revive(zombie)).toBe(true);
    expect(zombie).toMatchObject({
      alive: true,
      state: "buried",
      spawns: ZOMBIE.perGrave - 1,
      cooldown: ZOMBIE.regrowFrames,
      health: ZOMBIE.health,
    });
    run([zombie], surroundings, ZOMBIE.regrowFrames + ZOMBIE.riseFrames + 2);
    expect(zombie.state).toBe("shamble");
    damageEnemy(zombie, ZOMBIE.health, 0);
    zombie.dying = 0;
    expect(revive(zombie)).toBe(false);
    expect(zombie.alive).toBe(false);
  });

  it("goes back underground when the room resets", () => {
    const { enemies, surroundings } = setup(PAIR);
    const [, second] = enemies;
    surroundings.hero.x = 10 * TILE;
    run(enemies, surroundings, ZOMBIE.riseStagger + ZOMBIE.riseFrames);
    resetEnemy(second);
    expect(second).toMatchObject({
      state: "buried",
      height: FULL_HEIGHT,
      cooldown: ZOMBIE.riseStagger,
      health: ZOMBIE.health,
    });
  });
});
