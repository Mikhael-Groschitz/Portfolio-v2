import { describe, expect, it } from "vitest";
import {
  COLLECTOR,
  DAMAGE,
  LEGACY,
  QUAKE_FRAMES,
  RAM,
  VIBE,
  WHIP,
} from "../balance";
import { hitBoss } from "../core/bosses";
import {
  type World,
  createWorld,
  hudOf,
  isOpen,
  retry,
  skipIntro,
  startIntro,
  step,
} from "../core/world";
import { parseCampaign } from "../levels/campaign";
import { damageBoss, isVulnerable } from "./boss";
import { type Enemy, centerX, damageEnemy } from "./enemy";
import { type Controls, NO_CONTROLS } from "./hero";
import { type Projectile, launch } from "./projectiles";
import {
  FINAL_ACTS,
  OPENING_ACTS,
  type Vibe,
  hallucinationOf,
  nextAct,
  pasteTargets,
  vibeLine,
} from "./vibe";

const room = parseCampaign().find(
  ({ slot }) => slot.kind === "boss" && slot.boss === "vibe",
);

function arena(): { world: World; boss: Vibe } {
  if (!room) {
    throw new Error("The campaign has no Vibe room");
  }
  const world = createWorld([room], { reducedMotion: false, seed: 7 });
  startIntro(world);
  skipIntro(world);
  const { boss } = world.room;
  if (boss?.kind !== "vibe") {
    throw new Error("The Vibe room needs the Vibe");
  }
  return { world, boss };
}

function run(world: World, frames: number, controls: Partial<Controls> = {}) {
  for (let frame = 0; frame < frames; frame++) {
    step(world, { ...NO_CONTROLS, ...controls });
  }
}

function wake(world: World, boss: Vibe) {
  world.hero.x = boss.trigger;
  run(world, 1);
}

function fighting(): { world: World; boss: Vibe } {
  const { world, boss } = arena();
  wake(world, boss);
  run(world, VIBE.introFrames);
  return { world, boss };
}

function beginAct(world: World, boss: Vibe, act: number) {
  boss.state = "walk";
  boss.timer = 1;
  boss.act = act;
  run(world, 1);
}

function launched(world: World, frames: number): Projectile[] {
  const seen: Projectile[] = [];
  for (let frame = 0; frame < frames; frame++) {
    step(world, NO_CONTROLS);
    for (const projectile of world.projectiles) {
      if (projectile.active && projectile.age === 1) {
        seen.push({ ...projectile });
      }
    }
  }
  return seen;
}

function flying(world: World, kind: Projectile["kind"]): Projectile[] {
  return world.projectiles.filter(
    (projectile) => projectile.active && projectile.kind === kind,
  );
}

function copiesOf(world: World): Enemy[] {
  return world.room.enemies.filter((enemy) => enemy.summoned);
}

function shoot(world: World, kind: Projectile["kind"], vx = 0, vy = 0) {
  const { hero } = world;
  return launch(world.projectiles, {
    kind,
    x: hero.x,
    y: hero.y + 4,
    vx,
    vy,
    facing: 1,
    variant: 0,
    token: 0,
  });
}

describe("Vibe Coder entrance", () => {
  it("stands on the floor and waits until the Admin walks in", () => {
    const { world, boss } = arena();
    expect(boss.y + boss.height).toBe(boss.floor);
    run(world, 30);
    expect(boss.state).toBe("dormant");
    expect(hudOf(world)).toMatchObject({
      boss: null,
      card: false,
      speech: null,
    });
  });

  it("shows the name card and its first line while the VIBES bar fills", () => {
    const { world, boss } = arena();
    wake(world, boss);
    expect(boss.state).toBe("intro");
    expect(world.notice).toBe("vibe");
    expect(isVulnerable(boss)).toBe(false);
    expect(hudOf(world)).toMatchObject({
      card: true,
      speech: "intro",
      said: 1,
    });
    run(world, VIBE.introFrames / 2);
    expect(boss.health).toBeGreaterThan(0);
    expect(boss.health).toBeLessThan(VIBE.health);
    run(world, VIBE.introFrames / 2);
    expect(boss.state).toBe("walk");
    expect(hudOf(world)).toMatchObject({
      boss: { kind: "vibe", health: VIBE.health },
      card: false,
    });
  });

  it("has the smallest health bar of the three bosses", () => {
    expect(VIBE.health).toBeLessThan(COLLECTOR.health);
    expect(COLLECTOR.health).toBeLessThan(LEGACY.health);
  });

  it("only speaks for a moment, and the HUD counts every new line", () => {
    const { world, boss } = arena();
    wake(world, boss);
    run(world, VIBE.lineFrames - 1);
    expect(vibeLine(boss)).toBe("intro");
    run(world, 1);
    expect(vibeLine(boss)).toBeNull();
    expect(hudOf(world).speech).toBeNull();
    beginAct(world, boss, 0);
    expect(hudOf(world)).toMatchObject({ speech: "generate", said: 2 });
  });
});

