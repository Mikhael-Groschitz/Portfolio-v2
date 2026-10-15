import { BELT, CRON, SECTOR, TEST_BEAM } from "../balance";
import { type Body, type Box, overlaps, slide } from "../core/collision";
import {
  type Level,
  TERRAIN,
  TILE,
  type Terrain,
  isSolid,
  setTerrain,
  terrainAt,
} from "../levels/level";

export type SectorState = "solid" | "cracking" | "fallen";

export type BeamState = "off" | "warn" | "on";

export interface Sector extends Box {
  column: number;
  row: number;
  state: SectorState;
  timer: number;
}

export interface CronPlatform extends Box {
  column: number;
  row: number;
  group: 0 | 1;
  lead: boolean;
}

export interface Belt extends Box {
  direction: 1 | -1;
}

export interface TestBeam extends Box {
  order: number;
}

export interface Mechanisms {
  clock: number;
  sectors: Sector[];
  platforms: CronPlatform[];
  belts: Belt[];
  beams: TestBeam[];
}

const CRON_TERRAIN: readonly Terrain[] = [TERRAIN.cronA, TERRAIN.cronB];
const BEAM_TOP = 6;
const CRON_CYCLE = 2 * CRON.phaseFrames;
const BEAM_CYCLE =
  TEST_BEAM.offFrames + TEST_BEAM.warnFrames + TEST_BEAM.onFrames;

function cellBox(column: number, row: number): Box {
  return { x: column * TILE, y: row * TILE, width: TILE, height: TILE };
}

function cellsOf(
  level: Level,
  wanted: (terrain: Terrain) => boolean,
): { column: number; row: number; terrain: Terrain }[] {
  const cells: { column: number; row: number; terrain: Terrain }[] = [];
  for (let row = 0; row < level.rows; row++) {
    for (let column = 0; column < level.columns; column++) {
      const terrain = terrainAt(level, column, row);
      if (wanted(terrain)) {
        cells.push({ column, row, terrain });
      }
    }
  }
  return cells;
}

function beamOf(level: Level, column: number, row: number, order: number) {
  let floor = row + 1;
  while (floor < level.rows && !isSolid(level, column, floor)) {
    floor += 1;
  }
  const top = row * TILE + BEAM_TOP;
  return {
    x: column * TILE + (TILE - TEST_BEAM.width) / 2,
    y: top,
    width: TEST_BEAM.width,
    height: floor * TILE - top,
    order,
  };
}

export function createMechanisms(level: Level): Mechanisms {
  return {
    clock: 0,
    sectors: cellsOf(level, (terrain) => terrain === TERRAIN.sector).map(
      ({ column, row }) => ({
        ...cellBox(column, row),
        column,
        row,
        state: "solid",
        timer: 0,
      }),
    ),
    platforms: cellsOf(level, (terrain) => CRON_TERRAIN.includes(terrain)).map(
      ({ column, row, terrain }) => ({
        ...cellBox(column, row),
        column,
        row,
        group: terrain === TERRAIN.cronA ? 0 : 1,
        lead: terrainAt(level, column - 1, row) !== terrain,
      }),
    ),
    belts: cellsOf(
      level,
      (terrain) =>
        terrain === TERRAIN.beltLeft || terrain === TERRAIN.beltRight,
    ).map(({ column, row, terrain }) => ({
      ...cellBox(column, row),
      direction: terrain === TERRAIN.beltLeft ? -1 : 1,
    })),
    beams: [...level.places.beam]
      .sort((a, b) => a.column - b.column)
      .map((cell, order) => beamOf(level, cell.column, cell.row, order)),
  };
}

export function isScheduled(platform: CronPlatform, clock: number): boolean {
  const time =
    (clock - platform.group * CRON.phaseFrames + CRON_CYCLE) % CRON_CYCLE;
  return time < CRON.phaseFrames + CRON.overlapFrames;
}

export function scheduleLeft(platform: CronPlatform, clock: number): number {
  const time =
    (clock - platform.group * CRON.phaseFrames + CRON_CYCLE) % CRON_CYCLE;
  return CRON.phaseFrames + CRON.overlapFrames - time;
}

export function beamState(beam: TestBeam, clock: number): BeamState {
  const time =
    (((clock - beam.order * TEST_BEAM.staggerFrames) % BEAM_CYCLE) +
      BEAM_CYCLE) %
    BEAM_CYCLE;
  if (time < TEST_BEAM.offFrames) {
    return "off";
  }
  return time < TEST_BEAM.offFrames + TEST_BEAM.warnFrames ? "warn" : "on";
}

function schedule(mechanisms: Mechanisms, level: Level): void {
  for (const platform of mechanisms.platforms) {
    setTerrain(
      level,
      platform.column,
      platform.row,
      isScheduled(platform, mechanisms.clock)
        ? CRON_TERRAIN[platform.group]
        : TERRAIN.air,
    );
  }
}

export function resetMechanisms(mechanisms: Mechanisms, level: Level): void {
  mechanisms.clock = 0;
  for (const sector of mechanisms.sectors) {
    sector.state = "solid";
    sector.timer = 0;
    setTerrain(level, sector.column, sector.row, TERRAIN.sector);
  }
  schedule(mechanisms, level);
}

function standsOn(body: Body, box: Box): boolean {
  return (
    body.grounded &&
    Math.abs(body.y + body.height - box.y) < 1 &&
    body.x < box.x + box.width &&
    box.x < body.x + body.width
  );
}

function crumble(sector: Sector, level: Level, hero: Body): void {
  switch (sector.state) {
    case "solid":
      if (standsOn(hero, sector)) {
        sector.state = "cracking";
        sector.timer = SECTOR.crackFrames;
      }
      return;
    case "cracking":
      sector.timer -= 1;
      if (sector.timer <= 0) {
        sector.state = "fallen";
        sector.timer = SECTOR.regrowFrames;
        setTerrain(level, sector.column, sector.row, TERRAIN.air);
      }
      return;
    case "fallen":
      sector.timer = Math.max(sector.timer - 1, 0);
      if (sector.timer === 0 && !overlaps(hero, sector)) {
        sector.state = "solid";
        setTerrain(level, sector.column, sector.row, TERRAIN.sector);
      }
      return;
  }
}

export function updateMechanisms(
  mechanisms: Mechanisms,
  level: Level,
  hero: Body,
): void {
  mechanisms.clock += 1;
  for (const sector of mechanisms.sectors) {
    crumble(sector, level, hero);
  }
  schedule(mechanisms, level);
}

export function carry(mechanisms: Mechanisms, level: Level, body: Body): void {
  let push = 0;
  for (const belt of mechanisms.belts) {
    if (standsOn(body, belt)) {
      push += belt.direction;
    }
  }
  if (push !== 0) {
    slide(level, body, Math.sign(push) * BELT.speed);
  }
}

export function burningBeam(
  mechanisms: Mechanisms,
  body: Box,
): TestBeam | null {
  for (const beam of mechanisms.beams) {
    if (beamState(beam, mechanisms.clock) === "on" && overlaps(body, beam)) {
      return beam;
    }
  }
  return null;
}
