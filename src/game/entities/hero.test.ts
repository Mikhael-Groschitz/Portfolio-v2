import { describe, expect, it } from "vitest";
import {
  CACHE,
  CAST_FRAMES,
  CLOUD,
  HURT,
  INDEX,
  MOVEMENT,
  RAM,
  README,
  WHIP,
} from "../balance";
import type { Box } from "../core/collision";
import { TILE, parseLevel } from "../levels/level";
import {
  type Controls,
  HERO_HEIGHT,
  type Hero,
  LASH_FRAMES,
  NO_CONTROLS,
  QUICK_LASH,
  activeSubweapon,
  createHero,
  cycleSubweapon,
  grantSubweapon,
  heroLashReach,
  heroPose,
  hurtHero,
  isCrashed,
  lashBox,
  lashReach,
  startCast,
  updateHero,
} from "./hero";

const ROOM = parseLevel([
  "########################################",
  "#                                      #",
  "#                                      #",
  "#                                      #",
  "#                                      #",
  "#                                      #",
  "#                                      #",
  "#          ====      RR                #",
  "#                    RR                #",
  "#S                   RR               E#",
  "########################################",
]);

const STANDING_Y = 10 * TILE - HERO_HEIGHT;

function run(hero: Hero, frames: number, controls: Partial<Controls> = {}) {
  for (let frame = 0; frame < frames; frame++) {
    updateHero(hero, { ...NO_CONTROLS, ...controls }, ROOM);
  }
}

function heroAt(column: number): Hero {
  const hero = createHero({ column, row: 9 });
  run(hero, 1);
  return hero;
}

describe("walking and jumping", () => {
  it("walks at a steady pace and faces where it goes", () => {
    const hero = heroAt(2);
    const start = hero.x;
    run(hero, 60, { right: true });
    expect(hero.x).toBeCloseTo(start + 60 * MOVEMENT.walkSpeed);
    expect(hero.facing).toBe(1);
    run(hero, 1, { left: true });
    expect(hero.facing).toBe(-1);
    expect(hero.stride).toBeGreaterThan(0);
  });

  it("jumps more than three tiles high and lands again", () => {
    const hero = heroAt(4);
    let highest = hero.y;
    run(hero, 1, { jump: true, jumpPressed: true });
    for (let frame = 0; frame < 60; frame++) {
      run(hero, 1, { jump: true });
      highest = Math.min(highest, hero.y);
    }
    expect(STANDING_Y - highest).toBeGreaterThan(3 * TILE);
    expect(hero).toMatchObject({ y: STANDING_Y, grounded: true });
  });

  it("hops lower when the jump key is let go early", () => {
    const hero = heroAt(4);
    let highest = hero.y;
    run(hero, 1, { jump: true, jumpPressed: true });
    for (let frame = 0; frame < 40; frame++) {
      run(hero, 1);
      highest = Math.min(highest, hero.y);
    }
    expect(STANDING_Y - highest).toBeLessThan(TILE * 1.5);
  });

  it("never jumps twice in the air but forgives a late jump off a ledge", () => {
    const hero = heroAt(4);
    run(hero, 1, { jump: true, jumpPressed: true });
    run(hero, 10, { jump: true });
    run(hero, 1, { jump: true, jumpPressed: true });
    expect(hero.vy).toBeGreaterThanOrEqual(0);

    const ledge = createHero({ column: 21, row: 6 });
    run(ledge, 1);
    expect(ledge.grounded).toBe(true);
    for (let frame = 0; frame < 30 && ledge.grounded; frame++) {
      run(ledge, 1, { right: true });
    }
    expect(ledge.grounded).toBe(false);
    run(ledge, 1, { right: true, jump: true, jumpPressed: true });
    expect(ledge.vy).toBeLessThan(0);
    expect(ledge.cloud).toBe(0);
  });

  it("jumps up through a cable tray and lands on top of it", () => {
    const hero = heroAt(12);
    run(hero, 1, { jump: true, jumpPressed: true });
    run(hero, 60, { jump: true });
    expect(hero).toMatchObject({ y: 7 * TILE - HERO_HEIGHT, grounded: true });
  });
});

