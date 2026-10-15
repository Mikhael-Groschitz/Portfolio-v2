import { type SpriteRows, blank, outline, stamp } from "./sprite";

export const ZOMBIE_FRAME = { width: 18, height: 26, left: 4, top: 4 } as const;

const UPPER = [
  "..................",
  "........hhhhh.....",
  ".......hmmmmmh....",
  ".......mmmmmmm....",
  ".......mRkmRkm....",
  ".......mmmmmmm....",
  "........mkkkm.....",
  "........mkssm.....",
  ".........msm......",
  "......3333s3......",
  ".....33333333mmm..",
  "....3wwwww3333mmm.",
  "....3wkkkw333..mm.",
  "....3wwwww333.....",
  "...m3ss333s3......",
  "...m.3333s33......",
  "...s.4333343......",
  "...s.43333443.....",
];

const LEGS = {
  stride: [
    ".....22222222.....",
    ".....222.2222.....",
    ".....222..222.....",
    "....222...222.....",
    "....22....2222....",
    "...mm......222....",
    "..mmm......mmmm...",
  ],
  drag: [
    ".....22222222.....",
    ".....2222.222.....",
    ".....2222.222.....",
    "......222.222.....",
    "......22..222.....",
    ".....mm...222.....",
    "....mmm...mmmm....",
  ],
} as const;

const LEGS_TOP = 18;

interface ZombieParts {
  legs: keyof typeof LEGS;
  dx?: number;
  dy?: number;
}

const ZOMBIE_POSES = {
  shamble1: { legs: "stride" },
  shamble2: { legs: "drag", dy: 1 },
  hurt: { legs: "stride", dx: -1, dy: -1 },
} satisfies Record<string, ZombieParts>;

export type ZombiePose = keyof typeof ZOMBIE_POSES;

export const SHAMBLE: readonly ZombiePose[] = ["shamble1", "shamble2"];

function zombie({ legs, dx = 0, dy = 0 }: ZombieParts): string[] {
  let rows: SpriteRows = blank(ZOMBIE_FRAME.width, ZOMBIE_FRAME.height);
  rows = stamp(rows, LEGS[legs], 0, LEGS_TOP);
  rows = stamp(rows, UPPER, dx, dy);
  return outline(rows);
}

export const ZOMBIE_ART = Object.fromEntries(
  Object.entries<ZombieParts>(ZOMBIE_POSES).map(([name, parts]) => [
    name,
    zombie(parts),
  ]),
) as Record<ZombiePose, string[]>;