describe("Vibe Coder moves", () => {
  it("keeps its distance from the Admin and never leaves the stage", () => {
    const { world, boss } = fighting();
    boss.state = "walk";
    boss.timer = 1000;
    world.hero.x = boss.x - 20;
    const x = boss.x;
    run(world, 10);
    expect(boss.x).toBeGreaterThan(x);
    expect(boss.stride).toBeGreaterThan(0);
    world.hero.x = 20;
    run(world, 400);
    expect(boss.x).toBeLessThan(x);
    expect(boss.x).toBeGreaterThanOrEqual(boss.left);
    expect(Math.abs(centerX(world.hero) - centerX(boss))).toBeLessThanOrEqual(
      VIBE.keepAway + 32,
    );
  });

  it("cycles through its opening acts, then through the final ones", () => {
    const { boss } = arena();
    expect(OPENING_ACTS.map((_, act) => nextAct({ ...boss, act }))).toEqual(
      OPENING_ACTS,
    );
    expect(nextAct({ ...boss, act: OPENING_ACTS.length })).toBe("generate");
    expect(nextAct({ ...boss, final: true, act: 1 })).toBe(FINAL_ACTS[1]);
  });

  it("types for a while before it throws three code blocks", () => {
    const { world, boss } = fighting();
    beginAct(world, boss, 0);
    expect(boss.state).toBe("type");
    expect(vibeLine(boss)).toBe("generate");
    expect(launched(world, VIBE.typeFrames)).toEqual([]);
    expect(boss.state).toBe("throw");
    const blocks = launched(world, 1 + VIBE.blockGap * (VIBE.blocks - 1));
    expect(blocks).toHaveLength(VIBE.blocks);
    expect(blocks.map((block) => block.kind)).toEqual([
      "hallucination",
      "code",
      "code",
    ]);
    expect(blocks.map((block) => block.vx)).toEqual(
      VIBE.blockSpeeds.map((speed) => speed * boss.facing),
    );
    expect(boss.state).toBe("walk");
  });

  it("moves the hallucination to another block on every volley", () => {
    const { boss } = arena();
    expect(
      [0, 1, 2, 3].map((volleys) => hallucinationOf({ ...boss, volleys })),
    ).toEqual([0, 1, 2, 0]);
  });
});

describe("Vibe Coder projectiles", () => {
  it("lets hallucinations fade at the top of the arc without hurting anyone", () => {
    const { world } = arena();
    const ghost = shoot(world, "hallucination", 0, -1);
    const [box] = world.room.containers;
    const passing = shoot(world, "hallucination", 0, -1);
    if (!ghost || !passing || !box) {
      throw new Error("The test needs two shots and a container");
    }
    passing.x = box.x;
    passing.y = box.y;
    run(world, 1);
    expect(world.hero.ram).toBe(RAM.start);
    expect(box.broken).toBe(false);
    run(world, Math.ceil(1 / VIBE.blockGravity));
    expect(ghost.active).toBe(false);
    expect(world.particles.some((particle) => particle.active)).toBe(true);
  });

  it("hurts with real code blocks, unless the whip knocks them away", () => {
    const { world } = arena();
    shoot(world, "code");
    run(world, 1);
    expect(world.hero.ram).toBe(RAM.start + DAMAGE.codeBlock);
    const second = arena().world;
    const block = shoot(second, "code");
    if (!block) {
      throw new Error("The test needs a code block");
    }
    block.x = second.hero.x + second.hero.width + WHIP.reach / 2;
    block.vy = 0;
    run(second, 1, { attackPressed: true });
    run(second, WHIP.windupFrames + 2);
    expect(block.active).toBe(false);
    expect(second.hero.ram).toBe(RAM.start);
  });
});

