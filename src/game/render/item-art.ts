import { GLYPHS, textRows } from "./font";
import {
  type SpriteRows,
  blank,
  mirror,
  outline,
  pad,
  rotate,
  stamp,
} from "./sprite";

function framed(rows: SpriteRows): string[] {
  return outline(pad(rows));
}

function enlarge(rows: SpriteRows): string[] {
  return rows.flatMap((row) => {
    const wide = [...row].map((pixel) => pixel.repeat(2)).join("");
    return [wide, wide];
  });
}

export const DISK = framed([
  "bbbbbbbbbbb.",
  "bb888888bbbb",
  "bb8kk888bbbb",
  "bb8kk888bbbb",
  "bb888888bbbb",
  "bbbbbbbbbbbb",
  "bbwwwwwwwwbb",
  "bbwsssssswbb",
  "bbwwwwwwwwbb",
  "bbwsssswwwbb",
  "bbwwwwwwwwbb",
  "bbbbbbbbbbbb",
]);

export const PEN = framed([
  "vvvvvvvvv888",
  "vwwwvvvvv8k8",
  "vvvvvvgvv888",
  "vvvvvvvvv8k8",
  "vvvvvvvvv888",
]);

export const ENERGY = framed(["..c..", ".cwc.", "cwwwc", ".cbc.", "..c.."]);

export const BIG_ENERGY = framed([
  "....c....",
  "...cwc...",
  "..cwwwc..",
  ".cwwywwc.",
  "cwwyyywwc",
  ".cbbybbc.",
  "..cbbbc..",
  "...cbc...",
  "....c....",
]);

export const FIREWALL = framed([
  "....R.....",
  "...RyR....",
  "..RyLyR...",
  "..RyLyR...",
  "5555555555",
  "3343534335",
  "5555555555",
  "4353343343",
  "5555555555",
]);

export const INDEX_TREE = framed([
  "...ggg...",
  "...gwg...",
  "...ggg...",
  "....g....",
  "..ggggg..",
  "..g...g..",
  "ggg...ggg",
  "gwg...gwg",
  "ggg...ggg",
]);

export const CACHE_CHIP = framed([
  ".8.8.8.8.",
  "777777777",
  "7777yy777",
  "777yy7777",
  "77yyyyy77",
  "7777yy777",
  "777yy7777",
  "777777777",
  ".8.8.8.8.",
]);

export const BACKUP_TAPE = framed([
  "666666666666",
  "6kkkkkkkkkk6",
  "6kwwk66kwwk6",
  "6kwwk66kwwk6",
  "6kkkkkkkkkk6",
  "666666666666",
  "6yyyyyyyyyy6",
  "666666666666",
]);

export const README_PAGE = framed([
  "wwwwwwqq.",
  "w8888wwqq",
  "wwwwwwwww",
  "w888888ww",
  "wwwwwwwww",
  "w88888www",
  "wwwwwwwww",
  "w888888ww",
  "wwwwwwwww",
]);

export const TAPE_REEL = framed([
  "....8888....",
  "..88FFFF88..",
  ".8FFFFFFFF8.",
  ".8FF6666FF8.",
  "8FF66..66FF8",
  "8FF6.ww.6FF8",
  "8FF6.ww.6FF8",
  "8FF66..66FF8",
  ".8FF6666FF8.",
  ".8FFFFFFFF8.",
  "..88FFFF88..",
  "....8888....",
]);

export const GC_CHIP = framed([
  "...gggg...",
  ".gwwwwwwg.",
  "gggggggggg",
  ".g.g..g.g.",
  ".g.g..g.g.",
  ".g.g..g.g.",
  ".g.g..g.g.",
  ".gggggggg.",
]);

const BOWTIE = [
  "v........v",
  "vv......vv",
  "vwv....vwv",
  "vvwv..vwvv",
  "vvvvvvvvvv",
  "vvvvvvvvvv",
  "vvwv..vwvv",
  "vwv....vwv",
  "vv......vv",
  "v........v",
];

const STANDING_BOWTIE = BOWTIE.map((_, y) =>
  BOWTIE.map((row) => row[y]).join(""),
);

const PEDESTAL = [
  "..55555555..",
  "..44444444..",
  "...333333...",
  "..44444444..",
];

const TABLE = [
  "wwwwwwwwwwww",
  "w8888w8888ww",
  "wwwwwwwwwwww",
  "w8888w8888ww",
  "wwwwwwwwwwww",
  "w8888w8888ww",
  "wwwwwwwwwwww",
];

