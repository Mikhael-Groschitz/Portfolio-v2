import { ENEMY_DYING_FRAMES, QUAKE_FRAMES } from "../balance";
import {
  type Boss,
  type BossEvent,
  damageBoss,
  updateBoss,
} from "../entities/boss";
import { centerX } from "../entities/enemy";
import { spawnReward } from "../entities/items";
import { burst } from "../entities/particles";
import { isHostile } from "../entities/projectiles";
import { type Cue, cue } from "./cues";
import { announce } from "./notices";
import type { World } from "./world";

const IMPACT_SPARKS = 6;
const SHIELD_SPARKS = 8;

const STATE_CUES: Readonly<Partial<Record<Boss["state"], Cue>>> = {
  slash: "slash",
  mark: "mark",
  sweep: "sweep",
  vanish: "vanish",
  appear: "appear",
  call: "call",
  type: "typing",
  shield: "shield",
  exposed: "pop",
  deploy: "deploy",
  slam: "windup",
  bugs: "buzz",
};

export function clearHostileShots(world: World): void {
  for (const projectile of world.projectiles) {
    if (projectile.active && isHostile(projectile)) {
      projectile.active = false;
      burst(world.particles, world, "data", projectile.x, projectile.y, 3);
    }
  }
}

function dismissSummons(world: World): void {
  for (const enemy of world.room.enemies) {
    if (enemy.summoned && enemy.alive) {
      enemy.alive = false;
      enemy.dying = ENEMY_DYING_FRAMES;
    }
  }
}

function respond(world: World, boss: Boss, event: BossEvent | null): void {
  switch (event) {
    case "awake":
      announce(world, boss.kind);
      return;
    case "freed":
      spawnReward(world.drops, "gc", centerX(boss), boss.y + boss.height / 2);
      announce(world, "freed");
      return;
    case "rollback":
      clearHostileShots(world);
      spawnReward(world.drops, "gc", centerX(boss), boss.y + boss.height / 2);
      announce(world, "rollback");
      cue(world, "rollback");
      return;
    case "committed":
      clearHostileShots(world);
      dismissSummons(world);
      cue(world, "commit");
      return;
    case "landing":
      world.quake = QUAKE_FRAMES;
      cue(world, "landing");
      return;
    case "finished":
      world.mode = "victory";
      return;
    case "absorbed":
      cue(world, "block");
      burst(
        world.particles,
        world,
        "shield",
        centerX(boss),
        boss.y + boss.height / 2,
        SHIELD_SPARKS,
      );
      return;
    case "pasted":
      cue(world, "paste");
      return;
    case "unmasked":
      clearHostileShots(world);
      dismissSummons(world);
      spawnReward(
        world.drops,
        "readme",
        centerX(boss),
        boss.y + boss.height / 2,
      );
      announce(world, "unmasked");
      cue(world, "costume");
      return;
    case null:
      return;
  }
}

function thrownCards(boss: Boss): number {
  return boss.kind === "legacy" ? boss.thrown : 0;
}

export function moveBoss(world: World): void {
  const { boss } = world.room;
  if (!boss) {
    return;
  }
  const { state } = boss;
  const thrown = thrownCards(boss);
  respond(world, boss, updateBoss(boss, world));
  const sound = STATE_CUES[boss.state];
  if (boss.state !== state && sound) {
    cue(world, sound);
  }
  if (thrownCards(boss) > thrown) {
    cue(world, "card");
  }
}

export function hitBoss(world: World, boss: Boss, damage: number): void {
  const event = damageBoss(boss, damage);
  if (event !== "absorbed") {
    burst(
      world.particles,
      world,
      "impact",
      centerX(boss),
      boss.y + boss.height / 2,
      IMPACT_SPARKS,
    );
    cue(world, boss.state === "defeat" ? "bossDown" : "bossHit");
  }
  respond(world, boss, event);
}
