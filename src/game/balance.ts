export const MOVEMENT = {
  walkSpeed: 1.5,
  jumpSpeed: 5.8,
  jumpCutSpeed: 2,
  gravity: 0.3,
  maxFallSpeed: 6,
  coyoteFrames: 6,
  jumpBufferFrames: 6,
  crouchHeight: 18,
  dropThroughFrames: 10,
} as const;

export const CLOUD = {
  frames: 90,
  cooldownFrames: 120,
  speed: 1.8,
  fallSpeed: 0.45,
} as const;

export const WHIP = {
  windupFrames: 8,
  activeFrames: 8,
  recoverFrames: 10,
  reach: 34,
  damage: 1,
} as const;

export const RAM = {
  start: 20,
  crash: 100,
  entryCeiling: 50,
  devOverload: 20,
} as const;

export const RETRY = { relief: 10, floor: 20 } as const;

export const RANKING = {
  size: 10,
  nameLength: 3,
  minTimeMs: 120_000,
  maxTimeMs: 5_999_990,
  tokenTtlMs: 7_200_000,
  clockToleranceMs: 2_000,
  submitLimit: 5,
  submitWindowMs: 3_600_000,
} as const;

export const HURT = {
  invulnerableFrames: 60,
  stunFrames: 18,
  knockbackSpeed: 1.6,
  knockbackLift: 2.6,
} as const;

export const DAMAGE = {
  syntaxError: 8,
  glyph: 6,
  watchdog: 8,
  logBeam: 10,
  collector: 8,
  deleteSlash: 12,
  markSweep: 10,
  legacy: 8,
  card: 6,
  dive: 14,
  vibe: 6,
  zombie: 5,
  dropKnight: 8,
  dropAxe: 10,
  codeBlock: 6,
  wave: 8,
  bug: 6,
  testBeam: 8,
} as const;

export const SYNTAX_ERROR = {
  health: 2,
  walkSpeed: 0.45,
  sight: 140,
  windupFrames: 32,
  cooldownFrames: 110,
  throwLift: 2.8,
  glyphGravity: 0.14,
  minThrowSpeed: 0.6,
  maxThrowSpeed: 2.6,
} as const;

export const WATCHDOG = {
  health: 2,
  driftSpeed: 0.5,
  climbSpeed: 0.4,
  bobHeight: 6,
  bobFrames: 120,
  sight: 150,
  keepAway: 72,
  chargeFrames: 45,
  cooldownFrames: 150,
  beamSpeed: 2.2,
  beamRange: 220,
} as const;

export const ZOMBIE = {
  health: 3,
  walkSpeed: 0.28,
  riseFrames: 40,
  riseStagger: 24,
  turnFrames: 50,
  zoneGap: 4,
  zoneMargin: 3,
  zoneHeight: 3,
  aliveCap: 4,
  perGrave: 2,
  regrowFrames: 90,
  energyChance: 0.35,
} as const;

export const DROP_KNIGHT = {
  health: 6,
  walkSpeed: 0.35,
  sight: 170,
  keepAway: 72,
  windupFrames: 40,
  throwFrames: 14,
  cooldownFrames: 100,
  knockback: 0.4,
  axeGravity: 0.16,
  lowAxe: { speed: 1.7, lift: 3 },
  highAxe: { speed: 1.1, lift: 5 },
  energyChance: 0.6,
  boostChance: 0.15,
  backupChance: 0.05,
} as const;

export const QUERY_ENERGY = {
  start: 5,
  max: 99,
  small: 2,
  large: 5,
} as const;

export const GC = {
  relief: 25,
  diskChance: 0.15,
  penChance: 0.3,
  enemyEnergyChance: 0.25,
} as const;

export const SUBWEAPONS = {
  select: { cost: 1, damage: 1, limit: 2, speed: 4, range: 200 },
  join: { cost: 2, damage: 1, limit: 1, speed: 3.6, turnFrames: 40, lift: 1.1 },
  truncate: { cost: 5, damage: 2, limit: 1 },
  drop: {
    cost: 3,
    damage: 2,
    limit: 2,
    speed: 1.6,
    lift: 5.2,
    gravity: 0.2,
    lifetime: 150,
  },
} as const;

