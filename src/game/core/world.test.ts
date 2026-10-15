import { describe, expect, it } from "vitest";
import {
  COLLECTOR,
  HURT,
  LEGACY,
  PASSAGE_FRAMES,
  QUERY_ENERGY,
  ENEMY_DYING_FRAMES,
  RAM,
  RETRY,
  VIBE,
  ZOMBIE,
} from "../balance";
import { overload, skipAhead } from "../dev/tools";
import { damageEnemy } from "../entities/enemy";
import { type Controls, NO_CONTROLS, grantSubweapon } from "../entities/hero";
import { CAMPAIGN, parseCampaign } from "../levels/campaign";
import { type Cell, type Level, TILE, parseLevel } from "../levels/level";
import {
  INTRO_FRAMES,
  INTRO_RISE,
  STILL_INTRO_FRAMES,
  type World,
  createWorld,
  enterSlot,
  hudOf,
  introProgress,
  isOpen,
  isSaved,
  pause,
  resume,
  retry,
  skipIntro,
  startIntro,
  step,
} from "./world";

const rooms = parseCampaign();
const entrance = rooms[0].level;
const SLOT = { vibe: 2, collector: 5, staircase: 6, throne: 8 } as const;

function exitOf(level: Level): Cell {
  if (!level.exit) {
    throw new Error("This room has no exit");
  }
  return level.exit;
}

function run(world: World, frames: number, controls: Partial<Controls> = {}) {
  for (let frame = 0; frame < frames; frame++) {
    step(world, { ...NO_CONTROLS, ...controls });
  }
}

function playing(reducedMotion = false): World {
  const world = createWorld(rooms, { reducedMotion });
  startIntro(world);
  skipIntro(world);
  return world;
}

function crash(world: World) {
  while (world.mode === "playing") {
    overload(world);
    run(world, HURT.invulnerableFrames);
  }
}

function walkThroughDoor(world: World) {
  const from = world.room.index;
  skipAhead(world);
  run(world, 1);
  run(world, PASSAGE_FRAMES);
  expect(world.room.index).toBe(from + 1);
}

function enterRoom(world: World, index: number) {
  while (world.room.index < index) {
    const { boss } = world.room;
    if (boss && boss.state !== "gone") {
      boss.state = "gone";
    }
    walkThroughDoor(world);
  }
}

function wakeBoss(world: World) {
  const { boss } = world.room;
  if (!boss) {
    throw new Error("This room has no boss");
  }
  world.hero.x = boss.trigger;
  run(world, 1);
  return boss;
}

function reachSavepoint(world: World): Cell {
  const [savepoint] = world.room.level.places.checkpoint;
  world.hero.x = savepoint.column * TILE + 8;
  run(world, 2);
  return savepoint;
}

describe("opening", () => {
  it("waits on the title screen with the camera up in the sky", () => {
    const world = createWorld(rooms, { reducedMotion: false });
    const { x, y } = world.hero;
    run(world, 30, { right: true });
    expect(world.mode).toBe("title");
    expect(world.camera.y).toBe(world.restY - INTRO_RISE);
    expect(world.hero).toMatchObject({ x, y });
    expect(introProgress(world)).toBe(0);
  });

  it("descends from the moon to the gate and hands over the controls", () => {
    const world = createWorld(rooms, { reducedMotion: false });
    startIntro(world);
    run(world, INTRO_FRAMES / 2);
    expect(world.mode).toBe("intro");
    expect(world.camera.y).toBeGreaterThan(world.restY - INTRO_RISE);
    expect(world.camera.y).toBeLessThan(world.restY);
    run(world, INTRO_FRAMES / 2);
    expect(world.mode).toBe("playing");
    expect(world.camera.y).toBe(world.restY);
  });

  it("can be skipped with Enter", () => {
    const world = createWorld(rooms, { reducedMotion: false });
    startIntro(world);
    run(world, 10);
    skipIntro(world);
    expect(world.mode).toBe("playing");
    expect(world.camera.y).toBe(world.restY);
  });

  it("cuts instead of panning when motion is reduced", () => {
    const world = createWorld(rooms, { reducedMotion: true });
    startIntro(world);
    const heights = new Set<number>();
    for (let frame = 0; frame < STILL_INTRO_FRAMES - 1; frame++) {
      run(world, 1);
      heights.add(world.camera.y);
    }
    expect([...heights].sort((a, b) => a - b)).toEqual([
      world.restY - INTRO_RISE,
      world.restY,
    ]);
    run(world, 1);
    expect(world.mode).toBe("playing");
  });

  it("needs at least one room", () => {
    expect(() => createWorld([], { reducedMotion: false })).toThrow(
      "at least one room",
    );
  });
});