describe("network cable whip", () => {
  it("plants the hero on the ground for the whole lash", () => {
    const hero = heroAt(4);
    const poses = new Set<string>();
    run(hero, 1, { right: true, attackPressed: true });
    for (let frame = 1; frame < LASH_FRAMES; frame++) {
      run(hero, 1, { right: true });
      poses.add(heroPose(hero));
      expect(hero.vx).toBe(0);
    }
    expect([...poses]).toEqual(["windup", "strike"]);
    run(hero, 1, { right: true });
    expect(hero.lash).toBe(-1);
    expect(hero.vx).toBe(MOVEMENT.walkSpeed);
  });

  it("keeps the momentum when lashing in the air", () => {
    const hero = heroAt(4);
    run(hero, 1, { right: true, jump: true, jumpPressed: true });
    run(hero, 1, { right: true, jump: true, attackPressed: true });
    run(hero, 4, { jump: true });
    expect(hero.vx).toBe(MOVEMENT.walkSpeed);
    expect(hero.grounded).toBe(false);
  });

  it("finishes one lash before starting the next", () => {
    const hero = heroAt(4);
    run(hero, 1, { attackPressed: true });
    run(hero, 3);
    const lash = hero.lash;
    run(hero, 1, { attackPressed: true });
    expect(hero.lash).toBe(lash + 1);
  });

  it("reaches out only after the wind-up and pulls back at the end", () => {
    expect(lashReach(-1)).toBe(0);
    expect(lashReach(WHIP.windupFrames - 1)).toBe(0);
    expect(lashReach(WHIP.windupFrames)).toBeGreaterThan(0);
    expect(lashReach(WHIP.windupFrames + 2)).toBe(WHIP.reach);
    expect(lashReach(WHIP.windupFrames + WHIP.activeFrames + 2)).toBeLessThan(
      WHIP.reach,
    );
    expect(lashReach(LASH_FRAMES - 1)).toBe(0);
  });

  it("comes out and back faster while the Cache is warm", () => {
    const hero = heroAt(4);
    hero.cache = CACHE.frames;
    run(hero, 1, { attackPressed: true });
    expect(hero.quickLash).toBe(true);
    expect(QUICK_LASH.total).toBeLessThan(LASH_FRAMES);
    run(hero, QUICK_LASH.total);
    expect(hero.lash).toBe(-1);
    hero.cache = 0;
    run(hero, 1, { attackPressed: true });
    run(hero, QUICK_LASH.total - 1);
    expect(hero.lash).toBeGreaterThan(0);
  });

  it("reaches further while the Index is built", () => {
    const hero = heroAt(4);
    hero.index = INDEX.frames;
    run(hero, 1, { attackPressed: true });
    run(hero, WHIP.windupFrames + 1);
    expect(heroLashReach(hero)).toBe(INDEX.reach);
    const box: Box = { x: 0, y: 0, width: 0, height: 0 };
    expect(lashBox(hero, box)).toBe(true);
    expect(box.width).toBe(INDEX.reach);
  });

  it("lets the Index and the Cache run out after their time", () => {
    const hero = heroAt(4);
    hero.index = 3;
    hero.cache = 5;
    run(hero, 4);
    expect(hero.index).toBe(0);
    expect(hero.cache).toBe(1);
  });
});

