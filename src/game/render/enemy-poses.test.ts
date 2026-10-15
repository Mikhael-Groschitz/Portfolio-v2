import { describe, expect, it } from "vitest";
import {
  DROP_KNIGHT,
  ENEMY_DYING_FRAMES,
  SYNTAX_ERROR,
  WATCHDOG,
} from "../balance";
import { createEnemies } from "../entities/enemy";
import { createHero } from "../entities/hero";
import { headLine } from "../entities/watchdog";
import { parseLevel } from "../levels/level";
import { KNIGHT_WALK } from "./drop-knight-art";
import { CHARGE_KEYS, MARCH, SYNTAX_ERROR_COLLAPSE } from "./enemy-art";
import {
  BLINK_FRAMES,
  BLINK_PERIOD,
  COLLAPSE_HEIGHT,
  KNIGHT_STEP_PIXELS,
  MARCH_PIXELS,
  SHAMBLE_PIXELS,
  SQUIGGLE_FRAMES,
  THROW_FRAMES,
  collapseHeight,
  collapseStage,
  knightPose,
  squigglePhase,
  syntaxErrorPose,
  watchdogPose,
  zombiePose,
  zombieRows,
} from "./enemy-poses";
import { SHAMBLE, ZOMBIE_FRAME } from "./zombie-art";

const ROOM = parseLevel([
  "####################",
  "#     o            #",
  "#                  #",
  "#S        x       E#",
  "####################",
]);

function enemies() {
  const [syntaxError, watchdog] = createEnemies(ROOM);
  return { syntaxError, watchdog, hero: createHero(ROOM.start) };
}

describe("Syntax Error poses", () => {
  it("marches through four poses as it walks", () => {
    const { syntaxError } = enemies();
    const poses = MARCH.map((_, step) => {
      syntaxError.x = step * MARCH_PIXELS;
      return syntaxErrorPose(syntaxError);
    });
    expect(poses).toEqual(MARCH);
  });

  it("pulls back, raises the glyph, throws and recoils", () => {
    const { syntaxError } = enemies();
    syntaxError.state = "windup";
    syntaxError.timer = SYNTAX_ERROR.windupFrames;
    expect(syntaxErrorPose(syntaxError)).toBe("pull");
    syntaxError.timer = 2;
    expect(syntaxErrorPose(syntaxError)).toBe("raise");
    syntaxError.state = "patrol";
    syntaxError.cooldown = SYNTAX_ERROR.cooldownFrames - 1;
    expect(syntaxErrorPose(syntaxError)).toBe("throw");
    syntaxError.cooldown = SYNTAX_ERROR.cooldownFrames - (THROW_FRAMES - 1);
    expect(syntaxErrorPose(syntaxError)).toBe("recoil");
    syntaxError.hurt = 3;
    expect(syntaxErrorPose(syntaxError)).toBe("hurt");
  });

  it("crawls its squiggle slower than three times a second, or not at all", () => {
    const { syntaxError } = enemies();
    const phases = Array.from({ length: 120 }, (_, clock) =>
      squigglePhase(syntaxError, clock, false),
    );
    const changes = phases.filter(
      (phase, index) => index > 0 && phase !== phases[index - 1],
    ).length;
    const seconds = phases.length / 60;
    const blinksPerSecond = changes / 2 / seconds;
    expect(changes).toBeLessThanOrEqual(phases.length / SQUIGGLE_FRAMES);
    expect(blinksPerSecond).toBeLessThanOrEqual(3);
    expect(squigglePhase(syntaxError, 13, true)).toBe(0);
  });

  it("falls apart in stages after the last hit", () => {
    const { syntaxError } = enemies();
    syntaxError.dying = ENEMY_DYING_FRAMES;
    expect(collapseStage(syntaxError)).toBe(0);
    syntaxError.dying = 1;
    expect(collapseStage(syntaxError)).toBe(SYNTAX_ERROR_COLLAPSE.length - 1);
  });
});

