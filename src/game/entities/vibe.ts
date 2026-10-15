import { BOSS_HURT_FRAMES, VIBE } from "../balance";
import type { Box } from "../core/collision";
import { type Cell, type Level, TILE } from "../levels/level";
import type { BossEvent, BossSurroundings } from "./boss";
import { type Enemy, centerX, isFree } from "./enemy";
import type { Hero } from "./hero";
import { burst } from "./particles";
import { PROJECTILE_SIZE, launch } from "./projectiles";
import { pasteZombie } from "./zombie";

export type VibeState =
  | "dormant"
  | "intro"
  | "walk"
  | "type"
  | "throw"
  | "copy"
  | "shield"
  | "exposed"
  | "deploy"
  | "slam"
  | "land"
  | "bugs"
  | "defeat"
  | "gone";

export type VibeLine =
  "intro" | "generate" | "paste" | "shield" | "exposed" | "deploy" | "defeat";

export type VibeAct = "generate" | "paste" | "shield" | "slam" | "bugs";

export interface Vibe extends Box {
  kind: "vibe";
  home: Cell;
  floor: number;
  ceiling: number;
  trigger: number;
  left: number;
  right: number;
  state: VibeState;
  timer: number;
  health: number;
  facing: 1 | -1;
  stride: number;
  hurt: number;
  struck: number;
  hitToken: number;
  act: number;
  thrown: number;
  volleys: number;
  final: boolean;
  line: VibeLine | null;
  lineFrames: number;
  said: number;
  absorbed: number;
}

export const OPENING_ACTS: readonly VibeAct[] = ["generate", "paste", "shield"];
export const FINAL_ACTS: readonly VibeAct[] = ["slam", "bugs"];

const VIBE_SIZE = { width: 18, height: 34 } as const;
const TRIGGER_TILES = 3;
const WALL_MARGIN = TILE;
const HAND_Y = 12;
const COPY_SPARKS = 8;
const KEEP_AWAY_SLACK = 32;

export function createVibe(home: Cell, level: Level): Vibe {
  const boss: Vibe = {
    kind: "vibe",
    home,
    floor: (home.row + 1) * TILE,
    ceiling: TILE,
    trigger: (level.start.column + TRIGGER_TILES) * TILE,
    left: TILE + WALL_MARGIN,
    right: level.width - TILE - WALL_MARGIN,
    x: 0,
    y: 0,
    width: VIBE_SIZE.width,
    height: VIBE_SIZE.height,
    state: "dormant",
    timer: 0,
    health: 0,
    facing: -1,
    stride: 0,
    hurt: 0,
    struck: 0,
    hitToken: 0,
    act: 0,
    thrown: 0,
    volleys: 0,
    final: false,
    line: null,
    lineFrames: 0,
    said: 0,
    absorbed: 0,
  };
  resetVibe(boss);
  return boss;
}

export function resetVibe(boss: Vibe): void {
  boss.x = boss.home.column * TILE + TILE / 2 - boss.width / 2;
  boss.y = boss.floor - boss.height;
  boss.state = "dormant";
  boss.timer = 0;
  boss.health = 0;
  boss.facing = -1;
  boss.stride = 0;
  boss.hurt = 0;
  boss.struck = 0;
  boss.hitToken = 0;
  boss.act = 0;
  boss.thrown = 0;
  boss.volleys = 0;
  boss.final = false;
  boss.line = null;
  boss.lineFrames = 0;
  boss.said = 0;
  boss.absorbed = 0;
}

function say(boss: Vibe, line: VibeLine): void {
  boss.line = line;
  boss.lineFrames = VIBE.lineFrames;
  boss.said += 1;
}

function face(boss: Vibe, hero: Hero): void {
  boss.facing = centerX(hero) >= centerX(boss) ? 1 : -1;
}

function wake(boss: Vibe, hero: Hero): BossEvent | null {
  if (centerX(hero) < boss.trigger) {
    return null;
  }
  boss.state = "intro";
  boss.timer = VIBE.introFrames;
  say(boss, "intro");
  return "awake";
}

function introduce(boss: Vibe, hero: Hero): void {
  face(boss, hero);
  boss.timer -= 1;
  boss.health = Math.round(VIBE.health * (1 - boss.timer / VIBE.introFrames));
  if (boss.timer <= 0) {
    boss.health = VIBE.health;
    stroll(boss);
  }
}

