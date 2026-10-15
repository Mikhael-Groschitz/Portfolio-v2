import { describe, expect, it } from "vitest";
import { VIBE } from "../balance";
import { VIEW_HEIGHT, VIEW_WIDTH } from "../core/camera";
import { CAMPAIGN, parseCampaign } from "../levels/campaign";
import { TILE, isSolid } from "../levels/level";
import { PALETTE, TRANSPARENT } from "../palette";
import { fogRows, moonRows, skyRows, towerLights, towerRows } from "./backdrop";
import {
  ALERT_SLIDE,
  DOOR,
  DOOR_LOCK,
  GARGOYLE,
  GARGOYLE_EYES,
  GATE,
  LENS,
  LOG_PANEL,
  MERLON,
  PROJECTOR,
  SAVEPOINT,
  SAVEPOINT_SCREEN,
  SAVEPOINT_SCREEN_AT,
  SLIDE_AT,
  SPOTLIGHT,
  WALL,
  WINDOW,
  type TileArt,
  doorPlaque,
  tileArt,
} from "./castle-art";
import {
  COLLECTOR_ART,
  COLLECTOR_CRUMBLE,
  COLLECTOR_FRAME,
  SLASH_ARC,
} from "./collector-art";
import {
  CHARGE_KEYS,
  SQUIGGLE_ART,
  SYNTAX_ERROR_ART,
  SYNTAX_ERROR_COLLAPSE,
  SYNTAX_ERROR_DAMAGED_ART,
  SYNTAX_ERROR_FRAME,
  WATCHDOG_ART,
  WATCHDOG_DAMAGED_ART,
  WATCHDOG_FRAME,
} from "./enemy-art";
import { FONT_HEIGHT, GLYPHS, textRows, textWidth } from "./font";
import {
  COMMAND_LABELS,
  FACES,
  HOTFIX_NOTE,
  LEGACY_ART,
  LEGACY_FRAME,
  PUNCHED_CARDS,
  REELS,
  REEL_FRAMES,
  SCREEN,
  THRONE,
  THRONE_FRAME,
  THRONE_LEDS,
} from "./legacy-art";
import {
  HERO_ART,
  HERO_FRAME,
  HERO_FRAMES,
  STEP_FRAMES,
  WALK_FRAMES,
  frameTop,
  heroFrame,
} from "./hero-art";
import { DROP_KNIGHT_ART, DROP_KNIGHT_FRAME } from "./drop-knight-art";
import { RUN_STEPS } from "./hero-run";
import {
  AXE_SPIN,
  BACKUP_TAPE,
  BEAMS,
  BIG_ENERGY,
  BUG_CRAWL,
  CACHE_CHIP,
  CODE_BLOCKS,
  DISK,
  DROP_RELIC,
  ENERGY,
  FIREWALL,
  GC_CHIP,
  GLYPH_SHOTS,
  INDEX_TREE,
  JOIN_RELIC,
  JOIN_SPIN,
  PEN,
  README_PAGE,
  SELECT_BOLT,
  TAPE_REEL,
  TRUNCATE_RELIC,
  WAVE_CRESTS,
} from "./item-art";
import { LETTERS, titleRows } from "./lettering";
import { type SpriteRows, mirror, silhouette } from "./sprite";
import {
  BELT,
  BENCH,
  CLOCK,
  CRACKED_SECTOR,
  CRON_PLATFORMS,
  EMITTER,
  EMITTER_LENS,
  GEAR,
  NICHE,
  SECTOR,
  SECTOR_DEBRIS,
  SHELF,
  STAGE_PAINTS,
} from "./stage-art";
import { BRACE, COSTUME_ART, VIBE_ART, VIBE_FRAME } from "./vibe-art";
import { ZOMBIE_ART, ZOMBIE_FRAME } from "./zombie-art";

