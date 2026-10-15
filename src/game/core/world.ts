import { PASSAGE_FRAMES, QUERY_ENERGY, RAM, RETRY } from "../balance";
import {
  type Boss,
  type BossKind,
  bossLine,
  createBoss,
  isCleared,
  isFighting,
  linesSaid,
  resetBoss,
  showsCard,
} from "../entities/boss";
import { updateDropKnight } from "../entities/drop-knight";
import {
  ENEMY_TRAITS,
  type Enemy,
  type EnemyKind,
  type Surroundings,
  type Zone,
  centerX,
  createEnemies,
  createZones,
  resetEnemy,
  revive,
} from "../entities/enemy";
import {
  type Controls,
  type Hero,
  type Subweapon,
  activeSubweapon,
  createHero,
  isCrashed,
  placeHero,
  updateHero,
} from "../entities/hero";
import {
  type Container,
  type Drop,
  type Pickup,
  type Relic,
  createContainers,
  createDrops,
  createPickups,
  createRelics,
  updateDrops,
} from "../entities/items";
import {
  type Mechanisms,
  carry,
  createMechanisms,
  resetMechanisms,
  updateMechanisms,
} from "../entities/mechanisms";
import {
  type Particle,
  burst,
  createParticles,
  updateParticles,
} from "../entities/particles";
import {
  FADE_SPARKS,
  type Projectile,
  createProjectiles,
  moveProjectile,
} from "../entities/projectiles";
import { updateSyntaxError } from "../entities/syntax-error";
import type { VibeLine } from "../entities/vibe";
import { updateWatchdog } from "../entities/watchdog";
import { updateZombie } from "../entities/zombie";
import {
  type PlannedRoom,
  type Slot,
  type SlotSummary,
  summarize,
} from "../levels/campaign";
import { type Cell, type Level, TILE } from "../levels/level";
import { moveBoss } from "./bosses";
import { framesToMs } from "./clock";
import {
  type Camera,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  aimCamera,
  descend,
} from "./camera";
import { type Box, overlaps } from "./collision";
import { fireSubweapon, resolveCombat } from "./combat";
import { type Cues, createCues, cue } from "./cues";
import { announce } from "./notices";
import { clearPool } from "./pool";

export type Mode =
  "title" | "intro" | "playing" | "paused" | "crash" | "victory";

export type Notice =
  | "join"
  | "truncate"
  | "drop"
  | "firewall"
  | "index"
  | "cache"
  | "backup"
  | "readme"
  | "switch"
  | BossKind
  | "freed"
  | "rollback"
  | "unmasked"
  | "arrival"
  | "savepoint"
  | "soundOn"
  | "soundOff";

export const INTRO_FRAMES = 300;
export const STILL_INTRO_FRAMES = 90;
export const INTRO_RISE = 220;

const AWAKE_MARGIN = 48;
const ENTRANCE_SPARKS = 8;
const FADE_SPARK_COUNT = 4;

const ENEMY_UPDATES: Readonly<
  Record<EnemyKind, (enemy: Enemy, surroundings: Surroundings) => void>
> = {
  syntaxError: updateSyntaxError,
  watchdog: updateWatchdog,
  zombie: updateZombie,
  dropKnight: updateDropKnight,
};
const CHECKPOINT_REACH = 3 * TILE;
const DOORWAY = { inset: 8, width: 16, rows: 3 } as const;

export interface Room {
  index: number;
  slot: Slot;
  level: Level;
  doorway: Box | null;
  enemies: Enemy[];
  zones: Zone[];
  containers: Container[];
  relics: Relic[];
  pickups: Pickup[];
  mechanisms: Mechanisms;
  boss: Boss | null;
}

export interface Checkpoint {
  room: number;
  cell: Cell;
  mark: number;
}

export interface Entry {
  ram: number;
  energy: number;
  subweapons: Subweapon[];
  subweapon: number;
  firewall: number;
  readme: boolean;
}

