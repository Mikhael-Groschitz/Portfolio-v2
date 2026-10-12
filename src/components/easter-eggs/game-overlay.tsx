"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useRef } from "react";
import { useMediaQuery } from "@/components/shell/use-media-query";
import type { GameOverlayText } from "@/content/types";
import { GAME_TITLE } from "@/game/title";
import { useEasterEggs } from "./easter-egg-context";
import styles from "./easter-eggs.module.css";

const GameScreen = dynamic(() => import("@/game/ui/game-screen"), {
  ssr: false,
  loading: () => null,
});

const COARSE_POINTER = "(hover: none) and (pointer: coarse)";
const FINE_POINTER = "(any-pointer: fine)";

function TouchNotice({
  text,
  onExit,
}: Readonly<{ text: GameOverlayText; onExit: () => void }>) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const messageId = useId();

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <div
      className={styles.notice}
      role="alertdialog"
      aria-modal="true"
      aria-describedby={messageId}
      aria-label={GAME_TITLE}
    >
      <p id={messageId}>{text.touchOnly}</p>
      <button
        ref={buttonRef}
        type="button"
        className={styles.noticeButton}
        onClick={onExit}
      >
        {text.exit}
      </button>
    </div>
  );
}

function GameLayer({
  text,
  onExit,
}: Readonly<{ text: GameOverlayText; onExit: () => void }>) {
  const coarse = useMediaQuery(COARSE_POINTER);
  const fine = useMediaQuery(FINE_POINTER);

  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    return () => {
      if (previous?.isConnected) {
        previous.focus();
      }
    };
  }, []);

  if (coarse && !fine) {
    return <TouchNotice text={text} onExit={onExit} />;
  }
  return (
    <>
      <p className={styles.loading} role="status">
        {text.loading}
      </p>
      <GameScreen onExit={onExit} />
    </>
  );
}

export function GameOverlay({ text }: Readonly<{ text: GameOverlayText }>) {
  const { playing, exitGame } = useEasterEggs();
  if (!playing) {
    return null;
  }
  return <GameLayer text={text} onExit={exitGame} />;
}