function expectSprite(rows: SpriteRows, keys = Object.keys(PALETTE)) {
  const width = rows[0]?.length ?? 0;
  const allowed = new Set([TRANSPARENT, ...keys]);
  expect(width).toBeGreaterThan(0);
  expect(rows.filter((row) => row.length !== width)).toEqual([]);
  expect(
    [...new Set(rows.join(""))].filter((pixel) => !allowed.has(pixel)),
  ).toEqual([]);
}

describe("castle art", () => {
  const levels = parseCampaign().map((room) => room.level);
  const [level] = levels;
  const tiles = new Set<TileArt>();
  for (const room of levels) {
    for (let row = 0; row < room.rows; row++) {
      for (let column = 0; column < room.columns; column++) {
        const art = tileArt(room, column, row);
        if (art) {
          tiles.add(art);
        }
      }
    }
  }

  it("draws every tile as a 16 by 16 sprite with LEDs inside it", () => {
    expect(tiles.size).toBeGreaterThan(4);
    for (const { rows, leds } of tiles) {
      expectSprite(rows);
      expect(rows[0]).toHaveLength(TILE);
      expect(rows.length).toBeLessThanOrEqual(TILE);
      for (const led of leds) {
        expect(led.x).toBeLessThan(TILE);
        expect(led.y).toBeLessThan(rows.length);
        expect(Object.keys(PALETTE)).toContain(led.on);
        expect(Object.keys(PALETTE)).toContain(led.off);
      }
    }
  });

  it("caps racks and floors where they meet the air", () => {
    const rackTop = tileArt(level, 20, 8);
    const rackBody = tileArt(level, 20, 9);
    expect(rackTop).not.toBe(rackBody);
    expect(tileArt(level, 5, 10)).not.toBe(tileArt(level, 5, 11));
    expect(tileArt(level, 5, 5)).toBeNull();
  });

  it("keeps decorations within their spots", () => {
    for (const rows of [
      WALL,
      MERLON,
      GARGOYLE,
      WINDOW,
      DOOR,
      GATE,
      LOG_PANEL,
      SAVEPOINT,
      SAVEPOINT_SCREEN,
      doorPlaque("GC"),
      doorPlaque("PROD"),
    ]) {
      expectSprite(rows);
    }
    expect(doorPlaque("PROD")[0].length).toBeLessThanOrEqual(DOOR[0].length);
    for (const { plaque } of CAMPAIGN) {
      if (plaque) {
        expect(doorPlaque(plaque)[0].length).toBeLessThanOrEqual(
          DOOR[0].length,
        );
      }
    }
    for (let y = DOOR_LOCK.y; y < DOOR_LOCK.y + DOOR_LOCK.height; y++) {
      expect(DOOR[y].slice(DOOR_LOCK.x, DOOR_LOCK.x + DOOR_LOCK.width)).toBe(
        "R".repeat(DOOR_LOCK.width),
      );
    }
    expect(WALL[0]).toHaveLength(TILE);
    expect(GARGOYLE[0]).toHaveLength(TILE);
    expect(WINDOW[0]).toHaveLength(TILE);
    expect(SAVEPOINT[0].length).toBeLessThanOrEqual(TILE);
    expect(SAVEPOINT.length).toBeLessThanOrEqual(2 * TILE);
    expect(DOOR.length).toBeLessThanOrEqual(3 * TILE);
    expect(GATE[0]).toHaveLength(2 * TILE);
    for (const eye of GARGOYLE_EYES) {
      expect(GARGOYLE[eye.y][eye.x]).toBe(eye.on);
    }
  });
});

