import {
  BOSS_GLOW_FRAMES,
  BOSS_HURT_FRAMES,
  COLLECTOR,
  LEGACY,
  VIBE,
} from "../balance";
import type { Camera } from "../core/camera";
import { type Boss, bossLine } from "../entities/boss";
import type { Collector } from "../entities/collector";
import { centerX } from "../entities/enemy";
import { type Legacy, divesOf } from "../entities/legacy";
import type { Vibe } from "../entities/vibe";
import type { CollectorPoseName } from "./collector-art";
import type { Command, Face, LegacyPoseName } from "./legacy-art";
import type { VibePoseName } from "./vibe-art";

export const FLOAT_FRAMES = 20;
const REEL_STEP_FRAMES = 12;
const REWIND_STEP_FRAMES = 4;
export const MARK_PULSE_FRAMES = 40;
const QUAKE_STEP = 2;
const QUAKE_HEIGHT = 2;
export const STRIDE_STEP = 8;
export const TYPING_FRAMES = 15;
export const COSTUME_FRAMES = 36;
export const BRACE_POP_FRAMES = 12;
const BRACE_BOUNCE = 2;
const BRACE_POP = 3;
const SPEECH_GAP = 4;

export function isGlowing(boss: Boss): boolean {
  return boss.hurt > BOSS_HURT_FRAMES - BOSS_GLOW_FRAMES;
}

const WALK_POSES = ["walk1", "walk2"] as const;
const FLEE_POSES = ["flee1", "flee2"] as const;

function strideFrame<P extends string>(boss: Vibe, frames: readonly [P, P]): P {
  return frames[Math.floor(boss.stride / STRIDE_STEP) % frames.length];
}

export function vibePose(
  boss: Vibe,
  clock: number,
  reducedMotion: boolean,
): VibePoseName {
  switch (boss.state) {
    case "walk":
      return isGlowing(boss) ? "hurt" : strideFrame(boss, WALK_POSES);
    case "type":
      return reducedMotion || Math.floor(clock / TYPING_FRAMES) % 2 === 0
        ? "type1"
        : "type2";
    case "throw":
      return "throw";
    case "copy":
      return "raise";
    case "shield":
      return "shield";
    case "exposed":
      return isGlowing(boss) ? "hurt" : "exposed";
    case "deploy":
    case "bugs":
      return "deploy";
    case "slam":
      return "lift";
    case "land":
      return "land";
    case "defeat":
    case "gone":
      return boss.timer > VIBE.fleeFrames
        ? "unmasked"
        : strideFrame(boss, FLEE_POSES);
    default:
      return "idle";
  }
}

export function vibePresence(boss: Vibe): number {
  switch (boss.state) {
    case "defeat":
      return Math.min(boss.timer / VIBE.fleeFrames, 1);
    case "gone":
      return 0;
    default:
      return 1;
  }
}

export function costumeFlight(boss: Vibe, reducedMotion: boolean): number {
  if (boss.state !== "defeat" || reducedMotion) {
    return -1;
  }
  const elapsed = VIBE.defeatFrames - boss.timer;
  return elapsed < COSTUME_FRAMES ? elapsed : -1;
}

export function braceSpread(boss: Vibe, reducedMotion: boolean): number {
  if (boss.state === "shield") {
    return boss.absorbed > 0 && !reducedMotion ? BRACE_BOUNCE : 0;
  }
  if (boss.state !== "exposed" || reducedMotion) {
    return -1;
  }
  const elapsed = VIBE.exposedFrames - boss.timer;
  return elapsed < BRACE_POP_FRAMES ? BRACE_POP * (elapsed + 1) : -1;
}

export function braceAlpha(boss: Vibe): number {
  if (boss.state !== "exposed") {
    return 1;
  }
  return 1 - (VIBE.exposedFrames - boss.timer) / BRACE_POP_FRAMES;
}

export function speakerSpot(
  boss: Boss | null,
  camera: Camera,
  spot: { x: number; y: number },
): boolean {
  if (!boss || bossLine(boss) === null) {
    return false;
  }
  spot.x = Math.round(centerX(boss) - camera.x);
  spot.y = Math.round(boss.y - SPEECH_GAP - camera.y);
  return true;
}

export function collectorPose(
  boss: Collector,
  clock: number,
  reducedMotion: boolean,
): CollectorPoseName {
  switch (boss.state) {
    case "windup":
      return "raise";
    case "slash":
      return "slash";
    case "recover":
      return "recover";
    case "mark":
    case "sweep":
      return "mark";
    default:
      if (isGlowing(boss)) {
        return "hurt";
      }
      return reducedMotion || Math.floor(clock / FLOAT_FRAMES) % 2 === 0
        ? "float1"
        : "float2";
  }
}

export function crumbleStage(boss: Collector, stages: number): number {
  const progress = 1 - boss.timer / COLLECTOR.defeatFrames;
  return Math.min(Math.floor(progress * stages), stages - 1);
}

export function collectorPresence(boss: Collector): number {
  return boss.state === "intro" ? 1 - boss.timer / COLLECTOR.introFrames : 1;
}

export function markAlpha(clock: number, reducedMotion: boolean): number {
  return reducedMotion
    ? 0.8
    : 0.55 + 0.3 * Math.sin((clock * 2 * Math.PI) / MARK_PULSE_FRAMES);
}

export function legacyPose(boss: Legacy): LegacyPoseName {
  switch (boss.state) {
    case "perform":
    case "call":
      return "cast";
    case "aim":
    case "dive":
      return "dive";
    case "recover":
      return "recover";
    case "appear":
      return boss.seated ? "seated" : "dive";
    case "vanish":
    case "rollback":
    case "commit":
      return boss.seated ? "seated" : "standing";
    default:
      return "seated";
  }
}

export function legacyFace(boss: Legacy): Face {
  if (isGlowing(boss)) {
    return "hurt";
  }
  switch (boss.state) {
    case "dormant":
      return "off";
    case "intro":
      return "boot";
    case "rollback":
      return "rewind";
    case "commit":
    case "gone":
      return "commit";
    default:
      return boss.patched ? "patched" : "idle";
  }
}

export function legacyCommand(boss: Legacy): Command | null {
  switch (boss.state) {
    case "perform":
      return "perform";
    case "call":
      return "call";
    case "vanish":
      return boss.dives < divesOf(boss) ? "goto" : null;
    case "rollback":
      return "rollback";
    case "commit":
      return "commit";
    default:
      return null;
  }
}

export function legacyPresence(boss: Legacy): number {
  switch (boss.state) {
    case "vanish":
      return boss.timer / LEGACY.vanishFrames;
    case "hidden":
    case "gone":
      return 0;
    case "appear":
      return 1 - boss.timer / LEGACY.appearFrames;
    case "commit":
      return boss.timer / LEGACY.commitFrames;
    default:
      return 1;
  }
}

export function reelStep(
  boss: Legacy | null,
  clock: number,
  reducedMotion: boolean,
  frames: number,
): number {
  if (
    reducedMotion ||
    !boss ||
    boss.state === "dormant" ||
    boss.state === "gone"
  ) {
    return 0;
  }
  if (boss.state === "rollback") {
    return frames - 1 - (Math.floor(clock / REWIND_STEP_FRAMES) % frames);
  }
  return Math.floor(clock / REEL_STEP_FRAMES) % frames;
}

export function quakeOffset(quake: number, reducedMotion: boolean): number {
  if (quake === 0 || reducedMotion) {
    return 0;
  }
  return Math.floor(quake / QUAKE_STEP) % 2 === 0
    ? QUAKE_HEIGHT
    : -QUAKE_HEIGHT;
}
