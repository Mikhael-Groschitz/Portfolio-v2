import { describe, expect, it } from "vitest";
import { DROP_KNIGHT, SUBWEAPONS, VIBE, WATCHDOG } from "../balance";
import { TILE, parseLevel } from "../levels/level";
import {
  FADE_SPARKS,
  type Launch,
  PROJECTILE_SIZE,
  type ProjectileKind,
  countFlying,
  createProjectiles,
  isFriendly,
  isHostile,
  isWhippable,
  launch,
  moveProjectile,
} from "./projectiles";

const ROOM = parseLevel([
  "##############################",
  "#                            #",
  "#                            #",
  "#                            #",
  "#                            #",
  "#                            #",
  "#S                          E#",
  "##############################",
]);

const FAR = { x: 0, y: 0, width: 1, height: 1 };

function shot(overrides: Partial<Launch>): Launch {
  return {
    kind: "select",
    x: 3 * TILE,
    y: 3 * TILE,
    vx: 0,
    vy: 0,
    facing: 1,
    variant: 0,
    token: 1,
    ...overrides,
  };
}

describe("projectiles", () => {
  it("fly SELECT straight until a wall or the end of its range", () => {
    const projectiles = createProjectiles();
    const select = launch(projectiles, shot({ vx: SUBWEAPONS.select.speed }));
    expect(select).not.toBeNull();
    const y = select?.y;
    let frames = 0;
    while (select?.active && frames < 200) {
      moveProjectile(select, ROOM, FAR);
      frames += 1;
    }
    expect(select?.y).toBe(y);
    expect(select?.x).toBeGreaterThanOrEqual(
      3 * TILE + SUBWEAPONS.select.range,
    );
    expect(frames).toBeLessThan(
      SUBWEAPONS.select.range / SUBWEAPONS.select.speed + 2,
    );
    const wall = launch(projectiles, shot({ vx: -SUBWEAPONS.select.speed }));
    while (wall?.active) {
      moveProjectile(wall, ROOM, FAR);
    }
    expect(wall?.x).toBeLessThan(TILE);
  });

  it("drop glyphs in an arc until they hit the floor", () => {
    const projectiles = createProjectiles();
    const glyph = launch(
      projectiles,
      shot({ kind: "glyph", vx: 1, vy: -2.8, y: 5 * TILE }),
    );
    let highest = glyph?.y ?? 0;
    while (glyph?.active) {
      moveProjectile(glyph, ROOM, FAR);
      highest = Math.min(highest, glyph.y);
    }
    expect(highest).toBeLessThan(4 * TILE);
    expect((glyph?.y ?? 0) + (glyph?.height ?? 0)).toBeGreaterThan(7 * TILE);
  });

  it("bring JOIN back to the hand that threw it", () => {
    const projectiles = createProjectiles();
    const hand = { x: 3 * TILE, y: 3 * TILE, width: 12, height: 28 };
    const join = launch(
      projectiles,
      shot({
        kind: "join",
        vx: SUBWEAPONS.join.speed,
        vy: -SUBWEAPONS.join.lift,
        x: hand.x + hand.width,
        token: 7,
      }),
    );
    let farthest = 0;
    let frames = 0;
    while (join?.active && frames < 200) {
      moveProjectile(join, ROOM, hand);
      farthest = Math.max(farthest, join.x);
      frames += 1;
    }
    expect(farthest).toBeGreaterThan(hand.x + 3 * TILE);
    expect(join?.returning).toBe(true);
    expect(join?.token).toBe(-7);
    expect(frames).toBeLessThan(120);
  });

  it("send log beams across the room", () => {
    const projectiles = createProjectiles();
    const beam = launch(
      projectiles,
      shot({ kind: "beam", vx: -WATCHDOG.beamSpeed, x: 20 * TILE }),
    );
    expect(beam && isHostile(beam)).toBe(true);
    for (let frame = 0; frame < 20; frame++) {
      if (beam) {
        moveProjectile(beam, ROOM, FAR);
      }
    }
    expect(beam?.x).toBeCloseTo(20 * TILE - 20 * WATCHDOG.beamSpeed);
  });

  it("lob DROP up and over walls until it falls out of the room or runs out", () => {
    const projectiles = createProjectiles();
    const axe = launch(
      projectiles,
      shot({
        kind: "drop",
        vx: SUBWEAPONS.drop.speed,
        vy: -SUBWEAPONS.drop.lift,
      }),
    );
    if (!axe) {
      throw new Error("The pool should have room");
    }
    const start = axe.y;
    moveProjectile(axe, ROOM, FAR);
    expect(axe.y).toBeLessThan(start);
    axe.x = 0;
    axe.y = 3 * TILE;
    moveProjectile(axe, ROOM, FAR);
    expect(axe.active).toBe(true);
    let frames = 0;
    while (axe.active) {
      moveProjectile(axe, ROOM, FAR);
      frames += 1;
    }
    expect(frames).toBeLessThanOrEqual(SUBWEAPONS.drop.lifetime);
    expect(isHostile(axe)).toBe(false);
  });

  it("let the knight axes hurt the Admin, break on walls and fall to the whip", () => {
    const projectiles = createProjectiles();
    const axe = launch(
      projectiles,
      shot({
        kind: "dropAxe",
        vx: -DROP_KNIGHT.lowAxe.speed,
        vy: -DROP_KNIGHT.lowAxe.lift,
        facing: -1,
      }),
    );
    if (!axe) {
      throw new Error("The pool should have room");
    }
    expect(isHostile(axe)).toBe(true);
    expect(isWhippable(axe)).toBe(true);
    while (axe.active) {
      moveProjectile(axe, ROOM, FAR);
    }
    expect(axe.y).toBeLessThan(ROOM.height);
  });

  it("sort every shot into the Admin's, the enemies' or harmless ones", () => {
    const kinds = Object.keys(PROJECTILE_SIZE) as ProjectileKind[];
    const projectiles = createProjectiles();
    const sides = kinds.map((kind) => {
      const projectile = launch(projectiles, shot({ kind }));
      if (!projectile) {
        throw new Error("The pool should have room");
      }
      return [kind, isFriendly(projectile), isHostile(projectile)] as const;
    });
    expect(
      sides.filter(([, friendly, hostile]) => friendly && hostile),
    ).toEqual([]);
    expect(
      sides.filter(([, friendly, hostile]) => !friendly && !hostile),
    ).toEqual([["hallucination", false, false]]);
    expect(
      sides.filter(([, friendly]) => friendly).map(([kind]) => kind),
    ).toEqual(["select", "join", "drop"]);
  });

  it("throw code blocks in an arc that breaks on the floor, and fade hallucinations at the top", () => {
    const projectiles = createProjectiles();
    const lift = { y: 5 * TILE, vx: 1, vy: -VIBE.blockLift };
    const code = launch(projectiles, shot({ kind: "code", ...lift }));
    const ghost = launch(projectiles, shot({ kind: "hallucination", ...lift }));
    if (!code || !ghost) {
      throw new Error("The pool should have room");
    }
    expect(isWhippable(code)).toBe(true);
    expect(isWhippable(ghost)).toBe(false);
    let peak = code.y;
    while (ghost.active) {
      moveProjectile(code, ROOM, FAR);
      moveProjectile(ghost, ROOM, FAR);
      peak = Math.min(peak, code.y);
    }
    expect(ghost.vy).toBeGreaterThan(0);
    expect(code.active).toBe(true);
    while (code.active) {
      moveProjectile(code, ROOM, FAR);
    }
    expect(code.y + code.height).toBeGreaterThan(ROOM.height - 2 * TILE);
    expect(code.y).toBeLessThan(ROOM.height);
    expect(peak).toBeLessThan(5 * TILE - 2 * TILE);
    expect(FADE_SPARKS.code).toBe("data");
    expect(FADE_SPARKS.hallucination).toBe("data");
  });

  it("roll the floor wave until it hits a wall", () => {
    const projectiles = createProjectiles();
    const floor = ROOM.height - TILE;
    const wave = launch(
      projectiles,
      shot({
        kind: "wave",
        x: 10 * TILE,
        y: floor - PROJECTILE_SIZE.wave.height,
        vx: -VIBE.waveSpeed,
        facing: -1,
      }),
    );
    if (!wave) {
      throw new Error("The pool should have room");
    }
    expect(isWhippable(wave)).toBe(false);
    while (wave.active) {
      moveProjectile(wave, ROOM, FAR);
      expect(wave.y + wave.height).toBe(floor);
    }
    expect(wave.x).toBeLessThan(TILE);
    expect(wave.x).toBeGreaterThanOrEqual(TILE - VIBE.waveSpeed);
  });

  it("hang bugs under the ceiling for a while before they fall", () => {
    const projectiles = createProjectiles();
    const bug = launch(projectiles, shot({ kind: "bug", y: TILE }));
    if (!bug) {
      throw new Error("The pool should have room");
    }
    for (let frame = 0; frame < VIBE.bugWarnFrames; frame++) {
      moveProjectile(bug, ROOM, FAR);
    }
    expect(bug.y).toBe(TILE);
    moveProjectile(bug, ROOM, FAR);
    expect(bug.y).toBeGreaterThan(TILE);
    while (bug.active) {
      moveProjectile(bug, ROOM, FAR);
    }
    expect(bug.y + bug.height).toBeGreaterThan(ROOM.height - TILE);
    expect(isWhippable(bug)).toBe(true);
  });

  it("reuse a fixed pool and refuse shots when it is full", () => {
    const projectiles = createProjectiles();
    const size = projectiles.length;
    for (let index = 0; index < size; index++) {
      expect(launch(projectiles, shot({}))).not.toBeNull();
    }
    expect(launch(projectiles, shot({}))).toBeNull();
    expect(projectiles).toHaveLength(size);
    expect(countFlying(projectiles, "select")).toBe(size);
    expect(countFlying(projectiles, "join")).toBe(0);
  });
});
