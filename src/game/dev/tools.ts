import { RAM } from "../balance";
import { hitBoss } from "../core/bosses";
import { type World, createWorld, enterSlot } from "../core/world";
import { isCleared, isVulnerable, resetBoss } from "../entities/boss";
import { hurtHero, isCrashed, placeHero } from "../entities/hero";
import { BOOSTS } from "../entities/items";
import type { Slot, StageSlot } from "../levels/campaign";
import { parseLevel } from "../levels/level";

export const DEV_MARKER = "dev-tools:campaign-marker";

export interface DevHost {
  current: () => World;
  show: (world: World) => void;
  refresh: () => void;
}

export interface DevState {
  open: boolean;
  infinite: boolean;
  zombies: number;
  knights: number;
  testing: boolean;
  campaign: World;
}

export interface DevTools {
  afterStep: () => void;
  detach: () => void;
}

export const MOB_COUNTS = [1, 4, 8] as const;

const TOGGLE_KEY = "F9";
const INFINITE_KEY = "KeyI";
const ZOMBIES_KEY = "KeyU";
const KNIGHTS_KEY = "KeyK";
const TEST_ROOM_KEYS: ReadonlySet<string> = new Set(["Digit0", "Numpad0"]);
const OVERLOAD_KEYS: ReadonlySet<string> = new Set(["Equal", "NumpadAdd"]);
const SKIP_KEYS: ReadonlySet<string> = new Set(["PageDown", "BracketRight"]);
const SLOT_KEY = /^(?:Digit|Numpad)([1-9])$/;

const PICKUP_ROW = ["w", "i", "c", "b", "m"];
const SHELF_ROW = ["f", "u", "r", "r", "r"];
const RELIC_ROW = ["d", "j", "t"];
const ROOM_ROWS = 12;
const SHELF = 8;
const FLOOR = 9;
const WINDOW_ROW = 2;
const WINDOW_EVERY = 12;
const KNIGHT_GAP = 3;
const AREA_GAP = 8;

export function overload(world: World): void {
  if (world.mode !== "playing") {
    return;
  }
  const { hero } = world;
  hurtHero(hero, RAM.devOverload, hero.x + hero.width / 2 + hero.facing);
  if (isCrashed(hero)) {
    world.mode = "crash";
  }
}

export function skipAhead(world: World): void {
  if (world.mode !== "playing" || world.passage > 0) {
    return;
  }
  const { boss, level } = world.room;
  if (boss && !isCleared(boss)) {
    if (isVulnerable(boss)) {
      hitBoss(world, boss, boss.health);
    }
    return;
  }
  if (level.exit) {
    placeHero(world.hero, level.exit);
  }
}

export function jumpTo(world: World, index: number): void {
  const room = world.rooms[index];
  if (!room) {
    return;
  }
  if (room.boss) {
    resetBoss(room.boss);
  }
  world.passage = 0;
  enterSlot(world, index);
  world.mode = "playing";
}

export function sustain(world: World, state: DevState): void {
  if (state.infinite) {
    world.hero.ram = Math.min(world.hero.ram, RAM.start);
  }
}

function spaced(symbols: readonly string[], gap = 2): string[] {
  return symbols.flatMap((symbol) => [
    symbol,
    ...Array.from({ length: gap - 1 }, () => " "),
  ]);
}

export function testRoomMap(zombies: number, knights: number): string[] {
  const floor = [
    "#",
    "S",
    " ",
    ...spaced(PICKUP_ROW),
    " ",
    ...spaced(RELIC_ROW),
    "C",
    ...Array.from({ length: AREA_GAP / 2 }, () => " "),
    ...spaced(Array.from({ length: zombies }, () => "z")),
    ...Array.from({ length: AREA_GAP }, () => " "),
    ...spaced(
      Array.from({ length: knights }, () => "k"),
      KNIGHT_GAP,
    ),
    ...Array.from({ length: AREA_GAP / 2 }, () => " "),
    "#",
  ];
  const width = floor.length;
  const shelf = floor.map((_, column) => {
    if (column === 0 || column === width - 1) {
      return "#";
    }
    const item = (column - 3) / 2;
    return Number.isInteger(item) && SHELF_ROW[item] ? SHELF_ROW[item] : " ";
  });
  const air = (row: number) =>
    Array.from({ length: width }, (_, column) => {
      if (column === 0 || column === width - 1) {
        return "#";
      }
      return row === WINDOW_ROW && column % WINDOW_EVERY === 6 ? "W" : " ";
    }).join("");
  const wall = "#".repeat(width);
  return Array.from({ length: ROOM_ROWS }, (_, row) => {
    if (row === 0 || row > FLOOR) {
      return wall;
    }
    if (row === SHELF) {
      return shelf.join("");
    }
    return row === FLOOR ? floor.join("") : air(row);
  });
}

