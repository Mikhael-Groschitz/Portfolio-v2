export const CUES = [
  "whip",
  "cloud",
  "select",
  "join",
  "truncate",
  "hit",
  "smash",
  "break",
  "collect",
  "relief",
  "relic",
  "hurt",
  "door",
  "bossHit",
  "bossDown",
  "slash",
  "mark",
  "sweep",
  "card",
  "vanish",
  "appear",
  "landing",
  "call",
  "rollback",
  "commit",
  "drop",
  "rise",
  "sink",
  "clank",
  "windup",
  "axe",
  "block",
  "boost",
  "typing",
  "paste",
  "shield",
  "pop",
  "deploy",
  "buzz",
  "costume",
] as const;

export type Cue = (typeof CUES)[number];

export type Cues = Record<Cue, number>;

export function createCues(): Cues {
  return Object.fromEntries(CUES.map((name) => [name, 0])) as Cues;
}

export function cue(holder: { cues: Cues }, name: Cue): void {
  holder.cues[name] += 1;
}
