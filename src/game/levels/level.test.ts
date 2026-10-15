import { describe, expect, it } from "vitest";
import { type Box, overlaps } from "../core/collision";
import {
  type Controls,
  type Hero,
  NO_CONTROLS,
  createHero,
  updateHero,
} from "../entities/hero";
import {
  type Cell,
  type Level,
  TERRAIN,
  TILE,
  isFloor,
  isIndoors,
  isSolid,
  joinSegments,
  parseLevel,
  terrainAt,
} from "./level";
import { parseCampaign } from "./campaign";
import { HALL_OF_RACKS, LOG_CORRIDOR } from "./rooms";

const levels = parseCampaign().map((room) => room.level);
const ROOM = {
  entrance: 0,
  catacombs: 1,
  vibe: 2,
  tapes: 3,
  lab: 4,
  collector: 5,
  staircase: 6,
  cron: 7,
  throne: 8,
} as const;

describe("parseLevel", () => {
  it("reads terrain and markers from strings", () => {
    const level = parseLevel(["S =E", "#R##"]);
    expect(level).toMatchObject({
      columns: 4,
      rows: 2,
      width: 64,
      height: 32,
      start: { column: 0, row: 0 },
      exit: { column: 3, row: 0 },
      gate: null,
      plaque: null,
    });
    expect(terrainAt(level, 2, 0)).toBe(TERRAIN.ledge);
    expect(terrainAt(level, 1, 1)).toBe(TERRAIN.rack);
    expect(terrainAt(level, 0, 0)).toBe(TERRAIN.air);
    expect(isFloor(level, 2, 0)).toBe(true);
    expect(isSolid(level, 2, 0)).toBe(false);
  });

  it("collects every kind of place", () => {
    const level = parseLevel([
      "SxozkfurjtdwicbmCWGLAVBTsE",
      "##########################",
    ]);
    for (const place of [
      "syntaxError",
      "watchdog",
      "zombie",
      "dropKnight",
      "disk",
      "pen",
      "tape",
      "join",
      "truncate",
      "drop",
      "firewall",
      "index",
      "cache",
      "backup",
      "readme",
      "checkpoint",
      "window",
      "gargoyle",
      "log",
      "arch",
      "vibe",
      "collector",
      "throne",
      "summon",
    ] as const) {
      expect(level.places[place], place).toHaveLength(1);
    }
  });

  it("keeps the plaque that goes over the exit door", () => {
    expect(parseLevel(["S E", "###"], "GC").plaque).toBe("GC");
  });

  it.each([
    [[], "empty"],
    [["S  E", "###"], "Row 1 has 3 columns instead of 4"],
    [["   E", "####"], 'exactly one "S"'],
    [["S EE", "####"], 'at most one "E"'],
    [["SDDE", "####"], 'at most one "D"'],
    [["SVVE", "####"], 'at most one "V"'],
    [["SBBE", "####"], 'at most one "B"'],
    [["STTE", "####"], 'at most one "T"'],
    [["S ?E", "####"], 'Unknown symbol "?"'],
  ])("rejects broken maps (%j)", (map, message) => {
    expect(() => parseLevel(map)).toThrow(message);
  });

  it("lets a room end without an exit", () => {
    expect(parseLevel(["S  T", "####"]).exit).toBeNull();
  });

  it("treats the sides as walls and the sky and the depths as air", () => {
    const level = parseLevel(["S E", "###"]);
    expect(isSolid(level, -1, 0)).toBe(true);
    expect(isSolid(level, 3, 0)).toBe(true);
    expect(terrainAt(level, 1, -1)).toBe(TERRAIN.air);
    expect(terrainAt(level, 1, 2)).toBe(TERRAIN.air);
  });

  it("joins segments of the same height side by side", () => {
    expect(joinSegments(["ab", "cd"], ["e", "f"])).toEqual(["abe", "cdf"]);
    expect(() => joinSegments(["a", "b"], ["c"])).toThrow("Segments need 2");
  });
});

function exitOf(level: Level): Cell {
  if (!level.exit) {
    throw new Error("This room has no exit");
  }
  return level.exit;
}

describe("entrance", () => {
  const level = levels[ROOM.entrance];
  const { places } = level;

  it("keeps every row of every segment at the same width", () => {
    for (const segment of [HALL_OF_RACKS, LOG_CORRIDOR]) {
      expect(segment).toHaveLength(level.rows);
      expect(new Set(segment.map((row) => row.length)).size).toBe(1);
    }
    expect(level.columns).toBe(
      HALL_OF_RACKS[0].length + LOG_CORRIDOR[0].length,
    );
  });

  it("starts outside the gate and ends at the BKP door inside the castle", () => {
    const exit = exitOf(level);
    expect(level.gate).not.toBeNull();
    expect(level.plaque).toBe("BKP");
    expect(isIndoors(level, level.start.column)).toBe(false);
    expect(isIndoors(level, exit.column)).toBe(true);
    expect(exit.column).toBeGreaterThan(HALL_OF_RACKS[0].length);
  });

  it("leaves doorways tall enough to walk through", () => {
    for (const door of [...places.gate, ...places.arch]) {
      for (let row = door.row; row <= door.row + 2; row++) {
        expect(isSolid(level, door.column, row)).toBe(false);
        expect(isSolid(level, door.column + 1, row)).toBe(false);
      }
    }
  });

  it("hangs disks, pen drives and watchdogs in the air", () => {
    for (const cell of [...places.disk, ...places.pen, ...places.watchdog]) {
      expect(isSolid(level, cell.column, cell.row)).toBe(false);
    }
    expect(places.disk.length + places.pen.length).toBeGreaterThan(8);
    expect(places.watchdog.length).toBeGreaterThan(2);
    expect(places.syntaxError.length).toBeGreaterThan(2);
  });

  it("offers one JOIN and one TRUNCATE, both in the Log Corridor", () => {
    expect(places.join).toHaveLength(1);
    expect(places.truncate).toHaveLength(1);
    for (const cell of [...places.join, ...places.truncate]) {
      expect(cell.column).toBeGreaterThan(HALL_OF_RACKS[0].length);
    }
  });

  it("decorates the back wall indoors", () => {
    for (const { column } of [
      ...places.window,
      ...places.gargoyle,
      ...places.log,
    ]) {
      expect(isIndoors(level, column)).toBe(true);
    }
  });
});