describe("playing", () => {
  it("counts the play time only while the game runs", () => {
    const world = createWorld(rooms, { reducedMotion: false });
    run(world, 20);
    startIntro(world);
    run(world, 20);
    expect(world.playFrames).toBe(0);
    skipIntro(world);
    run(world, 30);
    pause(world);
    run(world, 30);
    expect(world.playFrames).toBe(30);
  });

  it("freezes everything while paused", () => {
    const world = playing();
    pause(world);
    const { x } = world.hero;
    run(world, 30, { right: true });
    expect(world.mode).toBe("paused");
    expect(world.hero.x).toBe(x);
    resume(world);
    run(world, 30, { right: true });
    expect(world.hero.x).toBeGreaterThan(x);
  });

  it("follows the hero into the castle", () => {
    const world = playing();
    run(world, 400, { right: true });
    expect(world.camera.x).toBeGreaterThan(0);
    expect(world.camera.x).toBeCloseTo(
      world.hero.x + world.hero.width / 2 - 160,
    );
  });

  it("crosses the entrance walking right and goes through the BKP door", () => {
    const world = playing();
    const door = exitOf(entrance);
    let hold = 0;
    for (
      let frame = 0;
      frame < 4000 && world.room.index === 0 && world.passage === 0;
      frame++
    ) {
      world.hero.invulnerable = 2;
      const blocked = world.hero.grounded && world.hero.vx === 0 && frame > 0;
      if (blocked && hold === 0) {
        hold = 24;
      }
      step(world, {
        ...NO_CONTROLS,
        right: true,
        jump: hold > 0,
        jumpPressed: hold === 24,
      });
      hold = Math.max(hold - 1, 0);
    }
    expect(world.hero.x).toBeGreaterThanOrEqual(door.column * TILE - TILE);
    expect(world.checkpoint.cell).toEqual(entrance.places.checkpoint.at(-1));
    run(world, PASSAGE_FRAMES);
    expect(world.room.index).toBe(1);
    expect(world.checkpoint).toMatchObject({
      room: 1,
      cell: rooms[1].level.start,
    });
  });

  it("keeps every pool at the same size however long it runs", () => {
    const world = playing();
    const sizes = [
      world.projectiles.length,
      world.particles.length,
      world.drops.length,
    ];
    for (let frame = 0; frame < 3000; frame++) {
      step(world, {
        ...NO_CONTROLS,
        right: frame % 400 < 300,
        left: frame % 400 >= 300,
        attackPressed: frame % 30 === 0,
        subweaponPressed: frame % 45 === 0,
        jumpPressed: frame % 50 === 0,
        jump: frame % 50 < 20,
      });
      if (world.mode === "crash") {
        retry(world);
      }
    }
    expect([
      world.projectiles.length,
      world.particles.length,
      world.drops.length,
    ]).toEqual(sizes);
  });

  it("wakes the enemies near the camera only, also up and down", () => {
    const world = playing();
    enterRoom(world, SLOT.staircase);
    const asleep = world.room.enemies.filter(
      (enemy) => enemy.y < world.camera.y - 2 * TILE * 4,
    );
    expect(asleep.length).toBeGreaterThan(0);
    const before = asleep.map((enemy) => [enemy.x, enemy.y]);
    run(world, 60);
    expect(asleep.map((enemy) => [enemy.x, enemy.y])).toEqual(before);
  });
});

