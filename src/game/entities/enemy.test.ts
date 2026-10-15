import { describe, expect, it } from "vitest";
import { SYNTAX_ERROR, WATCHDOG } from "../balance";
import { TILE, parseLevel } from "../levels/level";
import {
  ENEMY_TRAITS,
  createEnemies,
  damageEnemy,
  isFree,
  resetEnemy,
  summon,
} from "./enemy";

const ROOM = parseLevel([
  "####################",
  "#     o            #",
  "#                  #",
  "#S        x       E#",
  "####################",
]);

describe("enemies", () => {
  it("spawn from the map, standing or floating where they belong", () => {
    const [syntaxError, watchdog] = createEnemies(ROOM);
    expect(syntaxError).toMatchObject({
      kind: "syntaxError",
      health: SYNTAX_ERROR.health,
      state: "patrol",
      width: ENEMY_TRAITS.syntaxError.width,
      height: ENEMY_TRAITS.syntaxError.height,
    });
    expect(syntaxError.y + syntaxError.height).toBe(4 * TILE);
    expect(watchdog).toMatchObject({
      kind: "watchdog",
      health: WATCHDOG.health,
      state: "drift",
    });
    expect(watchdog.y + watchdog.height / 2).toBe(1.5 * TILE);
  });

  it("lose health with every hit and fall at zero", () => {
    const [syntaxError] = createEnemies(ROOM);
    expect(damageEnemy(syntaxError, 1, 0)).toBe(false);
    expect(syntaxError.hurt).toBeGreaterThan(0);
    expect(damageEnemy(syntaxError, 1, 0)).toBe(true);
    expect(syntaxError.alive).toBe(false);
  });

  it("remember which side the hit came from", () => {
    const [syntaxError] = createEnemies(ROOM);
    damageEnemy(syntaxError, 1, 0);
    expect(syntaxError.knock).toBe(1);
    damageEnemy(syntaxError, 0, 10_000);
    expect(syntaxError.knock).toBe(-1);
  });

  it("come back as new when the stage resets", () => {
    const [syntaxError] = createEnemies(ROOM);
    const { x, y } = syntaxError;
    syntaxError.x += 40;
    damageEnemy(syntaxError, 5, 0);
    resetEnemy(syntaxError);
    expect(syntaxError).toMatchObject({
      x,
      y,
      alive: true,
      health: SYNTAX_ERROR.health,
      hurt: 0,
    });
  });

  it("keep summon slots waiting until a boss calls them", () => {
    const level = parseLevel(["S  s  s  E", "##########"]);
    const slots = createEnemies(level);
    expect(slots.map((slot) => [slot.summoned, slot.alive])).toEqual([
      [true, false],
      [true, false],
    ]);
    const [slot] = slots;
    expect(isFree(slot)).toBe(true);
    summon(slot);
    expect(slot).toMatchObject({ alive: true, health: SYNTAX_ERROR.health });
    expect(isFree(slot)).toBe(false);
    damageEnemy(slot, SYNTAX_ERROR.health, 0);
    expect(isFree(slot)).toBe(false);
    slot.dying = 0;
    expect(isFree(slot)).toBe(true);
    summon(slot);
    resetEnemy(slot);
    expect(slot.alive).toBe(false);
  });
});
