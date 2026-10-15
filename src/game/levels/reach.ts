import {
  type Cell,
  type Level,
  TERRAIN,
  type Terrain,
  isFloor,
  isSolid,
  terrainAt,
} from "./level";

const UP_REACH: readonly number[] = [4, 4, 3, 2];
const DOWN_REACH = 4;
const WHIP_COLUMNS = 2;
const WHIP_ROWS = 4;
const SWAYING: ReadonlySet<Terrain> = new Set([
  TERRAIN.sector,
  TERRAIN.cronA,
  TERRAIN.cronB,
]);

type Key = number;

interface Ground {
  level: Level;
  missing: boolean;
}

function terrainOf({ level, missing }: Ground, column: number, row: number) {
  const terrain = terrainAt(level, column, row);
  return missing && SWAYING.has(terrain) ? TERRAIN.air : terrain;
}

function solid(ground: Ground, column: number, row: number): boolean {
  return (
    terrainOf(ground, column, row) !== TERRAIN.air &&
    isSolid(ground.level, column, row)
  );
}

function floor(ground: Ground, column: number, row: number): boolean {
  return (
    terrainOf(ground, column, row) !== TERRAIN.air &&
    isFloor(ground.level, column, row)
  );
}

function free(ground: Ground, column: number, row: number): boolean {
  return !solid(ground, column, row);
}

function keyOf(level: Level, column: number, row: number): Key {
  return row * level.columns + column;
}

function cellOf(level: Level, key: Key): Cell {
  return { column: key % level.columns, row: Math.floor(key / level.columns) };
}

export function canStand(
  level: Level,
  column: number,
  row: number,
  missing = false,
): boolean {
  const ground = { level, missing };
  return (
    column >= 0 &&
    column < level.columns &&
    row >= 0 &&
    row < level.rows &&
    free(ground, column, row) &&
    free(ground, column, row - 1) &&
    floor(ground, column, row + 1)
  );
}

function fall(ground: Ground, column: number, row: number): Cell | null {
  for (let below = row; below < ground.level.rows; below++) {
    if (solid(ground, column, below)) {
      return null;
    }
    if (floor(ground, column, below + 1)) {
      return { column, row: below };
    }
  }
  return null;
}

function across(from: number, to: number): number[] {
  const step = to >= from ? 1 : -1;
  return Array.from(
    { length: Math.abs(to - from) + 1 },
    (_, i) => from + i * step,
  );
}

function climbs(ground: Ground, column: number, row: number): Cell[] {
  const landings: Cell[] = [];
  UP_REACH.forEach((reach, rise) => {
    for (let lift = 2; lift <= rise + 1; lift++) {
      if (solid(ground, column, row - lift)) {
        return;
      }
    }
    for (let shift = -reach; shift <= reach; shift++) {
      const target = { column: column + shift, row: row - rise };
      if (
        (shift === 0 && rise === 0) ||
        !canStand(ground.level, target.column, target.row, ground.missing)
      ) {
        continue;
      }
      const rows = [target.row, target.row - 1];
      if (Math.abs(shift) >= 3) {
        rows.push(target.row - 2);
      }
      const clear = across(column, target.column).every((x) =>
        rows.every((y) => free(ground, x, y)),
      );
      if (clear) {
        landings.push(target);
      }
    }
  });
  return landings;
}

function drops(ground: Ground, column: number, row: number): Cell[] {
  const landings: Cell[] = [];
  for (let depth = 1; depth < ground.level.rows; depth++) {
    for (let shift = -DOWN_REACH; shift <= DOWN_REACH; shift++) {
      const target = { column: column + shift, row: row + depth };
      if (
        shift === 0 ||
        !canStand(ground.level, target.column, target.row, ground.missing)
      ) {
        continue;
      }
      const path = across(column, target.column).every(
        (x) => free(ground, x, row - 1) && free(ground, x, row - 2),
      );
      const shaft = across(row - 1, target.row).every((y) =>
        free(ground, target.column, y),
      );
      if (path && shaft) {
        landings.push(target);
      }
    }
  }
  return landings;
}

function moves(ground: Ground, column: number, row: number): Cell[] {
  const landings: Cell[] = [];
  for (const side of [-1, 1]) {
    const next = column + side;
    if (free(ground, next, row) && free(ground, next, row - 1)) {
      const landing = fall(ground, next, row);
      if (landing) {
        landings.push(landing);
      }
    }
  }
  if (!solid(ground, column, row + 1) && floor(ground, column, row + 1)) {
    const landing = fall(ground, column, row + 1);
    if (landing) {
      landings.push(landing);
    }
  }
  return [
    ...landings,
    ...climbs(ground, column, row),
    ...drops(ground, column, row),
  ];
}

function search(
  level: Level,
  starts: readonly Key[],
  missing: boolean,
): Set<Key> {
  const ground = { level, missing };
  const seen = new Set(starts);
  const queue = [...starts];
  for (let index = 0; index < queue.length; index++) {
    const { column, row } = cellOf(level, queue[index]);
    for (const landing of moves(ground, column, row)) {
      const key = keyOf(level, landing.column, landing.row);
      if (!seen.has(key)) {
        seen.add(key);
        queue.push(key);
      }
    }
  }
  return seen;
}

