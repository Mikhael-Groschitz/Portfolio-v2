import { describe, expect, it } from "vitest";
import {
  BOSS_GLOW_FRAMES,
  BOSS_HURT_FRAMES,
  COLLECTOR,
  LEGACY,
  QUAKE_FRAMES,
  VIBE,
} from "../balance";
import { createCollector, damageCollector } from "../entities/collector";
import { centerX } from "../entities/enemy";
import { createLegacy } from "../entities/legacy";
import { type Vibe, type VibeState, createVibe } from "../entities/vibe";
import { parseLevel } from "../levels/level";
import {
  BRACE_POP_FRAMES,
  COSTUME_FRAMES,
  FLOAT_FRAMES,
  MARK_PULSE_FRAMES,
  STRIDE_STEP,
  TYPING_FRAMES,
  braceAlpha,
  braceSpread,
  collectorPose,
  collectorPresence,
  costumeFlight,
  crumbleStage,
  isGlowing,
  legacyCommand,
  legacyFace,
  legacyPose,
  legacyPresence,
  markAlpha,
  quakeOffset,
  reelStep,
  speakerSpot,
  vibePose,
  vibePresence,
} from "./boss-poses";
import { COLLECTOR_CRUMBLE } from "./collector-art";
import { REEL_FRAMES } from "./legacy-art";

const ROOM = parseLevel([
  "####################",
  "#        B         #",
  "#S             T   #",
  "####################",
]);

function collector() {
  const [home] = ROOM.places.collector;
  return createCollector(home, ROOM);
}

function legacy() {
  const [seat] = ROOM.places.throne;
  return createLegacy(seat, ROOM);
}

const STAGE = parseLevel(["############", "#S       V #", "############"]);

function vibe(state: VibeState, timer = 0): Vibe {
  const [home] = STAGE.places.vibe;
  const boss = createVibe(home, STAGE);
  boss.state = state;
  boss.timer = timer;
  return boss;
}

describe("Vibe Coder poses", () => {
  it("struts while it walks and flinches when hit", () => {
    const boss = vibe("walk");
    expect(vibePose(boss, 0, false)).toBe("walk1");
    boss.stride = STRIDE_STEP;
    expect(vibePose(boss, 0, false)).toBe("walk2");
    boss.hurt = BOSS_HURT_FRAMES;
    expect(vibePose(boss, 0, false)).toBe("hurt");
  });

  it("types in two frames, and holds one with reduced motion", () => {
    const boss = vibe("type");
    expect(vibePose(boss, 0, false)).toBe("type1");
    expect(vibePose(boss, TYPING_FRAMES, false)).toBe("type2");
    expect(vibePose(boss, TYPING_FRAMES, true)).toBe("type1");
  });

  it("shows every act with its own pose, even when hit", () => {
    const acts: [VibeState, string][] = [
      ["dormant", "idle"],
      ["intro", "idle"],
      ["throw", "throw"],
      ["copy", "raise"],
      ["shield", "shield"],
      ["exposed", "exposed"],
      ["deploy", "deploy"],
      ["bugs", "deploy"],
      ["slam", "lift"],
      ["land", "land"],
    ];
    for (const [state, pose] of acts) {
      const boss = vibe(state);
      expect(vibePose(boss, 0, false)).toBe(pose);
      boss.hurt = BOSS_HURT_FRAMES;
      expect(vibePose(boss, 0, false)).toBe(
        state === "exposed" ? "hurt" : pose,
      );
    }
  });

  it("stands unmasked, then runs off and fades out", () => {
    const boss = vibe("defeat", VIBE.defeatFrames);
    expect(vibePose(boss, 0, false)).toBe("unmasked");
    expect(vibePresence(boss)).toBe(1);
    boss.timer = VIBE.fleeFrames;
    expect(vibePose(boss, 0, false)).toBe("flee1");
    boss.stride = STRIDE_STEP;
    expect(vibePose(boss, 0, false)).toBe("flee2");
    boss.timer = VIBE.fleeFrames / 2;
    expect(vibePresence(boss)).toBe(0.5);
    expect(vibePresence(vibe("gone"))).toBe(0);
    expect(vibePresence(vibe("walk"))).toBe(1);
  });

  it("throws the costume off for a moment, but not with reduced motion", () => {
    const boss = vibe("defeat", VIBE.defeatFrames);
    expect(costumeFlight(boss, false)).toBe(0);
    boss.timer = VIBE.defeatFrames - COSTUME_FRAMES + 1;
    expect(costumeFlight(boss, false)).toBe(COSTUME_FRAMES - 1);
    boss.timer -= 1;
    expect(costumeFlight(boss, false)).toBe(-1);
    expect(costumeFlight(vibe("defeat", VIBE.defeatFrames), true)).toBe(-1);
    expect(costumeFlight(vibe("walk"), false)).toBe(-1);
  });

  it("bounces the braces on a blocked hit and pops them when the shield ends", () => {
    const shield = vibe("shield", VIBE.shieldFrames);
    expect(braceSpread(shield, false)).toBe(0);
    shield.absorbed = VIBE.absorbFrames;
    expect(braceSpread(shield, false)).toBeGreaterThan(0);
    expect(braceSpread(shield, true)).toBe(0);
    expect(braceAlpha(shield)).toBe(1);
    const exposed = vibe("exposed", VIBE.exposedFrames);
    const opened = braceSpread(exposed, false);
    expect(opened).toBeGreaterThan(0);
    exposed.timer -= 1;
    expect(braceSpread(exposed, false)).toBeGreaterThan(opened);
    expect(braceAlpha(exposed)).toBeLessThan(1);
    exposed.timer = VIBE.exposedFrames - BRACE_POP_FRAMES;
    expect(braceSpread(exposed, false)).toBe(-1);
    expect(braceSpread(vibe("exposed", VIBE.exposedFrames), true)).toBe(-1);
    expect(braceSpread(vibe("walk"), false)).toBe(-1);
  });

  it("anchors the speech above the head while a line is on", () => {
    const camera = { x: 10, y: 4 };
    const spot = { x: 0, y: 0 };
    const boss = vibe("walk");
    expect(speakerSpot(null, camera, spot)).toBe(false);
    expect(speakerSpot(boss, camera, spot)).toBe(false);
    boss.line = "exposed";
    boss.lineFrames = VIBE.lineFrames;
    expect(speakerSpot(boss, camera, spot)).toBe(true);
    expect(spot.x).toBe(Math.round(centerX(boss) - camera.x));
    expect(spot.y).toBeLessThan(boss.y - camera.y);
  });
});