export interface World {
  rooms: readonly Room[];
  room: Room;
  hero: Hero;
  camera: Camera;
  mode: Mode;
  reducedMotion: boolean;
  seed: number;
  frame: number;
  intro: number;
  playFrames: number;
  checkpoint: Checkpoint;
  entry: Entry;
  attempts: number;
  restY: number;
  tokens: number;
  drops: Drop[];
  projectiles: Projectile[];
  particles: Particle[];
  sweep: number;
  quake: number;
  passage: number;
  notice: Notice | null;
  notices: number;
  noticeFrames: number;
  muted: boolean;
  cues: Cues;
}

export interface BossHud {
  kind: BossKind;
  health: number;
}

export interface BoostHud {
  firewall: boolean;
  index: number;
  cache: number;
  readme: boolean;
}

export interface Hud {
  mode: Mode;
  room: number;
  slot: SlotSummary;
  ram: number;
  energy: number;
  subweapon: Subweapon;
  cloudReady: boolean;
  notice: Notice | null;
  notices: number;
  boss: BossHud | null;
  card: boolean;
  speech: VibeLine | null;
  said: number;
  boosts: BoostHud;
  muted: boolean;
}

function doorwayOf({ exit }: Level): Box | null {
  return (
    exit && {
      x: exit.column * TILE + DOORWAY.inset,
      y: (exit.row + 1 - DOORWAY.rows) * TILE,
      width: DOORWAY.width,
      height: DOORWAY.rows * TILE,
    }
  );
}

function createRoom({ slot, level: plan }: PlannedRoom, index: number): Room {
  const level = { ...plan, terrain: [...plan.terrain] };
  return {
    index,
    slot,
    level,
    doorway: doorwayOf(level),
    enemies: createEnemies(level),
    zones: createZones(level),
    containers: createContainers(level),
    relics: createRelics(level),
    pickups: createPickups(level),
    mechanisms: createMechanisms(level),
    boss: createBoss(level),
  };
}

function snapshot(hero: Hero): Entry {
  return {
    ram: hero.ram,
    energy: hero.energy,
    subweapons: [...hero.subweapons],
    subweapon: hero.subweapon,
    firewall: hero.firewall,
    readme: hero.readme,
  };
}

function frameHero(world: World): void {
  world.camera.y = world.room.level.height - VIEW_HEIGHT;
  aimCamera(world.camera, world.room.level, world.hero);
}

export function createWorld(
  planned: readonly PlannedRoom[],
  {
    reducedMotion,
    seed = 1,
    muted = false,
  }: Readonly<{ reducedMotion: boolean; seed?: number; muted?: boolean }>,
): World {
  const rooms = planned.map(createRoom);
  const [first] = rooms;
  if (!first) {
    throw new Error("The campaign needs at least one room");
  }
  const hero = createHero(first.level.start);
  const world: World = {
    rooms,
    room: first,
    hero,
    camera: { x: 0, y: 0 },
    mode: "title",
    reducedMotion,
    seed,
    frame: 0,
    intro: 0,
    playFrames: 0,
    checkpoint: { room: 0, cell: first.level.start, mark: -1 },
    entry: snapshot(hero),
    attempts: 0,
    restY: 0,
    tokens: 0,
    drops: createDrops(),
    projectiles: createProjectiles(),
    particles: createParticles(),
    sweep: 0,
    quake: 0,
    passage: 0,
    notice: null,
    notices: 0,
    noticeFrames: 0,
    muted,
    cues: createCues(),
  };
  frameHero(world);
  world.restY = world.camera.y;
  world.camera.y = world.restY - INTRO_RISE;
  return world;
}

function introLength(world: World): number {
  return world.reducedMotion ? STILL_INTRO_FRAMES : INTRO_FRAMES;
}

