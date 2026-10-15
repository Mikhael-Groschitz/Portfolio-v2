import { type Level, TILE, isLedge, isSolid } from "../levels/level";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Body extends Box {
  vx: number;
  vy: number;
  grounded: boolean;
}

const EDGE = 0.001;

export function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

export function hitsSolid(level: Level, box: Box): boolean {
  const left = Math.floor(box.x / TILE);
  const right = Math.floor((box.x + box.width - EDGE) / TILE);
  const top = Math.floor(box.y / TILE);
  const bottom = Math.floor((box.y + box.height - EDGE) / TILE);
  for (let row = top; row <= bottom; row++) {
    for (let column = left; column <= right; column++) {
      if (isSolid(level, column, row)) {
        return true;
      }
    }
  }
  return false;
}

function landingRow(
  level: Level,
  body: Body,
  previousBottom: number,
  ledges: boolean,
): number | null {
  const row = Math.floor((body.y + body.height - EDGE) / TILE);
  const left = Math.floor(body.x / TILE);
  const right = Math.floor((body.x + body.width - EDGE) / TILE);
  const fromAbove = previousBottom <= row * TILE + EDGE;
  for (let column = left; column <= right; column++) {
    if (
      isSolid(level, column, row) ||
      (ledges && fromAbove && isLedge(level, column, row))
    ) {
      return row;
    }
  }
  return null;
}

export function standsOnLedge(level: Level, body: Body): boolean {
  const row = Math.floor((body.y + body.height + EDGE) / TILE);
  const left = Math.floor(body.x / TILE);
  const right = Math.floor((body.x + body.width - EDGE) / TILE);
  let ledge = false;
  for (let column = left; column <= right; column++) {
    if (isSolid(level, column, row)) {
      return false;
    }
    ledge ||= isLedge(level, column, row);
  }
  return ledge;
}

export function slide(level: Level, body: Body, dx: number): boolean {
  body.x += dx;
  if (dx === 0 || !hitsSolid(level, body)) {
    return false;
  }
  body.x =
    dx > 0
      ? Math.floor((body.x + body.width) / TILE) * TILE - body.width
      : (Math.floor(body.x / TILE) + 1) * TILE;
  return true;
}

export function moveBody(level: Level, body: Body, ledges = true): void {
  if (slide(level, body, body.vx)) {
    body.vx = 0;
  }
  const previousBottom = body.y + body.height;
  body.y += body.vy;
  body.grounded = false;
  if (body.vy > 0) {
    const row = landingRow(level, body, previousBottom, ledges);
    if (row !== null) {
      body.y = row * TILE - body.height;
      body.vy = 0;
      body.grounded = true;
    }
  } else if (body.vy < 0 && hitsSolid(level, body)) {
    body.y = (Math.floor(body.y / TILE) + 1) * TILE;
    body.vy = 0;
  }
}