describe("Garbage Collector poses", () => {
  it("sways its cloak while it floats, and holds still with reduced motion", () => {
    const boss = collector();
    boss.state = "hover";
    const poses = new Set(
      Array.from({ length: FLOAT_FRAMES * 4 }, (_, clock) =>
        collectorPose(boss, clock, false),
      ),
    );
    expect([...poses]).toEqual(["float1", "float2"]);
    expect(collectorPose(boss, FLOAT_FRAMES, true)).toBe("float1");
  });

  it("raises the scythe before the slash, even when hit, and squints while floating", () => {
    const boss = collector();
    boss.hurt = BOSS_HURT_FRAMES;
    for (const [state, pose] of [
      ["windup", "raise"],
      ["slash", "slash"],
      ["recover", "recover"],
      ["mark", "mark"],
      ["sweep", "mark"],
      ["hover", "hurt"],
    ] as const) {
      boss.state = state;
      expect(collectorPose(boss, 0, false)).toBe(pose);
    }
    boss.hurt = BOSS_HURT_FRAMES - BOSS_GLOW_FRAMES;
    expect(collectorPose(boss, 0, false)).toBe("float1");
  });

  it("glows at most two or three times a second, however fast the hits come", () => {
    const boss = collector();
    boss.state = "hover";
    boss.health = COLLECTOR.health;
    const glows = Array.from({ length: 60 }, () => {
      damageCollector(boss, 0);
      const glowing = isGlowing(boss);
      boss.hurt = Math.max(boss.hurt - 1, 0);
      return glowing;
    });
    const starts = glows.filter(
      (glowing, frame) => glowing && !glows[frame - 1],
    ).length;
    expect(starts).toBeLessThanOrEqual(3);
    expect(starts).toBeGreaterThan(1);
  });

  it("fades in during its entrance and falls apart in three steps", () => {
    const boss = collector();
    boss.state = "intro";
    boss.timer = COLLECTOR.introFrames;
    expect(collectorPresence(boss)).toBe(0);
    boss.timer = 0;
    expect(collectorPresence(boss)).toBe(1);
    boss.state = "defeat";
    boss.timer = COLLECTOR.defeatFrames;
    expect(crumbleStage(boss, COLLECTOR_CRUMBLE.length)).toBe(0);
    boss.timer = 1;
    expect(crumbleStage(boss, COLLECTOR_CRUMBLE.length)).toBe(
      COLLECTOR_CRUMBLE.length - 1,
    );
  });

  it("pulses the marked lanes slowly, or not at all with reduced motion", () => {
    const alphas = Array.from({ length: MARK_PULSE_FRAMES }, (_, clock) =>
      markAlpha(clock, false),
    );
    expect(Math.min(...alphas)).toBeGreaterThan(0.2);
    expect(Math.max(...alphas)).toBeLessThanOrEqual(1);
    expect(60 / MARK_PULSE_FRAMES).toBeLessThan(3);
    expect(
      new Set([0, 13, 27].map((clock) => markAlpha(clock, true))).size,
    ).toBe(1);
  });
});

