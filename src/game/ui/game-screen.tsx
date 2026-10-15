"use client";

import { type CSSProperties, useEffect, useId, useRef, useState } from "react";
import { useLanguage } from "@/components/locale/language-context";
import { prefersReducedMotion } from "@/components/preferences/preferences-runtime";
import { formatElapsed } from "@/content/format";
import {
  BACKUP,
  CACHE,
  INDEX,
  QUERY_ENERGY,
  RAM,
  README,
  SUBWEAPONS,
} from "../balance";
import { VIEW_HEIGHT, VIEW_WIDTH } from "../core/camera";
import { framesToMs } from "../core/clock";
import type { Mode } from "../core/world";
import { CAMPAIGN, summarize } from "../levels/campaign";
import { GAME_TITLE } from "../title";
import { Hud } from "./hud";
import { CrashPanel, PausePanel, TitlePanel, VictoryPanel } from "./panels";
import { type Anchor, type Game, type GameHud, createGame } from "./runtime";
import { GAME_TEXTS, type GameTexts, arrivalText, fill } from "./texts";
import styles from "./game.module.css";

const WAITING_HUD: GameHud = {
  mode: "title",
  room: 0,
  slot: summarize(CAMPAIGN, 0),
  ram: RAM.start,
  energy: QUERY_ENERGY.start,
  subweapon: "select",
  cloudReady: true,
  notice: null,
  notices: 0,
  boss: null,
  card: false,
  speech: null,
  said: 0,
  boosts: { firewall: false, index: 0, cache: 0, readme: false },
  muted: false,
  playMs: 0,
  endedAt: null,
};

function seconds(frames: number): number {
  return Math.round(framesToMs(frames) / 1000);
}

const PLAY_MODES: ReadonlySet<Mode> = new Set(["intro", "playing"]);

function noticeText(hud: GameHud, text: GameTexts): string {
  switch (hud.notice) {
    case "truncate":
    case "drop":
      return fill(text.notices[hud.notice], {
        cost: SUBWEAPONS[hud.notice].cost,
      });
    case "index":
      return fill(text.notices.index, { seconds: seconds(INDEX.frames) });
    case "cache":
      return fill(text.notices.cache, { seconds: seconds(CACHE.frames) });
    case "backup":
      return fill(text.notices.backup, { relief: BACKUP.relief });
    case "readme":
      return fill(text.notices.readme, {
        percent: Math.round((1 - README.damageFactor) * 100),
      });
    case "switch":
      return fill(text.notices.switch, {
        name: text.subweapons[hud.subweapon],
      });
    case "arrival":
      return arrivalText(hud.slot, text);
    case null:
      return "";
    default:
      return text.notices[hud.notice];
  }
}

function announcementFor(hud: GameHud | null, text: GameTexts): string {
  if (hud?.notice === "soundOn" || hud?.notice === "soundOff") {
    return text.notices[hud.notice];
  }
  switch (hud?.mode) {
    case "title":
      return text.opened;
    case "paused":
      return text.paused;
    case "crash":
      return text.crash.announcement;
    case "victory":
      return text.victory.announcement.replace(
        "{time}",
        formatElapsed(hud.playMs),
      );
    case "playing":
      return noticeText(hud, text);
    default:
      return "";
  }
}

function placeSpeaker(stage: HTMLElement | null, anchor: Anchor): void {
  stage?.style.setProperty("--speaker-x", String(anchor.x / VIEW_WIDTH));
  stage?.style.setProperty("--speaker-y", String(anchor.y / VIEW_HEIGHT));
}

function BossCard({
  name,
  tagline,
}: Readonly<{ name: string; tagline: string }>) {
  return (
    <div className={styles.card} aria-hidden="true">
      <p className={styles.cardName}>{name}</p>
      <p className={styles.cardTagline}>{tagline}</p>
    </div>
  );
}

function Speech({ line, paused }: Readonly<{ line: string; paused: boolean }>) {
  return (
    <p
      className={styles.speech}
      data-paused={paused || undefined}
      style={{ "--length": [...line].length } as CSSProperties}
      aria-hidden="true"
    >
      <span className={styles.typed}>{line}</span>
    </p>
  );
}

function nextIndex(current: number, count: number, backwards: boolean) {
  if (current === -1) {
    return backwards ? count - 1 : 0;
  }
  return (current + (backwards ? count - 1 : 1)) % count;
}