describe("doors and rooms", () => {
  it("fades through the door, enters the next slot and saves there", () => {
    const world = playing();
    skipAhead(world);
    run(world, 1);
    expect(world.mode).toBe("playing");
    expect(world.passage).toBe(PASSAGE_FRAMES);
    expect(world.cues.door).toBe(1);
    run(world, PASSAGE_FRAMES / 2 - 1);
    expect(world.room.index).toBe(0);
    run(world, 1);
    expect(world.room.index).toBe(1);
    expect(world.hero.x).toBe(rooms[1].level.start.column * TILE + 2);
    run(world, PASSAGE_FRAMES / 2);
    expect(world.passage).toBe(0);
    expect(world.checkpoint.room).toBe(1);
  });

  it("tells screen readers which stage begins, without a message on screen", () => {
    const world = playing();
    expect(hudOf(world).notice).toBe("arrival");
    walkThroughDoor(world);
    expect(hudOf(world)).toMatchObject({
      notice: "arrival",
      slot: { kind: "stage", stage: "catacombs", number: 2 },
    });
    walkThroughDoor(world);
    expect(hudOf(world).notice).toBeNull();
  });

  it("keeps a boss door locked until the boss is gone", () => {
    for (const index of [SLOT.vibe, SLOT.collector]) {
      const world = playing();
      enterRoom(world, index);
      expect(isOpen(world.room)).toBe(false);
      world.hero.x = exitOf(world.room.level).column * TILE + 4;
      run(world, 2);
      expect(world.mode).toBe("playing");
      const boss = wakeBoss(world);
      boss.state = "gone";
      expect(isOpen(world.room)).toBe(true);
      walkThroughDoor(world);
    }
  });

  it("plays the whole campaign up to the throne room", () => {
    const world = playing();
    enterRoom(world, SLOT.throne);
    expect(world.rooms).toHaveLength(9);
    expect(world.room.level.exit).toBeNull();
    expect(world.room.boss?.kind).toBe("legacy");
  });
});

describe("slot entry", () => {
  it("caps the RAM when the Admin walks into the next slot", () => {
    const world = playing();
    world.hero.ram = 80;
    walkThroughDoor(world);
    expect(world.hero.ram).toBe(RAM.entryCeiling);
    expect(world.entry.ram).toBe(RAM.entryCeiling);
  });

  it("keeps a lower RAM as it is", () => {
    const world = playing();
    world.hero.ram = 35;
    walkThroughDoor(world);
    expect(world.hero.ram).toBe(35);
  });

  it("takes a picture of the Admin on the way in", () => {
    const world = playing();
    grantSubweapon(world.hero, "join");
    world.hero.energy = 12;
    walkThroughDoor(world);
    expect(world.entry).toEqual({
      ram: RAM.start,
      energy: 12,
      subweapons: ["select", "join"],
      subweapon: 1,
      firewall: 0,
      readme: false,
    });
  });
});

