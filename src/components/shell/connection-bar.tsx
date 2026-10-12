"use client";

import type { ReactNode } from "react";
import { useConnectionStatus } from "@/components/connect/use-connection-status";
import {
  ConnectedIcon,
  DisconnectIcon,
  SpinnerIcon,
  SuccessIcon,
  WarningIcon,
} from "@/components/icons";
import { ProfileText } from "@/components/connect/profile-text";
import { useEasterEggs } from "@/components/easter-eggs/easter-egg-context";
import { TardisBadge } from "@/components/easter-eggs/tardis";
import { LocaleText } from "@/components/locale/locale-text";
import { formatCount, formatElapsed } from "@/content/format";
import { type Localized, mapLocalized } from "@/content/locales";
import { byProfile } from "@/content/profiles";
import type { ConnectionText } from "@/content/types";
import { DATABASE, SERVER, V1_DATABASE } from "@/engine/catalog";
import { rowCountOf } from "@/engine/execute";
import { useWorkspace } from "./workspace-context";
import { type Run, isProvisional } from "./workspace-state";
import styles from "./bars.module.css";

type StatusKey =
  | "connected"
  | "disconnected"
  | "executing"
  | "succeeded"
  | "failed"
  | "canceled"
  | "traveling";

const STATUS_ICONS: Record<StatusKey, ReactNode> = {
  connected: <ConnectedIcon />,
  disconnected: <DisconnectIcon />,
  executing: <SpinnerIcon />,
  succeeded: <SuccessIcon />,
  failed: <WarningIcon />,
  canceled: <WarningIcon />,
  traveling: <TardisBadge />,
};

function statusOf(run: Run | null, online: boolean): StatusKey {
  if (!online) {
    return "disconnected";
  }
  if (!run || (run.status === "done" && run.origin === "connection")) {
    return "connected";
  }
  if (run.status === "executing" || run.status === "canceled") {
    return run.status;
  }
  return run.status === "error" ? "failed" : "succeeded";
}

function rowsOf(run: Run | null): number {
  return run?.status === "done" ? rowCountOf(run.outcomes["pt-BR"]) : 0;
}

function elapsedOf(run: Run | null): number {
  return run && run.status !== "executing" ? run.elapsedMs : 0;
}

function variantOf(traveling: boolean, online: boolean): string {
  if (traveling) {
    return styles.traveling;
  }
  return online ? "" : styles.disconnected;
}

export function ConnectionBar({
  text,
}: Readonly<{ text: Localized<ConnectionText> }>) {
  const { activeDocument, activeRun } = useWorkspace();
  const { traveling, boardTardis } = useEasterEggs();
  const connection = useConnectionStatus();
  const online = connection === "connected" || connection === "unknown";
  if (!online && activeDocument === null) {
    return null;
  }
  const shownRun = online || !isProvisional(activeRun) ? activeRun : null;
  const status = traveling ? "traveling" : statusOf(shownRun, online);
  const rows = rowsOf(shownRun);
  const elapsed = elapsedOf(shownRun);
  const rowsText = mapLocalized(text, (bar) => formatCount(bar.rows, rows));

  return (
    <div
      className={`${styles.connectionBar} ${variantOf(traveling, online)}`}
      data-standalone={activeDocument === null || undefined}
    >
      <span className={styles.connectionStatus}>
        {STATUS_ICONS[status]}
        <span role="status">
          <LocaleText text={mapLocalized(text, (bar) => bar[status])} />
          {status === "succeeded" && (
            <span className="visually-hidden">
              {" "}
              <LocaleText text={rowsText} />
            </span>
          )}
        </span>
      </span>
      <span className={`${styles.segment} ${styles.detail}`}>
        {`${SERVER.name} (${SERVER.version} RTM)`}
      </span>
      <span className={`${styles.segment} ${styles.detail}`}>
        <ProfileText
          text={byProfile((profile) =>
            mapLocalized(text, (bar) => bar.login[profile]),
          )}
        />
      </span>
      <span className={styles.segment}>
        {traveling ? V1_DATABASE : DATABASE}
      </span>
      <span className={styles.segment}>{formatElapsed(elapsed)}</span>
      <span className={styles.segment}>
        <LocaleText text={rowsText} />
      </span>
      <button type="button" className={styles.tardis} onClick={boardTardis}>
        <TardisBadge />
        <span className="visually-hidden">
          <LocaleText text={mapLocalized(text, (bar) => bar.timeTravel)} />
        </span>
      </button>
    </div>
  );
}
