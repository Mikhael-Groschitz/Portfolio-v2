import { VIEW_HEIGHT, VIEW_WIDTH } from "../core/camera";
import {
  INTRO_RISE,
  type World,
  introProgress,
  isOpen,
  isSaved,
  passageProgress,
} from "../core/world";
import { heroPose, lashReach } from "../entities/hero";
import { COLORS } from "../palette";
import type { Art, RoomArt, Spot } from "./art";
import {
  FOG_DRIFT,
  FOG_LAYER,
  type Layer,
  MOON_LAYER,
  SKY_LAYER,
  TOWER_LAYER,
} from "./backdrop";
import { quakeOffset } from "./boss-poses";
import { drawBoss, drawStage, drawThroneReels } from "./bosses";
import { DOOR_LOCK, SAVEPOINT_SCREEN_AT } from "./castle-art";
import {
  drawEnemies,
  drawItems,
  drawParticles,
  drawProjectiles,
  drawSweep,
} from "./entities";
import { BEACON, LED, heroAlpha, lit } from "./flicker";
import { HERO_FRAME, LASH_HAND, frameTop, heroFrame } from "./hero-art";
import { drawMechanisms } from "./mechanisms";

const TITLE_TOP = 18;
const FOG_ALPHA = 0.35;
const DIM_ALPHA = 0.55;

function shift(origin: number, camera: number, depth: number): number {
  return Math.round(origin - camera * depth);
}

function drawLayer(
  context: CanvasRenderingContext2D,
  image: HTMLCanvasElement,
  layer: Layer,
  cameraX: number,
  cameraY: number,
  drift = 0,
): void {
  const top = shift(layer.top, cameraY, layer.depthY);
  const left = shift(layer.left, cameraX, layer.depthX) - drift;
  if (!layer.repeat) {
    context.drawImage(image, left, top);
    return;
  }
  for (
    let x = (left % image.width) - image.width;
    x < VIEW_WIDTH;
    x += image.width
  ) {
    context.drawImage(image, x, top);
  }
}

function drawBackdrop(
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
) {
  const { reducedMotion, camera, restY, frame } = world;
  const skyY = restY - INTRO_RISE;
  const cameraX = reducedMotion ? 0 : camera.x;
  const cameraY = reducedMotion
    ? camera.y < (skyY + restY) / 2
      ? skyY
      : restY
    : camera.y;
  drawLayer(context, art.sky, SKY_LAYER, cameraX, cameraY);
  drawLayer(context, art.moon, MOON_LAYER, cameraX, cameraY);
  drawLayer(context, art.towers, TOWER_LAYER, cameraX, cameraY);
  const towersTop = shift(TOWER_LAYER.top, cameraY, TOWER_LAYER.depthY);
  const towersLeft = shift(0, cameraX, TOWER_LAYER.depthX);
  for (let index = 0; index < art.towerLights.length; index++) {
    const light = art.towerLights[index];
    const on = reducedMotion || lit(frame, index * 37, BEACON);
    context.fillStyle = on ? COLORS.led : COLORS.ledOff;
    const x =
      (((light.x + towersLeft) % art.towers.width) + art.towers.width) %
      art.towers.width;
    context.fillRect(x, towersTop + light.y, 1, 1);
  }
  context.globalAlpha = FOG_ALPHA;
  drawLayer(
    context,
    art.fog,
    FOG_LAYER,
    cameraX,
    cameraY,
    reducedMotion ? 0 : Math.floor(frame * FOG_DRIFT),
  );
  context.globalAlpha = 1;
}

function drawLevel(
  context: CanvasRenderingContext2D,
  world: World,
  room: RoomArt,
  cameraX: number,
  cameraY: number,
) {
  if (room.battlements) {
    context.drawImage(
      room.battlements,
      room.roofStart - cameraX,
      -room.battlements.height - cameraY,
    );
  }
  const sourceY = Math.max(cameraY, 0);
  const targetY = Math.max(-cameraY, 0);
  const height = Math.min(
    VIEW_HEIGHT - targetY,
    world.room.level.height - sourceY,
  );
  if (height > 0) {
    context.drawImage(
      room.canvas,
      cameraX,
      sourceY,
      VIEW_WIDTH,
      height,
      0,
      targetY,
      VIEW_WIDTH,
      height,
    );
  }
  for (const light of room.lights) {
    const x = light.x - cameraX;
    const y = light.y - cameraY;
    if (x < 0 || y < 0 || x >= VIEW_WIDTH || y >= VIEW_HEIGHT) {
      continue;
    }
    const on = world.reducedMotion || lit(world.frame, light.phase, LED);
    context.fillStyle = on ? light.on : light.off;
    context.fillRect(x, y, 1, 1);
  }
}

function drawLock(
  context: CanvasRenderingContext2D,
  door: Spot,
  color: string,
  cameraX: number,
  cameraY: number,
) {
  context.fillStyle = color;
  context.fillRect(
    door.x + DOOR_LOCK.x - cameraX,
    door.y + DOOR_LOCK.y - cameraY,
    DOOR_LOCK.width,
    DOOR_LOCK.height,
  );
}

