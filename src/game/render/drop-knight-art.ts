import { type SpriteRows, blank, keep, outline, stamp } from "./sprite";

const HEADROOM = 6;

export const DROP_KNIGHT_FRAME = {
  width: 24,
  height: 32 + HEADROOM,
  left: 3,
  top: 4 + HEADROOM,
} as const;

const BASE = [
  "........................",
  "........cccc....F.......",
  ".......cc..cc...F88.....",
  ".......77777....F8888...",
  "......7888887...F8w8w8..",
  ".....788888887..F8wwww8.",
  ".....7kRRkRRk7.FF8w8w88.",
  ".....788888887..F8wwww8.",
  ".....7887k7887..F8w8w8..",
  "......7777777...F8888...",
  "....8888...8888.F88.....",
  "...8y888888888y8F.......",
  "...888bbbbbbbbb888F.....",
  "...88.bbwwwwwbb.88F.....",
  "...77.bbwkwkwbb.77F.....",
  "...77.bbwwwwwbb..7F.....",
  "...77.bbwkwkwbb...F.....",
  "...77.bbwwwwwbb...F.....",
  "...88.bbbbbbbbb...F.....",
  ".....yyyyyyyyyyy..F.....",
  ".....bbbbb.bbbbb..F.....",
  ".....78887.78887..F.....",
  ".....78887.78887..F.....",
  ".....77887.77887..F.....",
  ".....78887.78887..F.....",
  "....8888888.8888888.....",
  ".....78887.78887........",
  ".....78887.78887........",
  ".....78887.78887........",
  "....6666666.6666666.....",
  "...66666666.66666666....",
  "........................",
];

const RAISED_ARM = [".8", ".7", ".7", ".7", ".7", ".8"];
const STRETCHED_ARM = ["8888888", "....877"];
const LEGS_TOP = 21;
const LEGS_BOTTOM = 30;
const LEFT_LEG_EDGE = 11;

function isAxe(row: number, column: number): boolean {
  if (row <= 10) {
    return column >= 15;
  }
  if (row === 11) {
    return column === 16;
  }
  return row <= 24 && column === 18;
}

function isArm(row: number, column: number): boolean {
  return row >= 13 && row <= 15 && (column === 16 || column === 17);
}

const BODY = keep(BASE, (row, column) => !isAxe(row, column));
const ARMLESS = keep(BODY, (row, column) => !isArm(row, column));
const AXE = keep(BASE, isAxe);
const AXE_HEAD = keep(AXE, (row) => row <= 11);

function liftLeg(rows: SpriteRows, side: "left" | "right"): string[] {
  const inSide = (column: number) =>
    side === "left" ? column < LEFT_LEG_EDGE : column >= LEFT_LEG_EDGE;
  return rows.map((line, row) =>
    [...line]
      .map((pixel, column) => {
        if (!inSide(column) || row < LEGS_TOP || row > LEGS_BOTTOM) {
          return pixel;
        }
        return row === LEGS_BOTTOM ? "." : (rows[row + 1]?.[column] ?? ".");
      })
      .join(""),
  );
}

function visor(rows: SpriteRows, light: string): string[] {
  return rows.map((line) => line.replaceAll("R", light));
}

interface KnightParts {
  body: SpriteRows;
  axe?: SpriteRows;
  axeY?: number;
  arm?: readonly [SpriteRows, number, number];
  dx?: number;
}

const KNIGHT_POSES = {
  walk1: { body: BODY, axe: AXE },
  walk2: { body: liftLeg(BODY, "left"), axe: AXE },
  walk3: { body: BODY, axe: AXE },
  walk4: { body: liftLeg(BODY, "right"), axe: AXE },
  windup: {
    body: visor(ARMLESS, "L"),
    axe: AXE_HEAD,
    axeY: -HEADROOM,
    arm: [RAISED_ARM, 15, 6],
  },
  throw: { body: ARMLESS, arm: [STRETCHED_ARM, 15, 12] },
  empty: { body: BODY },
  hurt: { body: visor(BODY, "r"), axe: AXE, dx: -1 },
} satisfies Record<string, KnightParts>;

export type DropKnightPose = keyof typeof KNIGHT_POSES;

export const KNIGHT_WALK: readonly DropKnightPose[] = [
  "walk1",
  "walk2",
  "walk3",
  "walk4",
];

function knight({ body, axe, axeY = 0, arm, dx = 0 }: KnightParts): string[] {
  let rows: SpriteRows = blank(
    DROP_KNIGHT_FRAME.width,
    DROP_KNIGHT_FRAME.height,
  );
  rows = stamp(rows, body, dx, HEADROOM);
  if (arm) {
    rows = stamp(rows, arm[0], arm[1] + dx, arm[2] + HEADROOM);
  }
  if (axe) {
    rows = stamp(rows, axe, dx, HEADROOM + axeY);
  }
  return outline(rows);
}

export const DROP_KNIGHT_ART = Object.fromEntries(
  Object.entries<KnightParts>(KNIGHT_POSES).map(([name, parts]) => [
    name,
    knight(parts),
  ]),
) as Record<DropKnightPose, string[]>;