describe("hero art", () => {
  it("draws every frame on the same outlined canvas", () => {
    for (const frame of HERO_FRAMES) {
      const rows = HERO_ART[frame];
      expectSprite(rows);
      expect(rows).toHaveLength(HERO_FRAME.height);
      expect(rows[0]).toHaveLength(HERO_FRAME.width);
      expect(rows.join("")).toContain("k");
    }
  });

  it("keeps the feet on the ground in every standing frame", () => {
    const standing = HERO_FRAMES.filter(
      (frame) => !["jump", "fall", "hurt", "cloud"].includes(frame),
    );
    for (const frame of standing) {
      expect(HERO_ART[frame].at(-1)).toMatch(/[^.]/);
    }
  });

  it("draws a run cycle where every frame moves something", () => {
    expect(WALK_FRAMES).toHaveLength(RUN_STEPS);
    WALK_FRAMES.forEach((frame, index) => {
      const next = WALK_FRAMES[(index + 1) % WALK_FRAMES.length];
      expect(HERO_ART[frame]).not.toEqual(HERO_ART[next]);
      expect(HERO_ART[frame].at(-1)).toMatch(/[^.]/);
    });
  });

  it("anchors every frame to the feet, so crouching stays on the floor", () => {
    const standing = { x: 0, y: 132, width: 12, height: 28 };
    const crouched = { x: 0, y: 142, width: 12, height: 18 };
    expect(frameTop(standing)).toBe(standing.y - HERO_FRAME.top);
    expect(frameTop(crouched)).toBe(frameTop(standing));
    for (const frame of ["crouch", "crouchStrike"] as const) {
      expect(HERO_ART[frame].at(-1)).toMatch(/[^.]/);
    }
  });

  it("runs through eight frames and breathes slowly when idle", () => {
    const steps = Array.from({ length: WALK_FRAMES.length + 1 }, (_, index) =>
      heroFrame("walk", index * STEP_FRAMES, 0),
    );
    expect(steps).toEqual([...WALK_FRAMES, "walk1"]);
    expect(heroFrame("idle", 0, 0)).toBe("idle1");
    expect(heroFrame("idle", 0, 40)).toBe("idle2");
    expect(heroFrame("strike", 0, 0)).toBe("strike");
  });
});