function drawDoors(
  context: CanvasRenderingContext2D,
  world: World,
  room: RoomArt,
  cameraX: number,
  cameraY: number,
) {
  if (room.entry) {
    drawLock(context, room.entry, COLORS.led, cameraX, cameraY);
  }
  if (room.exit) {
    const color = isOpen(world.room) ? COLORS.comment : COLORS.led;
    drawLock(context, room.exit, color, cameraX, cameraY);
  }
}

function drawSavepoints(
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
  room: RoomArt,
  cameraX: number,
  cameraY: number,
) {
  for (let mark = 0; mark < room.savepoints.length; mark++) {
    if (isSaved(world, world.room, mark)) {
      const spot = room.savepoints[mark];
      context.drawImage(
        art.savepointScreen,
        spot.x + SAVEPOINT_SCREEN_AT.x - cameraX,
        spot.y + SAVEPOINT_SCREEN_AT.y - cameraY,
      );
    }
  }
}

function drawLash(
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
  frameX: number,
  frameY: number,
) {
  const { hero } = world;
  const pose = heroPose(hero);
  if (pose !== "strike" && pose !== "windup" && pose !== "crouchStrike") {
    return;
  }
  const hand = LASH_HAND[pose];
  const handX =
    hero.facing > 0 ? frameX + hand.x : frameX + HERO_FRAME.width - 1 - hand.x;
  const handY = frameY + hand.y;
  if (pose === "windup") {
    context.fillStyle = COLORS.cable;
    context.fillRect(handX - hero.facing * 2, handY + 1, 1, 3);
    context.fillRect(handX - hero.facing * 3, handY + 4, 1, 2);
    return;
  }
  const reach = Math.round(lashReach(hero.lash));
  if (reach <= 0) {
    return;
  }
  const start = hero.facing > 0 ? handX : handX - reach;
  context.fillStyle = COLORS.ink;
  context.fillRect(start, handY - 1, reach, 4);
  context.fillStyle = COLORS.cable;
  context.fillRect(start, handY, reach, 1);
  context.fillStyle = COLORS.keyword;
  context.fillRect(start, handY + 1, reach, 1);
  const [right, left] = art.plug;
  const plug = hero.facing > 0 ? right : left;
  context.drawImage(
    plug,
    hero.facing > 0 ? start + reach - 1 : start - plug.width + 1,
    handY - 1,
  );
}

function drawHero(
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
  cameraX: number,
  cameraY: number,
) {
  const { hero } = world;
  const frame = heroFrame(heroPose(hero), hero.stride, world.frame);
  const [right, left] = art.hero[frame];
  const frameX = Math.round(hero.x) - HERO_FRAME.left - cameraX;
  const frameY = frameTop(hero) - cameraY;
  context.globalAlpha = heroAlpha(hero.invulnerable, world.reducedMotion);
  context.drawImage(hero.facing > 0 ? right : left, frameX, frameY);
  drawLash(context, world, art, frameX, frameY);
  context.globalAlpha = 1;
}

function titleAlpha(world: World): number {
  if (world.mode === "title") {
    return 1;
  }
  if (world.mode !== "intro") {
    return 0;
  }
  const progress = introProgress(world);
  return world.reducedMotion
    ? Math.max(1 - progress * 2, 0)
    : Math.min(Math.max((0.75 - progress) / 0.25, 0), 1);
}

function veilAlpha(world: World): number {
  if (
    world.mode === "paused" ||
    world.mode === "crash" ||
    world.mode === "victory"
  ) {
    return DIM_ALPHA;
  }
  if (world.passage > 0) {
    return 1 - Math.abs(2 * passageProgress(world) - 1);
  }
  if (world.mode === "intro" && world.reducedMotion) {
    return 1 - Math.abs(2 * introProgress(world) - 1);
  }
  return 0;
}

export function render(
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
): void {
  const room = art.room(world.room.index);
  const cameraX = Math.round(world.camera.x);
  const cameraY =
    Math.round(world.camera.y) + quakeOffset(world.quake, world.reducedMotion);
  context.imageSmoothingEnabled = false;
  if (world.room.level.gate) {
    drawBackdrop(context, world, art);
  } else {
    context.fillStyle = COLORS.ink;
    context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }
  drawLevel(context, world, room, cameraX, cameraY);
  drawMechanisms(context, world, art, room, cameraX, cameraY);
  drawDoors(context, world, room, cameraX, cameraY);
  drawSavepoints(context, world, art, room, cameraX, cameraY);
  drawThroneReels(context, world, art, room, cameraX, cameraY);
  drawStage(context, world, art, room, cameraX, cameraY);
  drawItems(context, world, art, cameraX, cameraY);
  drawBoss(context, world, art, cameraX, cameraY);
  drawEnemies(context, world, art, cameraX, cameraY);
  drawHero(context, world, art, cameraX, cameraY);
  drawProjectiles(context, world, art, cameraX, cameraY);
  drawParticles(context, world, cameraX, cameraY);
  drawSweep(context, world);
  const title = titleAlpha(world);
  if (title > 0) {
    context.globalAlpha = title;
    context.drawImage(
      art.title,
      Math.floor((VIEW_WIDTH - art.title.width) / 2),
      TITLE_TOP,
    );
    context.globalAlpha = 1;
  }
  const veil = veilAlpha(world);
  if (veil > 0) {
    context.globalAlpha = veil;
    context.fillStyle = COLORS.ink;
    context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    context.globalAlpha = 1;
  }
}