describe("Vibe Coder copy and paste", () => {
  it("marks two spots and pastes Zombie Process copies that fall to one hit", () => {
    const { world, boss } = fighting();
    beginAct(world, boss, 1);
    expect(boss.state).toBe("copy");
    expect(vibeLine(boss)).toBe("paste");
    const copies = copiesOf(world);
    expect(pasteTargets(world.room.enemies)).toEqual(copies);
    run(world, VIBE.copyFrames - 1);
    expect(copies.some((copy) => copy.alive)).toBe(false);
    run(world, 1);
    expect(world.cues.paste).toBe(1);
    expect(boss.state).toBe("walk");
    expect(
      copies.map(({ alive, health, state }) => [alive, health, state]),
    ).toEqual([
      [true, VIBE.copyHealth, "shamble"],
      [true, VIBE.copyHealth, "shamble"],
    ]);
    const [first] = copies;
    expect(damageEnemy(first, WHIP.damage, centerX(first) - 1)).toBe(true);
  });

  it("generates code instead while its last copies are still around", () => {
    const { world, boss } = fighting();
    beginAct(world, boss, 1);
    run(world, VIBE.copyFrames);
    beginAct(world, boss, 1);
    expect(boss.state).toBe("type");
  });
});

describe("Vibe Coder try/catch shield", () => {
  it("swallows hits for about three seconds, then leaves it exposed", () => {
    const { world, boss } = fighting();
    beginAct(world, boss, 2);
    expect(boss.state).toBe("shield");
    expect(vibeLine(boss)).toBe("shield");
    hitBoss(world, boss, WHIP.damage);
    expect(boss.health).toBe(VIBE.health);
    expect(boss.absorbed).toBe(VIBE.absorbFrames);
    expect(world.cues.block).toBe(1);
    expect(world.cues.bossHit).toBe(0);
    run(world, VIBE.shieldFrames - 1);
    expect(boss.state).toBe("shield");
    run(world, 1);
    expect(boss.state).toBe("exposed");
    expect(vibeLine(boss)).toBe("exposed");
    hitBoss(world, boss, WHIP.damage);
    expect(boss.health).toBe(VIBE.health - WHIP.damage);
    run(world, VIBE.exposedFrames);
    expect(boss.state).toBe("walk");
  });
});