describe("bosses", () => {
  it("shows the boss bar once the fight starts and counts its health", () => {
    const world = playing();
    enterRoom(world, SLOT.collector);
    expect(hudOf(world).boss).toBeNull();
    wakeBoss(world);
    run(world, COLLECTOR.introFrames);
    expect(hudOf(world).boss).toEqual({
      kind: "collector",
      health: COLLECTOR.health,
    });
    expect(world.noticeFrames).toBeGreaterThan(0);
    expect(world.notice).toBe("collector");
  });

  it("drops the GC item when the Garbage Collector falls", () => {
    const world = playing();
    enterRoom(world, SLOT.collector);
    wakeBoss(world);
    run(world, COLLECTOR.introFrames + 1);
    skipAhead(world);
    expect(world.room.boss?.state).toBe("defeat");
    run(world, COLLECTOR.defeatFrames);
    expect(world.room.boss?.state).toBe("gone");
    expect(world.drops.some((drop) => drop.active && drop.kind === "gc")).toBe(
      true,
    );
    expect(world.notice).toBe("freed");
    expect(hudOf(world).boss).toBeNull();
  });

  it("restarts the fight from the boss door after a crash", () => {
    const world = playing();
    enterRoom(world, SLOT.collector);
    const boss = wakeBoss(world);
    run(world, COLLECTOR.introFrames + 1);
    world.hero.energy = 0;
    crash(world);
    expect(world.mode).toBe("crash");
    retry(world);
    expect(world.mode).toBe("playing");
    expect(world.room.index).toBe(SLOT.collector);
    expect(boss.state).toBe("dormant");
    expect(world.hero.ram).toBe(RAM.start);
    expect(world.hero.energy).toBe(QUERY_ENERGY.start);
    expect(world.hero.x).toBe(world.room.level.start.column * TILE + 2);
  });

  it("rolls back once, commits on the second defeat and ends in victory", () => {
    const world = playing();
    enterRoom(world, SLOT.throne);
    const boss = wakeBoss(world);
    run(world, LEGACY.introFrames + 1);
    skipAhead(world);
    expect(boss.state).toBe("rollback");
    expect(world.notice).toBe("rollback");
    run(world, LEGACY.rollbackFrames);
    expect(boss.health).toBe(LEGACY.rollbackHealth);
    expect(hudOf(world).boss).toEqual({
      kind: "legacy",
      health: LEGACY.rollbackHealth,
    });
    skipAhead(world);
    expect(boss.state).toBe("commit");
    run(world, LEGACY.commitFrames);
    expect(world.mode).toBe("victory");
    const frames = world.playFrames;
    run(world, 30);
    expect(world.playFrames).toBe(frames);
    retry(world);
    expect(world.mode).toBe("victory");
  });

  it("rolls back only on the final boss", () => {
    for (const [index, intro] of [
      [SLOT.vibe, VIBE.introFrames],
      [SLOT.collector, COLLECTOR.introFrames],
    ] as const) {
      const world = playing();
      enterRoom(world, index);
      const boss = wakeBoss(world);
      run(world, intro + 1);
      skipAhead(world);
      expect(boss.state).toBe("defeat");
      expect(world.notice).not.toBe("rollback");
    }
  });
});

describe("RAM and Crash", () => {
  it("crashes at 100% and tries again from the last savepoint", () => {
    const world = playing();
    const savepoint = reachSavepoint(world);
    expect(world.checkpoint.cell).toEqual(savepoint);
    const played = world.playFrames;
    crash(world);
    expect(world.mode).toBe("crash");
    expect(world.hero.ram).toBe(RAM.crash);
    const frozen = world.playFrames;
    run(world, 30, { right: true });
    expect(world.playFrames).toBe(frozen);
    retry(world);
    expect(world.mode).toBe("playing");
    expect(world.hero.ram).toBe(RAM.start);
    expect(world.hero.x).toBe(savepoint.column * TILE + 2);
    expect(world.playFrames).toBeGreaterThan(played);
  });

  it("only retries after a crash", () => {
    const world = playing();
    world.hero.ram = 70;
    retry(world);
    expect(world.hero.ram).toBe(70);
  });

  it("reports the HUD values", () => {
    const world = playing();
    world.hero.ram = 33.4;
    expect(hudOf(world)).toEqual({
      mode: "playing",
      room: 0,
      slot: { kind: "stage", stage: "racks", number: 1, total: 6 },
      ram: 33,
      energy: QUERY_ENERGY.start,
      subweapon: "select",
      cloudReady: true,
      notice: "arrival",
      notices: 1,
      boss: null,
      card: false,
      speech: null,
      said: 0,
      boosts: { firewall: false, index: 0, cache: 0, readme: false },
      muted: false,
    });
  });

  it("names the boss of a boss slot and numbers the stages after it", () => {
    const world = playing();
    enterRoom(world, SLOT.vibe);
    expect(hudOf(world)).toMatchObject({
      room: SLOT.vibe,
      slot: { kind: "boss", boss: "vibe" },
    });
    enterRoom(world, SLOT.vibe + 1);
    expect(hudOf(world).slot).toEqual({
      kind: "stage",
      stage: "tapes",
      number: 3,
      total: 6,
    });
    enterRoom(world, SLOT.throne);
    expect(hudOf(world).slot).toEqual({ kind: "boss", boss: "legacy" });
  });
});

