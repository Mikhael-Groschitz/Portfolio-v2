import { describe, expect, it } from "vitest";
import { COLLECTOR, LEGACY, RAM } from "../balance";
import type { Collector } from "../entities/collector";
import { type Controls, LASH_FRAMES, NO_CONTROLS } from "../entities/hero";
import type { Legacy } from "../entities/legacy";
import { skipAhead } from "../dev/tools";
import { CAMPAIGN, parseCampaign } from "../levels/campaign";
import { parseLevel } from "../levels/level";
import { CUES, type Cue, createCues } from "./cues";
import {
  type World,
  createWorld,
  hudOf,
  skipIntro,
  startIntro,
  step,
  toggleSound,
} from "./world";

const rooms = parseCampaign();

function start(world: World): World {
  startIntro(world);
  skipIntro(world);
  return world;
}

function arena(floor: string, extra: Record<number, string> = {}): World {
  const rows = [
    "##############################",
    ...Array.from(
      { length: 5 },
      (_, index) => extra[index + 1] ?? "#                            #",
    ),
    floor,
    "##############################",
  ];
  return start(
    createWorld([{ slot: CAMPAIGN[0], level: parseLevel(rows) }], {
      reducedMotion: false,
      seed: 3,
    }),
  );
}

function run(world: World, frames: number, controls: Partial<Controls> = {}) {
  for (let frame = 0; frame < frames; frame++) {
    step(world, { ...NO_CONTROLS, ...controls });
  }
}

function heard(world: World): Cue[] {
  return CUES.filter((name) => world.cues[name] > 0);
}

describe("sound cues", () => {
  it("start at zero for every sound", () => {
    expect(Object.values(createCues()).every((count) => count === 0)).toBe(
      true,
    );
  });

  it("crack the whip, hit, smash and break what it touches", () => {
    const world = arena("#S x                        E#", {
      5: "#  f                         #",
    });
    world.room.enemies[0].cooldown = 10_000;
    run(world, 1, { attackPressed: true });
    run(world, LASH_FRAMES - 1);
    expect(heard(world)).toEqual(
      expect.arrayContaining(["whip", "hit", "break"]),
    );
    run(world, 1, { attackPressed: true });
    run(world, LASH_FRAMES - 1);
    expect(world.cues.smash).toBe(1);
  });

  it("chime on pickups and buzz when the Admin gets hurt", () => {
    const world = arena("#S                          E#");
    const [drop] = world.drops;
    Object.assign(drop, {
      active: true,
      kind: "gc",
      x: world.hero.x,
      y: world.hero.y,
      width: 8,
      height: 8,
    });
    world.hero.ram = 50;
    run(world, 1);
    expect(world.cues.relief).toBe(1);
    const hurt = arena("#S x                        E#");
    hurt.room.enemies[0].x = hurt.hero.x;
    run(hurt, 1);
    expect(hurt.cues.hurt).toBe(1);
    expect(hurt.hero.ram).toBeGreaterThan(RAM.start);
  });

  it("play a sound for each subweapon and for the door", () => {
    const world = start(createWorld(rooms, { reducedMotion: false }));
    run(world, 1, { subweaponPressed: true });
    expect(world.cues.select).toBe(1);
    skipAhead(world);
    run(world, 1);
    expect(world.cues.door).toBe(1);
  });

  it("follow the bosses' moves", () => {
    const world = start(createWorld([rooms[5]], { reducedMotion: false }));
    const collector = world.room.boss as Collector;
    world.hero.x = collector.trigger;
    world.hero.invulnerable = 100_000;
    run(world, 1 + COLLECTOR.introFrames + COLLECTOR.hoverFrames * 4 + 600);
    expect(heard(world)).toEqual(
      expect.arrayContaining(["slash", "mark", "sweep"]),
    );
    skipAhead(world);
    expect(world.cues.bossDown).toBe(1);

    const throne = start(createWorld([rooms[8]], { reducedMotion: false }));
    const legacy = throne.room.boss as Legacy;
    throne.hero.x = legacy.trigger;
    throne.hero.invulnerable = 100_000;
    run(throne, 1 + LEGACY.introFrames + 2000);
    expect(heard(throne)).toEqual(
      expect.arrayContaining(["card", "vanish", "appear", "landing", "call"]),
    );
    for (const name of CUES) {
      throne.cues[name] = 0;
    }
    legacy.state = "throne";
    skipAhead(throne);
    expect(heard(throne)).toEqual(
      expect.arrayContaining(["bossHit", "rollback"]),
    );
  });
});

describe("sound switch", () => {
  it("mutes, unmutes and tells the player each time", () => {
    const world = start(createWorld(rooms, { reducedMotion: false }));
    expect(hudOf(world).muted).toBe(false);
    toggleSound(world);
    expect(world.muted).toBe(true);
    expect(hudOf(world)).toMatchObject({ muted: true, notice: "soundOff" });
    toggleSound(world);
    expect(hudOf(world)).toMatchObject({ muted: false, notice: "soundOn" });
    expect(
      createWorld(rooms, { reducedMotion: false, muted: true }).muted,
    ).toBe(true);
  });
});
