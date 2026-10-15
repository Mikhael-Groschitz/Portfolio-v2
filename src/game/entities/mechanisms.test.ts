import { describe, expect, it } from "vitest";
import {
  BELT,
  CRON,
  DAMAGE,
  MOVEMENT,
  RAM,
  SECTOR,
  TEST_BEAM,
} from "../balance";
import type { Body } from "../core/collision";
import { createWorld, skipIntro, startIntro, step } from "../core/world";
import type { StageSlot } from "../levels/campaign";
import { TERRAIN, TILE, parseLevel, terrainAt } from "../levels/level";
import { NO_CONTROLS } from "./hero";
import { BOOSTS } from "./items";
import {
  beamState,
  burningBeam,
  carry,
  createMechanisms,
  isScheduled,
  resetMechanisms,
  scheduleLeft,
  updateMechanisms,
} from "./mechanisms";

const MAP = [
  "####################",
  "#   |      |       #",
  "#                  #",
  "#                  #",
  "#     -- __        #",
  "#                  #",
  "#S %%    >>>  <<<  #",
  "####################",
];

function level() {
  return parseLevel(MAP);
}

function body(x: number, feet: number): Body {
  return {
    x,
    y: feet - 28,
    width: 12,
    height: 28,
    vx: 0,
    vy: 0,
    grounded: true,
  };
}

function slotOf(map: readonly string[]): StageSlot {
  return {
    kind: "stage",
    stage: "lab",
    map,
    plaque: null,
    cast: [],
    music: "lab",
    boosts: BOOSTS,
  };
}