describe("Legacy System poses", () => {
  it("sits, casts, dives and stands back up", () => {
    const boss = legacy();
    expect(legacyPose(boss)).toBe("seated");
    for (const [state, pose] of [
      ["perform", "cast"],
      ["call", "cast"],
      ["aim", "dive"],
      ["dive", "dive"],
      ["recover", "recover"],
    ] as const) {
      boss.state = state;
      expect(legacyPose(boss)).toBe(pose);
    }
    boss.state = "appear";
    boss.seated = false;
    expect(legacyPose(boss)).toBe("dive");
  });

  it("shows its mood on the monitor", () => {
    const boss = legacy();
    expect(legacyFace(boss)).toBe("off");
    boss.state = "intro";
    expect(legacyFace(boss)).toBe("boot");
    boss.state = "throne";
    expect(legacyFace(boss)).toBe("idle");
    boss.patched = true;
    expect(legacyFace(boss)).toBe("patched");
    boss.state = "rollback";
    expect(legacyFace(boss)).toBe("rewind");
    boss.state = "commit";
    expect(legacyFace(boss)).toBe("commit");
    boss.state = "throne";
    boss.hurt = BOSS_HURT_FRAMES;
    expect(legacyFace(boss)).toBe("hurt");
    boss.hurt = BOSS_HURT_FRAMES - BOSS_GLOW_FRAMES;
    expect(legacyFace(boss)).toBe("patched");
  });

  it("prints the command it runs above its head", () => {
    const boss = legacy();
    expect(legacyCommand(boss)).toBeNull();
    for (const state of ["perform", "call", "rollback", "commit"] as const) {
      boss.state = state;
      expect(legacyCommand(boss)).toBe(state);
    }
    boss.state = "vanish";
    expect(legacyCommand(boss)).toBe("goto");
    boss.dives = LEGACY.dives;
    expect(legacyCommand(boss)).toBeNull();
  });

  it("switches off like an old monitor when it leaves and on when it comes back", () => {
    const boss = legacy();
    boss.state = "vanish";
    boss.timer = LEGACY.vanishFrames;
    expect(legacyPresence(boss)).toBe(1);
    boss.timer = 0;
    expect(legacyPresence(boss)).toBe(0);
    boss.state = "hidden";
    expect(legacyPresence(boss)).toBe(0);
    boss.state = "appear";
    boss.timer = LEGACY.appearFrames;
    expect(legacyPresence(boss)).toBe(0);
    boss.state = "throne";
    expect(legacyPresence(boss)).toBe(1);
  });

  it("spins the tape reels slowly, backwards during the rollback, never with reduced motion", () => {
    const boss = legacy();
    const frames = REEL_FRAMES.length;
    expect(reelStep(boss, 100, false, frames)).toBe(0);
    boss.state = "throne";
    const forward = Array.from({ length: 60 }, (_, clock) =>
      reelStep(boss, clock, false, frames),
    );
    expect(new Set(forward).size).toBe(frames);
    const changes = forward.filter(
      (step, index) => index > 0 && step !== forward[index - 1],
    ).length;
    expect(changes).toBeLessThanOrEqual(6);
    boss.state = "rollback";
    expect(reelStep(boss, 0, false, frames)).toBe(frames - 1);
    expect(reelStep(boss, 50, true, frames)).toBe(0);
    expect(reelStep(null, 50, false, frames)).toBe(0);
  });
});

describe("floor shake", () => {
  it("shakes a couple of pixels for a moment, and never with reduced motion", () => {
    const offsets = Array.from({ length: QUAKE_FRAMES }, (_, frame) =>
      quakeOffset(QUAKE_FRAMES - frame, false),
    );
    expect(Math.max(...offsets.map(Math.abs))).toBeLessThanOrEqual(2);
    expect(new Set(offsets).size).toBe(2);
    expect(quakeOffset(0, false)).toBe(0);
    expect(
      Array.from({ length: QUAKE_FRAMES }, (_, frame) =>
        quakeOffset(frame, true),
      ).every((offset) => offset === 0),
    ).toBe(true);
  });
});