function shuffle(boss: Vibe, step: number): void {
  const x = Math.min(
    Math.max(boss.x + step, boss.left),
    boss.right - boss.width,
  );
  boss.stride += Math.abs(x - boss.x);
  boss.x = x;
}

function stroll(boss: Vibe): void {
  boss.state = "walk";
  boss.timer = VIBE.walkFrames;
}

export function isPasteTarget(enemy: Enemy): boolean {
  return enemy.kind === "zombie" && isFree(enemy);
}

export function pasteTargets(enemies: readonly Enemy[]): Enemy[] {
  return enemies.filter(isPasteTarget).slice(0, VIBE.copies);
}

export function nextAct(boss: Vibe): VibeAct {
  const acts = boss.final ? FINAL_ACTS : OPENING_ACTS;
  return acts[boss.act % acts.length];
}

function begin(boss: Vibe, surroundings: BossSurroundings): void {
  let act = nextAct(boss);
  boss.act += 1;
  if (
    act === "paste" &&
    pasteTargets(surroundings.room.enemies).length < VIBE.copies
  ) {
    act = "generate";
  }
  switch (act) {
    case "generate":
      boss.state = "type";
      boss.timer = VIBE.typeFrames;
      say(boss, "generate");
      return;
    case "paste":
      boss.state = "copy";
      boss.timer = VIBE.copyFrames;
      say(boss, "paste");
      return;
    case "shield":
      boss.state = "shield";
      boss.timer = VIBE.shieldFrames;
      say(boss, "shield");
      return;
    case "slam":
      boss.state = "slam";
      boss.timer = VIBE.slamFrames;
      return;
    case "bugs":
      boss.state = "bugs";
      boss.timer = VIBE.bugsFrames;
      dropBugs(boss, surroundings);
      return;
  }
}

function walk(boss: Vibe, surroundings: BossSurroundings): void {
  const { hero } = surroundings;
  face(boss, hero);
  const gap = Math.abs(centerX(hero) - centerX(boss));
  let step = 0;
  if (gap < VIBE.keepAway) {
    step = -boss.facing * VIBE.walkSpeed;
  } else if (gap > VIBE.keepAway + KEEP_AWAY_SLACK) {
    step = boss.facing * VIBE.walkSpeed;
  }
  shuffle(boss, step);
  boss.timer -= 1;
  if (boss.timer <= 0) {
    begin(boss, surroundings);
  }
}

export function hallucinationOf(boss: Vibe): number {
  return boss.volleys % VIBE.blocks;
}

function throwBlock(boss: Vibe, surroundings: BossSurroundings): void {
  const { width, height } = PROJECTILE_SIZE.code;
  const index = boss.thrown;
  launch(surroundings.projectiles, {
    kind: index === hallucinationOf(boss) ? "hallucination" : "code",
    x: centerX(boss) + boss.facing * (boss.width / 2) - width / 2,
    y: boss.y + HAND_Y - height / 2,
    vx: boss.facing * VIBE.blockSpeeds[index],
    vy: -VIBE.blockLift,
    facing: boss.facing,
    variant: index,
    token: 0,
  });
  boss.thrown += 1;
}

function generate(boss: Vibe, surroundings: BossSurroundings): void {
  boss.timer -= 1;
  if (boss.timer > 0) {
    return;
  }
  throwBlock(boss, surroundings);
  boss.timer = VIBE.blockGap;
  if (boss.thrown >= VIBE.blocks) {
    boss.thrown = 0;
    boss.volleys += 1;
    stroll(boss);
  }
}

function paste(boss: Vibe, surroundings: BossSurroundings): BossEvent | null {
  boss.timer -= 1;
  if (boss.timer > 0) {
    return null;
  }
  for (const copy of pasteTargets(surroundings.room.enemies)) {
    pasteZombie(copy, VIBE.copyHealth);
    burst(
      surroundings.particles,
      surroundings,
      "data",
      centerX(copy),
      copy.y + copy.height / 2,
      COPY_SPARKS,
    );
  }
  stroll(boss);
  return "pasted";
}

function launchWaves(boss: Vibe, surroundings: BossSurroundings): void {
  const { width, height } = PROJECTILE_SIZE.wave;
  for (const direction of [-1, 1] as const) {
    launch(surroundings.projectiles, {
      kind: "wave",
      x: centerX(boss) - width / 2,
      y: boss.floor - height,
      vx: direction * VIBE.waveSpeed,
      vy: 0,
      facing: direction,
      variant: 0,
      token: 0,
    });
  }
}

