import { type Level, TERRAIN, isSolid, terrainAt } from "../levels/level";
import { textRows } from "./font";
import { BELT } from "./stage-art";
import { type SpriteRows, blank, outline, pad, stamp } from "./sprite";

export interface Led {
  x: number;
  y: number;
  on: string;
  off: string;
}

export interface TileArt {
  rows: SpriteRows;
  leds: readonly Led[];
}

function led(x: number, y: number, on = "R", off = "r"): Led {
  return { x, y, on, off };
}

const STONE_ROWS = [
  "4444444444444431",
  "4333333333333321",
  "4333333333333321",
  "4333333333323321",
  "4333333333333321",
  "4323333333333321",
  "2222222222222221",
  "1111111111111111",
  "4444443144444444",
  "3333332143333333",
  "3333332143333333",
  "3333232143333333",
  "3333332143332333",
  "3333332143333333",
  "2222222122222222",
  "1111111111111111",
];

const STONE: TileArt = { rows: STONE_ROWS, leds: [] };

const BELT_TILE: TileArt = { rows: BELT, leds: [] };

const STONE_LED: TileArt = { rows: STONE_ROWS, leds: [led(15, 3), led(7, 11)] };

const STONE_TOP: TileArt = {
  rows: [
    "5555555555555555",
    "4444444444444444",
    "3333333333333333",
    "2222222222222222",
    "1111111111111111",
    "4444444444444431",
    "4333333333333321",
    "2222222222222221",
    ...STONE_ROWS.slice(8),
  ],
  leds: [],
};

const SERVER_STONE: TileArt = {
  rows: [
    "4444444444444431",
    "4333333333333321",
    "4311111111111121",
    "4318888888888121",
    "4317666666777121",
    "43177777777r7121",
    "4317666666777121",
    "4317777777777121",
    "43176666667r7121",
    "4317777777777121",
    "4317888777777121",
    "4317777777777121",
    "4316666666666121",
    "4311111111111121",
    "2222222222222221",
    "1111111111111111",
  ],
  leds: [led(11, 5), led(11, 8)],
};

const RACK_ROWS = [
  "6k888888888888k6",
  "66777777777r7r66",
  "6676666667777766",
  "6611111111111166",
  "6k888888888888k6",
  "667k7k7k7k7k7766",
  "667k7k7k7k7k7766",
  "6611111111111166",
  "6k888888888888k6",
  "66777777777r7r66",
  "6676666667777766",
  "6611111111111166",
  "6k888888888888k6",
  "667k7k7k7k7k7766",
  "667k7k7k7k7k7766",
  "6611111111111166",
];

const RACK: TileArt = {
  rows: RACK_ROWS,
  leds: [
    led(11, 1, "g", "6"),
    led(13, 1, "b", "6"),
    led(11, 9, "g", "6"),
    led(13, 9, "b", "6"),
  ],
};

const RACK_TOP: TileArt = {
  rows: [
    "8888888888888888",
    "7777777777777777",
    "6666666666666666",
    ...RACK_ROWS.slice(3),
  ],
  leds: [led(11, 9, "g", "6"), led(13, 9, "b", "6")],
};

const LEDGE: TileArt = {
  rows: [
    "8888888888888888",
    "7bbbbbbbbbbbbbb7",
    "7gggggggvvvvvvv7",
    "6666666666666666",
    "k6k6k6k6k6k6k6k6",
    "..6..........6..",
    "..6..........6..",
  ],
  leds: [],
};

export const WALL: SpriteRows = [
  "1111111111111111",
  "2222222122222222",
  "2222222122222222",
  "2222222122222222",
  "2232222122222222",
  "2222222122222222",
  "2222222122222322",
  "2222222122222222",
  "1111111111111111",
  "2221222222212222",
  "2221222222212222",
  "2221222322212222",
  "2221222222212222",
  "2221222222212222",
  "2221222222212222",
  "2221222222212222",
];