describe("RAM and damage", () => {
  it("starts with a fifth of the RAM in use", () => {
    expect(createHero({ column: 1, row: 9 }).ram).toBe(RAM.start);
  });

  it("raises the RAM, knocks the hero back and protects for a second", () => {
    const hero = heroAt(6);
    expect(hurtHero(hero, 20, hero.x + 30)).toBe("hurt");
    expect(hero.ram).toBe(RAM.start + 20);
    expect(hero.vx).toBeLessThan(0);
    expect(hero.facing).toBe(1);
    expect(heroPose(hero)).toBe("hurt");
    expect(hurtHero(hero, 20, hero.x + 30)).toBeNull();
    expect(hero.ram).toBe(RAM.start + 20);
    run(hero, HURT.invulnerableFrames);
    expect(hurtHero(hero, 20, hero.x - 30)).toBe("hurt");
    expect(hero.vx).toBeGreaterThan(0);
  });

  it("takes the controls away while the hero recovers", () => {
    const hero = heroAt(6);
    hurtHero(hero, 10, hero.x + 30);
    const knocked = hero.x;
    run(hero, HURT.stunFrames - 1, { right: true });
    expect(hero.x).toBeLessThan(knocked);
    run(hero, 10, { right: true });
    expect(hero.vx).toBe(MOVEMENT.walkSpeed);
  });

  it("lets the Firewall take one hit and then go away", () => {
    const hero = heroAt(6);
    hero.firewall = 1;
    expect(hurtHero(hero, 20, hero.x + 30)).toBe("blocked");
    expect(hero.ram).toBe(RAM.start);
    expect(hero.firewall).toBe(0);
    expect(hero.stun).toBe(0);
    expect(hero.invulnerable).toBe(HURT.invulnerableFrames);
    run(hero, HURT.invulnerableFrames);
    expect(hurtHero(hero, 20, hero.x + 30)).toBe("hurt");
    expect(hero.ram).toBe(RAM.start + 20);
  });

  it("takes a fifth less RAM after reading the README", () => {
    const hero = heroAt(6);
    hero.readme = true;
    hurtHero(hero, 10, hero.x + 30);
    expect(hero.ram).toBeCloseTo(RAM.start + 10 * README.damageFactor);
  });

  it("never goes past the crash line", () => {
    const hero = heroAt(6);
    hero.ram = RAM.crash - 10;
    expect(isCrashed(hero)).toBe(false);
    hurtHero(hero, 25, hero.x);
    expect(hero.ram).toBe(RAM.crash);
    expect(isCrashed(hero)).toBe(true);
  });
});

describe("crouching", () => {
  it("crouches in place, keeping the feet down and turning around", () => {
    const hero = heroAt(4);
    run(hero, 1, { down: true, right: true });
    expect(hero).toMatchObject({
      crouching: true,
      height: MOVEMENT.crouchHeight,
      vx: 0,
      facing: 1,
    });
    expect(hero.y + hero.height).toBe(10 * TILE);
    run(hero, 1, { down: true, left: true });
    expect(hero.facing).toBe(-1);
    expect(heroPose(hero)).toBe("crouch");
    run(hero, 1);
    expect(hero).toMatchObject({ crouching: false, height: HERO_HEIGHT });
    expect(hero.y + hero.height).toBe(10 * TILE);
  });

  it("stays down while something solid is right above the head", () => {
    const hero = heroAt(4);
    run(hero, 1, { down: true });
    const ceiling = parseLevel([
      "########################################",
      "#                                      #",
      "#  ####                                #",
      "#                                      #",
      "#S                                    E#",
      "########################################",
    ]);
    hero.x = 3 * TILE;
    hero.y = 3 * TILE;
    updateHero(hero, NO_CONTROLS, ceiling);
    expect(hero.crouching).toBe(true);
  });

  it("drops through a cable tray with down and jump", () => {
    const hero = createHero({ column: 12, row: 6 });
    run(hero, 1);
    expect(hero.grounded).toBe(true);
    run(hero, 1, { down: true });
    run(hero, 1, { down: true, jump: true, jumpPressed: true });
    run(hero, 40);
    expect(hero.y + hero.height).toBe(10 * TILE);
  });

  it("still jumps from solid ground when crouching", () => {
    const hero = heroAt(4);
    run(hero, 1, { down: true });
    run(hero, 1, { down: true, jump: true, jumpPressed: true });
    expect(hero.crouching).toBe(false);
    expect(hero.vy).toBeLessThan(0);
  });

  it("lashes closer to the ground while crouching", () => {
    const standing = heroAt(4);
    const crouched = heroAt(4);
    run(crouched, 1, { down: true });
    const high: Box = { x: 0, y: 0, width: 0, height: 0 };
    const low: Box = { x: 0, y: 0, width: 0, height: 0 };
    run(standing, 1, { attackPressed: true });
    run(crouched, 1, { down: true, attackPressed: true });
    run(standing, WHIP.windupFrames);
    run(crouched, WHIP.windupFrames, { down: true });
    expect(lashBox(standing, high)).toBe(true);
    expect(lashBox(crouched, low)).toBe(true);
    expect(low.y - high.y).toBe(HERO_HEIGHT - MOVEMENT.crouchHeight);
    expect(heroPose(crouched)).toBe("crouchStrike");
  });
});

