"use client";

import { type AnimationEvent, useEffect } from "react";
import { LocaleText } from "@/components/locale/locale-text";
import type { Localized } from "@/content/locales";
import { useEasterEggs } from "./easter-egg-context";
import { endLanding, useLanding } from "./landing-store";
import { Tardis } from "./tardis";
import styles from "./easter-eggs.module.css";

const LANDING_LIMIT_MS = 4000;

interface TimeTravelOverlayProps {
  text: Localized;
  arrivalText: Localized;
}

function Landing({ text }: Readonly<{ text: Localized }>) {
  useEffect(() => {
    const timer = window.setTimeout(endLanding, LANDING_LIMIT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      endLanding();
    }
  }

  return (
    <div
      className={`${styles.overlay} ${styles.landing}`}
      data-time-travel="arrive"
      aria-hidden="true"
      onAnimationEnd={handleAnimationEnd}
    >
      <div className={styles.cabin}>
        <Tardis size={176} phase="arrive" />
      </div>
      <p className={styles.caption}>
        <LocaleText text={text} />
      </p>
    </div>
  );
}

export function TimeTravelOverlay({
  text,
  arrivalText,
}: Readonly<TimeTravelOverlayProps>) {
  const { traveling } = useEasterEggs();
  const landing = useLanding();
  if (traveling) {
    return (
      <div className={styles.overlay} data-time-travel="" aria-hidden="true">
        <div className={styles.cabin}>
          <Tardis size={176} phase="depart" />
        </div>
        <p className={styles.caption}>
          <LocaleText text={text} />
        </p>
      </div>
    );
  }
  return landing ? <Landing text={arrivalText} /> : null;
}