export const WINDOW: SpriteRows = [
  "......4554......",
  ".....45bb54.....",
  "....45bccb54....",
  "....4bbbbbb4....",
  "...45bccbbb54...",
  "...4bbbbbccb4...",
  "..45bbccbbbb54..",
  "..4kkkkkkkkkk4..",
  ".45bccbkbvvvb54.",
  ".4bbbbbkbbbbbb4.",
  ".4bccbbkbccbbb4.",
  ".4bbbbbkbbbbbb4.",
  ".4kkkkkkkkkkkk4.",
  ".4gggggkbccbbb4.",
  ".4gccggkbbbbbb4.",
  ".4gggggkbbccbb4.",
  ".4ggccgkbbbbbb4.",
  ".4kkkkkkkkkkkk4.",
  ".4bbccbkvvvvvv4.",
  ".4bbbbbkvccvvv4.",
  ".4bccbbkvvvvvv4.",
  ".4bbbbbkvvccvv4.",
  ".4kkkkkkkkkkkk4.",
  ".4bcccbkbbbccb4.",
  ".4bbbbbkbbbbbb4.",
  ".4bbccbkbccbbb4.",
  ".4bbbbbkbbbbbb4.",
  "4555555555555554",
  "4444444444444444",
  "2222222222222222",
];

export const GARGOYLE: SpriteRows = [
  "................",
  "..5.......5.....",
  "..45.....54.....",
  "...4444444......",
  "..443R33R34.....",
  "..43333333345...",
  "...4kkkkk345....",
  "....43333345....",
  "...5433334454...",
  "..54333333445...",
  ".543334333344...",
  ".43334443333345.",
  ".4333344433334..",
  "..43333333344...",
  "..4422222244....",
  ".44444444444....",
];

export const GARGOYLE_EYES: readonly Led[] = [led(5, 4), led(8, 4)];

export const GATE: SpriteRows = [
  "...............55...............",
  "..............5445..............",
  "...........5411111145...........",
  "........5541111111111455........",
  ".......541111111111111145.......",
  ".....5541111111111111111455.....",
  "....544117111711171117111445....",
  "...54411171117111711171117445...",
  "..5547111711171117111711171455..",
  "..5417111711171117111711171145..",
  ".541171117111711171117111711145.",
  "55411711171117111711171117111455",
  "54111711171117111711171117111745",
  "54111711171117111711171117111745",
  "47111711171117111711171117111714",
  "47111711171117111711171117111714",
  "47111711171117111711171117111714",
  "17111711171117111711171117111711",
  "17111711171117111711171117111711",
  "17111711171117111711171117111711",
  "17111711171117111711171117111711",
  "17111711171117111711171117111711",
  "k8kkk8kkk8kkk8kkk8kkk8kkk8kkk8kk",
  ".7...7...7...7...7...7...7...7..",
  ".k...k...k...k...k...k...k...k..",
];

export const GATE_SPRINGLINE = 22;

export const DOOR: SpriteRows = [
  "..............5445..............",
  "............54777745............",
  "..........547677776745..........",
  ".........54776777767745.........",
  "........5477767777677745........",
  ".......547777677776777745.......",
  "......54677776777767777645......",
  ".....5476777767777677776745.....",
  "....547767777677776777767745....",
  "...54777677776777767777677745...",
  "...54777677776777767777677745...",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..548888k8888k8888k8888k888845..",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..5477776777kkkkkkkk7776777745..",
  "..5477776777k7RRRR7k7776777745..",
  "..5477776777k7RRRR7k7776777745..",
  "..5477776777kkkkkkkk7776777745..",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..548888k8888k8888k8888k888845..",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..548888k8888k8888k8888k888845..",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..5477776777767777677776777745..",
  "..5444444444444444444444444445..",
  "..5422222222222222222222222245..",
  "..5422222222222222222222222245..",
];