describe("enemy and item art", () => {
  it("draws every enemy frame on its own canvas size", () => {
    for (const rows of [
      ...Object.values(SYNTAX_ERROR_ART),
      ...Object.values(SYNTAX_ERROR_DAMAGED_ART),
      ...SYNTAX_ERROR_COLLAPSE,
    ]) {
      expectSprite(rows);
      expect(rows).toHaveLength(SYNTAX_ERROR_FRAME.height);
      expect(rows[0]).toHaveLength(SYNTAX_ERROR_FRAME.width);
    }
    for (const rows of [
      ...Object.values(WATCHDOG_ART),
      ...Object.values(WATCHDOG_DAMAGED_ART),
    ]) {
      expectSprite(rows);
      expect(rows).toHaveLength(WATCHDOG_FRAME.height);
      expect(rows[0]).toHaveLength(WATCHDOG_FRAME.width);
    }
    for (const rows of SQUIGGLE_ART) {
      expectSprite(rows);
    }
  });

  it("gives every pose of the march and of the throw its own drawing", () => {
    const poses = Object.values(SYNTAX_ERROR_ART).map((rows) => rows.join(""));
    expect(new Set(poses).size).toBeGreaterThanOrEqual(poses.length - 1);
    expect(SQUIGGLE_ART[0]).not.toEqual(SQUIGGLE_ART[1]);
    expect(
      new Set(SYNTAX_ERROR_COLLAPSE.map((rows) => rows.join(""))).size,
    ).toBe(SYNTAX_ERROR_COLLAPSE.length);
  });

  it("cracks the skull and the open lens once an enemy is damaged", () => {
    for (const [pose, rows] of Object.entries(SYNTAX_ERROR_ART)) {
      expect(
        SYNTAX_ERROR_DAMAGED_ART[pose as keyof typeof SYNTAX_ERROR_ART],
      ).not.toEqual(rows);
    }
    for (const [pose, rows] of Object.entries(WATCHDOG_ART)) {
      if (!pose.endsWith("blink")) {
        expect(WATCHDOG_DAMAGED_ART[pose]).not.toEqual(rows);
      }
    }
  });

  it("warms the Watchdog lens from amber to red before it fires", () => {
    const [amber, red, glowing] = CHARGE_KEYS.map((key) =>
      WATCHDOG_ART[key].join(""),
    );
    expect(amber).toContain("y");
    expect(red).toContain("R");
    expect(glowing).toContain("L");
    expect(WATCHDOG_ART["mid-ahead"].join("")).not.toContain("R");
    expect(SQUIGGLE_ART[0].join("")).toMatch(/R.R.R/);
  });

  it("draws pickups, relics and shots", () => {
    for (const rows of [
      DISK,
      PEN,
      ENERGY,
      BIG_ENERGY,
      GC_CHIP,
      JOIN_RELIC,
      TRUNCATE_RELIC,
      SELECT_BOLT,
      ...JOIN_SPIN,
      ...GLYPH_SHOTS,
      ...BEAMS,
      FIREWALL,
      INDEX_TREE,
      CACHE_CHIP,
      BACKUP_TAPE,
      README_PAGE,
      TAPE_REEL,
      DROP_RELIC,
      ...AXE_SPIN,
    ]) {
      expectSprite(rows);
    }
    expect(GLYPH_SHOTS).toHaveLength(3);
    expect(BEAMS).toHaveLength(2);
  });

  it("gives every new item its own silhouette and spins the axe in four turns", () => {
    const shapes = [
      FIREWALL,
      INDEX_TREE,
      CACHE_CHIP,
      BACKUP_TAPE,
      README_PAGE,
      TAPE_REEL,
    ].map((rows) => rows.map((row) => row.replace(/[^.]/g, "X")).join("\n"));
    expect(new Set(shapes).size).toBe(shapes.length);
    expect(AXE_SPIN).toHaveLength(4);
    expect(new Set(AXE_SPIN.map((rows) => rows.join(""))).size).toBe(4);
    expect(DROP_RELIC).toEqual(JOIN_RELIC.map(() => expect.any(String)));
  });

  it("draws the Zombie Process and the DROP Knight on their own canvas sizes", () => {
    for (const rows of Object.values(ZOMBIE_ART)) {
      expectSprite(rows);
      expect(rows).toHaveLength(ZOMBIE_FRAME.height);
      expect(rows[0]).toHaveLength(ZOMBIE_FRAME.width);
    }
    for (const rows of Object.values(DROP_KNIGHT_ART)) {
      expectSprite(rows);
      expect(rows).toHaveLength(DROP_KNIGHT_FRAME.height);
      expect(rows[0]).toHaveLength(DROP_KNIGHT_FRAME.width);
    }
    const knightPoses = Object.values(DROP_KNIGHT_ART).map((rows) =>
      rows.join(""),
    );
    expect(new Set(knightPoses).size).toBe(knightPoses.length - 1);
    expect(
      new Set(Object.values(ZOMBIE_ART).map((rows) => rows.join(""))).size,
    ).toBe(Object.keys(ZOMBIE_ART).length);
  });

  it("keeps the feet of both mobs on the floor line", () => {
    for (const rows of [ZOMBIE_ART.shamble1, ZOMBIE_ART.shamble2]) {
      expect(rows.at(-1)).toMatch(/[^.]/);
    }
    for (const rows of [DROP_KNIGHT_ART.walk1, DROP_KNIGHT_ART.throw]) {
      expect(rows.at(-1)).toMatch(/[^.]/);
    }
  });

  it("raises the axe above the helmet and lights the visor before a throw", () => {
    const top = (rows: readonly string[]) =>
      rows.findIndex((row) => /[^.]/.test(row));
    expect(top(DROP_KNIGHT_ART.windup)).toBeLessThan(
      top(DROP_KNIGHT_ART.walk1),
    );
    expect(DROP_KNIGHT_ART.windup.join("")).toContain("L");
    expect(DROP_KNIGHT_ART.walk1.join("")).not.toContain("L");
    expect(DROP_KNIGHT_ART.throw.join("")).not.toContain("F");
  });
});

function fits(rows: SpriteRows, part: SpriteRows, x: number, y: number) {
  return part.every((line, dy) =>
    [...line].every(
      (pixel, dx) => pixel === TRANSPARENT || rows[y + dy][x + dx] === pixel,
    ),
  );
}

