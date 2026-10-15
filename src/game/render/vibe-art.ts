import {
  type SpriteRows,
  blank,
  keep,
  mirror,
  outline,
  pad,
  repaint,
  stamp,
} from "./sprite";

const WIDTH = 36;
const HEIGHT = 37;
const HEADROOM = 10;

export const VIBE_FRAME = {
  width: WIDTH + 2,
  height: HEIGHT + HEADROOM + 2,
  left: 13,
  top: 4 + HEADROOM,
} as const;

const IDLE: SpriteRows = [
  "...www..............................",
  "....w...............................",
  "....w.........HHHHHH................",
  "....w.......HHHHHHHHH...............",
  "....w......6HHHHHHHHHH..............",
  "....w.....6644HHHHHH4...............",
  "....w.....67b4ffffff44..............",
  "....w.....67b4fkffff444.............",
  "....w.....6644ffffff444.............",
  "....w.......4fkwwkff444.............",
  "....w........4ffff4444..............",
  "....w.........4FF44.................",
  "....w......yyyy4444yyyss............",
  "....ww....yyyyyyyyyyyyyssss.........",
  "...wwwF..44yywyyyyyyyy4yssss........",
  "....FF..44ybbbbbbbbyy44ssssss.......",
  "....F.444.bwwbwbwbbyy444ssssss......",
  ".....44...bbbbbbbbbyy444sssssss.....",
  "..........bwbwwbbbbyy444sssssss.....",
  "..........bbbbbbbbbyy444.ssssss.....",
  "..........bwwbwwwbbyy.4..ssssss.....",
  "..........777777777yy.44.sssssss....",
  "...........7777777yyy.44.sssssss....",
  "...........yyyyyyyyyy.44..ssssss....",
  "...........yy4444yyFF....sssssss....",
  "...........66666666......ssssss.....",
  "...........77777777.......sssss.....",
  "...........777..777.......sssss.....",
  "...........777..777........s.ss.....",
  "...........777..777.................",
  "...........777..777.................",
  "...........777..777.................",
  "...........777..777.................",
  "...........777..777.................",
  "..........wwss.wwss.................",
  ".........wwwww.wwwww................",
  "....................................",
];

function isSwordArm(row: number, column: number): boolean {
  return row <= 17 && (column <= 9 || (row === 14 && column === 10));
}

function isCape(row: number, _column: number, pixel: string): boolean {
  return pixel === "s" && row <= 33;
}

function isBackArm(row: number, column: number, pixel: string): boolean {
  return (
    (row >= 12 && row <= 23 && column >= 21 && pixel === "4") ||
    (row === 24 && (column === 19 || column === 20))
  );
}

const SWORD_ARM = keep(IDLE, isSwordArm);
const CAPE = keep(IDLE, isCape);
const LEGS = keep(IDLE, (row, column) => row >= 25 && column <= 20);
const BACK_ARM = keep(IDLE, isBackArm);
const HEAD = keep(IDLE, (row, column) => row >= 2 && row <= 11 && column >= 10);
const TORSO = keep(
  IDLE,
  (row, column, pixel) =>
    row >= 12 &&
    row <= 24 &&
    !isSwordArm(row, column) &&
    !isCape(row, column, pixel) &&
    !isBackArm(row, column, pixel),
);

const LEGS_STRIDE: SpriteRows = [
  "...........66666666...",
  "...........77777777...",
  "..........7777..777...",
  "..........777...7777..",
  ".........777.....777..",
  ".........777.....777..",
  "........777.......777.",
  "........777.......777.",
  ".......777.........777",
  "......wwss.........wss",
  ".....wwwww........wwww",
];

const LEGS_TALL: SpriteRows = [
  "...........66666666.",
  "...........77777777.",
  "...........777..777.",
  "...........777..777.",
  "...........777..777.",
  "...........777..777.",
  "...........777..777.",
  "...........777..777.",
  "...........777..777.",
  "...........777..777.",
  "..........wwss.wwss.",
  ".........wwwww.wwwww",
];

