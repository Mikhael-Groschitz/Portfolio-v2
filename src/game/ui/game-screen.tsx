"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLanguage } from "@/components/locale/language-context";
import { prefersReducedMotion } from "@/components/preferences/preferences-runtime";
import { formatElapsed } from "@/content/format";
import { QUERY_ENERGY, RAM, SUBWEAPONS } from "../balance";
import { VIEW_HEIGHT, VIEW_WIDTH } from "../core/camera";
import type { Mode } from "../core/world";
import { GAME_TITLE } from "../title";
import { Hud } from "./hud";
import { CrashPanel, PausePanel, TitlePanel, VictoryPanel } from "./panels";
import { type Game, type GameHud, createGame } from "./runtime";
import { GAME_TEXTS, type GameTexts } from "./texts";
import styles from "./game.module.css";

const WAITING_HUD: GameHud = {
  mode: "title",
  ram: RAM.start,
  energy: QUERY_ENERGY.start,
  subweapon: "select",
  cloudReady: true,
  notice: null,
  notices: 0,
  boss: null,
  muted: false,
  playMs: 0,
  endedAt: null,
};

const PLAY_MODES: ReadonlySet<Mode> = new Set(["intro", "playing"]);

function noticeText(hud: GameHud, text: GameTexts): string {
  switch (hud.notice) {
    case "join":
      return text.notices.join;
    case "truncate":
      return text.notices.truncate.replace(
        "{cost}",
        String(SUBWEAPONS.truncate.cost),
      );
    case "switch":
      return text.notices.switch.replace(
        "{name}",
        text.subweapons[hud.subweapon],
      );
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
          {shown.mode === "playing" && shown.notice && (
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