describe("campaign rooms", () => {
  const vibe = levels[ROOM.vibe];
  const collector = levels[ROOM.collector];
  const staircase = levels[ROOM.staircase];
  const throne = levels[ROOM.throne];

  it("gives the final boss the minions it calls", () => {
    expect(throne.places.summon.length).toBeGreaterThanOrEqual(2);
  });

  it("stands every start, exit, checkpoint, relic, walker and boss on the floor", () => {
    for (const level of levels) {
      const { places } = level;
      for (const cell of [
        level.start,
        ...(level.exit ? [level.exit] : []),
        ...places.checkpoint,
        ...places.join,
        ...places.truncate,
        ...places.syntaxError,
        ...places.zombie,
        ...places.dropKnight,
        ...places.drop,
        ...places.firewall,
        ...places.index,
        ...places.cache,
        ...places.backup,
        ...places.readme,
        ...places.summon,
        ...places.vibe,
        ...places.throne,
      ]) {
        expect(isFloor(level, cell.column, cell.row + 1)).toBe(true);
        expect(isSolid(level, cell.column, cell.row)).toBe(false);
      }
    }
  });

  it("keeps the boss arenas one screen wide and the staircase tall", () => {
    expect(vibe.width).toBe(320);
    expect(collector.width).toBe(320);
    expect(throne.width).toBe(320);
    expect(staircase.height).toBeGreaterThan(2 * 180);
    expect(staircase.places.checkpoint.length).toBeGreaterThan(0);
  });
});

const JUMP_HOLD = 60;
const SETTLE_FRAMES = 160;

type Move = (frame: number) => Partial<Controls>;

function walk(direction: -1 | 1): Move {
  return (frame) =>
    frame < 6 ? { left: direction < 0, right: direction > 0 } : {};
}

function leap(direction: -1 | 0 | 1, delay = 0): Move {
  return (frame) => ({
    jump: frame < JUMP_HOLD,
    jumpPressed: frame === 0,
    left: direction < 0 && frame >= delay,
    right: direction > 0 && frame >= delay,
  });
}

const MOVES: readonly Move[] = [
  walk(-1),
  walk(1),
  leap(0),
  leap(-1),
  leap(1),
  leap(-1, 12),
  leap(1, 12),
  (frame) => ({ down: true, jumpPressed: frame === 1, jump: frame === 1 }),
];

function settle(level: Level, from: Hero, move: Move): Hero | null {
  const hero = { ...from, subweapons: [...from.subweapons] };
  for (let frame = 0; frame < SETTLE_FRAMES; frame++) {
    updateHero(hero, { ...NO_CONTROLS, ...move(frame) }, level);
    if (frame > 2 && hero.grounded && !hero.crouching) {
      return hero;
    }
  }
  return null;
}

function canReach(level: Level, goal: Box): boolean {
  const start = createHero(level.start);
  const seen = new Set<string>();
  const queue: Hero[] = [start];
  while (queue.length > 0) {
    const hero = queue.shift();
    if (!hero) {
      break;
    }
    if (overlaps(hero, goal)) {
      return true;
    }
    for (const move of MOVES) {
      const landing = settle(level, hero, move);
      const key = landing && `${Math.round(landing.x / 3)},${landing.y}`;
      if (landing && key && !seen.has(key)) {
        seen.add(key);
        queue.push(landing);
      }
    }
  }
  return false;
}

function doorway(cell: Cell): Box {
  return {
    x: cell.column * TILE + 8,
    y: cell.row * TILE,
    width: 16,
    height: TILE,
  };
}

describe("routes", () => {
  it("lets the Admin climb the staircase from the bottom door to the top door", () => {
    const staircase = levels[ROOM.staircase];
    expect(canReach(staircase, doorway(exitOf(staircase)))).toBe(true);
  });

  it("lets the Admin cross every new stage and every boss room on foot", () => {
    for (const index of [
      ROOM.catacombs,
      ROOM.vibe,
      ROOM.tapes,
      ROOM.lab,
      ROOM.collector,
      ROOM.cron,
    ]) {
      const level = levels[index];
      expect(canReach(level, doorway(exitOf(level))), String(index)).toBe(true);
    }
    const throne = levels[ROOM.throne];
    const [seat] = throne.places.throne;
    expect(canReach(throne, doorway(seat))).toBe(true);
  });

  it("does not find a way through a wall", () => {
    const sealed = parseLevel([
      "##########",
      "#   #    #",
      "#S  #   E#",
      "##########",
    ]);
    expect(canReach(sealed, doorway(exitOf(sealed)))).toBe(false);
  });
});
