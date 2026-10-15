import { COLLECTOR, VIBE } from "../balance";
import { VIEW_WIDTH } from "../core/camera";
import type { Box } from "../core/collision";
import { clamp } from "../core/math";
import type { World } from "../core/world";
import { type Boss, isFighting } from "../entities/boss";
import { type Collector, LANE_WIDTH, laneBox } from "../entities/collector";
import { centerX } from "../entities/enemy";
import type { Legacy } from "../entities/legacy";
import { type Vibe, isPasteTarget } from "../entities/vibe";
import { TILE } from "../levels/level";
import { COLORS } from "../palette";
import type { Art, Facing, RoomArt } from "./art";
import {
  COSTUME_FRAMES,
  braceAlpha,
  braceSpread,
  collectorPose,
  collectorPresence,
  costumeFlight,
  crumbleStage,
  legacyCommand,
  legacyFace,
  legacyPose,
  isGlowing,
  legacyPresence,
  markAlpha,
  reelStep,
  vibePose,
  vibePresence,
} from "./boss-poses";
import { SLIDE_AT } from "./castle-art";
import { COLLECTOR_FRAME, CRUMBLE_FLOOR } from "./collector-art";
import { LEGACY_ART, LEGACY_FRAME, REELS, SCREEN } from "./legacy-art";
import { type CostumePiece, VIBE_FRAME } from "./vibe-art";

const GLOW_ALPHA = 0.5;
const LABEL_GAP = 6;
const LANE_FILL = 0.18;
const SWEEP_FILL = 0.35;
const SWEEP_LINE = 2;
const MARKER_HEIGHT = 2;
const HOTFIX_OFFSET = { x: 13, y: -3 } as const;
const LANE: Box = { x: 0, y: 0, width: 0, height: 0 };
const BRACE_MARGIN = 10;
const SHIELD_FILL = 0.16;
const ABSORB_FILL = 0.32;
const DASH = [2, 2];
const SOLID: number[] = [];
const ANT_FRAMES = 6;
const WARNING_HEIGHT = 3;
const WARNING_DASH = 8;
const WARNING_FRAMES = 4;
const LANDING_MARK = { width: 10, height: 2 } as const;
const CONE_ALPHA = 0.1;
const CONE_TOP = 2;
const CONE_BOTTOM = 22;
const COSTUME_GRAVITY = 0.18;
const COSTUME_PATHS: Readonly<
  Record<CostumePiece, { ahead: number; rise: number }>
> = {
  armor: { ahead: 0.6, rise: 2.4 },
  cape: { ahead: -1.2, rise: 1.8 },
  sword: { ahead: 1.5, rise: 3.2 },
};
const COSTUME_PIECES = Object.keys(COSTUME_PATHS) as readonly CostumePiece[];

function pick(facing: Facing, direction: number): HTMLCanvasElement {
  return direction > 0 ? facing[0] : facing[1];
}

function frameLeft(boss: Boss, frame: { width: number; left: number }): number {
  return boss.facing > 0
    ? Math.round(boss.x) - frame.left
    : Math.round(boss.x) - (frame.width - frame.left - boss.width);
}

function drawPasteMarks(
  context: CanvasRenderingContext2D,
  world: World,
  boss: Vibe,
  cameraX: number,
  cameraY: number,
): void {
  if (boss.state !== "copy") {
    return;
  }
  context.globalAlpha = markAlpha(world.frame, world.reducedMotion);
  context.strokeStyle = COLORS.cable;
  context.lineWidth = 1;
  context.setLineDash(DASH);
  context.lineDashOffset = world.reducedMotion
    ? 0
    : -Math.floor(world.frame / ANT_FRAMES);
  let marked = 0;
  for (const copy of world.room.enemies) {
    if (marked >= VIBE.copies || !isPasteTarget(copy)) {
      continue;
    }
    marked += 1;
    context.strokeRect(
      Math.round(copy.x) - cameraX + 0.5,
      Math.round(copy.y) - cameraY + 0.5,
      copy.width - 1,
      copy.height - 1,
    );
  }
  context.setLineDash(SOLID);
  context.globalAlpha = 1;
}