export function introProgress(world: World): number {
  if (world.mode === "title") {
    return 0;
  }
  return world.mode === "intro" ? world.intro / introLength(world) : 1;
}

function arrive(world: World): void {
  if (world.room.slot.kind === "stage") {
    announce(world, "arrival");
  }
}

function finishIntro(world: World): void {
  world.mode = "playing";
  frameHero(world);
  arrive(world);
}

export function startIntro(world: World): void {
  if (world.mode === "title") {
    world.mode = "intro";
    world.intro = 0;
  }
}

export function skipIntro(world: World): void {
  if (world.mode === "intro") {
    finishIntro(world);
  }
}

function advanceIntro(world: World): void {
  world.intro += 1;
  const progress = introProgress(world);
  const skyY = world.restY - INTRO_RISE;
  if (world.reducedMotion) {
    world.camera.y = progress < 0.5 ? skyY : world.restY;
  } else {
    world.camera.y = descend(skyY, world.restY, progress);
  }
  if (world.intro >= introLength(world)) {
    finishIntro(world);
  }
}

function setCheckpoint(world: World, cell: Cell, mark: number): void {
  world.checkpoint.room = world.room.index;
  world.checkpoint.cell = cell;
  world.checkpoint.mark = mark;
}

function isQuiet(world: World): boolean {
  return world.noticeFrames === 0 || world.notice === "arrival";
}

function reachCheckpoints(world: World): void {
  const { hero, checkpoint } = world;
  const places = world.room.level.places.checkpoint;
  const feet = hero.y + hero.height;
  const reached = checkpoint.mark;
  for (let mark = checkpoint.mark + 1; mark < places.length; mark++) {
    const cell = places[mark];
    if (
      centerX(hero) >= cell.column * TILE &&
      Math.abs(feet - (cell.row + 1) * TILE) <= CHECKPOINT_REACH
    ) {
      setCheckpoint(world, cell, mark);
    }
  }
  if (checkpoint.mark > reached && isQuiet(world)) {
    announce(world, "savepoint");
  }
}

export function isSaved(world: World, room: Room, mark: number): boolean {
  const { checkpoint } = world;
  return checkpoint.room === room.index && mark <= checkpoint.mark;
}

function checkCrash(world: World): void {
  if (world.mode === "playing" && isCrashed(world.hero)) {
    world.mode = "crash";
  }
}

function isAwake(world: World, enemy: Enemy): boolean {
  const middleX = world.camera.x + VIEW_WIDTH / 2;
  const middleY = world.camera.y + VIEW_HEIGHT / 2;
  return (
    Math.abs(centerX(enemy) - middleX) < VIEW_WIDTH / 2 + AWAKE_MARGIN &&
    Math.abs(enemy.y + enemy.height / 2 - middleY) <
      VIEW_HEIGHT / 2 + AWAKE_MARGIN
  );
}

function enter(world: World, enemy: Enemy): void {
  const entrance = ENEMY_TRAITS[enemy.kind].entrances[enemy.state];
  if (entrance?.cue) {
    cue(world, entrance.cue);
  }
  if (entrance?.spark) {
    burst(
      world.particles,
      world,
      entrance.spark,
      centerX(enemy),
      enemy.y + enemy.height,
      ENTRANCE_SPARKS,
    );
  }
}

function moveEnemies(world: World): void {
  for (const enemy of world.room.enemies) {
    if (!enemy.alive) {
      enemy.dying = Math.max(enemy.dying - 1, 0);
      revive(enemy);
      continue;
    }
    if (!isAwake(world, enemy)) {
      continue;
    }
    const { state } = enemy;
    ENEMY_UPDATES[enemy.kind](enemy, world);
    if (enemy.state !== state) {
      enter(world, enemy);
    }
  }
}

