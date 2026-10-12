import type { CSSProperties } from "react";
import styles from "./tardis.module.css";

type TardisPhase = "idle" | "depart" | "arrive";

const SIDES = ["front", "right", "back", "left"] as const;

type Side = (typeof SIDES)[number];

interface TardisProps {
  size: number;
  phase?: TardisPhase;
  className?: string;
}

function Face({ side }: Readonly<{ side: Side }>) {
  return (
    <svg
      viewBox="0 0 40 96"
      className={styles.face}
      data-side={side}
      aria-hidden="true"
      focusable="false"
    >
      <rect className={styles.body} width="40" height="96" />
      <path
        className={styles.shade}
        d="M0 0h4v96H0zM36 0h4v96h-4zM4 3h32v9H4zM4 92h32v4H4zM19.25 12h1.5v80h-1.5z"
      />
      <path className={styles.sign} d="M8 6.5h24v2.5H8z" />
      <path
        className={styles.glass}
        d="M7.5 15.5h4.6v6.8H7.5zm5.9 0H18v6.8h-4.6zm-5.9 8.1h4.6v6.8H7.5zm5.9 0H18v6.8h-4.6zM22 15.5h4.6v6.8H22zm5.9 0h4.6v6.8h-4.6zM22 23.6h4.6v6.8H22zm5.9 0h4.6v6.8h-4.6z"
      />
      <path
        className={styles.panel}
        d="M8 35h9.5v14H8zm14.5 0H32v14h-9.5zM8 54h9.5v14H8zm14.5 0H32v14h-9.5zM8 73h9.5v14H8zm14.5 0H32v14h-9.5z"
      />
    </svg>
  );
}

export function Tardis({
  size,
  phase = "idle",
  className,
}: Readonly<TardisProps>) {
  return (
    <span
      className={className ? `${styles.tardis} ${className}` : styles.tardis}
      style={{ "--tardis-size": `${size}px` } as CSSProperties}
      data-phase={phase}
      aria-hidden="true"
    >
      <span className={styles.model}>
        <span className={styles.spin}>
          <span className={styles.turn}>
            {SIDES.map((side) => (
              <Face key={side} side={side} />
            ))}
            <span className={styles.roof} />
            <span className={styles.lamp}>
              <span />
              <span />
            </span>
          </span>
        </span>
      </span>
    </span>
  );
}

export function TardisBadge() {
  return (
    <span className={styles.badge} aria-hidden="true">
      <span className={styles.badgeSpin}>
        <span className={styles.badgeTurn}>
          <svg
            viewBox="0 0 16 16"
            width="16"
            height="16"
            className={styles.badgeIcon}
            focusable="false"
          >
            <path className={styles.badgeLamp} d="M7.25.5h1.5V2h-1.5z" />
            <path
              fillRule="evenodd"
              d="M5 2h6l1 1.5H4zM4 3.5h8V5H4zm.75.45v.6h6.5v-.6zM4 5h8v9.5H4zm1 1v2h2.5V6zm3.5 0v2H11V6zM7.85 8.75v4.75h.3V8.75zM3.5 14.5h9v1h-9z"
            />
          </svg>
        </span>
      </span>
    </span>
  );
}