function cycleFocus(event: KeyboardEvent, root: HTMLElement): void {
  if (event.key !== "Tab") {
    return;
  }
  event.preventDefault();
  const buttons = [
    ...root.querySelectorAll<HTMLButtonElement>("button:not([disabled])"),
  ];
  if (buttons.length === 0) {
    return;
  }
  const current = buttons.findIndex(
    (button) => button === document.activeElement,
  );
  buttons[nextIndex(current, buttons.length, event.shiftKey)].focus();
}

function fitStage(screen: HTMLElement, viewport: HTMLElement): void {
  const ratio = window.devicePixelRatio || 1;
  const available = Math.min(
    (viewport.clientWidth * ratio) / VIEW_WIDTH,
    (viewport.clientHeight * ratio) / VIEW_HEIGHT,
  );
  const scale = available >= 1 ? Math.floor(available) : available;
  screen.style.setProperty(
    "--stage-width",
    `${(VIEW_WIDTH * scale) / ratio}px`,
  );
  screen.style.setProperty(
    "--stage-height",
    `${(VIEW_HEIGHT * scale) / ratio}px`,
  );
}

export default function GameScreen({
  onExit,
}: Readonly<{ onExit: () => void }>) {
  const { locale } = useLanguage();
  const text = GAME_TEXTS[locale];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const gameRef = useRef<Game | null>(null);
  const exitRef = useRef(onExit);
  const [hud, setHud] = useState<GameHud | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const shown = hud ?? WAITING_HUD;
  const playing = PLAY_MODES.has(shown.mode);

  useEffect(() => {
    exitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const game = createGame(canvas, {
      reducedMotion: prefersReducedMotion(),
      onHud: setHud,
      onAnchor: (anchor) => placeSpeaker(stageRef.current, anchor),
      onExit: () => exitRef.current(),
    });
    gameRef.current = game;
    game.start();
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    const screen = screenRef.current;
    const viewport = viewportRef.current;
    if (!screen || !viewport) {
      return;
    }
    const observer = new ResizeObserver(() => fitStage(screen, viewport));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const screen = screenRef.current;
    if (!screen) {
      return;
    }
    const trap = (event: KeyboardEvent) => cycleFocus(event, screen);
    screen.addEventListener("keydown", trap);
    return () => screen.removeEventListener("keydown", trap);
  }, []);

  useEffect(() => {
    const target = playing ? stageRef.current : actionRef.current;
    target?.focus({ preventScroll: true });
  }, [playing, shown.mode]);

  const panelProps = {
    text,
    actionRef,
    onAction: () => gameRef.current?.command("confirm"),
    onExit,
  };

  return (
    <div
      ref={screenRef}
      className={styles.screen}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <h2 id={titleId} className="visually-hidden">
        {GAME_TITLE}
      </h2>
      <p id={descriptionId} className="visually-hidden">
        {text.description}
      </p>
      <Hud
        hud={shown}
        text={text}
        locale={locale}
        hidden={shown.mode === "title" || shown.mode === "intro"}
      />
      <div ref={viewportRef} className={styles.viewport}>
        <div
          ref={stageRef}
          className={styles.stage}
          role="application"
          aria-label={GAME_TITLE}
          tabIndex={-1}
        >
          <canvas
            ref={canvasRef}
            width={VIEW_WIDTH}
            height={VIEW_HEIGHT}
            className={styles.canvas}
            aria-hidden="true"
          />
          {shown.card && shown.boss && (
            <BossCard
              name={text.bosses[shown.boss.kind]}
              tagline={text.taglines[shown.boss.kind]}
            />
          )}
          {shown.speech && (
            <Speech
              key={shown.said}
              line={text.vibe.lines[shown.speech]}
              paused={shown.mode !== "playing"}
            />
          )}
          {shown.mode === "title" && (
            <TitlePanel {...panelProps} muted={shown.muted} />
          )}
          {shown.mode === "paused" && <PausePanel {...panelProps} />}
          {shown.mode === "crash" && shown.endedAt !== null && (
            <CrashPanel
              {...panelProps}
              playMs={shown.playMs}
              endedAt={shown.endedAt}
            />
          )}
          {shown.mode === "victory" && shown.endedAt !== null && (
            <VictoryPanel
              {...panelProps}
              playMs={shown.playMs}
              endedAt={shown.endedAt}
            />
          )}
          {shown.mode === "intro" && <p className={styles.skip}>{text.skip}</p>}
          {shown.mode === "playing" &&
            shown.notice &&
            shown.notice !== "arrival" && (
              <p className={styles.notice} aria-hidden="true">
                {noticeText(shown, text)}
              </p>
            )}
        </div>
      </div>
      <p className="visually-hidden" aria-live="polite">
        {announcementFor(hud, text)}
      </p>
    </div>
  );
}