export const DOOR_LOCK = { x: 14, y: 24, width: 4, height: 2 } as const;

export const LOG_PANEL: SpriteRows = [
  "..5555555555555555555555555555..",
  ".544444444444444444444444444445.",
  "54kkkkkkkkkkkkkkkkkkkkkkkkkkkk45",
  "54knnnnnnnnnnnnnnnnnnnnnnnnnnk45",
  "54knggggngggggggngggnnnnnnnnnk45",
  "54knnnnnnnnnnnnnnnnnnnnnnnnnnk45",
  "54knyyyynyyyynyyyyyyynnnnnnnnk45",
  "54knnnnnnnnnnnnnnnnnnnnnnnnnnk45",
  "54kngggggngggnggggggggngggnnnk45",
  "54knnnnnnnnnnnnnnnnnnnnnnnnnnk45",
  "54knRRRRRnRRRRnRRRRRRnnnnnnnnk45",
  "54knnnnnnnnnnnnnnnnnnnnnnnnnnk45",
  "54knccccnccncccccccnnnnnnnnnnk45",
  "54knnnnnnnnnnnnnnnnnnnnnnnnnnk45",
  "54kngggnggggggnggnnnnnnnnnnnnk45",
  "54knnnnnnnnnnnnnnnnnnnnnnnnnnk45",
  "54kkkkkkkkkkkkkkkkkkkkkkkkkkkk45",
  ".544444444444444444444444444445.",
  "..5555555555555555555555555555..",
];

export const SAVEPOINT: SpriteRows = [
  ".kkkkkkkkkkkk.",
  "k766666666667k",
  "k6kkkkkkkkkk6k",
  "k6knnnnnnnnk6k",
  "k6knnnnnnnnk6k",
  "k6knnnnnnnnk6k",
  "k6knnnnnnnnk6k",
  "k6knnnnnnnnk6k",
  "k6kkkkkkkkkk6k",
  "k6666666rr666k",
  "k788888888887k",
  ".kkkkk77kkkkk.",
  ".....k78k.....",
  ".....k78k.....",
  "...kkk78kkk...",
  "..k54444445k..",
  ".k5444444445k.",
  ".k5555555555k.",
  ".kkkkkkkkkkkk.",
];

export const SAVEPOINT_SCREEN: SpriteRows = [
  "gg.ggg..",
  "........",
  "ggg.gg.g",
  "........",
  "w.......",
  "........",
  ".....RR.",
];

export const SAVEPOINT_SCREEN_AT = { x: 3, y: 3 } as const;

const PLATE = [
  "77777777777",
  "71111111117",
  "71111111117",
  "71111111117",
  "71111111117",
  "71111111117",
  "71111111117",
  "71111111117",
  "77777777777",
];

export function doorPlaque(text: string): string[] {
  const letters = textRows(text, "R");
  const width = letters[0].length + 4;
  const plate = PLATE.map(
    (row) => `${row[0]}${row[1].repeat(width - 2)}${row.at(-1) ?? ""}`,
  );
  return outline(stamp(plate, letters, 2, 2));
}

const SCREEN_SIZE = { width: 48, height: 30 } as const;
const SLIDE_SIZE = { width: 40, height: 20 } as const;
const SLIDE_OFFSET = { x: 4, y: 6 } as const;
const BAR = { width: 3, step: 5 } as const;

export const SLIDE_AT = {
  x: SLIDE_OFFSET.x + 1,
  y: SLIDE_OFFSET.y + 1,
} as const;

const CHECK = [
  ".........gg",
  "........ggg",
  ".......ggg.",
  "gg....ggg..",
  "ggg..ggg...",
  ".ggggggg...",
  "..ggggg....",
  "...ggg.....",
];

const WARNING = [
  ".....y.....",
  "....yyy....",
  "....yky....",
  "...yykyy...",
  "...yykyy...",
  "..yyykyyy..",
  "..yyyyyyy..",
  ".yyyykyyyy.",
  "yyyyyyyyyyy",
];