const LEGS_CROUCH: SpriteRows = [
  "...........66666666...",
  "..........7777777777..",
  ".........777......777.",
  ".........777......777.",
  "..........777....777..",
  "..........777....777..",
  ".........wwss...wwss..",
  "........wwwww..wwwww..",
];

const TYPING_SCREEN: SpriteRows = [
  ".cccccccc",
  "cwwwcwwcc",
  "ccccccccc",
  "cwwcwwwwc",
  "ccccccccc",
  "cwccccccc",
];

const TYPING_SCREEN_ALT: SpriteRows = [
  ".cccccccc",
  "cwwcwwwwc",
  "ccccccccc",
  "cwwwwcwcc",
  "ccccccccc",
  "cwwwcwwcc",
];

const COPY_SCREEN: SpriteRows = [
  ".bbbbbbbb",
  "bwwwwbbbb",
  "bwbbwwwwb",
  "bwbbwbbwb",
  "bwwwwbbwb",
  "bbbbwwwwb",
];

const ALERT_SCREEN: SpriteRows = [
  ".ssssssss",
  "sssswssss",
  "sssswssss",
  "sssswssss",
  "sssssssss",
  "sssswssss",
];

const TYPING_ARM: SpriteRows = [
  "...44.",
  "..44..",
  "..44..",
  "..44..",
  "..44..",
  "..44..",
  "...44.",
  "....FF",
];

const TYPING_ARM_ALT: SpriteRows = [
  "...44..",
  "..44...",
  "..44...",
  "..44...",
  "..44...",
  "..444..",
  "...4444",
  ".....FF",
];

const PLANTED_SWORD: SpriteRows = [
  "www",
  ".w.",
  ".w.",
  ".w.",
  ".w.",
  ".w.",
  ".w.",
  ".w.",
  ".w.",
  ".w.",
  ".w.",
  ".w.",
  ".w.",
  ".w.",
  ".w.",
];

const FLUNG_ARM: SpriteRows = [".F......", "FF444444", ".F......"];

const CHEST_PLATE: SpriteRows = [
  "yyyyyyyyy",
  "yyyywyyyy",
  "yyybbbyyy",
  "yybbwbbyy",
  "yyybbbyyy",
  "yyyybyyyy",
  "y4yyyyy4y",
  ".y44444y.",
];

const LAPTOP: SpriteRows = [
  "777777777",
  "7bbbbbbb7",
  "7bwwbwbb7",
  "7bbbbbbb7",
  "7bwbwwbb7",
  "7bbbbbbb7",
  "888888888",
  ".8888888.",
];

const LIFTING_ARM: SpriteRows = [
  "FF",
  ".4",
  ".4",
  ".4",
  "4.",
  "4.",
  "4.",
  "4.",
  "4.",
  "4.",
  "4.",
  "4.",
  ".4",
  ".4",
];

const LIFTING_BACK_ARM: SpriteRows = [
  "FF.",
  ".4.",
  ".4.",
  ".4.",
  ".4.",
  "..4",
  "..4",
  "..4",
  "..4",
  "..4",
  "..4",
  "..4",
  "..4",
  "..4",
];

const RAISED_BACK_ARM: SpriteRows = [
  ".F.F",
  ".FFF",
  "..F.",
  "..4.",
  "..4.",
  ".4..",
  ".4..",
  "4...",
  "4...",
];

const HOLDING_ARM: SpriteRows = [
  ".44",
  "44.",
  "44.",
  "44.",
  "44.",
  "44.",
  "44.",
  ".FF",
];

const PANIC_ARM: SpriteRows = [
  "F.F.",
  "FFF.",
  ".F..",
  ".4..",
  ".4..",
  "..4.",
  "..4.",
  "...4",
  "...4",
];

const SHUT_LAPTOP: SpriteRows = [
  ".88888888888",
  "788888888887",
  ".77777777777",
];

const SLAMMING_ARM: SpriteRows = [
  "..44",
  ".44.",
  ".44.",
  "44..",
  "44..",
  "4...",
  "4...",
  "4...",
  "4...",
  "FF..",
];

