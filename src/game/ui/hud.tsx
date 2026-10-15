import type { Locale } from "@/content/locales";
import type { BoostHud, BossHud } from "../core/world";
import { BOSS_HEALTH, type BossKind } from "../entities/boss";
import type { Subweapon } from "../entities/hero";
import { pixelPath } from "./pixel-path";
import type { GameHud } from "./runtime";
import { type GameTexts, fill, slotTitle } from "./texts";
import styles from "./game.module.css";

const RAM_WARNING = 50;
const RAM_CRITICAL = 80;
const FULL_UPTIME = 99.999;

const BOSS_METERS: Readonly<Record<BossKind, "heap" | "uptime" | null>> = {
  vibe: null,
  collector: "heap",
  legacy: "uptime",
};

const SUBWEAPON_ICONS: Readonly<Record<Subweapon, readonly string[]>> = {
  select: [
    "...X....",
    "...XX...",
    "XXXXXX..",
    "XXXXXXX.",
    "XXXXXX..",
    "...XX...",
    "...X....",
  ],
  join: [
    "X........X",
    "XX......XX",
    "XXX....XXX",
    "XXXX..XXXX",
    "XXXXXXXXXX",
    "XXXXXXXXXX",
    "XXXX..XXXX",
    "XXX....XXX",
    "XX......XX",
    "X........X",
  ],
  truncate: [
    "XXXXXXXXXX",
    "X.......XX",
    "XXXXXXXXXX",
    "X.....XX.X",
    "X....XX..X",
    "X...XX...X",
    "X..XX....X",
    "XXXXXXXXXX",
  ],
  drop: [
    "X.XXXX..",
    "XXX.X.X.",
    "XXXXXXXX",
    "XXX.X.XX",
    "XXXXXXXX",
    "XXX.X.X.",
    "X.XXXX..",
    "X.......",
    "X.......",
    "X.......",
  ],
};

const BOOST_ORDER = ["firewall", "index", "cache", "readme"] as const;

const BOOST_ICONS: Readonly<
  Record<(typeof BOOST_ORDER)[number], readonly string[]>
> = {
  firewall: [
    "....X.....",
    "...XXX....",
    "..XX.XX...",
    "..XXXXX...",
    "XXXXXXXXXX",
    "X...X....X",
    "XXXXXXXXXX",
    "X....X...X",
    "XXXXXXXXXX",
  ],
  index: [
    "...XXX...",
    "...X.X...",
    "...XXX...",
    "....X....",
    "..XXXXX..",
    "..X...X..",
    "XXX...XXX",
    "X.X...X.X",
    "XXX...XXX",
  ],
  cache: [
    ".....XXX",
    "....XXX.",
    "...XXX..",
    "..XXXXXX",
    "XXXXXXX.",
    "...XXX..",
    "..XXX...",
    ".XXX....",
    "XX......",
  ],
  readme: [
    "XXXXXX..",
    "X....XX.",
    "X.XX.XXX",
    "X......X",
    "X.XXXX.X",
    "X......X",
    "X.XXXX.X",
    "X......X",
    "XXXXXXXX",
  ],
};

const SOUND_ICONS = {
  on: [
    "....X.....",
    "...XX..X..",
    "XXXXX...X.",
    "XXXXX.X.X.",
    "XXXXX.X.X.",
    "XXXXX...X.",
    "...XX..X..",
    "....X.....",
  ],
  off: [
    "....X.....",
    "...XX.....",
    "XXXXX.X..X",
    "XXXXX..XX.",
    "XXXXX..XX.",
    "XXXXX.X..X",
    "...XX.....",
    "....X.....",
  ],
} as const;

const CLOUD_ICON = [
  "....XXX.....",
  "..XXXXXX.XX.",
  ".XXXXXXXXXXX",
  "XXXXXXXXXXXX",
  "XXXXXXXXXXXX",
  ".XXXXXXXXXX.",
];