export function testSlot(zombies: number, knights: number): StageSlot {
  return {
    kind: "stage",
    stage: "lab",
    map: testRoomMap(zombies, knights),
    plaque: null,
    cast: ["zombie", "dropKnight"],
    music: "stage",
    boosts: BOOSTS,
  };
}

export function createTestWorld(state: DevState, like: World): World {
  const slot = testSlot(state.zombies, state.knights);
  const world = createWorld([{ slot, level: parseLevel(slot.map) }], {
    reducedMotion: like.reducedMotion,
    seed: like.seed + 1,
    muted: like.muted,
  });
  jumpTo(world, 0);
  return world;
}

function nextCount(count: number): number {
  const index = MOB_COUNTS.findIndex((value) => value === count);
  return MOB_COUNTS[(index + 1) % MOB_COUNTS.length];
}

function openTestRoom(host: DevHost, state: DevState): void {
  const current = host.current();
  if (!state.testing) {
    state.campaign = current;
  }
  state.testing = true;
  host.show(createTestWorld(state, current));
}

function backToCampaign(host: DevHost, state: DevState): World {
  if (state.testing) {
    state.campaign.muted = host.current().muted;
    state.testing = false;
    host.show(state.campaign);
  }
  return state.campaign;
}

export function pressDevKey(
  host: DevHost,
  state: DevState,
  code: string,
): boolean {
  if (code === TOGGLE_KEY) {
    state.open = !state.open;
    return true;
  }
  if (OVERLOAD_KEYS.has(code)) {
    overload(host.current());
    return true;
  }
  if (SKIP_KEYS.has(code)) {
    skipAhead(host.current());
    return true;
  }
  if (!state.open) {
    return false;
  }
  if (code === INFINITE_KEY) {
    state.infinite = !state.infinite;
    return true;
  }
  if (code === ZOMBIES_KEY || code === KNIGHTS_KEY) {
    if (code === ZOMBIES_KEY) {
      state.zombies = nextCount(state.zombies);
    } else {
      state.knights = nextCount(state.knights);
    }
    if (state.testing) {
      openTestRoom(host, state);
    }
    return true;
  }
  if (TEST_ROOM_KEYS.has(code)) {
    openTestRoom(host, state);
    return true;
  }
  const slot = SLOT_KEY.exec(code);
  if (slot) {
    jumpTo(backToCampaign(host, state), Number(slot[1]) - 1);
    return true;
  }
  return false;
}

function slotLabel(slot: Slot): string {
  return slot.kind === "stage" ? `stage  ${slot.stage}` : `boss   ${slot.boss}`;
}

function mobs(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function describeTools(state: DevState): string {
  const { campaign } = state;
  const marker = (active: boolean) => (active ? ">" : " ");
  const slots = campaign.rooms.map(
    (room) =>
      `${marker(!state.testing && room === campaign.room)} ${room.index + 1}  ${slotLabel(room.slot)}`,
  );
  return [
    `dev tools  (${TOGGLE_KEY} closes)`,
    ...slots,
    `${marker(state.testing)} 0  test room: ${mobs(state.zombies, "zombie", "zombies")}, ${mobs(state.knights, "knight", "knights")}`,
    "",
    `  U     zombies: ${MOB_COUNTS.join(" / ")}`,
    `  K     knights: ${MOB_COUNTS.join(" / ")}`,
    `  I     infinite RAM: ${state.infinite ? "on" : "off"}`,
    `  =     +${RAM.devOverload}% RAM`,
    "  PgDn  skip ahead",
  ].join("\n");
}

export function attachDevTools(host: DevHost): DevTools {
  const state: DevState = {
    open: false,
    infinite: false,
    zombies: MOB_COUNTS[0],
    knights: MOB_COUNTS[0],
    testing: false,
    campaign: host.current(),
  };
  const panel = document.createElement("pre");
  panel.dataset.devTools = DEV_MARKER;
  panel.setAttribute("aria-hidden", "true");
  Object.assign(panel.style, {
    position: "fixed",
    top: "8px",
    left: "8px",
    zIndex: "96",
    margin: "0",
    padding: "8px 12px",
    border: "1px solid var(--border)",
    background: "var(--bg-window)",
    color: "var(--text)",
    fontFamily: "var(--font-code)",
    fontSize: "12px",
    pointerEvents: "none",
  });
  let shown = "";

  function draw() {
    panel.hidden = !state.open;
    shown = describeTools(state);
    panel.textContent = shown;
  }

  function keydown(event: KeyboardEvent) {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }
    if (!pressDevKey(host, state, event.code)) {
      return;
    }
    event.preventDefault();
    draw();
    host.refresh();
  }

  draw();
  document.body.append(panel);
  window.addEventListener("keydown", keydown);

  return {
    afterStep() {
      sustain(host.current(), state);
      if (state.open && describeTools(state) !== shown) {
        draw();
      }
    },
    detach() {
      window.removeEventListener("keydown", keydown);
      panel.remove();
    },
  };
}