function contains(rows: SpriteRows, part: SpriteRows): boolean {
  for (let y = 0; y + part.length <= rows.length; y++) {
    for (let x = 0; x + part[0].length <= rows[0].length; x++) {
      if (fits(rows, part, x, y)) {
        return true;
      }
    }
  }
  return false;
}

describe("savepoint art", () => {
  it("lights the screen and the LED of the console, never its frame", () => {
    const { x, y } = SAVEPOINT_SCREEN_AT;
    SAVEPOINT_SCREEN.forEach((row, top) => {
      [...row].forEach((pixel, left) => {
        if (pixel !== TRANSPARENT) {
          expect("nr").toContain(SAVEPOINT[y + top][x + left]);
        }
      });
    });
    expect(SAVEPOINT_SCREEN.join("")).toContain("g");
    expect(SAVEPOINT_SCREEN.join("")).toContain("R");
  });
});

describe("boss art", () => {
  const label = textRows("DEL", "k");

  it("draws every Vibe Coder pose on one outlined canvas, facing both ways", () => {
    for (const [right, left] of Object.values(VIBE_ART)) {
      for (const rows of [right, left]) {
        expectSprite(rows);
        expect(rows).toHaveLength(VIBE_FRAME.height);
        expect(rows[0]).toHaveLength(VIBE_FRAME.width);
        expect(rows.at(-2)).toMatch(/k/);
        expect(rows.at(-1)).toMatch(/^\.+$/);
      }
      expect(right).toEqual(mirror(left));
    }
  });

  it("gives every Vibe Coder pose its own drawing", () => {
    const drawings = Object.values(VIBE_ART).map(([, left]) => left.join("\n"));
    expect(new Set(drawings).size).toBe(drawings.length);
    expect(Object.keys(VIBE_ART)).toEqual(
      expect.arrayContaining([
        "idle",
        "walk1",
        "walk2",
        "throw",
        "shield",
        "hurt",
        "unmasked",
      ]),
    );
  });

  it("raises the laptop above the head only before the slam", () => {
    const headroom = VIBE_FRAME.top - 5;
    const raised = Object.entries(VIBE_ART)
      .filter(([, [, left]]) =>
        left.slice(0, headroom).some((row) => /[^.]/.test(row)),
      )
      .map(([pose]) => pose);
    expect(raised).toEqual(["lift"]);
  });

  it("takes off a costume that was worn over the idle pose", () => {
    const [, idle] = VIBE_ART.idle;
    const [, unmasked] = VIBE_ART.unmasked;
    const offenders = Object.entries(COSTUME_ART).flatMap(
      ([piece, [, rows]]) => {
        expectSprite(rows);
        return rows.flatMap((row, y) =>
          [...row].flatMap((pixel, x) =>
            pixel !== "." && pixel !== "k" && idle[y][x] === "."
              ? [`${piece} ${x},${y}`]
              : [],
          ),
        );
      },
    );
    expect(offenders).toEqual([]);
    expect(idle.join("")).toContain("y");
    expect(unmasked.join("")).not.toContain("y");
    expect(unmasked.slice(0, -4).join("")).not.toContain("s");
  });

  it("draws the try/catch braces taller than the boss", () => {
    expectSprite(BRACE);
    expect(BRACE.length).toBeGreaterThan(VIBE_FRAME.height - VIBE_FRAME.top);
  });

  it("draws code blocks, bugs and floor waves of one size each", () => {
    for (const rows of [...CODE_BLOCKS, ...BUG_CRAWL, ...WAVE_CRESTS.flat()]) {
      expectSprite(rows);
    }
    expect(CODE_BLOCKS).toHaveLength(VIBE.blocks);
    for (const set of [CODE_BLOCKS, BUG_CRAWL, WAVE_CRESTS.flat()]) {
      expect(
        new Set(set.map((rows) => `${rows[0].length}x${rows.length}`)).size,
      ).toBe(1);
      expect(new Set(set.map((rows) => rows.join("\n"))).size).toBe(set.length);
    }
    for (const [right, left] of WAVE_CRESTS) {
      expect(left).toEqual(mirror(right));
    }
  });

  it("hangs a projector screen and spotlights over the Vibe stage", () => {
    for (const rows of [PROJECTOR, ALERT_SLIDE, SPOTLIGHT]) {
      expectSprite(rows);
    }
    expect(SLIDE_AT.x + ALERT_SLIDE[0].length).toBeLessThan(
      PROJECTOR[0].length,
    );
    expect(SLIDE_AT.y + ALERT_SLIDE.length).toBeLessThan(PROJECTOR.length);
    expect(SPOTLIGHT[LENS.y - 1][LENS.x]).toBe("o");
    const stage = parseCampaign().find(
      ({ slot }) => slot.kind === "boss" && slot.boss === "vibe",
    )?.level;
    expect(stage?.places.screen).toHaveLength(1);
    expect(stage?.places.spotlight).toHaveLength(2);
    expect(stage?.places.paste).toHaveLength(VIBE.copies);
  });

  it("draws the Garbage Collector on one canvas size, both ways", () => {
    for (const [right, left] of Object.values(COLLECTOR_ART)) {
      for (const rows of [right, left]) {
        expectSprite(rows);
        expect(rows).toHaveLength(COLLECTOR_FRAME.height);
        expect(rows[0]).toHaveLength(COLLECTOR_FRAME.width);
      }
    }
    for (const rows of COLLECTOR_CRUMBLE) {
      expectSprite(rows);
      expect(rows).toHaveLength(COLLECTOR_FRAME.height);
    }
    expectSprite(SLASH_ARC);
  });

  it("keeps DEL readable on the blade whichever way the boss faces", () => {
    const { float1 } = COLLECTOR_ART;
    expect(contains(float1[0], label)).toBe(true);
    expect(contains(float1[1], label)).toBe(true);
    expect(contains(float1[1], mirror(label))).toBe(false);
  });

  it("draws the Legacy System, its faces and its throne", () => {
    for (const { rows, screen } of Object.values(LEGACY_ART)) {
      expectSprite(rows);
      expect(rows).toHaveLength(LEGACY_FRAME.height);
      expect(rows[0]).toHaveLength(LEGACY_FRAME.width);
      expect(screen[0] + SCREEN.width).toBeLessThanOrEqual(LEGACY_FRAME.width);
      expect(screen[1] + SCREEN.height).toBeLessThanOrEqual(
        LEGACY_FRAME.height,
      );
    }
    for (const face of Object.values(FACES)) {
      expectSprite(face);
      expect(face).toHaveLength(SCREEN.height);
      expect(face[0]).toHaveLength(SCREEN.width);
    }
    expect(FACES.idle.join("")).toContain("y");
    expect(FACES.patched.join("")).toContain("R");
    expectSprite(THRONE);
    expect(THRONE).toHaveLength(THRONE_FRAME.height);
    expect(THRONE[0]).toHaveLength(THRONE_FRAME.width);
    for (const [x, y] of [...THRONE_LEDS, ...REELS]) {
      expect(THRONE[y]?.[x]).toMatch(/[^.]/);
    }
    for (const rows of [...REEL_FRAMES, HOTFIX_NOTE, ...PUNCHED_CARDS]) {
      expectSprite(rows);
    }
    expect(new Set(REEL_FRAMES.map((rows) => rows.join(""))).size).toBe(
      REEL_FRAMES.length,
    );
  });

  it("prints every command on a plate that fits the screen", () => {
    for (const rows of Object.values(COMMAND_LABELS)) {
      expectSprite(rows);
      expect(rows[0].length).toBeLessThan(VIEW_WIDTH / 2);
    }
  });
});

