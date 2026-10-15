import { describe, expect, it } from "vitest";
import { HURT, PASSAGE_FRAMES, RAM, VIBE, ZOMBIE } from "../balance";
import {
  type World,
  createWorld,
  skipIntro,
  startIntro,
  step,
} from "../core/world";
import { createZones, damageEnemy } from "../entities/enemy";
import { NO_CONTROLS } from "../entities/hero";
import { parseCampaign } from "../levels/campaign";
import { TILE, parseLevel } from "../levels/level";
import {
  DEV_MARKER,
  type DevHost,
  type DevState,
  MOB_COUNTS,
  describeTools,
  jumpTo,
  overload,
  pressDevKey,
  skipAhead,
  sustain,
  testRoomMap,
} from "./tools";

const rooms = parseCampaign();

function playing(): World {
  const world = createWorld(rooms, { reducedMotion: false });
  startIntro(world);
  skipIntro(world);
  return world;
}

function setup(world = playing()): {
  host: DevHost;
  state: DevState;
  shown: World[];
} {
  let current = world;
  const shown: World[] = [];
  const host: DevHost = {
    current: () => current,
    show: (next) => {
      current = next;
      shown.push(next);
    },
    refresh: () => {},
  };
  const state: DevState = {
    open: false,
    infinite: false,
    zombies: MOB_COUNTS[0],
    knights: MOB_COUNTS[0],
    testing: false,
    campaign: world,
  };
  return { host, state, shown };
}

function run(world: World, frames: number) {
  for (let frame = 0; frame < frames; frame++) {
    step(world, NO_CONTROLS);
  }
}

function count(world: World, kind: string): number {
  return world.room.enemies.filter((enemy) => enemy.kind === kind).length;
}

describe("dev tools", () => {
  it("carries the marker that proves they stay out of production", () => {
    expect(DEV_MARKER).toBe("dev-tools:campaign-marker");
  });

  it("jumps to any slot, even from the title screen", () => {
    const world = createWorld(rooms, { reducedMotion: false });
    jumpTo(world, 5);
    expect(world.mode).toBe("playing");
    expect(world.room.index).toBe(5);
    expect(world.checkpoint).toMatchObject({ room: 5, mark: -1 });
    expect(world.room.boss?.state).toBe("dormant");
  });

  it("brings a beaten boss back for another round", () => {
    const world = playing();
    jumpTo(world, 2);
    const { boss } = world.room;
    if (!boss) {
      throw new Error("The slot needs a boss");
    }
    boss.state = "gone";
    jumpTo(world, 2);
    expect(boss.state).toBe("dormant");
  });

  it("cancels a passage on the way", () => {
    const world = playing();
    skipAhead(world);
    run(world, 1);
    expect(world.passage).toBe(PASSAGE_FRAMES);
    jumpTo(world, 7);
    expect(world).toMatchObject({ mode: "playing", passage: 0 });
    run(world, PASSAGE_FRAMES);
    expect(world.room.index).toBe(7);
  });

  it("ignores slots that do not exist", () => {
    const world = playing();
    jumpTo(world, 42);
    expect(world.room.index).toBe(0);
  });

  it("raises the RAM only while playing, up to a crash", () => {
    const title = createWorld(rooms, { reducedMotion: false });
    overload(title);
    expect(title.hero.ram).toBe(RAM.start);
    const world = playing();
    overload(world);
    expect(world.hero.ram).toBe(RAM.start + RAM.devOverload);
    while (world.mode === "playing") {
      run(world, HURT.invulnerableFrames);
      overload(world);
    }
    expect(world.mode).toBe("crash");
  });

  it("walks to the door, or finishes the boss in front of the Admin", () => {
    const world = playing();
    const { exit } = world.room.level;
    skipAhead(world);
    expect(world.hero.x).toBe((exit?.column ?? 0) * TILE + 2);
    jumpTo(world, 2);
    const { boss } = world.room;
    skipAhead(world);
    expect(boss?.state).toBe("dormant");
    if (boss) {
      world.hero.x = boss.trigger;
    }
    run(world, 1);
    skipAhead(world);
    expect(boss?.state).toBe("intro");
    run(world, VIBE.introFrames);
    skipAhead(world);
    expect(boss?.state).toBe("defeat");
  });

  it("keeps the RAM low while the infinite RAM is on", () => {
    const { state } = setup();
    const world = state.campaign;
    world.hero.ram = 90;
    sustain(world, state);
    expect(world.hero.ram).toBe(90);
    state.infinite = true;
    sustain(world, state);
    expect(world.hero.ram).toBe(RAM.start);
  });

  it("opens with F9 and only then takes the slot and infinite RAM keys", () => {
    const { host, state } = setup();
    const world = host.current();
    expect(pressDevKey(host, state, "Digit6")).toBe(false);
    expect(pressDevKey(host, state, "KeyI")).toBe(false);
    expect(world.room.index).toBe(0);
    expect(pressDevKey(host, state, "F9")).toBe(true);
    expect(state.open).toBe(true);
    expect(pressDevKey(host, state, "Digit6")).toBe(true);
    expect(world.room.index).toBe(5);
    expect(pressDevKey(host, state, "Numpad9")).toBe(true);
    expect(world.room.index).toBe(8);
    expect(pressDevKey(host, state, "KeyI")).toBe(true);
    expect(state.infinite).toBe(true);
    expect(pressDevKey(host, state, "KeyZ")).toBe(false);
  });

  it("keeps the old RAM and skip keys working with the panel closed", () => {
    const { host, state } = setup();
    const world = host.current();
    expect(pressDevKey(host, state, "Equal")).toBe(true);
    world.hero.invulnerable = 0;
    expect(pressDevKey(host, state, "NumpadAdd")).toBe(true);
    expect(world.hero.ram).toBe(RAM.start + 2 * RAM.devOverload);
    const { exit } = world.room.level;
    expect(pressDevKey(host, state, "PageDown")).toBe(true);
    expect(world.hero.x).toBe((exit?.column ?? 0) * TILE + 2);
    expect(pressDevKey(host, state, "BracketRight")).toBe(true);
    expect(state.open).toBe(false);
  });

  it("lists the slots and the test room and points at the current one", () => {
    const { host, state } = setup();
    jumpTo(host.current(), 2);
    const lines = describeTools(state).split("\n");
    expect(lines).toContain("  1  stage  racks");
    expect(lines).toContain("> 3  boss   vibe");
    expect(lines).toContain("  9  boss   legacy");
    expect(lines).toContain("  0  test room: 1 zombie, 1 knight");
    expect(lines).toContain("  I     infinite RAM: off");
  });
});