function fill(
  rows: SpriteRows,
  x: number,
  y: number,
  width: number,
  height: number,
  paint: string,
): string[] {
  return stamp(
    rows,
    Array.from({ length: height }, () => paint.repeat(width)),
    x,
    y,
  );
}

function chart(heights: readonly number[], paints: string): string[] {
  const tallest = Math.max(...heights);
  return heights.reduce<string[]>(
    (rows, height, index) =>
      fill(
        rows,
        index * BAR.step,
        tallest - height,
        BAR.width,
        height,
        paints[index],
      ),
    blank(heights.length * BAR.step, tallest),
  );
}

function slide(
  background: string,
  title: string,
  heights: readonly number[],
  paints: string,
  mark: SpriteRows,
): string[] {
  const { width, height } = SLIDE_SIZE;
  const bars = chart(heights, paints);
  let rows = fill(blank(width, height), 0, 0, width, height, background);
  rows = fill(rows, 0, 0, width, 3, title);
  rows = stamp(rows, ["wwww.wwwwww.www"], 2, 1);
  rows = stamp(rows, bars, 3, height - 2 - bars.length);
  rows = fill(rows, 2, height - 2, 22, 1, "h");
  return stamp(
    rows,
    mark,
    width - mark[0].length - 3,
    height - mark.length - 4,
  );
}

export const ALERT_SLIDE = slide("r", "R", [13, 10, 6, 3], "RRRR", WARNING);

function screen(): string[] {
  const { width, height } = SCREEN_SIZE;
  let rows = blank(width, height);
  rows = fill(rows, 1, 0, width - 2, 3, "6");
  rows = fill(rows, 2, 1, width - 4, 1, "8");
  rows = fill(rows, 2, 3, width - 4, 24, "k");
  rows = fill(rows, 3, 4, width - 6, 22, "o");
  rows = fill(rows, 3, 26, width - 6, 1, "q");
  rows = fill(rows, 3, 27, width - 6, 2, "6");
  return stamp(
    rows,
    slide("d", "b", [4, 7, 10, 13], "bgvy", CHECK),
    SLIDE_OFFSET.x,
    SLIDE_OFFSET.y,
  );
}

export const PROJECTOR = outline(pad(screen()));

export const SPOTLIGHT = outline(
  pad([
    "...66...",
    "..6776..",
    ".677776.",
    ".678876.",
    ".677776.",
    "..qooq..",
    "..oooo..",
  ]),
);

export const LENS = { x: 5, y: 8 } as const;

export const MERLON: SpriteRows = [
  "55555555........",
  "44444444........",
  "34333343........",
  "33333333........",
  "33333333........",
  "22222222........",
  "11111111........",
  "1111111111111111",
];

function hash(column: number, row: number): number {
  const value = Math.imul(column * 374761393 + row * 668265263, 1274126177);
  return (value ^ (value >>> 15)) >>> 0;
}

export function tileArt(
  level: Level,
  column: number,
  row: number,
): TileArt | null {
  const terrain = terrainAt(level, column, row);
  const openAbove = !isSolid(level, column, row - 1);
  switch (terrain) {
    case TERRAIN.rack:
      return terrainAt(level, column, row - 1) === TERRAIN.rack
        ? RACK
        : RACK_TOP;
    case TERRAIN.ledge:
      return LEDGE;
    case TERRAIN.beltLeft:
    case TERRAIN.beltRight:
      return BELT_TILE;
    case TERRAIN.stone: {
      if (openAbove && row > 0) {
        return STONE_TOP;
      }
      const roll = hash(column, row) % 7;
      if (roll === 0) {
        return SERVER_STONE;
      }
      return roll === 1 ? STONE_LED : STONE;
    }
    default:
      return null;
  }
}

export function ledPhase(column: number, row: number, index: number): number {
  return hash(column + index * 31, row);
}