describe("cloud form", () => {
  function airborne(): Hero {
    const hero = createHero({ column: 4, row: 2 });
    run(hero, MOVEMENT.coyoteFrames + 2);
    return hero;
  }

  it("turns into a cloud when jump is pressed again in the air", () => {
    const hero = heroAt(4);
    run(hero, 1, { jump: true, jumpPressed: true });
    run(hero, 10, { jump: true });
    run(hero, 1, { jump: true, jumpPressed: true });
    expect(hero.cloud).toBeGreaterThan(0);
    expect(heroPose(hero)).toBe("cloud");
    const { x, y } = hero;
    run(hero, 20, { jump: true, right: true });
    expect(hero.y - y).toBeCloseTo(20 * CLOUD.fallSpeed);
    expect(hero.x - x).toBeCloseTo(20 * CLOUD.speed);
  });

  it("glides for a limited time and then needs to recharge", () => {
    const hero = airborne();
    run(hero, 1, { jump: true, jumpPressed: true });
    run(hero, CLOUD.frames, { jump: true });
    expect(hero.cloud).toBe(0);
    expect(hero.cloudCooldown).toBeGreaterThan(0);
    run(hero, 1, { jump: true, jumpPressed: true });
    expect(hero.cloud).toBe(0);
    run(hero, CLOUD.cooldownFrames);
    const again = airborne();
    run(again, 1, { jump: true, jumpPressed: true });
    expect(again.cloud).toBeGreaterThan(0);
  });

  it("ends when the jump key is let go or the cloud touches the ground", () => {
    const released = airborne();
    run(released, 1, { jump: true, jumpPressed: true });
    run(released, 5, { jump: true });
    run(released, 1);
    expect(released.cloud).toBe(0);
    expect(released.cloudCooldown).toBe(CLOUD.cooldownFrames);

    const landing = heroAt(4);
    run(landing, 1, { jump: true, jumpPressed: true });
    run(landing, 30, { jump: true });
    run(landing, 1, { jump: true, jumpPressed: true });
    run(landing, CLOUD.frames, { jump: true });
    expect(landing.grounded).toBe(true);
    expect(landing.cloud).toBe(0);
  });

  it("cannot lash while gliding", () => {
    const hero = airborne();
    run(hero, 1, { jump: true, jumpPressed: true });
    run(hero, 1, { jump: true, attackPressed: true });
    expect(hero.lash).toBe(-1);
  });
});

describe("subweapons", () => {
  it("starts with SELECT and cycles through what it picks up", () => {
    const hero = heroAt(4);
    expect(activeSubweapon(hero)).toBe("select");
    expect(cycleSubweapon(hero)).toBe(false);
    grantSubweapon(hero, "join");
    expect(activeSubweapon(hero)).toBe("join");
    grantSubweapon(hero, "join");
    expect(hero.subweapons).toEqual(["select", "join"]);
    expect(cycleSubweapon(hero)).toBe(true);
    expect(activeSubweapon(hero)).toBe("select");
    cycleSubweapon(hero);
    expect(activeSubweapon(hero)).toBe("join");
  });

  it("shows a short throwing pose after using one", () => {
    const hero = heroAt(4);
    startCast(hero);
    expect(heroPose(hero)).toBe("cast");
    run(hero, CAST_FRAMES);
    expect(heroPose(hero)).toBe("idle");
  });
});