const SHIELD_LAPTOP: SpriteRows = [
  "777777777",
  "7ccccccc7",
  "7cwwcwwc7",
  "7ccccccc7",
  "7cwcwwwc7",
  "7ccccccc7",
  "888888888",
];

const SHIELD_ARM: SpriteRows = [
  "...FF",
  "...4.",
  "..44.",
  ".44..",
  ".4...",
  "44...",
];

const SWEAT: SpriteRows = ["c", "c"];

const FACES = {
  focus: ["ffffff", "ffffff", "fkffff", "ffkkff", "ffff"],
  worried: ["fwffff", "fkffff", "ffffff", "fffkkf", "ffff"],
  hurt: ["ffffff", "kkffff", "ffffff", "fkkkkf", "ffff"],
} as const;

const FACE_AT = { x: 14, y: 6 } as const;
const SCREEN_AT = { x: 10, y: 15 } as const;
const HOODIE = { y: "4" } as const;

function face(expression: keyof typeof FACES): string[] {
  return stamp(HEAD, FACES[expression], FACE_AT.x, FACE_AT.y);
}

function screen(rows: SpriteRows): string[] {
  return stamp(TORSO, rows, SCREEN_AT.x, SCREEN_AT.y);
}

const ARMORED = stamp(TORSO, CHEST_PLATE, SCREEN_AT.x, SCREEN_AT.y);
const HOODED = repaint(TORSO, HOODIE);
const HOODED_BACK_ARM = repaint(BACK_ARM, HOODIE);
const WORRIED = face("worried");

type Layer = readonly [part: SpriteRows, left: number, top: number];

function still(part: SpriteRows): Layer {
  return [part, 0, 0];
}

const VIBE_POSES = {
  idle: [CAPE, BACK_ARM, LEGS, TORSO, HEAD, SWORD_ARM].map(still),
  walk1: [
    still(CAPE),
    still(BACK_ARM),
    [LEGS_STRIDE, 0, 25],
    still(TORSO),
    still(HEAD),
    still(SWORD_ARM),
  ],
  walk2: [
    [CAPE, 0, -1],
    [BACK_ARM, 0, -1],
    [LEGS_TALL, 0, 24],
    [TORSO, 0, -1],
    [HEAD, 0, -1],
    [SWORD_ARM, 0, -1],
  ],
  type1: [
    still(CAPE),
    still(BACK_ARM),
    still(LEGS),
    still(screen(TYPING_SCREEN)),
    still(face("focus")),
    [TYPING_ARM, 6, 14],
    [PLANTED_SWORD, 2, 21],
  ],
  type2: [
    still(CAPE),
    still(BACK_ARM),
    still(LEGS),
    still(screen(TYPING_SCREEN_ALT)),
    still(face("focus")),
    [TYPING_ARM_ALT, 6, 14],
    [PLANTED_SWORD, 2, 21],
  ],
  throw: [
    still(CAPE),
    still(BACK_ARM),
    [LEGS_STRIDE, 0, 25],
    still(screen(TYPING_SCREEN)),
    still(HEAD),
    [FLUNG_ARM, 3, 13],
    [PLANTED_SWORD, 2, 21],
  ],
  raise: [
    still(CAPE),
    [RAISED_BACK_ARM, 21, 4],
    still(LEGS),
    still(screen(COPY_SCREEN)),
    still(HEAD),
    still(SWORD_ARM),
  ],
  shield: [
    still(CAPE),
    still(BACK_ARM),
    still(LEGS),
    still(ARMORED),
    still(WORRIED),
    [SHIELD_LAPTOP, 6, 4],
    [SHIELD_ARM, 5, 10],
    [PLANTED_SWORD, 2, 21],
  ],
  exposed: [
    still(CAPE),
    [RAISED_BACK_ARM, 21, 4],
    still(LEGS),
    still(TORSO),
    still(WORRIED),
    [SWEAT, 22, 3],
    [PANIC_ARM, 7, 5],
    [PLANTED_SWORD, 2, 21],
  ],
  deploy: [
    still(CAPE),
    still(BACK_ARM),
    still(LEGS),
    still(screen(ALERT_SCREEN)),
    still(HEAD),
    [TYPING_ARM, 6, 14],
    [PLANTED_SWORD, 2, 21],
  ],
  lift: [
    still(CAPE),
    [LIFTING_BACK_ARM, 19, -1],
    [LEGS_STRIDE, 0, 25],
    still(ARMORED),
    still(HEAD),
    [LIFTING_ARM, 8, -1],
    [LAPTOP, 9, -9],
    [PLANTED_SWORD, 2, 21],
  ],
  land: [
    [CAPE, 0, 3],
    [BACK_ARM, 0, 3],
    [LEGS_CROUCH, 0, 28],
    [ARMORED, 0, 3],
    [HEAD, 0, 3],
    [SLAMMING_ARM, 4, 17],
    [SHUT_LAPTOP, 0, 33],
  ],
  hurt: [
    [CAPE, 1, 0],
    [BACK_ARM, 1, 0],
    still(LEGS),
    [TORSO, 1, 0],
    [face("hurt"), 2, 0],
    [SWORD_ARM, 1, 1],
  ],
  unmasked: [
    still(HOODED_BACK_ARM),
    still(LEGS),
    still(HOODED),
    still(WORRIED),
    [SWEAT, 22, 3],
    [HOLDING_ARM, 8, 14],
  ],
  flee1: [
    still(HOODED_BACK_ARM),
    [LEGS_STRIDE, 0, 25],
    still(HOODED),
    still(WORRIED),
    [SWEAT, 22, 3],
    [HOLDING_ARM, 8, 14],
  ],
  flee2: [
    [HOODED_BACK_ARM, 0, -1],
    [LEGS_TALL, 0, 24],
    [HOODED, 0, -1],
    [WORRIED, 0, -1],
    [SWEAT, 22, 2],
    [HOLDING_ARM, 8, 13],
  ],
} satisfies Record<string, readonly Layer[]>;

