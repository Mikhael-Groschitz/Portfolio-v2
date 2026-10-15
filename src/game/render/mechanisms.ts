import { BELT, SECTOR } from "../balance";
import { VIEW_HEIGHT, VIEW_WIDTH } from "../core/camera";
import { framesToMs } from "../core/clock";
import type { Box } from "../core/collision";
import type { World } from "../core/world";
import {
  type Mechanisms,
  beamState,
  isScheduled,
  scheduleLeft,
} from "../entities/mechanisms";
import { TILE } from "../levels/level";
import { COLORS } from "../palette";
import type { Art, RoomArt } from "./art";
import { markAlpha } from "./boss-poses";
import { EMITTER_LENS } from "./stage-art";

const TREMOR_FRAMES = 2;
const TREAD_GAP = 4;
const TREAD_ROW = 1;
const GHOST_ALPHA = 0.25;
const DEBRIS_FALL = 0.35;
const DIGIT_LIFT = 9;
const GUIDE_GAP = 4;
const BEAM_ALPHA = 0.85;
const CORE_WIDTH = 2;

function onScreen(box: Box, cameraX: number, cameraY: number): boolean {
  return (
    box.x + box.width > cameraX &&
    box.x < cameraX + VIEW_WIDTH &&
    box.y + box.height > cameraY &&
    box.y < cameraY + VIEW_HEIGHT
  );
}

function drawBelts(
  context: CanvasRenderingContext2D,
  world: World,
  mechanisms: Mechanisms,
  cameraX: number,
  cameraY: number,
): void {
  context.fillStyle = COLORS.ink;
  for (const belt of mechanisms.belts) {
    if (!onScreen(belt, cameraX, cameraY)) {
      continue;
    }
    const travel = world.reducedMotion
      ? 0
      : Math.floor(mechanisms.clock * BELT.speed) * belt.direction;
    const shift = ((travel % TREAD_GAP) + TREAD_GAP) % TREAD_GAP;
    for (let x = shift; x < belt.width; x += TREAD_GAP) {
      context.fillRect(
        belt.x + x - cameraX,
        belt.y + TREAD_ROW - cameraY,
        1,
        1,
      );
    }
  }
}

function drawSectors(
  context: CanvasRenderingContext2D,
  world: World,
  room: RoomArt,
  mechanisms: Mechanisms,
  cameraX: number,
  cameraY: number,
): void {
  for (const sector of mechanisms.sectors) {
    if (!onScreen(sector, cameraX, cameraY)) {
      continue;
    }
    const x = sector.x - cameraX;
    const y = sector.y - cameraY;
    switch (sector.state) {
      case "solid":
        context.drawImage(room.sector, x, y);
        break;
      case "cracking": {
        const tremor = world.reducedMotion
          ? 0
          : Math.floor(mechanisms.clock / TREMOR_FRAMES) % 2 === 0
            ? 1
            : -1;
        context.drawImage(room.crackedSector, x + tremor, y);
        break;
      }
      case "fallen": {
        const elapsed = SECTOR.regrowFrames - sector.timer;
        if (!world.reducedMotion && elapsed < SECTOR.fallFrames) {
          context.globalAlpha = 1 - elapsed / SECTOR.fallFrames;
          context.drawImage(
            room.debris,
            x,
            y + Math.round(elapsed * elapsed * DEBRIS_FALL),
          );
          context.globalAlpha = 1;
        }
        break;
      }
    }
  }
}

function drawPlatforms(
  context: CanvasRenderingContext2D,
  art: Art,
  mechanisms: Mechanisms,
  cameraX: number,
  cameraY: number,
): void {
  for (const platform of mechanisms.platforms) {
    if (!onScreen(platform, cameraX, cameraY)) {
      continue;
    }
    const x = platform.x - cameraX;
    const y = platform.y - cameraY;
    const image = art.cronPlatforms[platform.group];
    if (!isScheduled(platform, mechanisms.clock)) {
      context.globalAlpha = GHOST_ALPHA;
      context.drawImage(image, x - 1, y - 1);
      context.globalAlpha = 1;
      continue;
    }
    context.drawImage(image, x - 1, y - 1);
    if (platform.lead) {
      const seconds = Math.ceil(
        framesToMs(scheduleLeft(platform, mechanisms.clock)) / 1000,
      );
      const digit = art.digits[Math.min(seconds, art.digits.length - 1)];
      context.drawImage(
        digit,
        x + Math.floor((TILE - digit.width) / 2),
        y - DIGIT_LIFT,
      );
    }
  }
}

function drawBeams(
  context: CanvasRenderingContext2D,
  world: World,
  mechanisms: Mechanisms,
  cameraX: number,
  cameraY: number,
): void {
  for (const beam of mechanisms.beams) {
    if (!onScreen(beam, cameraX, cameraY)) {
      continue;
    }
    const state = beamState(beam, mechanisms.clock);
    if (state === "off") {
      continue;
    }
    const lensX = Math.floor(beam.x / TILE) * TILE + EMITTER_LENS.x - cameraX;
    const lensY = Math.floor(beam.y / TILE) * TILE + EMITTER_LENS.y - cameraY;
    const middle = Math.round(beam.x + beam.width / 2) - cameraX;
    const top = beam.y - cameraY;
    if (state === "warn") {
      context.fillStyle = COLORS.gold;
      context.fillRect(lensX, lensY, EMITTER_LENS.width, EMITTER_LENS.height);
      context.globalAlpha = markAlpha(world.frame, world.reducedMotion);
      for (let y = 0; y < beam.height; y += GUIDE_GAP) {
        context.fillRect(middle, top + y, 1, 2);
      }
      context.globalAlpha = 1;
      continue;
    }
    context.fillStyle = COLORS.ledGlow;
    context.fillRect(lensX, lensY, EMITTER_LENS.width, EMITTER_LENS.height);
    context.globalAlpha = BEAM_ALPHA;
    context.fillStyle = COLORS.led;
    context.fillRect(beam.x - cameraX, top, beam.width, beam.height);
    context.globalAlpha = 1;
    context.fillStyle = COLORS.white;
    context.fillRect(middle - CORE_WIDTH / 2, top, CORE_WIDTH, beam.height);
  }
}

export function drawMechanisms(
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
  room: RoomArt,
  cameraX: number,
  cameraY: number,
): void {
  const { mechanisms } = world.room;
  drawBelts(context, world, mechanisms, cameraX, cameraY);
  drawSectors(context, world, room, mechanisms, cameraX, cameraY);
  drawPlatforms(context, art, mechanisms, cameraX, cameraY);
  drawBeams(context, world, mechanisms, cameraX, cameraY);
}