function moveProjectiles(world: World): void {
  for (const projectile of world.projectiles) {
    if (!projectile.active) {
      continue;
    }
    moveProjectile(projectile, world.room.level, world.hero);
    const spark = FADE_SPARKS[projectile.kind];
    if (!projectile.active && spark) {
      burst(
        world.particles,
        world,
        spark,
        projectile.x + projectile.width / 2,
        projectile.y + projectile.height / 2,
        FADE_SPARK_COUNT,
      );
    }
  }
}

export function isOpen(room: Room): boolean {
  return room.boss === null || isCleared(room.boss);
}

function resetRoom(world: World, room: Room): void {
  for (const enemy of room.enemies) {
    resetEnemy(enemy);
  }
  for (const container of room.containers) {
    container.broken = false;
  }
  for (const relic of room.relics) {
    relic.taken = world.hero.subweapons.includes(relic.kind);
  }
  for (const pickup of room.pickups) {
    pickup.taken = false;
  }
  if (room.boss && !isCleared(room.boss)) {
    resetBoss(room.boss);
  }
  resetMechanisms(room.mechanisms, room.level);
  clearPool(world.drops);
  clearPool(world.projectiles);
  clearPool(world.particles);
  world.sweep = 0;
  world.quake = 0;
  world.noticeFrames = 0;
}

function enterRoom(world: World, room: Room, cell: Cell): void {
  world.room = room;
  resetRoom(world, room);
  placeHero(world.hero, cell);
  frameHero(world);
}

function nextRoom(world: World): Room | null {
  return world.rooms[world.room.index + 1] ?? null;
}

export function enterSlot(world: World, index: number): void {
  const room = world.rooms[index];
  if (!room) {
    return;
  }
  const { hero } = world;
  hero.ram = Math.min(hero.ram, RAM.entryCeiling);
  world.entry = snapshot(hero);
  world.attempts = 0;
  enterRoom(world, room, room.level.start);
  setCheckpoint(world, room.level.start, -1);
  arrive(world);
}

function enterDoor(world: World): void {
  const { room, hero } = world;
  if (
    room.doorway &&
    isOpen(room) &&
    nextRoom(world) &&
    overlaps(hero, room.doorway)
  ) {
    world.passage = PASSAGE_FRAMES;
    cue(world, "door");
  }
}

function advancePassage(world: World): void {
  world.passage -= 1;
  const next = nextRoom(world);
  if (world.passage === PASSAGE_FRAMES / 2 && next) {
    enterSlot(world, next.index);
  }
}

export function passageProgress(world: World): number {
  return world.passage > 0 ? 1 - world.passage / PASSAGE_FRAMES : 0;
}

function play(world: World, controls: Controls): void {
  world.playFrames += 1;
  if (world.passage > 0) {
    advancePassage(world);
    return;
  }
  const { hero, room } = world;
  const { lashes, cloud } = hero;
  updateHero(hero, controls, room.level);
  carry(room.mechanisms, room.level, hero);
  updateMechanisms(room.mechanisms, room.level, hero);
  if (hero.lashes > lashes) {
    cue(world, "whip");
  }
  if (cloud === 0 && hero.cloud > 0) {
    cue(world, "cloud");
  }
  fireSubweapon(world, controls);
  moveEnemies(world);
  moveBoss(world);
  moveProjectiles(world);
  updateDrops(world.drops, room.level);
  updateParticles(world.particles);
  resolveCombat(world);
  world.sweep = Math.max(world.sweep - 1, 0);
  world.quake = Math.max(world.quake - 1, 0);
  world.noticeFrames = Math.max(world.noticeFrames - 1, 0);
  reachCheckpoints(world);
  enterDoor(world);
  aimCamera(world.camera, room.level, hero);
  checkCrash(world);
}

export function step(world: World, controls: Controls): void {
  if (world.mode === "intro") {
    advanceIntro(world);
  } else if (world.mode === "playing") {
    play(world, controls);
  } else if (world.mode !== "title") {
    return;
  }
  world.frame += 1;
}