describe("dev test room", () => {
  it("builds a closed room with every item and the chosen mobs", () => {
    const map = testRoomMap(4, 8);
    expect(new Set(map.map((row) => row.length)).size).toBe(1);
    const level = parseLevel(map);
    expect(level.exit).toBeNull();
    for (const place of [
      "firewall",
      "index",
      "cache",
      "backup",
      "readme",
      "disk",
      "pen",
      "drop",
      "join",
      "truncate",
      "checkpoint",
    ] as const) {
      expect(level.places[place].length, place).toBeGreaterThan(0);
    }
    expect(level.places.tape).toHaveLength(3);
    expect(level.places.zombie).toHaveLength(4);
    expect(level.places.dropKnight).toHaveLength(8);
    expect(createZones(level)).toHaveLength(1);
  });

  it("opens in its own world and goes back to the campaign with a digit", () => {
    const { host, state, shown } = setup();
    pressDevKey(host, state, "F9");
    expect(pressDevKey(host, state, "Digit0")).toBe(true);
    const test = host.current();
    expect(shown).toEqual([test]);
    expect(test).not.toBe(state.campaign);
    expect(test.mode).toBe("playing");
    expect(state.testing).toBe(true);
    expect(describeTools(state).split("\n")).toContain(
      "> 0  test room: 1 zombie, 1 knight",
    );
    pressDevKey(host, state, "Digit4");
    expect(host.current()).toBe(state.campaign);
    expect(state.campaign.room.index).toBe(3);
    expect(state.testing).toBe(false);
  });

  it("cycles 1, 4 and 8 of each mob and rebuilds the room", () => {
    const { host, state } = setup();
    pressDevKey(host, state, "F9");
    pressDevKey(host, state, "Digit0");
    expect(count(host.current(), "zombie")).toBe(1);
    pressDevKey(host, state, "KeyU");
    expect(count(host.current(), "zombie")).toBe(4);
    pressDevKey(host, state, "KeyU");
    expect(count(host.current(), "zombie")).toBe(8);
    pressDevKey(host, state, "KeyK");
    pressDevKey(host, state, "KeyK");
    expect(count(host.current(), "dropKnight")).toBe(8);
    pressDevKey(host, state, "KeyU");
    expect(state.zombies).toBe(1);
  });

  it("raises at most four zombies at once and the next one when one falls", () => {
    const { host, state } = setup();
    pressDevKey(host, state, "F9");
    state.zombies = 8;
    pressDevKey(host, state, "Digit0");
    const test = host.current();
    const zombies = test.room.enemies.filter(
      (enemy) => enemy.kind === "zombie",
    );
    const [zone] = test.room.zones;
    test.hero.x = zone.left + TILE;
    test.hero.invulnerable = 100_000;
    run(test, ZOMBIE.riseStagger * 8);
    const risen = () => zombies.filter((zombie) => zombie.state !== "buried");
    expect(risen()).toHaveLength(ZOMBIE.aliveCap);
    const [first] = risen();
    damageEnemy(first, ZOMBIE.health, 0);
    run(test, 2);
    expect(risen()).toHaveLength(ZOMBIE.aliveCap + 1);
  });
});
