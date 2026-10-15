import { describe, expect, it } from "vitest";
import {
  BACKUP,
  CACHE,
  DROP_KNIGHT,
  FIREWALL,
  GC,
  INDEX,
  QUERY_ENERGY,
  TAPE,
  ZOMBIE,
} from "../balance";
import { TILE, parseLevel } from "../levels/level";
import { createHero } from "./hero";
import { ENEMY_TRAITS } from "./enemy";
import {
  BOOSTS,
  applyDrop,
  createContainers,
  createDrops,
  createPickups,
  createRelics,
  dropFor,
  lootFor,
  spawnDrop,
  spawnReward,
  updateDrops,
} from "./items";

const ROOM = parseLevel([
  "####################",
  "#    f    u   j  t #",
  "#                  #",
  "#                  #",
  "#S                E#",
  "####################",
]);

describe("items", () => {
  it("floats disks, pen drives and relics in the middle of their cells", () => {
    const containers = createContainers(ROOM);
    expect(containers.map(({ kind }) => kind)).toEqual(["disk", "pen"]);
    expect(containers[0]).toMatchObject({
      x: 5 * TILE + 1,
      y: TILE + 1,
      width: 14,
      height: 14,
      broken: false,
    });
    expect(createRelics(ROOM).map(({ kind }) => kind)).toEqual([
      "join",
      "truncate",
    ]);
  });

  it("drops energy most of the time and the GC item sometimes", () => {
    expect(dropFor("disk", GC.diskChance - 0.01)).toBe("gc");
    expect(dropFor("disk", GC.diskChance + 0.01)).toBe("energy");
    expect(dropFor("pen", GC.penChance - 0.01)).toBe("gc");
    expect(dropFor("pen", GC.penChance + 0.01)).toBe("bigEnergy");
  });

  it("lays tapes, the DROP relic and loose items where the map puts them", () => {
    const level = parseLevel([
      "####################",
      "#  r   d           #",
      "#                  #",
      "#S  w i c b m     E#",
      "####################",
    ]);
    expect(createContainers(level).map(({ kind }) => kind)).toEqual(["tape"]);
    expect(createRelics(level).map(({ kind }) => kind)).toEqual(["drop"]);
    const pickups = createPickups(level);
    expect(pickups.map(({ kind }) => kind)).toEqual([
      "firewall",
      "index",
      "cache",
      "backup",
      "readme",
    ]);
    for (const pickup of pickups) {
      expect(pickup.y + pickup.height).toBe(4 * TILE);
      expect(pickup.taken).toBe(false);
    }
  });

  it("fills a tape with a boost the stage offers, or with energy", () => {
    const half = TAPE.boostChance / 2;
    expect(dropFor("tape", 0, BOOSTS)).toBe("firewall");
    expect(dropFor("tape", half, BOOSTS)).toBe("index");
    expect(dropFor("tape", TAPE.boostChance - 0.001, BOOSTS)).toBe("cache");
    expect(dropFor("tape", half, ["firewall"])).toBe("firewall");
    expect(dropFor("tape", half, [])).toBe("bigEnergy");
    expect(dropFor("tape", TAPE.boostChance + 0.01, BOOSTS)).toBe("bigEnergy");
  });

  it("splits enemy loot into backup, boost, energy and nothing", () => {
    const knight = ENEMY_TRAITS.dropKnight.loot;
    expect(lootFor(knight, DROP_KNIGHT.backupChance - 0.001, BOOSTS)).toBe(
      "backup",
    );
    expect(lootFor(knight, DROP_KNIGHT.backupChance + 0.001, BOOSTS)).toBe(
      "firewall",
    );
    expect(
      lootFor(
        knight,
        DROP_KNIGHT.backupChance + DROP_KNIGHT.boostChance - 0.001,
        BOOSTS,
      ),
    ).toBe("cache");
    expect(lootFor(knight, DROP_KNIGHT.backupChance + 0.001, [])).toBe(
      "energy",
    );
    const edge =
      DROP_KNIGHT.backupChance +
      DROP_KNIGHT.boostChance +
      DROP_KNIGHT.energyChance;
    expect(lootFor(knight, edge - 0.001, BOOSTS)).toBe("energy");
    expect(lootFor(knight, edge + 0.001, BOOSTS)).toBeNull();
    const zombie = ENEMY_TRAITS.zombie.loot;
    expect(lootFor(zombie, ZOMBIE.energyChance - 0.001)).toBe("energy");
    expect(lootFor(zombie, ZOMBIE.energyChance + 0.001)).toBeNull();
    expect(lootFor(ENEMY_TRAITS.syntaxError.loot, 0)).toBe("energy");
  });

  it("pops drops up and lets them rest on the floor", () => {
    const drops = createDrops();
    spawnDrop(drops, "energy", 5 * TILE, 2 * TILE);
    const [drop] = drops;
    expect(drop).toMatchObject({ active: true, kind: "energy" });
    updateDrops(drops, ROOM);
    expect(drop.y).toBeLessThan(2 * TILE - drop.height / 2);
    for (let frame = 0; frame < 60; frame++) {
      updateDrops(drops, ROOM);
    }
    expect(drop).toMatchObject({ grounded: true, y: 5 * TILE - drop.height });
  });

  it("always finds room for a boss reward, giving up a loose energy if it must", () => {
    const drops = createDrops();
    for (let slot = 0; slot < drops.length; slot++) {
      spawnDrop(drops, "energy", 5 * TILE, 2 * TILE);
    }
    spawnDrop(drops, "readme", 5 * TILE, 2 * TILE);
    expect(drops.some((drop) => drop.kind === "readme")).toBe(false);
    spawnReward(drops, "readme", 5 * TILE, 2 * TILE);
    expect(drops.filter((drop) => drop.active)).toHaveLength(drops.length);
    expect(
      drops.filter((drop) => drop.active && drop.kind === "readme"),
    ).toHaveLength(1);
  });

  it("refills Query Energy up to the cap and frees RAM down to zero", () => {
    const hero = createHero(ROOM.start);
    hero.energy = QUERY_ENERGY.max - 1;
    applyDrop(hero, "energy");
    expect(hero.energy).toBe(QUERY_ENERGY.max);
    hero.energy = 0;
    applyDrop(hero, "bigEnergy");
    expect(hero.energy).toBe(QUERY_ENERGY.large);
    hero.ram = 60;
    applyDrop(hero, "gc");
    expect(hero.ram).toBe(60 - GC.relief);
    hero.ram = 10;
    applyDrop(hero, "gc");
    expect(hero.ram).toBe(0);
    hero.ram = 80;
    applyDrop(hero, "backup");
    expect(hero.ram).toBe(80 - BACKUP.relief);
    applyDrop(hero, "backup");
    expect(hero.ram).toBe(0);
  });

  it("arms boosts without stacking them and keeps the README for good", () => {
    const hero = createHero(ROOM.start);
    applyDrop(hero, "firewall");
    applyDrop(hero, "firewall");
    expect(hero.firewall).toBe(FIREWALL.charges);
    applyDrop(hero, "index");
    hero.index = 10;
    applyDrop(hero, "index");
    expect(hero.index).toBe(INDEX.frames);
    applyDrop(hero, "cache");
    expect(hero.cache).toBe(CACHE.frames);
    expect(hero.readme).toBe(false);
    applyDrop(hero, "readme");
    expect(hero.readme).toBe(true);
  });
});
