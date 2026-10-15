import { ENEMY_DYING_FRAMES, VIBE } from "../balance";
import { VIEW_HEIGHT, VIEW_WIDTH } from "../core/camera";
import type { Box } from "../core/collision";
import { SWEEP_FRAMES } from "../core/combat";
import type { World } from "../core/world";
import {
  type Enemy,
  ENEMY_HEALTH,
  type EnemyKind,
  isTangible,
} from "../entities/enemy";
import type { Spark } from "../entities/particles";
import type { Projectile } from "../entities/projectiles";
import { COLORS, PALETTE } from "../palette";
import type { Art, Facing } from "./art";
import { DROP_KNIGHT_FRAME } from "./drop-knight-art";
import {
  SQUIGGLE_OFFSET,
  SYNTAX_ERROR_FRAME,
  WATCHDOG_FRAME,
} from "./enemy-art";
import {
  collapseHeight,
  collapseStage,
  dyingProgress,
  knightPose,
  squigglePhase,
  syntaxErrorPose,
  watchdogPose,
  zombiePose,
  zombieRows,
} from "./enemy-poses";
import { SPARK_PAINT } from "./item-art";
import { ZOMBIE_FRAME } from "./zombie-art";

const MARGIN = 32;
const DYING_FALL = 0.5;
const BOB_FRAMES = 20;
const BOB_HEIGHT = 1.5;
const SPIN_FRAMES = 4;
const SWEEP_TRAIL = 8;
const TRAIL_ALPHA = 0.4;
const COPY_ALPHA = 0.7;
const HALLUCINATION_ALPHA = 0.45;
const CREST_FRAMES = 12;
const CRAWL_FRAMES = 12;

type EnemyDrawer = (
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
  enemy: Enemy,
  cameraX: number,
  cameraY: number,
) => void;

const SPARK_COLORS = Object.fromEntries(
  Object.entries(SPARK_PAINT).map(([spark, key]) => [
    spark,
    COLORS[PALETTE[key]],
  ]),
) as Readonly<Record<Spark, string>>;

function visible(box: Box, cameraX: number, cameraY: number): boolean {
  return (
    box.x + box.width > cameraX - MARGIN &&
    box.x < cameraX + VIEW_WIDTH + MARGIN &&
    box.y + box.height > cameraY - MARGIN &&
    box.y < cameraY + VIEW_HEIGHT + MARGIN
  );
}

function pick(facing: Facing, direction: number): HTMLCanvasElement {
  return direction > 0 ? facing[0] : facing[1];
}

function frameX(enemy: Enemy, frame: { width: number; left: number }): number {
  return enemy.facing > 0
    ? Math.round(enemy.x) - frame.left
    : Math.round(enemy.x) - (frame.width - frame.left - enemy.width);
}

function drawCentered(
  context: CanvasRenderingContext2D,
  image: HTMLCanvasElement,
  box: Box,
  cameraX: number,
  cameraY: number,
  lift = 0,
): void {
  context.drawImage(
    image,
    Math.round(box.x + box.width / 2 - image.width / 2) - cameraX,
    Math.round(box.y + box.height / 2 - image.height / 2 + lift) - cameraY,
  );
}

function bob(world: World, offset: number): number {
  return world.reducedMotion
    ? 0
    : Math.sin((world.frame + offset) / BOB_FRAMES) * BOB_HEIGHT;
}

function drawSyntaxError(
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
  enemy: Enemy,
  cameraX: number,
  cameraY: number,
): void {
  const x = Math.round(enemy.x) - SYNTAX_ERROR_FRAME.left - cameraX;
  const y = Math.round(enemy.y) - SYNTAX_ERROR_FRAME.top - cameraY;
  if (!enemy.alive) {
    context.drawImage(
      pick(art.collapse[collapseStage(enemy)], enemy.facing),
      x,
      y,
    );
    return;
  }
  context.drawImage(
    art.squiggle[squigglePhase(enemy, world.frame, world.reducedMotion)],
    x + SQUIGGLE_OFFSET.x,
    y + SQUIGGLE_OFFSET.y,
  );
  const frames =
    enemy.health < ENEMY_HEALTH.syntaxError
      ? art.syntaxErrorDamaged
      : art.syntaxError;
  context.drawImage(pick(frames[syntaxErrorPose(enemy)], enemy.facing), x, y);
}