function drawFloorWarning(
  context: CanvasRenderingContext2D,
  world: World,
  boss: Vibe,
  cameraX: number,
  cameraY: number,
): void {
  if (boss.state !== "slam") {
    return;
  }
  const middle = Math.round(centerX(boss));
  const half = WARNING_DASH / 2;
  const shift = world.reducedMotion
    ? 0
    : Math.floor(world.frame / WARNING_FRAMES) % WARNING_DASH;
  const y = boss.floor - WARNING_HEIGHT - cameraY;
  context.globalAlpha = markAlpha(world.frame, world.reducedMotion);
  context.fillStyle = COLORS.led;
  for (
    let gap = shift;
    middle + gap < boss.right + TILE || middle - gap > boss.left - TILE;
    gap += WARNING_DASH
  ) {
    context.fillRect(middle + gap - cameraX, y, half, WARNING_HEIGHT);
    context.fillRect(middle - gap - half - cameraX, y, half, WARNING_HEIGHT);
  }
  context.globalAlpha = 1;
}

function drawLandingMarks(
  context: CanvasRenderingContext2D,
  world: World,
  boss: Vibe,
  cameraX: number,
  cameraY: number,
): void {
  context.globalAlpha = markAlpha(world.frame, world.reducedMotion);
  context.fillStyle = COLORS.led;
  for (const projectile of world.projectiles) {
    if (
      projectile.active &&
      projectile.kind === "bug" &&
      projectile.age <= VIBE.bugWarnFrames
    ) {
      context.fillRect(
        Math.round(centerX(projectile) - LANDING_MARK.width / 2) - cameraX,
        boss.floor - LANDING_MARK.height - cameraY,
        LANDING_MARK.width,
        LANDING_MARK.height,
      );
    }
  }
  context.globalAlpha = 1;
}

function drawBraces(
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
  boss: Vibe,
  cameraX: number,
  cameraY: number,
): void {
  const spread = braceSpread(boss, world.reducedMotion);
  if (spread < 0) {
    return;
  }
  const [open, close] = art.braces;
  const top = Math.round(boss.y + boss.height / 2 - open.height / 2) - cameraY;
  const left =
    Math.round(boss.x) - BRACE_MARGIN - open.width - spread - cameraX;
  const right =
    Math.round(boss.x + boss.width) + BRACE_MARGIN + spread - cameraX;
  const alpha = braceAlpha(boss);
  context.globalAlpha = alpha * (boss.absorbed > 0 ? ABSORB_FILL : SHIELD_FILL);
  context.fillStyle = COLORS.keyword;
  context.fillRect(
    left + open.width,
    top + 2,
    right - left - open.width,
    open.height - 4,
  );
  context.globalAlpha = alpha;
  context.drawImage(open, left, top);
  context.drawImage(close, right, top);
  context.globalAlpha = 1;
}

function drawCostume(
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
  boss: Vibe,
  x: number,
  y: number,
): void {
  const elapsed = costumeFlight(boss, world.reducedMotion);
  if (elapsed < 0) {
    return;
  }
  context.globalAlpha = 1 - elapsed / COSTUME_FRAMES;
  for (const piece of COSTUME_PIECES) {
    const { ahead, rise } = COSTUME_PATHS[piece];
    context.drawImage(
      pick(art.costume[piece], boss.facing),
      x + Math.round(ahead * elapsed * boss.facing),
      y +
        Math.round((COSTUME_GRAVITY * elapsed * elapsed) / 2 - rise * elapsed),
    );
  }
  context.globalAlpha = 1;
}

function drawVibe(
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
  boss: Vibe,
  cameraX: number,
  cameraY: number,
): void {
  drawPasteMarks(context, world, boss, cameraX, cameraY);
  drawFloorWarning(context, world, boss, cameraX, cameraY);
  drawLandingMarks(context, world, boss, cameraX, cameraY);
  const presence = vibePresence(boss);
  if (presence <= 0) {
    return;
  }
  const pose = vibePose(boss, world.frame, world.reducedMotion);
  const x = frameLeft(boss, VIBE_FRAME) - cameraX;
  const y = Math.round(boss.y) - VIBE_FRAME.top - cameraY;
  context.globalAlpha = presence;
  context.drawImage(pick(art.vibe[pose], boss.facing), x, y);
  if (isGlowing(boss)) {
    context.globalAlpha = presence * GLOW_ALPHA;
    context.drawImage(pick(art.vibeGlow[pose], boss.facing), x, y);
  }
  context.globalAlpha = 1;
  drawBraces(context, world, art, boss, cameraX, cameraY);
  drawCostume(context, world, art, boss, x, y);
}

