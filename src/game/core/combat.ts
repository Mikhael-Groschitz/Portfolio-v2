import { DAMAGE, SUBWEAPONS, WHIP } from "../balance";
import { isVulnerable, touchDamage } from "../entities/boss";
import { type Collector, laneBox, slashBox } from "../entities/collector";
import {
  ENEMY_TRAITS,
  type Enemy,
  centerX,
  damageEnemy,
  isTangible,
} from "../entities/enemy";
import {
  type Controls,
  type Hero,
  activeSubweapon,
  cycleSubweapon,
  grantSubweapon,
  handY,
  hurtHero,
  lashBox,
  startCast,
} from "../entities/hero";
import {
  type Container,
  type ContainerKind,
  type DropKind,
  applyDrop,
  dropFor,
  lootFor,
  spawnDrop,
} from "../entities/items";
import { burningBeam } from "../entities/mechanisms";
import { type Spark, burst } from "../entities/particles";
import {
  PROJECTILE_SIZE,
  type Projectile,
  countFlying,
  isFriendly,
  isHostile,
  isWhippable,
  launch,
} from "../entities/projectiles";
import { boostsOf } from "../levels/campaign";
import { clearHostileShots, hitBoss } from "./bosses";
import { VIEW_WIDTH } from "./camera";
import { type Box, overlaps } from "./collision";
import { type Cue, cue } from "./cues";
import { announce } from "./notices";
import { random } from "./random";
import type { Notice, World } from "./world";

export const SWEEP_FRAMES = 24;

const LASH: Box = { x: 0, y: 0, width: 0, height: 0 };
const ATTACK: Box = { x: 0, y: 0, width: 0, height: 0 };
const IMPACT_SPARKS = 6;
const DEFEAT_SPARKS = 14;
const SHIELD_SPARKS = 10;

const SHOT_DAMAGE: Readonly<Record<Projectile["kind"], number>> = {
  select: SUBWEAPONS.select.damage,
  join: SUBWEAPONS.join.damage,
  drop: SUBWEAPONS.drop.damage,
  glyph: DAMAGE.glyph,
  beam: DAMAGE.logBeam,
  card: DAMAGE.card,
  dropAxe: DAMAGE.dropAxe,
  code: DAMAGE.codeBlock,
  hallucination: 0,
  wave: DAMAGE.wave,
  bug: DAMAGE.bug,
};

const THROW_LIFT: Readonly<Record<"select" | "join" | "drop", number>> = {
  select: 0,
  join: SUBWEAPONS.join.lift,
  drop: SUBWEAPONS.drop.lift,
};

const CONTAINER_SPARKS: Readonly<Record<ContainerKind, Spark>> = {
  disk: "plastic",
  pen: "glass",
  tape: "metal",
};

const PICKUP_FEEDBACK: Readonly<
  Record<DropKind, { cue: Cue; notice?: Notice }>
> = {
  energy: { cue: "collect" },
  bigEnergy: { cue: "collect" },
  gc: { cue: "relief" },
  firewall: { cue: "boost", notice: "firewall" },
  index: { cue: "boost", notice: "index" },
  cache: { cue: "boost", notice: "cache" },
  backup: { cue: "relief", notice: "backup" },
  readme: { cue: "relic", notice: "readme" },
};

function breakContainer(world: World, container: Container): void {
  const x = container.x + container.width / 2;
  const y = container.y + container.height / 2;
  container.broken = true;
  cue(world, "break");
  burst(world.particles, world, CONTAINER_SPARKS[container.kind], x, y, 10);
  spawnDrop(
    world.drops,
    dropFor(container.kind, random(world), boostsOf(world.room.slot)),
    x,
    y,
  );
}

function hitEnemy(
  world: World,
  enemy: Enemy,
  damage: number,
  fromX: number,
): void {
  const traits = ENEMY_TRAITS[enemy.kind];
  const x = centerX(enemy);
  const y = enemy.y + enemy.height / 2;
  burst(world.particles, world, "impact", x, y, IMPACT_SPARKS);
  if (!damageEnemy(enemy, damage, fromX)) {
    cue(world, traits.hit);
    return;
  }
  cue(world, traits.defeat);
  burst(world.particles, world, traits.spark, x, y, DEFEAT_SPARKS);
  const loot = lootFor(traits.loot, random(world), boostsOf(world.room.slot));
  if (loot) {
    spawnDrop(world.drops, loot, x, y);
  }
}

