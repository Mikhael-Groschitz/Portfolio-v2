import type { StageId } from "../levels/campaign";
import { type SpriteRows, blank, outline, pad, stamp } from "./sprite";

export const STAGE_PAINTS: Readonly<
  Record<StageId, Readonly<Record<string, string>>>
> = {
  racks: {},
  catacombs: { "5": "4", "4": "3", "3": "2" },
  tapes: { "1": "k", "2": "H", "4": "F", "5": "q" },
  lab: { "1": "6", "2": "6", "3": "7", "4": "8", "5": "8" },
  stairs: {},
  cron: { "1": "n", "2": "d", "3": "h", "4": "m" },
};

const BELT_ROWS: SpriteRows = [
  "2222222222222222",
  "4444444444444444",
  "k66k66k66k66k66k",
  "6787678767876787",
  "7878787878787878",
  "6787678767876787",
  "k66k66k66k66k66k",
  "2222222222222222",
  "4444444444444431",
  "3333332143333333",
  "3333332143333333",
  "3333232143333333",
  "3333332143332333",
  "3333332143333333",
  "2222222122222222",
  "1111111111111111",
];

const SECTOR_ROWS: SpriteRows = [
  "5555555555555555",
  "4444444k44444444",
  "3333333k33333333",
  "222222k222222222",
  "11111k1111111111",
  "444444k444443144",
  "433333k33333k321",
  "4333333k333k3321",
  "43333333k3k33321",
  "2222222222k22221",
  "1111111111111111",
  "4444443144444444",
  "3333332143333333",
  "3333332143333333",
  "2222222122222222",
  "1111111111111111",
];

const CRACKING_ROWS: SpriteRows = [
  "555555k555555555",
  "444444kk44444k44",
  "33333k3k3333k333",
  "2222k222k22k2222",
  "111k1111k1k11111",
  "44k444444k443144",
  "4k3333k33k333321",
  "k333kk3k3333k321",
  "4333k333kk3k3321",
  "222k22222k2k2221",
  "11k11111k11k1111",
  "444k4431k4444444",
  "3333k321k3333333",
  "33333k21k3333333",
  "222222k122222222",
  "1111111k11111111",
];

const DEBRIS_ROWS: SpriteRows = [
  "..44......5.....",
  ".4332....443....",
  ".3332....332....",
  "..21.....21.....",
  "........44......",
  "...33..4332.....",
  "..432...221.....",
  "..21............",
];

const CRON_A: SpriteRows = [
  "yyyyyyyyyyyyyyyy",
  "FyyFyyyyyyyyFyyF",
  "FFFFFFFFFFFFFFFF",
  "HFoFHHHHHHHHFoFH",
  "HHHHHHHHHHHHHHHH",
  ".kH.kH.kH.kH.kH.",
  "..k..k..k..k..k.",
];

const CRON_B: SpriteRows = [
  "yyyyyyyyyyyyyyyy",
  "yFFyyFFyyFFyyFFy",
  "FFFFFFFFFFFFFFFF",
  "HHFFHHHFFHHHFFHH",
  "HHHHHHHHHHHHHHHH",
  "HH.HH.HH.HH.HH.H",
  "k...k...k...k...",
];

const EMITTER_ROWS: SpriteRows = [
  "1111111111111111",
  "2677777777777762",
  ".26787777778762.",
  "..267777777762..",
  "...2677rr7762...",
  "....22rrrr22....",
];

const NICHE_ROWS: SpriteRows = [
  "....11111111....",
  "..112222222211..",
  ".12222222222221.",
  ".12222222222221.",
  "1222222222222221",
  "12qqqqq2qqqqq221",
  "12qkkkq2qkkkq221",
  "12qFFFq2qFFFq221",
  "12qqqqq2qqqqq221",
  "1444444444444441",
  "1222222222222221",
  "122qqqqq2qqqqq21",
  "122qkkkq2qkkkq21",
  "122qFFFq2qFFFq21",
  "122qqqqq2qqqqq21",
  "1444444444444441",
  "1222222222222221",
  "12qqqqq2qqqqq221",
  "12qkkkq2qkkkq221",
  "12qFFFq2qFFFq221",
  "12qqqqq2qqqqq221",
  "1444444444444441",
  "1222222222222221",
  "122qqqqq22qq2221",
  "122qkkkq2qkkq221",
  "122qFFFq2qFFq221",
  "122qqqqq2qqqq221",
  "1444444444444441",
  "1555555555555551",
  "1444444444444441",
  "1333333333333331",
  "1111111111111111",
];

const SPINES = ["6w6", "6q6", "7w7", "6b6", "7q7"] as const;
const SHELF_HEIGHT = 48;