describe("stage art", () => {
  it("repaints the stages with palette colors only, each new stage its own way", () => {
    for (const paints of Object.values(STAGE_PAINTS)) {
      for (const [from, to] of Object.entries(paints)) {
        expect(PALETTE).toHaveProperty(from);
        expect(PALETTE).toHaveProperty(to);
      }
    }
    const { catacombs, tapes, lab, cron } = STAGE_PAINTS;
    const looks = [catacombs, tapes, lab, cron].map((paints) =>
      JSON.stringify(paints),
    );
    expect(new Set(looks).size).toBe(4);
    expect(looks).not.toContain("{}");
  });

  it("draws the new ground one tile wide and tells the platform groups apart by shape", () => {
    for (const rows of [BELT, SECTOR, CRACKED_SECTOR]) {
      expectSprite(rows);
      expect(rows).toHaveLength(TILE);
      expect(rows[0]).toHaveLength(TILE);
    }
    expect(SECTOR.join("")).not.toEqual(CRACKED_SECTOR.join(""));
    for (const rows of [SECTOR_DEBRIS, EMITTER, ...CRON_PLATFORMS]) {
      expectSprite(rows);
    }
    const [first, second] = CRON_PLATFORMS;
    expect(silhouette(first, "x")).not.toEqual(silhouette(second, "x"));
    expect(
      EMITTER[EMITTER_LENS.y].slice(
        EMITTER_LENS.x,
        EMITTER_LENS.x + EMITTER_LENS.width,
      ),
    ).toMatch(/r/);
  });

  it("hangs every new decoration on open wall", () => {
    const sizes = [
      ["niche", NICHE],
      ["shelf", SHELF],
      ["bench", BENCH],
      ["clock", CLOCK],
      ["gear", GEAR],
    ] as const;
    for (const [, rows] of sizes) {
      expectSprite(rows);
    }
    for (const { level } of parseCampaign()) {
      for (const [place, rows] of sizes) {
        const columns = Math.floor(rows[0].length / TILE);
        const tall = Math.floor(rows.length / TILE);
        for (const { column, row } of level.places[place]) {
          for (let y = row; y < row + tall; y++) {
            for (let x = column; x < column + columns; x++) {
              expect(isSolid(level, x, y), `${place} at ${x},${y}`).toBe(false);
            }
          }
        }
      }
    }
  });
});

