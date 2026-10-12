export type Placement = "right" | "left" | "below" | "above";

interface TargetBox {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

interface Viewport {
  width: number;
  height: number;
}

export interface CardPosition {
  top?: number;
  bottom?: number;
  left: number;
}

const GAP = 12;
const MARGIN = 12;
const ROOM_ABOVE = 200;
const FALLBACK_TOP = 72;

function clampLeft(left: number, width: number, viewport: Viewport): number {
  const max = Math.max(MARGIN, viewport.width - width - MARGIN);
  return Math.min(Math.max(left, MARGIN), max);
}

function below(target: TargetBox, width: number, viewport: Viewport) {
  return {
    top: target.bottom + GAP,
    left: clampLeft(target.left, width, viewport),
  };
}

export function placeCard(
  target: TargetBox | null,
  viewport: Viewport,
  placement: Placement,
  width: number,
): CardPosition {
  if (!target) {
    return {
      top: FALLBACK_TOP,
      left: clampLeft((viewport.width - width) / 2, width, viewport),
    };
  }
  if (placement === "right") {
    const left = target.right + GAP;
    return left + width + MARGIN <= viewport.width
      ? { top: Math.max(target.top, MARGIN), left }
      : below(target, width, viewport);
  }
  if (placement === "left") {
    const left = target.left - GAP - width;
    return left >= MARGIN
      ? { top: Math.max(target.top, MARGIN), left }
      : below(target, width, viewport);
  }
  if (placement === "above" && target.top >= ROOM_ABOVE) {
    return {
      bottom: viewport.height - target.top + GAP,
      left: clampLeft(target.left, width, viewport),
    };
  }
  return below(target, width, viewport);
}