function drawWatchdog(
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
  enemy: Enemy,
  cameraX: number,
  cameraY: number,
): void {
  const x = Math.round(enemy.x) - WATCHDOG_FRAME.left - cameraX;
  const y = Math.round(enemy.y) - WATCHDOG_FRAME.top - cameraY;
  if (!enemy.alive) {
    const fall = world.reducedMotion
      ? 0
      : Math.round((ENEMY_DYING_FRAMES - enemy.dying) * DYING_FALL);
    context.globalAlpha = enemy.dying / ENEMY_DYING_FRAMES;
    context.drawImage(
      pick(art.watchdogDamaged.hurt, enemy.facing),
      x,
      y + fall,
    );
    context.globalAlpha = 1;
    return;
  }
  const frames =
    enemy.health < ENEMY_HEALTH.watchdog ? art.watchdogDamaged : art.watchdog;
  const pose = watchdogPose(
    enemy,
    world.hero,
    world.frame,
    world.reducedMotion,
  );
  context.drawImage(pick(frames[pose], enemy.facing), x, y);
}

function drawZombie(
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
  enemy: Enemy,
  cameraX: number,
  cameraY: number,
): void {
  const rows = zombieRows(enemy);
  if (rows <= 0) {
    return;
  }
  const image = pick(art.zombie[zombiePose(enemy)], enemy.facing);
  const floor = Math.round(enemy.y + enemy.height);
  context.globalAlpha = enemy.summoned ? COPY_ALPHA : 1;
  context.drawImage(
    image,
    0,
    0,
    image.width,
    rows,
    frameX(enemy, ZOMBIE_FRAME) - cameraX,
    floor - rows - cameraY,
    image.width,
    rows,
  );
  context.globalAlpha = 1;
}

function drawDropKnight(
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
  enemy: Enemy,
  cameraX: number,
  cameraY: number,
): void {
  const image = pick(art.dropKnight[knightPose(enemy)], enemy.facing);
  const x = frameX(enemy, DROP_KNIGHT_FRAME) - cameraX;
  const floor = Math.round(enemy.y + enemy.height) - cameraY;
  if (enemy.alive) {
    context.drawImage(image, x, floor - image.height);
    return;
  }
  const scale = world.reducedMotion ? 1 : collapseHeight(enemy);
  const height = Math.max(Math.round(image.height * scale), 1);
  context.globalAlpha = 1 - dyingProgress(enemy);
  context.drawImage(
    image,
    0,
    0,
    image.width,
    image.height,
    x,
    floor - height,
    image.width,
    height,
  );
  context.globalAlpha = 1;
}

const ENEMY_DRAWERS: Readonly<Record<EnemyKind, EnemyDrawer>> = {
  syntaxError: drawSyntaxError,
  watchdog: drawWatchdog,
  zombie: drawZombie,
  dropKnight: drawDropKnight,
};

export function drawEnemies(
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
  cameraX: number,
  cameraY: number,
): void {
  for (const enemy of world.room.enemies) {
    const shown = isTangible(enemy) || enemy.dying > 0;
    if (!shown || !visible(enemy, cameraX, cameraY)) {
      continue;
    }
    ENEMY_DRAWERS[enemy.kind](context, world, art, enemy, cameraX, cameraY);
  }
}