export function pause(world: World): void {
  if (world.mode === "playing") {
    world.mode = "paused";
  }
}

export function resume(world: World): void {
  if (world.mode === "paused") {
    world.mode = "playing";
  }
}

export function retry(world: World): void {
  if (world.mode !== "crash") {
    return;
  }
  const { hero, checkpoint, entry } = world;
  world.attempts += 1;
  hero.ram = Math.max(
    entry.ram - RETRY.relief * world.attempts,
    Math.min(entry.ram, RETRY.floor),
  );
  hero.energy = Math.max(entry.energy, QUERY_ENERGY.start);
  hero.subweapons = [...entry.subweapons];
  hero.subweapon = entry.subweapon;
  hero.firewall = entry.firewall;
  hero.readme = entry.readme;
  hero.index = 0;
  hero.cache = 0;
  enterRoom(world, world.rooms[checkpoint.room], checkpoint.cell);
  world.passage = 0;
  world.mode = "playing";
}

export function toggleSound(world: World): void {
  world.muted = !world.muted;
  announce(world, world.muted ? "soundOff" : "soundOn");
}

function cloudReady(hero: Hero): boolean {
  return hero.cloud === 0 && hero.cloudCooldown === 0;
}

function currentNotice(world: World): Notice | null {
  return world.noticeFrames > 0 ? world.notice : null;
}

function seconds(frames: number): number {
  return Math.ceil(Math.round(framesToMs(frames)) / 1000);
}

function boostsOf(hero: Hero): BoostHud {
  return {
    firewall: hero.firewall > 0,
    index: seconds(hero.index),
    cache: seconds(hero.cache),
    readme: hero.readme,
  };
}

function boostsMatch(shown: BoostHud, hero: Hero): boolean {
  return (
    shown.firewall === hero.firewall > 0 &&
    shown.index === seconds(hero.index) &&
    shown.cache === seconds(hero.cache) &&
    shown.readme === hero.readme
  );
}

function shownBoss(world: World): Boss | null {
  const { boss } = world.room;
  return boss && isFighting(boss) ? boss : null;
}

export function hudOf(world: World): Hud {
  const { hero } = world;
  const boss = shownBoss(world);
  return {
    mode: world.mode,
    room: world.room.index,
    slot: summarize(
      world.rooms.map((room) => room.slot),
      world.room.index,
    ),
    ram: Math.round(hero.ram),
    energy: hero.energy,
    subweapon: activeSubweapon(hero),
    cloudReady: cloudReady(hero),
    notice: currentNotice(world),
    notices: world.notices,
    boss: boss && { kind: boss.kind, health: boss.health },
    card: boss !== null && showsCard(boss),
    speech: boss && bossLine(boss),
    said: boss ? linesSaid(boss) : 0,
    boosts: boostsOf(hero),
    muted: world.muted,
  };
}

function bossMatches(shown: BossHud | null, boss: Boss | null): boolean {
  if (shown === null || boss === null) {
    return shown === null && boss === null;
  }
  return shown.kind === boss.kind && shown.health === boss.health;
}

export function hudMatches(hud: Hud, world: World): boolean {
  const { hero } = world;
  const boss = shownBoss(world);
  return (
    hud.mode === world.mode &&
    hud.room === world.room.index &&
    hud.ram === Math.round(hero.ram) &&
    hud.energy === hero.energy &&
    hud.subweapon === activeSubweapon(hero) &&
    hud.cloudReady === cloudReady(hero) &&
    hud.notice === currentNotice(world) &&
    hud.notices === world.notices &&
    hud.muted === world.muted &&
    boostsMatch(hud.boosts, hero) &&
    bossMatches(hud.boss, boss) &&
    hud.card === (boss !== null && showsCard(boss)) &&
    hud.speech === (boss && bossLine(boss)) &&
    hud.said === (boss ? linesSaid(boss) : 0)
  );
}