describe("stage mechanisms", () => {
  it("finds the bad sectors, scheduled platforms, belts and test beams of a map", () => {
    const mechanisms = createMechanisms(level());
    expect(mechanisms.sectors.map(({ column, row }) => [column, row])).toEqual([
      [3, 6],
      [4, 6],
    ]);
    expect(
      mechanisms.platforms.map(({ column, group, lead }) => [
        column,
        group,
        lead,
      ]),
    ).toEqual([
      [6, 0, true],
      [7, 0, false],
      [9, 1, true],
      [10, 1, false],
    ]);
    expect(mechanisms.belts.map((belt) => belt.direction)).toEqual([
      1, 1, 1, -1, -1, -1,
    ]);
    expect(mechanisms.beams.map(({ order, x }) => [order, x])).toEqual([
      [0, 4 * TILE + (TILE - TEST_BEAM.width) / 2],
      [1, 11 * TILE + (TILE - TEST_BEAM.width) / 2],
    ]);
    const [beam] = mechanisms.beams;
    expect(beam.y + beam.height).toBe(6 * TILE);
  });

  it("cracks a bad sector under the Admin, drops it and brings it back", () => {
    const map = level();
    const mechanisms = createMechanisms(map);
    const [sector] = mechanisms.sectors;
    const hero = body(sector.x + 2, sector.y);
    updateMechanisms(mechanisms, map, hero);
    expect(sector.state).toBe("cracking");
    for (let frame = 1; frame < SECTOR.crackFrames; frame++) {
      updateMechanisms(mechanisms, map, hero);
    }
    expect(sector.state).toBe("cracking");
    updateMechanisms(mechanisms, map, hero);
    expect(sector.state).toBe("fallen");
    expect(terrainAt(map, sector.column, sector.row)).toBe(TERRAIN.air);
    const away = body(15 * TILE, 7 * TILE);
    for (let frame = 0; frame < SECTOR.regrowFrames; frame++) {
      updateMechanisms(mechanisms, map, away);
    }
    expect(sector.state).toBe("solid");
    expect(terrainAt(map, sector.column, sector.row)).toBe(TERRAIN.sector);
  });

  it("waits for the Admin to move away before a sector grows back", () => {
    const map = level();
    const mechanisms = createMechanisms(map);
    const [sector] = mechanisms.sectors;
    sector.state = "fallen";
    sector.timer = 1;
    const inside = body(sector.x, sector.y + sector.height);
    updateMechanisms(mechanisms, map, inside);
    updateMechanisms(mechanisms, map, inside);
    expect(sector.state).toBe("fallen");
    updateMechanisms(mechanisms, map, body(15 * TILE, 7 * TILE));
    expect(sector.state).toBe("solid");
  });

  it("swaps the two groups of scheduled platforms, with a short overlap", () => {
    const map = level();
    const mechanisms = createMechanisms(map);
    const [first] = mechanisms.platforms;
    const second = mechanisms.platforms[2];
    const shown = (clock: number) => [
      isScheduled(first, clock),
      isScheduled(second, clock),
    ];
    expect(shown(0)).toEqual([true, true]);
    expect(shown(CRON.overlapFrames)).toEqual([true, false]);
    expect(shown(CRON.phaseFrames)).toEqual([true, true]);
    expect(shown(CRON.phaseFrames + CRON.overlapFrames)).toEqual([false, true]);
    expect(scheduleLeft(first, CRON.overlapFrames)).toBe(CRON.phaseFrames);
    mechanisms.clock = CRON.phaseFrames + CRON.overlapFrames - 1;
    updateMechanisms(mechanisms, map, body(0, 0));
    expect(terrainAt(map, first.column, first.row)).toBe(TERRAIN.air);
    expect(terrainAt(map, second.column, second.row)).toBe(TERRAIN.cronB);
  });

  it("warns before every test beam fires, one after the other", () => {
    const mechanisms = createMechanisms(level());
    const [first, second] = mechanisms.beams;
    const warn = TEST_BEAM.offFrames;
    const fire = warn + TEST_BEAM.warnFrames;
    expect(beamState(first, warn - 1)).toBe("off");
    expect(beamState(first, warn)).toBe("warn");
    expect(beamState(first, fire)).toBe("on");
    expect(beamState(second, fire)).toBe("warn");
    expect(beamState(second, fire + TEST_BEAM.staggerFrames)).toBe("on");
    const hero = body(first.x - 2, first.y + first.height);
    mechanisms.clock = warn;
    expect(burningBeam(mechanisms, hero)).toBeNull();
    mechanisms.clock = fire;
    expect(burningBeam(mechanisms, hero)).toBe(first);
  });

  it("carries whoever stands on a belt and stops them at walls", () => {
    const map = level();
    const mechanisms = createMechanisms(map);
    const rider = body(9 * TILE, 6 * TILE);
    carry(mechanisms, map, rider);
    expect(rider.x).toBe(9 * TILE + BELT.speed);
    const back = body(14 * TILE, 6 * TILE);
    carry(mechanisms, map, back);
    expect(back.x).toBe(14 * TILE - BELT.speed);
    const flying = { ...rider, grounded: false };
    const before = flying.x;
    carry(mechanisms, map, flying);
    expect(flying.x).toBe(before);
    expect(BELT.speed).toBeLessThan(MOVEMENT.walkSpeed);
  });

  it("puts every sector and platform back when the room starts over", () => {
    const map = level();
    const mechanisms = createMechanisms(map);
    const [sector] = mechanisms.sectors;
    sector.state = "fallen";
    sector.timer = 100;
    mechanisms.clock = 250;
    resetMechanisms(mechanisms, map);
    expect(sector).toMatchObject({ state: "solid", timer: 0 });
    expect(mechanisms.clock).toBe(0);
    expect(terrainAt(map, sector.column, sector.row)).toBe(TERRAIN.sector);
    expect(terrainAt(map, 6, 4)).toBe(TERRAIN.cronA);
    expect(terrainAt(map, 9, 4)).toBe(TERRAIN.cronB);
  });

  it("burns the Admin standing in a beam that fires", () => {
    const map = [
      "##########",
      "#   |    #",
      "#        #",
      "#S       #",
      "##########",
    ];
    const world = createWorld([{ slot: slotOf(map), level: parseLevel(map) }], {
      reducedMotion: false,
    });
    startIntro(world);
    skipIntro(world);
    const [beam] = world.room.mechanisms.beams;
    world.hero.x = beam.x;
    world.room.mechanisms.clock = TEST_BEAM.offFrames + TEST_BEAM.warnFrames;
    step(world, NO_CONTROLS);
    expect(world.hero.ram).toBe(RAM.start + DAMAGE.testBeam);
  });

  it("keeps each world's ground to itself", () => {
    const map = ["######", "#    #", "#S %E#", "######"];
    const planned = { slot: slotOf(map), level: parseLevel(map) };
    const first = createWorld([planned], { reducedMotion: false });
    const second = createWorld([planned], { reducedMotion: false });
    const [sector] = first.room.mechanisms.sectors;
    first.room.level.terrain[
      sector.row * first.room.level.columns + sector.column
    ] = TERRAIN.air;
    expect(terrainAt(second.room.level, sector.column, sector.row)).toBe(
      TERRAIN.sector,
    );
    expect(terrainAt(planned.level, sector.column, sector.row)).toBe(
      TERRAIN.sector,
    );
  });
});