function shelfRows(): string[] {
  const rows = ["HHHHHHHHHHHHHHHH", "HFFFFFFFFFFFFFFH"];
  for (let level = 0; level < 3; level++) {
    rows.push("HF............FH");
    for (let row = 0; row < 10; row++) {
      const spines = Array.from(
        { length: 4 },
        (_, book) =>
          SPINES[(level * 3 + book * 2 + Math.floor(row / 3)) % SPINES.length],
      ).join("");
      rows.push(`HF${spines}FH`);
    }
    rows.push("HFFFFFFFFFFFFFFH");
    rows.push(level === 2 ? "HHHHHHHHHHHHHHHH" : "HF2222222222222F");
  }
  while (rows.length < SHELF_HEIGHT) {
    rows.push("H..............H");
  }
  return rows;
}

function fill(
  rows: SpriteRows,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  paint: string,
): string[] {
  return stamp(
    rows,
    Array.from({ length: y1 - y0 + 1 }, () => paint.repeat(x1 - x0 + 1)),
    x0,
    y0,
  );
}

const CHECK = [
  [5, 22],
  [6, 23],
  [7, 24],
  [8, 23],
  [9, 22],
  [10, 21],
  [11, 20],
] as const;

function benchRows(): string[] {
  let rows = blank(32, 48);
  rows = fill(rows, 2, 16, 14, 27, "k");
  rows = fill(rows, 3, 17, 13, 26, "n");
  rows = fill(rows, 17, 16, 29, 27, "k");
  rows = fill(rows, 18, 17, 28, 26, "n");
  for (const [x, y] of CHECK) {
    rows = fill(rows, x, y, x, y, "g");
  }
  for (let step = 0; step < 6; step++) {
    rows = fill(rows, 20 + step, 19 + step, 20 + step, 19 + step, "R");
    rows = fill(rows, 25 - step, 19 + step, 25 - step, 19 + step, "R");
  }
  rows = fill(rows, 7, 28, 9, 30, "8");
  rows = fill(rows, 22, 28, 24, 30, "8");
  rows = fill(rows, 4, 31, 12, 31, "7");
  rows = fill(rows, 19, 31, 27, 31, "7");
  rows = fill(rows, 0, 32, 31, 33, "F");
  rows = fill(rows, 0, 34, 31, 34, "H");
  rows = fill(rows, 1, 35, 2, 47, "H");
  rows = fill(rows, 29, 35, 30, 47, "H");
  rows = fill(rows, 3, 36, 28, 37, "6");
  return fill(rows, 3, 38, 28, 38, "7");
}

function disc(
  size: number,
  paint: (distance: number, angle: number) => string,
): string[] {
  const middle = (size - 1) / 2;
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) =>
      paint(
        Math.hypot(x - middle, y - middle),
        Math.atan2(y - middle, x - middle),
      ),
    ).join(""),
  );
}

const CLOCK_SIZE = 48;
const GEAR_SIZE = 32;

function clockRows(): string[] {
  const radius = (CLOCK_SIZE - 1) / 2;
  let rows = disc(CLOCK_SIZE, (distance) => {
    if (distance > radius) {
      return ".";
    }
    if (distance > radius - 1.5) {
      return "F";
    }
    return distance > radius - 4 ? "y" : "q";
  });
  const mark = (x: number, y: number, paint: string) => {
    rows = fill(
      rows,
      Math.round(x),
      Math.round(y),
      Math.round(x),
      Math.round(y),
      paint,
    );
  };
  for (let hour = 0; hour < 12; hour++) {
    const angle = (hour * Math.PI) / 6;
    for (const length of [radius - 6, radius - 7]) {
      mark(
        radius + length * Math.sin(angle),
        radius - length * Math.cos(angle),
        "k",
      );
    }
  }
  for (let length = 0; length < 16; length++) {
    mark(radius, radius - length, "k");
  }
  for (let length = 0; length < 11; length++) {
    mark(radius + length * 0.8, radius + length * 0.6, "k");
  }
  mark(radius, radius, "R");
  return rows;
}

function gearRows(): string[] {
  const radius = (GEAR_SIZE - 1) / 2;
  return disc(GEAR_SIZE, (distance, angle) => {
    const reach = Math.cos(angle * 8) > 0.3 ? radius : radius - 3;
    if (distance > reach || distance <= 3) {
      return ".";
    }
    return distance <= 5 || (distance > 9 && distance < 11) ? "H" : "F";
  });
}

export const BELT = BELT_ROWS;
export const SECTOR = SECTOR_ROWS;
export const CRACKED_SECTOR = CRACKING_ROWS;
export const SECTOR_DEBRIS = DEBRIS_ROWS;
export const CRON_PLATFORMS = [
  outline(pad(CRON_A)),
  outline(pad(CRON_B)),
] as const;
export const EMITTER = EMITTER_ROWS;
export const EMITTER_LENS = { x: 6, y: 4, width: 4, height: 2 } as const;
export const NICHE = NICHE_ROWS;
export const SHELF = outline(pad(shelfRows()));
export const BENCH = outline(pad(benchRows()));
export const CLOCK = outline(pad(clockRows()));
export const GEAR = outline(pad(gearRows()));