describe("Watchdog poses", () => {
  it("flaps its fins with the hover and keeps them still with reduced motion", () => {
    const { watchdog, hero } = enemies();
    watchdog.y = watchdog.baseY - 5;
    expect(watchdogPose(watchdog, hero, 50, false)).toMatch(/^up-/);
    watchdog.y = watchdog.baseY + 5;
    expect(watchdogPose(watchdog, hero, 50, false)).toMatch(/^down-/);
    expect(watchdogPose(watchdog, hero, 50, true)).toMatch(/^mid-/);
  });

  it("looks toward the hero's head", () => {
    const { watchdog, hero } = enemies();
    watchdog.y = headLine(hero) - watchdog.height / 2;
    watchdog.baseY = watchdog.y;
    expect(watchdogPose(watchdog, hero, 50, false)).toBe("mid-ahead");
    watchdog.y -= 20;
    watchdog.baseY = watchdog.y;
    expect(watchdogPose(watchdog, hero, 50, false)).toBe("mid-down");
    watchdog.y += 40;
    watchdog.baseY = watchdog.y;
    expect(watchdogPose(watchdog, hero, 50, false)).toBe("mid-up");
  });

  it("blinks now and then, but not with reduced motion", () => {
    const { watchdog, hero } = enemies();
    const closed = Array.from({ length: BLINK_PERIOD }, (_, clock) =>
      watchdogPose(watchdog, hero, clock, false),
    ).filter((pose) => pose.endsWith("blink")).length;
    expect(closed).toBe(BLINK_FRAMES);
    const still = Array.from({ length: BLINK_PERIOD }, (_, clock) =>
      watchdogPose(watchdog, hero, clock, true),
    ).filter((pose) => pose.endsWith("blink")).length;
    expect(still).toBe(0);
  });

  it("warms its lens in three steps while charging", () => {
    const { watchdog, hero } = enemies();
    watchdog.state = "charge";
    const stages = new Set<string>();
    for (let timer = WATCHDOG.chargeFrames; timer > 0; timer--) {
      watchdog.timer = timer;
      stages.add(watchdogPose(watchdog, hero, 0, false));
    }
    expect([...stages]).toEqual(CHARGE_KEYS);
    watchdog.hurt = 2;
    expect(watchdogPose(watchdog, hero, 0, false)).toBe("hurt");
  });
});

const MOBS = parseLevel([
  "####################",
  "#                  #",
  "#S   z     k      E#",
  "####################",
]);

describe("Zombie Process poses", () => {
  it("drags its feet through two poses and flinches when hit", () => {
    const [zombie] = createEnemies(MOBS);
    const poses = SHAMBLE.map((_, step) => {
      zombie.x = step * SHAMBLE_PIXELS;
      return zombiePose(zombie);
    });
    expect(poses).toEqual(SHAMBLE);
    zombie.hurt = 2;
    expect(zombiePose(zombie)).toBe("hurt");
  });

  it("shows only what is above the floor while rising and sinking", () => {
    const [zombie] = createEnemies(MOBS);
    expect(zombieRows(zombie)).toBe(ZOMBIE_FRAME.height);
    zombie.height = 10;
    expect(zombieRows(zombie)).toBe(10 + ZOMBIE_FRAME.top);
    zombie.height = 22;
    zombie.alive = false;
    zombie.dying = ENEMY_DYING_FRAMES / 2;
    expect(zombieRows(zombie)).toBe(ZOMBIE_FRAME.height / 2);
    zombie.dying = 0;
    expect(zombieRows(zombie)).toBe(0);
  });
});

describe("DROP Knight poses", () => {
  it("walks through four poses, raises the axe and throws it", () => {
    const [, knight] = createEnemies(MOBS);
    const poses = KNIGHT_WALK.map((_, step) => {
      knight.x = step * KNIGHT_STEP_PIXELS;
      return knightPose(knight);
    });
    expect(poses).toEqual(KNIGHT_WALK);
    knight.state = "windup";
    expect(knightPose(knight)).toBe("windup");
    knight.state = "throw";
    expect(knightPose(knight)).toBe("throw");
  });

  it("shows empty hands for a while after a throw, then the axe again", () => {
    const [, knight] = createEnemies(MOBS);
    knight.cooldown = DROP_KNIGHT.cooldownFrames;
    expect(knightPose(knight)).toBe("empty");
    knight.cooldown = DROP_KNIGHT.cooldownFrames / 2;
    expect(knightPose(knight)).not.toBe("empty");
    knight.hurt = 1;
    expect(knightPose(knight)).toBe("hurt");
  });

  it("collapses to under a third of its height as it falls", () => {
    const [, knight] = createEnemies(MOBS);
    expect(collapseHeight(knight)).toBe(1);
    knight.alive = false;
    knight.dying = 0;
    expect(collapseHeight(knight)).toBeCloseTo(COLLAPSE_HEIGHT);
  });
});