describe("savepoints", () => {
  it("light up and say so when the Admin walks by", () => {
    const world = playing();
    expect(isSaved(world, world.room, 0)).toBe(false);
    reachSavepoint(world);
    expect(isSaved(world, world.room, 0)).toBe(true);
    expect(isSaved(world, world.room, 1)).toBe(false);
    expect(hudOf(world).notice).toBe("savepoint");
  });

  it("stay quiet while another message is on screen", () => {
    const world = playing();
    grantSubweapon(world.hero, "join");
    world.notice = "join";
    world.noticeFrames = 100;
    reachSavepoint(world);
    expect(isSaved(world, world.room, 0)).toBe(true);
    expect(world.notice).toBe("join");
  });
});

describe("retry", () => {
  it("resets enemies, disks and shots", () => {
    const world = playing();
    const [enemy] = world.room.enemies;
    enemy.alive = false;
    world.room.containers[0].broken = true;
    world.hero.ram = RAM.crash;
    step(world, NO_CONTROLS);
    expect(world.mode).toBe("crash");
    retry(world);
    expect(enemy.alive).toBe(true);
    expect(world.room.containers[0].broken).toBe(false);
    expect(world.projectiles.some((shot) => shot.active)).toBe(false);
  });

  it("goes back to the state the Admin had on the way into the slot", () => {
    const world = playing();
    const relic = world.room.relics.find(({ kind }) => kind === "join");
    if (!relic) {
      throw new Error("The entrance needs a JOIN relic");
    }
    relic.taken = true;
    grantSubweapon(world.hero, "join");
    world.hero.energy = 30;
    reachSavepoint(world);
    world.hero.ram = RAM.crash;
    step(world, NO_CONTROLS);
    retry(world);
    expect(world.hero.subweapons).toEqual(["select"]);
    expect(world.hero.subweapon).toBe(0);
    expect(world.hero.energy).toBe(QUERY_ENERGY.start);
    expect(world.hero.ram).toBe(RAM.start);
    expect(relic.taken).toBe(false);
  });

  it("keeps what the Admin brought into the slot", () => {
    const world = playing();
    grantSubweapon(world.hero, "join");
    world.hero.energy = 3;
    world.hero.ram = 70;
    enterSlot(world, 0);
    const relic = world.room.relics.find(({ kind }) => kind === "join");
    expect(relic?.taken).toBe(true);
    world.hero.ram = RAM.crash;
    step(world, NO_CONTROLS);
    retry(world);
    expect(world.hero.subweapons).toEqual(["select", "join"]);
    expect(world.hero.energy).toBe(QUERY_ENERGY.start);
    expect(world.hero.ram).toBe(RAM.entryCeiling - RETRY.relief);
    expect(relic?.taken).toBe(true);
  });

  it("lowers the RAM a little more on every retry of the same slot", () => {
    const world = playing();
    world.hero.ram = 70;
    enterSlot(world, 0);
    const crashAndRetry = () => {
      world.hero.ram = RAM.crash;
      step(world, NO_CONTROLS);
      retry(world);
      return world.hero.ram;
    };
    const rams = [crashAndRetry(), crashAndRetry(), crashAndRetry()];
    expect(rams).toEqual([
      RAM.entryCeiling - RETRY.relief,
      RAM.entryCeiling - RETRY.relief * 2,
      RAM.entryCeiling - RETRY.relief * 3,
    ]);
    for (let attempt = 0; attempt < 10; attempt++) {
      crashAndRetry();
    }
    expect(world.hero.ram).toBe(RETRY.floor);
    enterSlot(world, 0);
    expect(world.attempts).toBe(0);
    expect(crashAndRetry()).toBe(RETRY.floor);
  });

  it("never raises the RAM the Admin had on the way in", () => {
    const world = playing();
    world.hero.ram = RETRY.floor - 5;
    enterSlot(world, 0);
    world.hero.ram = RAM.crash;
    step(world, NO_CONTROLS);
    retry(world);
    expect(world.hero.ram).toBe(RETRY.floor - 5);
  });
});