function strikeBoss(world: World): void {
  const { boss } = world.room;
  const { lashes } = world.hero;
  if (
    boss &&
    isVulnerable(boss) &&
    boss.struck !== lashes &&
    overlaps(LASH, boss)
  ) {
    boss.struck = lashes;
    hitBoss(world, boss, WHIP.damage);
  }
}

function strike(world: World): void {
  const { hero, room } = world;
  if (!lashBox(hero, LASH)) {
    return;
  }
  for (const enemy of room.enemies) {
    if (
      isTangible(enemy) &&
      enemy.struck !== hero.lashes &&
      overlaps(LASH, enemy)
    ) {
      enemy.struck = hero.lashes;
      hitEnemy(world, enemy, WHIP.damage, centerX(hero));
    }
  }
  strikeBoss(world);
  for (const container of room.containers) {
    if (!container.broken && overlaps(LASH, container)) {
      breakContainer(world, container);
    }
  }
  for (const projectile of world.projectiles) {
    if (
      projectile.active &&
      isWhippable(projectile) &&
      overlaps(LASH, projectile)
    ) {
      projectile.active = false;
      burst(world.particles, world, "data", projectile.x, projectile.y, 4);
    }
  }
}

function shootBoss(world: World, projectile: Projectile): boolean {
  const { boss } = world.room;
  if (
    !boss ||
    !isVulnerable(boss) ||
    boss.hitToken === projectile.token ||
    !overlaps(projectile, boss)
  ) {
    return false;
  }
  boss.hitToken = projectile.token;
  hitBoss(world, boss, SHOT_DAMAGE[projectile.kind]);
  return true;
}

function shoot(world: World, projectile: Projectile): void {
  const stops = projectile.kind === "select";
  for (const enemy of world.room.enemies) {
    if (
      isTangible(enemy) &&
      enemy.hitToken !== projectile.token &&
      overlaps(projectile, enemy)
    ) {
      enemy.hitToken = projectile.token;
      hitEnemy(world, enemy, SHOT_DAMAGE[projectile.kind], centerX(projectile));
      if (stops) {
        projectile.active = false;
        return;
      }
    }
  }
  if (shootBoss(world, projectile) && stops) {
    projectile.active = false;
    return;
  }
  for (const container of world.room.containers) {
    if (!container.broken && overlaps(projectile, container)) {
      breakContainer(world, container);
      if (stops) {
        projectile.active = false;
        return;
      }
    }
  }
}

function hurt(world: World, amount: number, fromX: number): void {
  const { hero } = world;
  const result = hurtHero(hero, amount, fromX);
  if (result === "hurt") {
    cue(world, "hurt");
  } else if (result === "blocked") {
    cue(world, "block");
    burst(
      world.particles,
      world,
      "shield",
      centerX(hero),
      hero.y + hero.height / 2,
      SHIELD_SPARKS,
    );
  }
}

function inSweptLane(boss: Collector, hero: Hero): boolean {
  if (boss.state !== "sweep") {
    return false;
  }
  for (let lane = 0; lane < boss.lanes.length; lane++) {
    laneBox(boss, lane, ATTACK);
    if (boss.lanes[lane] && overlaps(hero, ATTACK)) {
      return true;
    }
  }
  return false;
}

function harmByBoss(world: World): void {
  const { hero } = world;
  const { boss } = world.room;
  if (!boss) {
    return;
  }
  if (isVulnerable(boss) && overlaps(hero, boss)) {
    hurt(world, touchDamage(boss), centerX(boss));
  } else if (
    boss.kind === "collector" &&
    slashBox(boss, ATTACK) &&
    overlaps(hero, ATTACK)
  ) {
    hurt(world, DAMAGE.deleteSlash, centerX(boss));
  } else if (boss.kind === "collector" && inSweptLane(boss, hero)) {
    hurt(world, DAMAGE.markSweep, centerX(ATTACK));
  }
}

