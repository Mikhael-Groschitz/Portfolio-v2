import type { RefObject } from "react";
import { SuccessIcon, WarningIcon } from "@/components/icons";
import { formatCompletionTime, formatElapsed } from "@/content/format";
import { formatRankingTime } from "@/ranking/format";
import { BOSS_KINDS } from "../entities/boss";
import { TITLE_COMMANDS, commandLines } from "./command-sheet";
import type { GameTexts } from "./texts";
import { toRankingMs } from "./victory-flow";
import styles from "./game.module.css";

interface PanelProps {
  text: GameTexts;
  actionRef: RefObject<HTMLButtonElement | null>;
  onAction: () => void;
  onExit: () => void;
}

function Actions({
  text,
  actionRef,
  onAction,
  onExit,
  action,
  actionKey,
}: Readonly<PanelProps & { action: string; actionKey: string }>) {
  return (
    <div className={styles.actions}>
      <button
        ref={actionRef}
        type="button"
        className={styles.primary}
        onClick={onAction}
      >
        <kbd className={styles.key}>{actionKey}</kbd> {action}
      </button>
      <button type="button" className={styles.secondary} onClick={onExit}>
        <kbd className={styles.key}>Esc</kbd> {text.exit}
      </button>
    </div>
  );
}

export function TitlePanel({
  muted,
  ...props
}: Readonly<PanelProps & { muted: boolean }>) {
  const { text } = props;
  const sound = text.hud;
  return (
    <div className={`${styles.panel} ${styles.titlePanel}`}>
      <p className={styles.prompt}>{text.prompt}</p>
      <p className={styles.tip}>{text.tip}</p>
      <dl className={styles.controls} aria-label={text.controlsLabel}>
        {commandLines(text, TITLE_COMMANDS).map(({ id, keys, action }) => (
          <div key={id} className={styles.control}>
            <dt>
              <kbd className={styles.key}>{keys}</kbd>
            </dt>
            <dd>{action}</dd>
          </div>
        ))}
        <div className={styles.control}>
          <dt>
            <kbd className={styles.key}>M</kbd>
          </dt>
          <dd>
            {sound.sound}: {muted ? sound.soundOff : sound.soundOn}
          </dd>
        </div>
      </dl>
      <Actions {...props} action={text.start} actionKey="Enter" />
    </div>
  );
}

export function PausePanel(props: Readonly<PanelProps>) {
  const { text } = props;
  return (
    <div className={styles.panel}>
      <p className={styles.panelTitle}>{text.paused}</p>
      <Actions {...props} action={text.resume} actionKey="P" />
    </div>
  );
}

export function CrashPanel({
  playMs,
  endedAt,
  ...props
}: Readonly<PanelProps & { playMs: number; endedAt: number }>) {
  const { crash } = props.text;
  return (
    <div className={`${styles.panel} ${styles.crashPanel}`}>
      <div className={styles.messages}>
        <p className={styles.error}>
          {crash.header}
          <br />
          {crash.message}
        </p>
        <p>{crash.advice}</p>
        <p>
          {crash.completionTime}: {formatCompletionTime(new Date(endedAt))}
        </p>
      </div>
      <div className={styles.statusBar}>
        <WarningIcon />
        <span>{crash.status}</span>
        <span className={styles.elapsed}>{formatElapsed(playMs)}</span>
      </div>
      <Actions {...props} action={props.text.retry} actionKey="R" />
    </div>
  );
}

export function VictoryPanel({
  playMs,
  endedAt,
  result,
  text,
  actionRef,
  onExit,
}: Readonly<
  PanelProps & { playMs: number; endedAt: number; result: string | null }
>) {
  const { victory } = text;
  return (
    <div className={`${styles.panel} ${styles.crashPanel}`}>
      <div className={styles.messages}>
        <dl className={styles.defeated}>
          {BOSS_KINDS.map((kind) => (
            <div key={kind} className={styles.defeatedRow}>
              <dt>{text.bosses[kind]}</dt>
              <dd>{victory.bosses[kind]}</dd>
            </div>
          ))}
        </dl>
        <p>{victory.rows}</p>
        <p>{victory.message}</p>
        <p>
          {victory.playTime}: {formatRankingTime(toRankingMs(playMs))}
        </p>
        {result && <p>{result}</p>}
        <p>
          {victory.completionTime}: {formatCompletionTime(new Date(endedAt))}
        </p>
      </div>
      <div className={styles.statusBar}>
        <SuccessIcon />
        <span>{victory.status}</span>
        <span className={styles.elapsed}>{formatElapsed(playMs)}</span>
      </div>
      <div className={styles.actions}>
        <button
          ref={actionRef}
          type="button"
          className={styles.primary}
          onClick={onExit}
        >
          <kbd className={styles.key}>Enter</kbd> {text.exit}
        </button>
      </div>
      <p className={styles.credit}>{victory.credit}</p>
    </div>
  );
}