function sandbox(map: readonly string[]): World {
  const world = createWorld([{ slot: CAMPAIGN[0], level: parseLevel(map) }], {
    reducedMotion: false,
    seed: 4,
  });
  startIntro(world);
  skipIntro(world);
  return world;
}

describe("boosts", () => {
  it("keeps the Firewall and the README from the way in and drops the Index and the Cache on a retry", () => {
    const world = playing();
    world.hero.firewall = 1;
    world.hero.readme = true;
    walkThroughDoor(world);
    expect(world.entry).toMatchObject({ firewall: 1, readme: true });
    world.hero.firewall = 0;
    world.hero.readme = false;
    world.hero.index = 300;
    world.hero.cache = 300;
    world.hero.ram = RAM.crash;
    step(world, NO_CONTROLS);
    retry(world);
    expect(world.hero).toMatchObject({
      firewall: 1,
      readme: true,
      index: 0,
      cache: 0,
    });
  });

  it("shows the boosts in the HUD with whole seconds left", () => {
    const world = playing();
    world.hero.firewall = 1;
    world.hero.index = 61;
    world.hero.cache = 60;
    world.hero.readme = true;
    expect(hudOf(world).boosts).toEqual({
      firewall: true,
      index: 2,
      cache: 1,
      readme: true,
    });
  });
});

describe("new mobs in the world", () => {
  it("raises zombies with a rumble and a burst of dirt", () => {
    const world = sandbox([
      "##############################",
      "#                            #",
      "#                            #",
      "#S       z                  E#",
      "##############################",
    ]);
    const [zombie] = world.room.enemies;
    world.hero.x = 6 * TILE;
    run(world, 1);
    expect(zombie.state).toBe("rise");
    expect(world.cues.rise).toBe(1);
    expect(world.particles.some((particle) => particle.active)).toBe(true);
    run(world, ZOMBIE.riseFrames);
    expect(zombie.state).toBe("shamble");
  });

  it("brings a second zombie out of the same grave and then no more", () => {
    const world = sandbox([
      "##############################",
      "#                            #",
      "#                            #",
      "#S       z                  E#",
      "##############################",
    ]);
    const [zombie] = world.room.enemies;
    world.hero.x = 6 * TILE;
    world.hero.invulnerable = 100_000;
    run(world, ZOMBIE.riseFrames + 2);
    damageEnemy(zombie, ZOMBIE.health, 0);
    run(
      world,
      ENEMY_DYING_FRAMES + ZOMBIE.regrowFrames + ZOMBIE.riseFrames + 2,
    );
    expect(zombie).toMatchObject({ alive: true, state: "shamble" });
    world.hero.invulnerable = 100_000;
    damageEnemy(zombie, ZOMBIE.health, 0);
    run(
      world,
      ENEMY_DYING_FRAMES + ZOMBIE.regrowFrames + ZOMBIE.riseFrames + 2,
    );
    expect(zombie.alive).toBe(false);
  });

  it("puts loose items back when the Admin retries", () => {
    const world = sandbox([
      "##############################",
      "#                            #",
      "#                            #",
      "#S w                        E#",
      "##############################",
    ]);
    run(world, 40, { right: true });
    expect(world.room.pickups[0].taken).toBe(true);
    world.hero.ram = RAM.crash;
    step(world, NO_CONTROLS);
    retry(world);
    expect(world.room.pickups[0].taken).toBe(false);
    expect(world.hero.firewall).toBe(0);
  });
});