describe("lettering and font", () => {
  it("draws every title letter at the same height", () => {
    const heights = new Set(Object.values(LETTERS).map((rows) => rows.length));
    expect([...heights]).toEqual([13]);
    for (const rows of Object.values(LETTERS)) {
      expectSprite(rows, ["X"]);
    }
  });

  it("composes a title that fits the screen", () => {
    const title = titleRows();
    expectSprite(title);
    expect(title[0].length).toBeLessThan(VIEW_WIDTH);
    expect(title.length).toBeLessThan(VIEW_HEIGHT / 2);
  });

  it("has a small font with letters, digits and code symbols", () => {
    for (const rows of Object.values(GLYPHS)) {
      expect(rows).toHaveLength(FONT_HEIGHT);
      expectSprite(rows, ["X"]);
    }
    for (const character of "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789;)}<>/\\") {
      expect(GLYPHS).toHaveProperty(character);
    }
    expect(textWidth("OF")).toBe(3 + 1 + 3);
    expect(textRows("A", "b")).toEqual([".b.", "b.b", "bbb", "b.b", "b.b"]);
    expect(textRows("~", "b")).toEqual(textRows("?", "b"));
  });
});

describe("backdrop", () => {
  it("paints the sky, the moon, the towers and the fog", () => {
    for (const rows of [skyRows(), moonRows(), towerRows(), fogRows()]) {
      expectSprite(rows);
    }
    expect(skyRows()[0]).toHaveLength(VIEW_WIDTH);
    expect(towerRows()[0]).toHaveLength(VIEW_WIDTH);
    expect(fogRows()[0]).toHaveLength(VIEW_WIDTH);
  });

  it("puts a warning light on top of every antenna mast", () => {
    const towers = towerRows();
    expect(towerLights().length).toBeGreaterThan(0);
    for (const light of towerLights()) {
      expect(towers[light.y][light.x]).toBe(TRANSPARENT);
      expect(towers[light.y + 1][light.x]).not.toBe(TRANSPARENT);
    }
  });
});