describe("Vibe Coder deploy --friday", () => {
  function final(): { world: World; boss: Vibe } {
    const { world, boss } = fighting();
    damageBoss(boss, VIBE.health - VIBE.deployHealth);
    return { world, boss };
  }

  it("starts the final phase at its last vibes, and can't be hit while it deploys", () => {
    const { world, boss } = final();
    expect(boss).toMatchObject({ state: "deploy", final: true });
    expect(vibeLine(boss)).toBe("deploy");
    expect(isVulnerable(boss)).toBe(false);
    run(world, VIBE.deployFrames);
    expect(boss.state).toBe("walk");
    expect(nextAct(boss)).toBe("slam");
  });

  it("raises the laptop, slams it and sends a wave both ways along the floor", () => {
    const { world, boss } = final();
    beginAct(world, boss, 0);
    expect(boss.state).toBe("slam");
    run(world, VIBE.slamFrames - 1);
    expect(flying(world, "wave")).toEqual([]);
    run(world, 1);
    const waves = flying(world, "wave");
    expect(waves.map((wave) => Math.sign(wave.vx)).sort()).toEqual([-1, 1]);
    expect(
      waves.every((wave) => Math.round(wave.y + wave.height) === boss.floor),
    ).toBe(true);
    expect(world.quake).toBe(QUAKE_FRAMES - 1);
    expect(boss.state).toBe("land");
    expect(isVulnerable(boss)).toBe(true);
    run(world, VIBE.landFrames);
    expect(boss.state).toBe("walk");
  });

  it("lets the Admin jump over the wave", () => {
    function waveDamage(jumps: boolean): number {
      const { world, boss } = final();
      beginAct(world, boss, 0);
      world.hero.x = boss.x + boss.width + 40;
      run(world, VIBE.slamFrames - 1);
      const ram = world.hero.ram;
      run(world, 1, { jump: jumps, jumpPressed: jumps });
      run(world, 40, { jump: jumps });
      return world.hero.ram - ram;
    }
    expect(waveDamage(false)).toBe(DAMAGE.wave);
    expect(waveDamage(true)).toBe(0);
  });

  it("drops bugs that wait at the ceiling before they fall", () => {
    const { world, boss } = final();
    beginAct(world, boss, 1);
    expect(boss.state).toBe("bugs");
    const bugs = flying(world, "bug");
    expect(bugs).toHaveLength(VIBE.bugs);
    expect(bugs.every((bug) => bug.y === boss.ceiling)).toBe(true);
    const middle = centerX(world.hero);
    expect(bugs.some((bug) => Math.abs(centerX(bug) - middle) < 1)).toBe(true);
    run(world, VIBE.bugWarnFrames - 1);
    expect(bugs.every((bug) => bug.y === boss.ceiling)).toBe(true);
    run(world, 2);
    expect(bugs.every((bug) => bug.y > boss.ceiling)).toBe(true);
    run(world, 60);
    expect(bugs.some((bug) => bug.active)).toBe(false);
  });
});

describe("Vibe Coder defeat", () => {
  it("drops the costume and the README, confesses and runs off", () => {
    const { world, boss } = fighting();
    beginAct(world, boss, 1);
    run(world, VIBE.copyFrames);
    shoot(world, "code", 0, -1);
    boss.final = true;
    boss.health = WHIP.damage;
    world.hero.x = boss.x - 60;
    hitBoss(world, boss, WHIP.damage);
    expect(boss.state).toBe("defeat");
    expect(vibeLine(boss)).toBe("defeat");
    expect(world.notice).toBe("unmasked");
    expect(world.cues.costume).toBe(1);
    expect(flying(world, "code")).toEqual([]);
    expect(copiesOf(world).some((copy) => copy.alive)).toBe(false);
    expect(
      world.drops.some((drop) => drop.active && drop.kind === "readme"),
    ).toBe(true);
    expect(isVulnerable(boss)).toBe(false);
    const x = boss.x;
    run(world, VIBE.defeatFrames - VIBE.fleeFrames);
    expect(boss.x).toBe(x);
    run(world, 1);
    expect(boss.facing).toBe(1);
    expect(boss.x).toBeGreaterThan(x);
    expect(isOpen(world.room)).toBe(false);
    run(world, VIBE.fleeFrames);
    expect(boss.state).toBe("gone");
    expect(isOpen(world.room)).toBe(true);
  });

  it("hurts the Admin on touch, but not while it shows off", () => {
    const { world, boss } = arena();
    wake(world, boss);
    world.hero.x = boss.x;
    run(world, 1);
    expect(world.hero.ram).toBe(RAM.start);
    world.hero.x = boss.trigger;
    run(world, VIBE.introFrames);
    world.hero.x = boss.x;
    run(world, 1);
    expect(world.hero.ram).toBe(RAM.start + DAMAGE.vibe);
  });

  it("starts over after a crash", () => {
    const { world, boss } = fighting();
    damageBoss(boss, VIBE.health - VIBE.deployHealth);
    world.hero.ram = RAM.crash;
    run(world, 1);
    expect(world.mode).toBe("crash");
    retry(world);
    expect(boss).toMatchObject({
      state: "dormant",
      health: 0,
      final: false,
      line: null,
      said: 0,
      stride: 0,
    });
    expect(copiesOf(world).some((copy) => copy.alive)).toBe(false);
  });
});
