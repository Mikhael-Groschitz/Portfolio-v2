import { type Pooled, claim, createPool } from "../core/pool";
import { type Seeded, random } from "../core/random";

export type Spark =
  | "bone"
  | "plastic"
  | "glass"
  | "data"
  | "ember"
  | "impact"
  | "card"
  | "dirt"
  | "log"
  | "metal"
  | "shield";

export interface Particle extends Pooled {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  spark: Spark;
}

const POOL_SIZE = 96;
const FALL = 0.15;
const MIN_LIFE = 18;
const EXTRA_LIFE = 16;

export function createParticles(): Particle[] {
  return createPool(POOL_SIZE, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    spark: "data",
  }));
}

export function burst(
  particles: readonly Particle[],
  state: Seeded,
  spark: Spark,
  x: number,
  y: number,
  count: number,
): void {
  for (let index = 0; index < count; index++) {
    const particle = claim(particles);
    if (!particle) {
      return;
    }
    const angle = random(state) * Math.PI * 2;
    const speed = 0.5 + random(state) * 1.6;
    particle.x = x;
    particle.y = y;
    particle.vx = Math.cos(angle) * speed;
    particle.vy = Math.sin(angle) * speed - 1;
    particle.life = MIN_LIFE + Math.floor(random(state) * EXTRA_LIFE);
    particle.spark = spark;
  }
}

export function updateParticles(particles: readonly Particle[]): void {
  for (const particle of particles) {
    if (!particle.active) {
      continue;
    }
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += FALL;
    particle.life -= 1;
    if (particle.life <= 0) {
      particle.active = false;
    }
  }
}
