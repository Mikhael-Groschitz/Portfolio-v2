import { describe, expect, it } from "vitest";
import { WATCHDOG } from "../balance";
import { parseLevel } from "../levels/level";
import { type Surroundings, centerX, createEnemies } from "./enemy";
import { createHero } from "./hero";
import { createProjectiles } from "./projectiles";
import { headLine, updateWatchdog } from "./watchdog";

const ROOM = parseLevel([
  "########################################",
  "#                                      #",
  "#                      o               #",
  "#                                      #",
  "#                                      #",
  "#                                      #",
  "#                                      #",
  "#                                      #",
  "#                                      #",
  "#S                                    E#",
  "########################################",
]);

function setup() {
  const enemies = createEnemies(ROOM);
  const surroundings: Surroundings = {
    room: { level: ROOM, enemies, zones: [] },
    hero: createHero({ column: 12, row: 9 }),
    projectiles: createProjectiles(),
  };
  const [watchdog] = enemies;
  return { surroundings, watchdog };
}

describe("The Watchdog", () => {
  it("drifts to the hero's head height and keeps its distance", () => {
    const { surroundings, watchdog } = setup();
    watchdog.cooldown = 10_000;
    for (let frame = 0; frame < 600; frame++) {
      updateWatchdog(watchdog, surroundings);
    }
    const { hero } = surroundings;
    expect(watchdog.baseY + watchdog.height / 2).toBeCloseTo(headLine(hero), 0);
    expect(Math.abs(centerX(hero) - centerX(watchdog))).toBeLessThan(
      WATCHDOG.keepAway + 10,
    );
    expect(Math.abs(centerX(hero) - centerX(watchdog))).toBeGreaterThan(
      WATCHDOG.keepAway - 10,
    );
  });

  it("charges in place and fires a log beam at head height", () => {
    const { surroundings, watchdog } = setup();
    let frames = 0;
    while (watchdog.state !== "charge" && frames < 1000) {
      updateWatchdog(watchdog, surroundings);
      frames += 1;
    }
    expect(watchdog.state).toBe("charge");
    const { x, y } = watchdog;
    for (let frame = 0; frame < WATCHDOG.chargeFrames - 1; frame++) {
      updateWatchdog(watchdog, surroundings);
    }
    expect(watchdog).toMatchObject({ x, y, state: "charge" });
    updateWatchdog(watchdog, surroundings);
    const beam = surroundings.projectiles.find((shot) => shot.active);
    expect(beam).toMatchObject({ kind: "beam", variant: 0 });
    expect(beam ? beam.y + beam.height / 2 : 0).toBeCloseTo(
      headLine(surroundings.hero),
      0,
    );
    expect(Math.sign(beam?.vx ?? 0)).toBe(
      Math.sign(centerX(surroundings.hero) - centerX(watchdog)),
    );
    expect(watchdog.cooldown).toBe(WATCHDOG.cooldownFrames);
  });

  it("aims at the standing head line even when the hero crouches", () => {
    const { surroundings } = setup();
    const standing = headLine(surroundings.hero);
    surroundings.hero.y += 10;
    surroundings.hero.height -= 10;
    expect(headLine(surroundings.hero)).toBe(standing);
  });

  it("drifts back without bobbing while it recovers from a hit", () => {
    const { surroundings, watchdog } = setup();
    watchdog.hurt = 5;
    watchdog.knock = 1;
    const { x, y } = watchdog;
    updateWatchdog(watchdog, surroundings);
    expect(watchdog.x).toBeGreaterThan(x);
    expect(watchdog).toMatchObject({ y, hurt: 4 });
  });
});