export const SECTOR = {
  crackFrames: 36,
  fallFrames: 24,
  regrowFrames: 300,
} as const;

export const BELT = { speed: 0.9 } as const;

export const CRON = { phaseFrames: 180, overlapFrames: 24 } as const;

export const TEST_BEAM = {
  offFrames: 100,
  warnFrames: 50,
  onFrames: 70,
  staggerFrames: 40,
  width: 6,
} as const;

export const FIREWALL = { charges: 1 } as const;
export const INDEX = { frames: 600, reach: 48 } as const;
export const CACHE = { frames: 600, factor: 0.6 } as const;
export const BACKUP = { relief: 50 } as const;
export const README = { damageFactor: 0.8 } as const;
export const TAPE = { boostChance: 0.5 } as const;

export const VIBE = {
  health: 12,
  deployHealth: 4,
  introFrames: 120,
  walkFrames: 70,
  walkSpeed: 0.6,
  keepAway: 96,
  typeFrames: 45,
  blocks: 3,
  blockGap: 12,
  blockLift: 3.4,
  blockSpeeds: [1.1, 1.7, 2.3],
  blockGravity: 0.14,
  copyFrames: 50,
  copies: 2,
  copyHealth: 1,
  shieldFrames: 180,
  exposedFrames: 100,
  deployFrames: 90,
  slamFrames: 50,
  landFrames: 24,
  waveSpeed: 2,
  bugs: 3,
  bugSpread: 40,
  bugWarnFrames: 50,
  bugGravity: 0.25,
  bugsFrames: 110,
  lineFrames: 140,
  absorbFrames: 16,
  defeatFrames: 160,
  fleeFrames: 40,
  fleeSpeed: 2,
} as const;

export const COLLECTOR = {
  health: 18,
  introFrames: 90,
  hoverFrames: 70,
  hurriedHoverFrames: 45,
  hoverHeight: 44,
  driftSpeed: 0.8,
  keepAway: 72,
  bobHeight: 3,
  bobFrames: 90,
  windupFrames: 40,
  hurriedWindupFrames: 30,
  approachSpeed: 1.1,
  slashGap: 18,
  slashFrames: 12,
  slashReach: 50,
  slashHeight: 24,
  recoverFrames: 42,
  hurriedRecoverFrames: 30,
  climbSpeed: 1.4,
  markFrames: 66,
  sweepFrames: 24,
  sweepHeight: 32,
  laneTiles: 3,
  lanes: 2,
  hurriedLanes: 3,
  defeatFrames: 90,
} as const;

export const LEGACY = {
  health: 20,
  rollbackHealth: 10,
  introFrames: 120,
  throneFrames: 70,
  patchedThroneFrames: 45,
  volleys: 2,
  patchedVolleys: 3,
  cardsPerVolley: 3,
  cardGap: 22,
  volleyGap: 44,
  cardSpeed: 1.6,
  patchedCardSpeed: 2.1,
  cardRange: 320,
  callFrames: 40,
  calls: 1,
  patchedCalls: 2,
  vanishFrames: 24,
  hiddenFrames: 30,
  appearFrames: 24,
  aimFrames: 36,
  patchedAimFrames: 28,
  dives: 1,
  patchedDives: 2,
  diveHeight: 72,
  diveGravity: 0.45,
  maxDiveSpeed: 8,
  recoverFrames: 54,
  patchedRecoverFrames: 40,
  rollbackFrames: 150,
  commitFrames: 150,
} as const;

export const BOSS_HURT_FRAMES = 24;
export const BOSS_GLOW_FRAMES = 10;
export const QUAKE_FRAMES = 12;
export const PASSAGE_FRAMES = 36;

export const ENEMY_HURT_FRAMES = 12;
export const ENEMY_KNOCKBACK = 1.4;
export const ENEMY_DYING_FRAMES = 24;
export const CAST_FRAMES = 12;