function drawLanes(
  context: CanvasRenderingContext2D,
  world: World,
  boss: Collector,
  cameraX: number,
  cameraY: number,
): void {
  const sweeping = boss.state === "sweep";
  if (!sweeping && boss.state !== "mark") {
    return;
  }
  const progress = sweeping ? 1 - boss.timer / COLLECTOR.sweepFrames : 0;
  for (let lane = 0; lane < boss.lanes.length; lane++) {
    if (!boss.lanes[lane]) {
      continue;
    }
    laneBox(boss, lane, LANE);
    const x = LANE.x - cameraX;
    const y = LANE.y - cameraY;
    context.fillStyle = COLORS.string;
    context.globalAlpha = sweeping ? SWEEP_FILL : LANE_FILL;
    context.fillRect(x, y, LANE.width, LANE.height);
    context.globalAlpha = sweeping
      ? 1
      : markAlpha(world.frame, world.reducedMotion);
    context.fillStyle = COLORS.led;
    context.fillRect(x, y, LANE.width, 1);
    context.fillRect(x, y, 1, LANE.height);
    context.fillRect(x + LANE.width - 1, y, 1, LANE.height);
    context.fillRect(x, y + LANE.height - 1, LANE.width, 1);
    if (sweeping && !world.reducedMotion) {
      context.fillStyle = COLORS.white;
      context.fillRect(
        x + Math.round(progress * (LANE_WIDTH - SWEEP_LINE)),
        y,
        SWEEP_LINE,
        LANE.height,
      );
    }
  }
  context.globalAlpha = 1;
}

function drawSlash(
  context: CanvasRenderingContext2D,
  art: Art,
  boss: Collector,
  cameraX: number,
  cameraY: number,
): void {
  if (boss.state !== "slash") {
    return;
  }
  const image = pick(art.slashArc, boss.facing);
  const x = boss.facing > 0 ? centerX(boss) : centerX(boss) - image.width;
  context.globalAlpha = boss.timer / COLLECTOR.slashFrames;
  context.drawImage(
    image,
    Math.round(x) - cameraX,
    boss.floor - image.height - cameraY,
  );
  context.globalAlpha = 1;
}

function drawCollector(
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
  boss: Collector,
  cameraX: number,
  cameraY: number,
): void {
  drawLanes(context, world, boss, cameraX, cameraY);
  const x = frameLeft(boss, COLLECTOR_FRAME) - cameraX;
  if (boss.state === "defeat") {
    const stage = crumbleStage(boss, art.crumble.length);
    context.drawImage(
      art.crumble[stage],
      x,
      boss.floor - CRUMBLE_FLOOR - cameraY,
    );
    return;
  }
  const y = Math.round(boss.y) - COLLECTOR_FRAME.top - cameraY;
  const pose = collectorPose(boss, world.frame, world.reducedMotion);
  context.globalAlpha = collectorPresence(boss);
  context.drawImage(pick(art.collector[pose], boss.facing), x, y);
  if (isGlowing(boss)) {
    context.globalAlpha = GLOW_ALPHA;
    context.drawImage(pick(art.collectorGlow[pose], boss.facing), x, y);
  }
  context.globalAlpha = 1;
  drawSlash(context, art, boss, cameraX, cameraY);
}

function drawShrunk(
  context: CanvasRenderingContext2D,
  image: HTMLCanvasElement,
  x: number,
  y: number,
  presence: number,
  reducedMotion: boolean,
): void {
  if (reducedMotion || presence >= 1) {
    context.globalAlpha = presence;
    context.drawImage(image, x, y);
    context.globalAlpha = 1;
    return;
  }
  const height = Math.max(Math.round(image.height * presence), 1);
  const top = y + Math.round((image.height - height) / 2);
  context.drawImage(
    image,
    0,
    0,
    image.width,
    image.height,
    x,
    top,
    image.width,
    height,
  );
  if (height <= 2) {
    const width = Math.round(image.width * presence * 2);
    context.fillStyle = COLORS.white;
    context.fillRect(x + Math.round((image.width - width) / 2), top, width, 1);
  }
}

function drawMarker(
  context: CanvasRenderingContext2D,
  world: World,
  boss: Legacy,
  cameraX: number,
  cameraY: number,
): void {
  if (boss.state !== "aim") {
    return;
  }
  const x = Math.round(boss.x) - cameraX;
  const y = boss.floor - MARKER_HEIGHT - cameraY;
  context.globalAlpha = markAlpha(world.frame, world.reducedMotion);
  context.fillStyle = COLORS.gold;
  context.fillRect(x, y, boss.width, MARKER_HEIGHT);
  context.fillRect(x, y - 4, 1, 4);
  context.fillRect(x + boss.width - 1, y - 4, 1, 4);
  context.globalAlpha = 1;
}