const CUT = [
  "..........RR",
  "........RRR.",
  "......RRR...",
  "....RRR.....",
  "..RRR.......",
  "RRR.........",
];

function relic(icon: SpriteRows): string[] {
  let rows = blank(16, 18);
  rows = stamp(rows, icon, Math.floor((16 - icon[0].length) / 2), 1);
  rows = stamp(rows, PEDESTAL, 2, 13);
  return outline(rows);
}

const AXE_HEAD = [
  "F.8888..",
  "F8w8w88.",
  "F8wwww88",
  "F8w8w8w8",
  "F8wwww88",
  "F8w8w88.",
  "F.8888..",
];

const UPRIGHT_AXE = [
  ...AXE_HEAD.map((row) => `..${row}`),
  "..F.......",
  "..F.......",
  "..F.......",
  ".FFF......",
];

const SPINNING_AXE = [
  ...AXE_HEAD.map((row) => `..${row}`),
  "..F.......",
  "..F.......",
  "..F.......",
];

export const JOIN_RELIC = relic(BOWTIE);
export const TRUNCATE_RELIC = relic(stamp(TABLE, CUT, 0, 1));
export const DROP_RELIC = relic(UPRIGHT_AXE);

export const AXE_SPIN = [0, 1, 2, 3].map((turns) => {
  let rows: SpriteRows = SPINNING_AXE;
  for (let turn = 0; turn < turns; turn++) {
    rows = rotate(rows);
  }
  return framed(rows);
});

export const SELECT_BOLT = framed([
  "bbccccw...",
  "bccccccwww",
  "bccccccwww",
  "bbccccw...",
]);

export const JOIN_SPIN = [framed(BOWTIE), framed(STANDING_BOWTIE)] as const;

export const GLYPH_SHOTS = [";", ")", "}"].map((glyph) =>
  framed(enlarge(GLYPHS[glyph].map((row) => row.replaceAll("X", "s")))),
);

export const BEAMS = [
  framed(textRows("WARN", "y")),
  framed(textRows("ERROR", "R")),
];

const CODE_LINES = [
  ["vv.yyy", "..gggg", "ww.cc."],
  ["yyyy..", "..vv.w", "gg.yyy"],
  ["www.vv", "..yy..", "cccc.g"],
] as const;

function codeBlock(lines: readonly string[]): string[] {
  let rows = blank(10, 8);
  rows = stamp(rows, ["bbbbbbbbbb"], 0, 0);
  rows = stamp(rows, ["bbbbbbbbbb"], 0, 7);
  rows = stamp(
    rows,
    Array.from({ length: 6 }, () => "bnnnnnnnnb"),
    0,
    1,
  );
  lines.forEach((line, index) => {
    rows = stamp(rows, [line], 2, 2 + index * 2);
  });
  return framed(rows);
}

export const CODE_BLOCKS = CODE_LINES.map(codeBlock);

export const BUG_CRAWL = [
  framed([
    ".k....k.",
    "..k..k..",
    "...kk...",
    "k.RRRR.k",
    ".RRwRRR.",
    "kRRRRRRk",
    ".RRRRRR.",
    "k.RRRR.k",
  ]),
  framed([
    "..k..k..",
    "..k..k..",
    "...kk...",
    ".kRRRRk.",
    ".RRwRRR.",
    ".RRRRRR.",
    "kRRRRRRk",
    "..RRRR..",
  ]),
];

const CRESTS = [
  [
    ".......LL.....",
    "......LwwL....",
    ".....LwRRwL...",
    "....LwRRRRRL..",
    "...LRRRRsRRRL.",
    "..LRRsRRRRsRRL",
    ".LRRRRRRsRRRRL",
    "LRsRRRRRRRRsRL",
  ],
  [
    "........LL....",
    ".......LwwL...",
    "......LwRRwL..",
    "....LLwRRRRRL.",
    "...LRRRRsRRRRL",
    "..LRRRRRRRsRRL",
    ".LRRsRRRRRRRRL",
    "LRRRRRRsRRRRsL",
  ],
];

export const WAVE_CRESTS = CRESTS.map((rows) => {
  const right = framed(rows);
  return [right, mirror(right)] as const;
});

export const SPARK_PAINT = {
  bone: "w",
  plastic: "b",
  glass: "v",
  data: "c",
  ember: "R",
  impact: "y",
  card: "o",
  dirt: "3",
  log: "s",
  metal: "8",
  shield: "b",
} as const;
