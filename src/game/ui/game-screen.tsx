"use client";

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useLanguage } from "@/components/locale/language-context";
import { prefersReducedMotion } from "@/components/preferences/preferences-runtime";
import { formatElapsed } from "@/content/format";
import { formatRankingTime } from "@/ranking/format";
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
import { commandLines } from "./command-sheet";
import { Hud } from "./hud";
import { type PanelLayout, panelLayout, sameLayout } from "./panel-layout";
import { NameEntry } from "./name-entry";
import { CrashPanel, PausePanel, TitlePanel, VictoryPanel } from "./panels";
import {
  type Ticket,
  loadRanking,
  startRun,
  submitRun,
} from "./ranking-client";
import type { RankingState } from "./ranking-view";
import { type Anchor, type Game, type GameHud, createGame } from "./runtime";
import { CommandsPanel, RankingPanel } from "./side-panels";
import { GAME_TEXTS, type GameTexts, arrivalText, fill } from "./texts";
import {
  type Finish,
  type Saved,
  afterSubmit,
  findSaved,
  finishAnnouncement,
  finishLine,
  placeName,
  planFinish,
  toRankingMs,
} from "./victory-flow";
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

interface Ending {
  finish: Finish;
  timeMs: number;
  confirming: boolean;
}

function announcementFor(
  hud: GameHud | null,
  text: GameTexts,
  ending: Ending | null,
): string {
  if (hud?.notice === "soundOn" || hud?.notice === "soundOff") {
    return text.notices[hud.notice];
  }
  if (hud?.mode === "victory" && ending) {
    if (ending.finish.kind === "entry") {
      return ending.confirming
        ? text.record.confirm
        : (finishAnnouncement(ending.finish, ending.timeMs, text) ?? "");
    }
    const line = finishAnnouncement(ending.finish, ending.timeMs, text);
    const victory = text.victory.announcement.replace(
      "{time}",
      formatElapsed(hud.playMs),
    );
    return line ? `${victory} ${line}` : victory;
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

function PanelToggles({
  text,
  open,
  placement,
  onToggle,
}: Readonly<{
  text: GameTexts;
  open: OpenPanel;
  placement: "below" | "beside";
  onToggle: (panel: Exclude<OpenPanel, null>) => void;
}>) {
  return (
    <div className={styles.panelToggles} data-placement={placement}>
      <button
        type="button"
        className={styles.secondary}
        aria-expanded={open === "ranking"}
        onClick={() => onToggle("ranking")}
      >
        <kbd className={styles.key}>
          {commandLines(text, ["ranking"])[0].keys}
        </kbd>{" "}
        {text.panels.ranking.title}
      </button>
      <button
        type="button"
        className={styles.secondary}
        aria-expanded={open === "commands"}
        onClick={() => onToggle("commands")}
      >
        {text.panels.commands.title}
      </button>
    </div>
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
    ...root.querySelectorAll<HTMLElement>(
      "button:not([disabled]), input, [data-scroll]",
    ),
  ];
  if (buttons.length === 0) {
    return;
  }
  const current = buttons.findIndex(
    (button) => button === document.activeElement,
  );
  buttons[nextIndex(current, buttons.length, event.shiftKey)].focus();
}

const NO_PANELS: PanelLayout = { mode: "narrow", buttons: "none" };

type OpenPanel = "ranking" | "commands" | null;

interface Victory {
  ticket: Ticket;
  timeMs: number;
}

const NO_TICKET: Ticket = { kind: "none" };
const OFF_TICKET: Ticket = { kind: "off" };

function fitStage(screen: HTMLElement, viewport: HTMLElement): PanelLayout {
  const ratio = window.devicePixelRatio || 1;
  const available = Math.min(
    (viewport.clientWidth * ratio) / VIEW_WIDTH,
    (viewport.clientHeight * ratio) / VIEW_HEIGHT,
  );
  const scale = available >= 1 ? Math.floor(available) : available;
  const stageWidth = (VIEW_WIDTH * scale) / ratio;
  const stageHeight = (VIEW_HEIGHT * scale) / ratio;
  screen.style.setProperty("--stage-width", `${stageWidth}px`);
  screen.style.setProperty("--stage-height", `${stageHeight}px`);
  const layout = panelLayout({
    viewportWidth: viewport.clientWidth,
    viewportHeight: viewport.clientHeight,
    stageWidth,
    stageHeight,
  });
  if (layout.mode === "wide") {
    screen.style.setProperty("--panel-width", `${layout.width}px`);
    screen.style.setProperty("--panel-gap", `${layout.gap}px`);
  }
  return layout;
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
  const closeRef = useRef<HTMLButtonElement>(null);
  const gameRef = useRef<Game | null>(null);
  const exitRef = useRef(onExit);
  const rankingKeyRef = useRef(() => {});
  const loadingRef = useRef<AbortController | null>(null);
  const runAbortRef = useRef<AbortController | null>(null);
  const ticketRef = useRef<Promise<Ticket> | null>(null);
  const modeRef = useRef<Mode>("title");
  const rankingRef = useRef<RankingState>({ kind: "loading" });
  const runRef = useRef<{
    begin: () => void;
    finish: (timeMs: number) => void;
  }>({ begin: () => {}, finish: () => {} });
  const escapeRef = useRef(() => {});
  const [hud, setHud] = useState<GameHud | null>(null);
  const [layout, setLayout] = useState<PanelLayout>(NO_PANELS);
  const [open, setOpen] = useState<OpenPanel>(null);
  const [ranking, setRanking] = useState<RankingState>({ kind: "loading" });
  const [victory, setVictory] = useState<Victory | null>(null);
  const [progress, setProgress] = useState<Finish | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [highlight, setHighlight] = useState<number | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const shown = hud ?? WAITING_HUD;
  const playing = PLAY_MODES.has(shown.mode);
  const collapsed = layout.mode !== "wide";
  const overlay = collapsed && !playing ? open : null;
  const finish =
    shown.mode === "victory" && victory
      ? (progress ?? planFinish(victory.ticket, ranking, victory.timeMs))
      : null;
  const entry = finish?.kind === "entry" ? finish : null;
  const entryOpen = entry !== null;

  const readRanking = useCallback(() => {
    loadingRef.current?.abort();
    const controller = new AbortController();
    loadingRef.current = controller;
    setRanking({ kind: "loading" });
    void loadRanking(fetch, controller.signal).then((state) => {
      if (!controller.signal.aborted) {
        setRanking(state);
      }
    });
  }, []);

  function apply(saved: Saved) {
    if (saved.entries) {
      setRanking({ kind: "ready", entries: saved.entries });
    }
    setHighlight(saved.highlight);
    setProgress(saved.finish);
    if (saved.finish.kind !== "entry") {
      setConfirming(false);
    }
  }

  function save(name: string) {
    if (!victory || victory.ticket.kind !== "token" || !entry) {
      return;
    }
    const { token } = victory.ticket;
    const { timeMs } = victory;
    const { position } = entry;
    const signal = runAbortRef.current?.signal;
    setProgress({ kind: "entry", position, saving: true, problem: null });
    void submitRun({ token, name, timeMs }, fetch, signal).then(
      async (outcome) => {
        const saved = afterSubmit(outcome, { name, timeMs, position });
        if (!saved.reload) {
          if (!signal?.aborted) {
            apply(saved);
          }
          return;
        }
        const state = await loadRanking(fetch, signal);
        if (signal?.aborted) {
          return;
        }
        apply(
          state.kind === "ready"
            ? findSaved(state.entries, name, timeMs)
            : {
                finish: { kind: "sent" },
                entries: null,
                highlight: null,
                reload: false,
              },
        );
      },
    );
  }

  function toggle(panel: Exclude<OpenPanel, null>) {
    const next = overlay === panel ? null : panel;
    if (next) {
      gameRef.current?.hold();
    }
    setOpen(next);
  }

  useEffect(() => {
    exitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    rankingKeyRef.current = () => {
      if (collapsed) {
        toggle("ranking");
      }
    };
    rankingRef.current = ranking;
    escapeRef.current = () => {
      if (confirming) {
        onExit();
      } else {
        setConfirming(true);
      }
    };
    runRef.current = {
      begin() {
        runAbortRef.current?.abort();
        const controller = new AbortController();
        runAbortRef.current = controller;
        ticketRef.current =
          rankingRef.current.kind === "off"
            ? Promise.resolve(OFF_TICKET)
            : startRun(fetch, controller.signal);
        setVictory(null);
        setProgress(null);
        setConfirming(false);
        setHighlight(null);
      },
      finish(timeMs) {
        const signal = runAbortRef.current?.signal;
        void (ticketRef.current ?? Promise.resolve(NO_TICKET)).then(
          (ticket) => {
            if (signal?.aborted) {
              return;
            }
            setVictory({ ticket, timeMs });
            if (
              ticket.kind === "token" &&
              rankingRef.current.kind === "error"
            ) {
              readRanking();
            }
          },
        );
      },
    };
  });

  useEffect(() => () => runAbortRef.current?.abort(), []);

  useEffect(() => {
    gameRef.current?.lock(entryOpen ? () => escapeRef.current() : null);
  }, [entryOpen]);

  useEffect(() => {
    const controller = new AbortController();
    loadingRef.current = controller;
    void loadRanking(fetch, controller.signal).then((state) => {
      if (!controller.signal.aborted) {
        setRanking(state);
      }
    });
    return () => loadingRef.current?.abort();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const game = createGame(canvas, {
      reducedMotion: prefersReducedMotion(),
      onHud: (next) => {
        setHud(next);
        const previous = modeRef.current;
        modeRef.current = next.mode;
        if (PLAY_MODES.has(next.mode)) {
          setOpen(null);
        }
        if (previous === "title" && next.mode !== "title") {
          runRef.current.begin();
        }
        if (next.mode === "victory" && previous !== "victory") {
          runRef.current.finish(toRankingMs(next.playMs));
        }
      },
      onAnchor: (anchor) => placeSpeaker(stageRef.current, anchor),
      onExit: () => exitRef.current(),
      onRanking: () => rankingKeyRef.current(),
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
    const observer = new ResizeObserver(() => {
      const next = fitStage(screen, viewport);
      setLayout((current) => (sameLayout(current, next) ? current : next));
    });
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
    if (entryOpen) {
      return;
    }
    const target = overlay
      ? closeRef.current
      : playing
        ? stageRef.current
        : actionRef.current;
    target?.focus({ preventScroll: true });
  }, [playing, shown.mode, overlay, entryOpen]);

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
        {layout.mode === "wide" && (
          <RankingPanel
            text={text}
            state={ranking}
            highlight={highlight}
            place="left"
            onRetry={readRanking}
          />
        )}
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
          {shown.mode === "title" && !overlay && (
            <TitlePanel {...panelProps} muted={shown.muted} />
          )}
          {shown.mode === "paused" && !overlay && (
            <PausePanel {...panelProps} />
          )}
          {shown.mode === "crash" && shown.endedAt !== null && !overlay && (
            <CrashPanel
              {...panelProps}
              playMs={shown.playMs}
              endedAt={shown.endedAt}
            />
          )}
          {shown.mode === "victory" &&
            shown.endedAt !== null &&
            !overlay &&
            !entry && (
              <VictoryPanel
                {...panelProps}
                playMs={shown.playMs}
                endedAt={shown.endedAt}
                result={
                  finish && victory
                    ? finishLine(finish, victory.timeMs, text)
                    : null
                }
              />
            )}
          {entry && victory && (
            <NameEntry
              text={text}
              place={placeName(entry.position, text)}
              time={formatRankingTime(victory.timeMs)}
              saving={entry.saving}
              problem={entry.problem}
              confirming={confirming}
              onSave={save}
              onIncomplete={() =>
                setProgress({ ...entry, saving: false, problem: "incomplete" })
              }
              onEscape={() => escapeRef.current()}
              onKeep={() => setConfirming(false)}
              onExit={onExit}
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
        {layout.mode === "wide" && (
          <CommandsPanel text={text} collapsed={false} place="right" />
        )}
        {collapsed && layout.mode !== "narrow" && !entryOpen ? (
          <PanelToggles
            text={text}
            open={overlay}
            placement="below"
            onToggle={toggle}
          />
        ) : null}
        {layout.mode === "narrow" &&
          layout.buttons === "beside" &&
          !entryOpen && (
            <PanelToggles
              text={text}
              open={overlay}
              placement="beside"
              onToggle={toggle}
            />
          )}
        {overlay === "ranking" && (
          <RankingPanel
            text={text}
            state={ranking}
            highlight={highlight}
            place="over"
            onRetry={readRanking}
            close={{
              label: text.panels.close,
              onClose: () => toggle("ranking"),
            }}
            closeRef={closeRef}
          />
        )}
        {overlay === "commands" && (
          <CommandsPanel
            text={text}
            collapsed
            place="over"
            close={{
              label: text.panels.close,
              onClose: () => toggle("commands"),
            }}
            closeRef={closeRef}
          />
        )}
      </div>
      <p className="visually-hidden" aria-live="polite">
        {announcementFor(
          hud,
          text,
          finish && victory
            ? { finish, timeMs: victory.timeMs, confirming }
            : null,
        )}
      </p>
    </div>
  );
}