function PixelIcon({
  mask,
  className,
}: Readonly<{ mask: readonly string[]; className: string }>) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${mask[0].length} ${mask.length}`}
      width={mask[0].length * 2}
      height={mask.length * 2}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path d={pixelPath(mask)} fill="currentColor" />
    </svg>
  );
}

function uptime(boss: BossHud, locale: Locale): string {
  const percent = (FULL_UPTIME * boss.health) / BOSS_HEALTH[boss.kind];
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(percent);
}

function BossMeter({
  boss,
  text,
  locale,
}: Readonly<{ boss: BossHud; text: GameTexts; locale: Locale }>) {
  const max = BOSS_HEALTH[boss.kind];
  const meter = BOSS_METERS[boss.kind];
  const name = (
    <span className={styles.bossName}>{text.bosses[boss.kind]}</span>
  );
  const value =
    meter === "uptime"
      ? `${uptime(boss, locale)}%`
      : `${Math.round((100 * boss.health) / max)}%`;
  return (
    <>
      {meter && name}
      <label className={styles.stat}>
        {meter ? text.hud[meter] : name}
        <meter
          className={`${styles.meter} ${styles.bossMeter}`}
          min={0}
          max={max}
          value={boss.health}
        />
        <span
          className={`${styles.value} ${styles.amount}`}
          data-meter={meter ?? undefined}
          aria-hidden="true"
        >
          {value}
        </span>
      </label>
    </>
  );
}

function Boosts({
  boosts,
  labels,
}: Readonly<{ boosts: BoostHud; labels: GameTexts["hud"] }>) {
  return BOOST_ORDER.filter((kind) => Boolean(boosts[kind])).map((kind) => {
    const time = boosts[kind];
    return (
      <span
        key={kind}
        className={styles.boost}
        data-boost={kind}
        title={labels[kind]}
      >
        <PixelIcon mask={BOOST_ICONS[kind]} className={styles.icon} />
        <span className="visually-hidden">{labels[kind]}</span>
        {typeof time === "number" && (
          <span className={`${styles.value} ${styles.amount}`}>
            {fill(labels.seconds, { seconds: time })}
          </span>
        )}
      </span>
    );
  });
}

function StatusRow({
  hud,
  text,
  locale,
}: Readonly<{ hud: GameHud; text: GameTexts; locale: Locale }>) {
  const { slot, boss } = hud;
  return (
    <div className={styles.statusRow}>
      {!boss && (
        <span
          className={slot.kind === "boss" ? styles.bossName : styles.location}
        >
          {slotTitle(slot, text)}
        </span>
      )}
      {!boss && slot.kind === "stage" && (
        <span className={styles.stageName}>{text.stages[slot.stage]}</span>
      )}
      <Boosts boosts={hud.boosts} labels={text.hud} />
      {boss && (
        <span className={styles.bossGroup}>
          <BossMeter boss={boss} text={text} locale={locale} />
        </span>
      )}
    </div>
  );
}

export function Hud({
  hud,
  text,
  locale,
  hidden,
}: Readonly<{
  hud: GameHud;
  text: GameTexts;
  locale: Locale;
  hidden: boolean;
}>) {
  const labels = text.hud;

  return (
    <div className={styles.hud} data-hidden={hidden || undefined}>
      <span className={styles.player}>{labels.player}</span>
      <label className={styles.stat}>
        {labels.ram}
        <meter
          className={styles.meter}
          min={0}
          max={100}
          low={RAM_WARNING}
          high={RAM_CRITICAL}
          optimum={0}
          value={hud.ram}
        />
        <span className={`${styles.value} ${styles.amount}`} aria-hidden="true">
          {hud.ram}%
        </span>
      </label>
      <span className={styles.stat}>
        {labels.energy}
        <span className={styles.subweapon} data-subweapon={hud.subweapon}>
          <span className={styles.slot}>
            <PixelIcon
              mask={SUBWEAPON_ICONS[hud.subweapon]}
              className={styles.icon}
            />
          </span>
          <span className={styles.subweaponName}>
            {text.subweapons[hud.subweapon]}
          </span>
        </span>
        <span className={styles.value}>
          {String(hud.energy).padStart(2, "0")}
        </span>
      </span>
      <span className={styles.stat}>
        <PixelIcon
          mask={CLOUD_ICON}
          className={hud.cloudReady ? styles.cloud : styles.cloudCharging}
        />
        {labels.cloud}
        <span className="visually-hidden">
          {hud.cloudReady ? labels.cloudReady : labels.cloudCharging}
        </span>
      </span>
      <span className={styles.hint}>
        <kbd className={styles.key}>M</kbd>
        <PixelIcon
          mask={hud.muted ? SOUND_ICONS.off : SOUND_ICONS.on}
          className={hud.muted ? styles.cloudCharging : styles.cloud}
        />
        {labels.sound}
        <span className="visually-hidden">
          : {hud.muted ? labels.soundOff : labels.soundOn}
        </span>
      </span>
      <span className={styles.hint}>
        <kbd className={styles.key}>P</kbd> {labels.pause}
      </span>
      <span className={styles.hint}>
        <kbd className={styles.key}>Esc</kbd> {labels.exit}
      </span>
      <StatusRow hud={hud} text={text} locale={locale} />
    </div>
  );
}