function dropBugs(boss: Vibe, surroundings: BossSurroundings): void {
  const { width } = PROJECTILE_SIZE.bug;
  const middle = centerX(surroundings.hero);
  for (let bug = 0; bug < VIBE.bugs; bug++) {
    const x = middle + (bug - (VIBE.bugs - 1) / 2) * VIBE.bugSpread;
    launch(surroundings.projectiles, {
      kind: "bug",
      x: Math.min(Math.max(x, boss.left), boss.right) - width / 2,
      y: boss.ceiling,
      vx: 0,
      vy: 0,
      facing: 1,
      variant: bug,
      token: 0,
    });
  }
}

function countdown(boss: Vibe): boolean {
  boss.timer -= 1;
  return boss.timer <= 0;
}

function flee(boss: Vibe, hero: Hero): void {
  if (boss.timer === VIBE.fleeFrames) {
    boss.facing = centerX(hero) > centerX(boss) ? -1 : 1;
  }
  shuffle(boss, boss.facing * VIBE.fleeSpeed);
}

function leave(boss: Vibe, hero: Hero): void {
  if (boss.timer <= VIBE.fleeFrames) {
    flee(boss, hero);
  }
  if (countdown(boss)) {
    boss.state = "gone";
    boss.line = null;
  }
}

function fight(boss: Vibe, surroundings: BossSurroundings): BossEvent | null {
  switch (boss.state) {
    case "walk":
      walk(boss, surroundings);
      return null;
    case "type":
      face(boss, surroundings.hero);
      if (countdown(boss)) {
        boss.state = "throw";
        boss.timer = 0;
      }
      return null;
    case "throw":
      generate(boss, surroundings);
      return null;
    case "copy":
      return paste(boss, surroundings);
    case "shield":
      if (countdown(boss)) {
        boss.state = "exposed";
        boss.timer = VIBE.exposedFrames;
        say(boss, "exposed");
      }
      return null;
    case "slam":
      if (countdown(boss)) {
        launchWaves(boss, surroundings);
        boss.state = "land";
        boss.timer = VIBE.landFrames;
        return "landing";
      }
      return null;
    default:
      if (countdown(boss)) {
        stroll(boss);
      }
      return null;
  }
}

export function updateVibe(
  boss: Vibe,
  surroundings: BossSurroundings,
): BossEvent | null {
  boss.hurt = Math.max(boss.hurt - 1, 0);
  boss.absorbed = Math.max(boss.absorbed - 1, 0);
  boss.lineFrames = Math.max(boss.lineFrames - 1, 0);
  if (boss.lineFrames === 0) {
    boss.line = null;
  }
  switch (boss.state) {
    case "dormant":
      return wake(boss, surroundings.hero);
    case "intro":
      introduce(boss, surroundings.hero);
      return null;
    case "defeat":
      leave(boss, surroundings.hero);
      return null;
    case "gone":
      return null;
    default:
      return fight(boss, surroundings);
  }
}

export function isVibeVulnerable(boss: Vibe): boolean {
  return (
    boss.state !== "dormant" &&
    boss.state !== "intro" &&
    boss.state !== "deploy" &&
    boss.state !== "defeat" &&
    boss.state !== "gone"
  );
}

export function damageVibe(boss: Vibe, amount: number): BossEvent | null {
  if (boss.state === "shield") {
    boss.absorbed = VIBE.absorbFrames;
    return "absorbed";
  }
  boss.health = Math.max(boss.health - amount, 0);
  if (boss.hurt === 0) {
    boss.hurt = BOSS_HURT_FRAMES;
  }
  if (boss.health === 0) {
    boss.state = "defeat";
    boss.timer = VIBE.defeatFrames;
    say(boss, "defeat");
    return "unmasked";
  }
  if (!boss.final && boss.health <= VIBE.deployHealth) {
    boss.final = true;
    boss.act = 0;
    boss.thrown = 0;
    boss.state = "deploy";
    boss.timer = VIBE.deployFrames;
    say(boss, "deploy");
  }
  return null;
}

export function vibeLine(boss: Vibe): VibeLine | null {
  return boss.lineFrames > 0 ? boss.line : null;
}