function harm(world: World): void {
  const { hero } = world;
  if (hero.invulnerable > 0) {
    return;
  }
  for (const enemy of world.room.enemies) {
    if (isTangible(enemy) && overlaps(hero, enemy)) {
      hurt(world, ENEMY_TRAITS[enemy.kind].touch, centerX(enemy));
      return;
    }
  }
  for (const projectile of world.projectiles) {
    if (
      projectile.active &&
      isHostile(projectile) &&
      overlaps(hero, projectile)
    ) {
      projectile.active = false;
      hurt(world, SHOT_DAMAGE[projectile.kind], centerX(projectile));
      return;
    }
  }
  const beam = burningBeam(world.room.mechanisms, hero);
  if (beam) {
    hurt(world, DAMAGE.testBeam, centerX(beam));
    return;
  }
  harmByBoss(world);
}

function collect(world: World, kind: DropKind): void {
  applyDrop(world.hero, kind);
  const feedback = PICKUP_FEEDBACK[kind];
  cue(world, feedback.cue);
  if (feedback.notice) {
    announce(world, feedback.notice);
  }
}

function gather(world: World): void {
  const { hero } = world;
  for (const drop of world.drops) {
    if (drop.active && overlaps(hero, drop)) {
      drop.active = false;
      collect(world, drop.kind);
    }
  }
  for (const pickup of world.room.pickups) {
    if (!pickup.taken && overlaps(hero, pickup)) {
      pickup.taken = true;
      collect(world, pickup.kind);
    }
  }
  for (const relic of world.room.relics) {
    if (!relic.taken && overlaps(hero, relic)) {
      relic.taken = true;
      grantSubweapon(hero, relic.kind);
      announce(world, relic.kind);
      cue(world, "relic");
    }
  }
}

export function resolveCombat(world: World): void {
  strike(world);
  for (const projectile of world.projectiles) {
    if (projectile.active && isFriendly(projectile)) {
      shoot(world, projectile);
    }
  }
  harm(world);
  gather(world);
}

function onScreen(world: World, box: Box): boolean {
  const left = world.camera.x;
  return box.x + box.width > left && box.x < left + VIEW_WIDTH;
}

function truncate(world: World): void {
  clearHostileShots(world);
  const damage = SUBWEAPONS.truncate.damage;
  for (const enemy of world.room.enemies) {
    if (isTangible(enemy) && onScreen(world, enemy)) {
      hitEnemy(world, enemy, damage, centerX(world.hero));
    }
  }
  const { boss } = world.room;
  if (boss && isVulnerable(boss) && onScreen(world, boss)) {
    hitBoss(world, boss, damage);
  }
  world.sweep = SWEEP_FRAMES;
}

function throwFromHand(world: World, kind: "select" | "join" | "drop"): void {
  const { hero } = world;
  const { width, height } = PROJECTILE_SIZE[kind];
  world.tokens += 1;
  launch(world.projectiles, {
    kind,
    x: hero.facing > 0 ? hero.x + hero.width : hero.x - width,
    y: handY(hero) - height / 2,
    vx: hero.facing * SUBWEAPONS[kind].speed,
    vy: -THROW_LIFT[kind],
    facing: hero.facing,
    variant: 0,
    token: world.tokens,
  });
}

function inFlight(world: World, kind: keyof typeof SUBWEAPONS): number {
  return kind === "truncate"
    ? Number(world.sweep > 0)
    : countFlying(world.projectiles, kind);
}

export function fireSubweapon(world: World, controls: Controls): void {
  const { hero } = world;
  if (controls.switchPressed && cycleSubweapon(hero)) {
    announce(world, "switch");
  }
  if (
    !controls.subweaponPressed ||
    hero.stun > 0 ||
    hero.cloud > 0 ||
    hero.lash >= 0
  ) {
    return;
  }
  const kind = activeSubweapon(hero);
  const { cost, limit } = SUBWEAPONS[kind];
  if (hero.energy < cost || inFlight(world, kind) >= limit) {
    return;
  }
  hero.energy -= cost;
  startCast(hero);
  cue(world, kind);
  if (kind === "truncate") {
    truncate(world);
  } else {
    throwFromHand(world, kind);
  }
}