export function drawItems(
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
  cameraX: number,
  cameraY: number,
): void {
  for (const relic of world.room.relics) {
    if (relic.taken || !visible(relic, cameraX, cameraY)) {
      continue;
    }
    const image = art.relics[relic.kind];
    context.drawImage(
      image,
      Math.round(relic.x + relic.width / 2 - image.width / 2) - cameraX,
      Math.round(relic.y + relic.height + 1 - image.height) - cameraY,
    );
  }
  for (const pickup of world.room.pickups) {
    if (!pickup.taken && visible(pickup, cameraX, cameraY)) {
      drawCentered(context, art.drops[pickup.kind], pickup, cameraX, cameraY);
    }
  }
  for (const container of world.room.containers) {
    if (!container.broken && visible(container, cameraX, cameraY)) {
      drawCentered(
        context,
        art.containers[container.kind],
        container,
        cameraX,
        cameraY,
        bob(world, container.x),
      );
    }
  }
  for (const drop of world.drops) {
    if (drop.active) {
      drawCentered(context, art.drops[drop.kind], drop, cameraX, cameraY);
    }
  }
}

function cycle(
  projectile: Projectile,
  world: World,
  step: number,
  frames: number,
): number {
  return world.reducedMotion ? 0 : Math.floor(projectile.age / step) % frames;
}

function spinFrame(
  projectile: Projectile,
  world: World,
  frames: number,
): number {
  if (world.reducedMotion) {
    return 0;
  }
  const turn = Math.floor(projectile.age / SPIN_FRAMES) % frames;
  return projectile.facing > 0 ? turn : (frames - turn) % frames;
}

function projectileImage(
  projectile: Projectile,
  world: World,
  art: Art,
): HTMLCanvasElement {
  switch (projectile.kind) {
    case "select":
      return pick(art.select, projectile.facing);
    case "join":
      return art.join[
        world.reducedMotion
          ? 0
          : Math.floor(projectile.age / SPIN_FRAMES) % art.join.length
      ];
    case "drop":
    case "dropAxe":
      return art.axes[spinFrame(projectile, world, art.axes.length)];
    case "glyph":
      return art.glyphs[projectile.variant];
    case "beam":
      return art.beams[projectile.variant];
    case "card":
      return art.cards[projectile.variant];
    case "code":
    case "hallucination":
      return art.codeBlocks[projectile.variant];
    case "wave":
      return pick(
        art.waves[cycle(projectile, world, CREST_FRAMES, art.waves.length)],
        projectile.facing,
      );
    case "bug":
      return art.bugs[
        projectile.age > VIBE.bugWarnFrames
          ? 0
          : cycle(projectile, world, CRAWL_FRAMES, art.bugs.length)
      ];
  }
}

export function drawProjectiles(
  context: CanvasRenderingContext2D,
  world: World,
  art: Art,
  cameraX: number,
  cameraY: number,
): void {
  for (const projectile of world.projectiles) {
    if (projectile.active) {
      context.globalAlpha =
        projectile.kind === "hallucination" ? HALLUCINATION_ALPHA : 1;
      drawCentered(
        context,
        projectileImage(projectile, world, art),
        projectile,
        cameraX,
        cameraY,
      );
    }
  }
  context.globalAlpha = 1;
}

export function drawParticles(
  context: CanvasRenderingContext2D,
  world: World,
  cameraX: number,
  cameraY: number,
): void {
  for (const particle of world.particles) {
    if (particle.active) {
      context.fillStyle = SPARK_COLORS[particle.spark];
      context.fillRect(
        Math.round(particle.x) - cameraX,
        Math.round(particle.y) - cameraY,
        2,
        2,
      );
    }
  }
}

export function drawSweep(context: CanvasRenderingContext2D, world: World) {
  if (world.sweep === 0 || world.reducedMotion) {
    return;
  }
  const x = Math.round((1 - world.sweep / SWEEP_FRAMES) * VIEW_WIDTH);
  context.fillStyle = COLORS.string;
  context.globalAlpha = TRAIL_ALPHA;
  context.fillRect(x - SWEEP_TRAIL - 1, 0, SWEEP_TRAIL, VIEW_HEIGHT);
  context.globalAlpha = 1;
  context.fillRect(x - 1, 0, 3, VIEW_HEIGHT);
}