function leadsTo(level: Level, goal: Key): Set<Key> {
  const back = new Map<Key, Key[]>();
  for (const missing of [false, true]) {
    const ground = { level, missing };
    for (let row = 0; row < level.rows; row++) {
      for (let column = 0; column < level.columns; column++) {
        if (!canStand(level, column, row, missing)) {
          continue;
        }
        const from = keyOf(level, column, row);
        for (const landing of moves(ground, column, row)) {
          const to = keyOf(level, landing.column, landing.row);
          const sources = back.get(to);
          if (sources) {
            sources.push(from);
          } else {
            back.set(to, [from]);
          }
        }
      }
    }
  }
  const seen = new Set([goal]);
  const queue = [goal];
  for (let index = 0; index < queue.length; index++) {
    for (const from of back.get(queue[index]) ?? []) {
      if (!seen.has(from)) {
        seen.add(from);
        queue.push(from);
      }
    }
  }
  return seen;
}

const PIECES = [
  "start",
  "exit",
  "checkpoint",
  "syntaxError",
  "watchdog",
  "zombie",
  "dropKnight",
  "vibe",
  "collector",
  "throne",
  "summon",
  "paste",
] as const;

const RAISED: ReadonlySet<Terrain> = new Set([
  TERRAIN.rack,
  TERRAIN.ledge,
  TERRAIN.sector,
  TERRAIN.beltLeft,
  TERRAIN.beltRight,
  TERRAIN.cronA,
  TERRAIN.cronB,
]);

function raised(level: Level, column: number, row: number): boolean {
  const terrain = terrainAt(level, column, row);
  return (
    RAISED.has(terrain) ||
    (terrain === TERRAIN.stone &&
      row + 1 < level.rows &&
      terrainAt(level, column, row + 1) === TERRAIN.air)
  );
}

export function crowding(level: Level): string[] {
  const items = [
    ...FLOATING,
    ...RESTING.filter((place) => place !== "checkpoint"),
  ];
  const taken = new Set<Key>();
  for (const place of [...items, ...PIECES]) {
    for (const cell of level.places[place]) {
      taken.add(keyOf(level, cell.column, cell.row));
    }
  }
  const problems: string[] = [];
  for (const place of items) {
    const floats = FLOATING.some((kind) => kind === place);
    for (const { column, row } of level.places[place]) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((dx === 0 && dy === 0) || (!floats && dy === 1)) {
            continue;
          }
          const x = column + dx;
          const y = row + dy;
          const inside =
            y >= 0 && y < level.rows && x >= 0 && x < level.columns;
          if (
            terrainAt(level, x, y) !== TERRAIN.air ||
            (inside && taken.has(keyOf(level, x, y)))
          ) {
            problems.push(`${label(place, { column, row })} touches ${x},${y}`);
          }
        }
      }
      if (
        floats &&
        canStand(level, column, row + 1) &&
        raised(level, column, row + 2)
      ) {
        problems.push(`${label(place, { column, row })} blocks a head`);
      }
    }
  }
  return problems;
}

export interface Survey {
  reached: ReadonlySet<Key>;
  stranded: readonly string[];
}

const RESTING = [
  "checkpoint",
  "join",
  "truncate",
  "drop",
  "firewall",
  "index",
  "cache",
  "backup",
  "readme",
] as const;

const FLOATING = ["disk", "pen", "tape"] as const;

function label(place: string, cell: Cell): string {
  return `${place} at ${cell.column},${cell.row}`;
}

export function survey(level: Level): Survey {
  const start = keyOf(level, level.start.column, level.start.row);
  const reached = search(level, [start], false);
  const stranded: string[] = [];
  const goals = level.exit ? [level.exit] : [];
  for (const cell of [...goals]) {
    if (!reached.has(keyOf(level, cell.column, cell.row))) {
      stranded.push(label("exit", cell));
    }
  }
  for (const place of RESTING) {
    for (const cell of level.places[place]) {
      if (!reached.has(keyOf(level, cell.column, cell.row))) {
        stranded.push(label(place, cell));
      }
    }
  }
  const stands = [...reached].map((key) => cellOf(level, key));
  for (const place of FLOATING) {
    for (const cell of level.places[place]) {
      const whipped = stands.some(
        (stand) =>
          Math.abs(stand.column - cell.column) <= WHIP_COLUMNS &&
          cell.row <= stand.row &&
          cell.row >= stand.row - WHIP_ROWS,
      );
      if (!whipped) {
        stranded.push(label(place, cell));
      }
    }
  }
  if (level.exit) {
    const anywhere = new Set([
      ...reached,
      ...search(level, [...reached], true),
    ]);
    const home = leadsTo(
      level,
      keyOf(level, level.exit.column, level.exit.row),
    );
    for (const key of anywhere) {
      if (!home.has(key)) {
        stranded.push(label("dead end", cellOf(level, key)));
      }
    }
  }
  return { reached, stranded };
}