export type VibePoseName = keyof typeof VIBE_POSES;

export type CostumePiece = "armor" | "cape" | "sword";

function compose(layers: readonly Layer[]): string[] {
  return outline(
    pad(
      layers.reduce<string[]>(
        (rows, [part, left, top]) => stamp(rows, part, left, top + HEADROOM),
        blank(WIDTH, HEIGHT + HEADROOM),
      ),
    ),
  );
}

function sprites<K extends string>(
  poses: Readonly<Record<K, readonly Layer[]>>,
): Record<K, readonly [SpriteRows, SpriteRows]> {
  return Object.fromEntries(
    Object.entries<readonly Layer[]>(poses).map(([name, layers]) => {
      const rows = compose(layers);
      const pair: readonly [SpriteRows, SpriteRows] = [mirror(rows), rows];
      return [name, pair];
    }),
  ) as Record<K, readonly [SpriteRows, SpriteRows]>;
}

export const VIBE_ART = sprites<VibePoseName>(VIBE_POSES);

const ARMOR = keep(
  ARMORED,
  (row, column, pixel) =>
    pixel === "y" ||
    (row >= SCREEN_AT.y &&
      row < SCREEN_AT.y + CHEST_PLATE.length &&
      column >= SCREEN_AT.x &&
      column < SCREEN_AT.x + CHEST_PLATE[0].length &&
      pixel !== "."),
);

export const COSTUME_ART = sprites<CostumePiece>({
  armor: [still(ARMOR)],
  cape: [still(CAPE)],
  sword: [still(keep(SWORD_ARM, (_row, _column, pixel) => pixel === "w"))],
});

function braceRow(row: number, height: number): string {
  const middle = Math.floor(height / 2);
  if (row === 0 || row === height - 1) {
    return "....bbbb";
  }
  if (row === 1 || row === height - 2) {
    return "...bbc..";
  }
  if (row === middle - 1 || row === middle + 1) {
    return "..bbc...";
  }
  return row === middle ? "bbbc...." : "...bb...";
}

const BRACE_HEIGHT = 40;

export const BRACE = outline(
  pad(
    Array.from({ length: BRACE_HEIGHT }, (_, row) =>
      braceRow(row, BRACE_HEIGHT),
    ),
  ),
);