function drawCommand(
  context: CanvasRenderingContext2D,
  art: Art,
  boss: Legacy,
  cameraX: number,
  cameraY: number,
): void {
  const command = legacyCommand(boss);
  if (!command) {
    return;
  }
  const image = art.commands[command];
  const x = clamp(
    Math.round(centerX(boss) - image.width / 2) - cameraX,
    2,
    VIEW_WIDTH - image.width - 2,
  );
  const y = Math.round(boss.y) - LEGACY_FRAME.top - image.height - LABEL_GAP;
  context.drawImage(image, x, Math.max(y - cameraY, 2));
}

function drawLegacy(
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
  boss: Legacy,
  cameraX: number,
  cameraY: number,
): void {
  drawMarker(context, world, boss, cameraX, cameraY);
  const presence = legacyPresence(boss);
  if (presence > 0) {
    const pose = legacyPose(boss);
    const x = frameLeft(boss, LEGACY_FRAME) - cameraX;
    const y = Math.round(boss.y) - LEGACY_FRAME.top - cameraY;
    drawShrunk(
      context,
      pick(art.legacy[pose], boss.facing),
      x,
      y,
      presence,
      world.reducedMotion,
    );
    if (presence >= 1) {
      const [screenX, screenY] = LEGACY_ART[pose].screen;
      const faceX =
        boss.facing > 0 ? screenX : LEGACY_FRAME.width - screenX - SCREEN.width;
      context.drawImage(art.faces[legacyFace(boss)], x + faceX, y + screenY);
      if (boss.patched) {
        context.drawImage(
          art.hotfix,
          x + faceX + HOTFIX_OFFSET.x,
          y + screenY + HOTFIX_OFFSET.y,
        );
      }
      if (isGlowing(boss)) {
        context.globalAlpha = GLOW_ALPHA;
        context.drawImage(pick(art.legacyGlow[pose], boss.facing), x, y);
        context.globalAlpha = 1;
      }
    }
  }
  drawCommand(context, art, boss, cameraX, cameraY);
}

export function drawStage(
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
  room: RoomArt,
  cameraX: number,
  cameraY: number,
): void {
  const { boss } = world.room;
  if (!boss || !isFighting(boss)) {
    return;
  }
  if (room.screen && boss.kind === "vibe" && boss.final) {
    context.drawImage(
      art.alertSlide,
      room.screen.x + SLIDE_AT.x - cameraX,
      room.screen.y + SLIDE_AT.y - cameraY,
    );
  }
  const target = Math.round(centerX(boss)) - cameraX;
  const floor = Math.round(boss.y + boss.height) - cameraY;
  context.globalAlpha = CONE_ALPHA;
  context.fillStyle = COLORS.moon;
  for (const lens of room.spotlights) {
    const x = lens.x - cameraX;
    const y = lens.y - cameraY;
    context.beginPath();
    context.moveTo(x - CONE_TOP, y);
    context.lineTo(x + CONE_TOP, y);
    context.lineTo(target + CONE_BOTTOM, floor);
    context.lineTo(target - CONE_BOTTOM, floor);
    context.closePath();
    context.fill();
  }
  context.globalAlpha = 1;
}

export function drawThroneReels(
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
  room: RoomArt,
  cameraX: number,
  cameraY: number,
): void {
  if (!room.throne) {
    return;
  }
  const { boss } = world.room;
  const legacy = boss?.kind === "legacy" ? boss : null;
  const reel =
    art.reels[
      reelStep(legacy, world.frame, world.reducedMotion, art.reels.length)
    ];
  for (const [x, y] of REELS) {
    context.drawImage(
      reel,
      room.throne.x + x - Math.floor(reel.width / 2) - cameraX,
      room.throne.y + y - Math.floor(reel.height / 2) - cameraY,
    );
  }
}

export function drawBoss(
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
  cameraX: number,
  cameraY: number,
): void {
  const { boss } = world.room;
  switch (boss?.kind) {
    case "vibe":
      drawVibe(context, world, art, boss, cameraX, cameraY);
      return;
    case "collector":
      if (isFighting(boss)) {
        drawCollector(context, world, art, boss, cameraX, cameraY);
      }
      return;
    case "legacy":
      if (boss.state !== "gone") {
        drawLegacy(context, world, art, boss, cameraX, cameraY);
      }
      return;
    case undefined:
      return;
  }
}
