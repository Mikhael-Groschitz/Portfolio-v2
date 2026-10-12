"use client";

import { useId, useRef, useState } from "react";
import { REPOSITORY_URL } from "@/components/commands/site-links";
import { useConnecting } from "@/components/connect/connecting-store";
import {
  BellIcon,
  ChevronIcon,
  ReadyIcon,
  RepositoryIcon,
} from "@/components/icons";
import { useOutsidePointerDown } from "@/components/interaction";
import { useLanguage } from "@/components/locale/language-context";
import { getTexts } from "@/content";
import type { StatusText } from "@/content/types";
import { useWorkspace } from "./workspace-context";
import type { Run } from "./workspace-state";
import styles from "./bars.module.css";

type StatusKey =
  "ready" | "connecting" | "executing" | "succeeded" | "failed" | "canceled";

function statusOf(run: Run | null, connecting: boolean): StatusKey {
  if (connecting) {
    return "connecting";
  }
  if (run?.status === "executing" || run?.status === "canceled") {
    return run.status;
  }
  if (run?.status === "done" && run.origin === "user") {
    return "succeeded";
  }
  return run?.status === "error" ? "failed" : "ready";
}

function Tips({ text }: Readonly<{ text: StatusText }>) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const labelId = useId();
  const panelId = useId();
  const titleId = useId();

  useOutsidePointerDown(wrapperRef, open, () => setOpen(false));

  return (
    <div
      ref={wrapperRef}
      className={styles.tips}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
    >
      <span id={labelId} className="visually-hidden">
        {text.notifications}
      </span>
      <button
        ref={buttonRef}
        type="button"
        className={styles.footerButton}
        aria-labelledby={labelId}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        data-tip=""
        data-tips=""
        onClick={() => setOpen(!open)}
      >
        <BellIcon />
      </button>
      {open && (
        <section
          id={panelId}
          aria-labelledby={titleId}
          className={styles.tipsPanel}
        >
          <h2 id={titleId} className={styles.tipsTitle}>
            {text.tipsTitle}
          </h2>
          <ul className={styles.tipsList}>
            {text.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function StatusBar({ text }: Readonly<{ text: StatusText }>) {
  const { activeRun } = useWorkspace();
  const connecting = useConnecting();
  const { locale } = useLanguage();
  const status = statusOf(activeRun, connecting);
  const newTab = getTexts(locale).shell.results.opensInNewTab;

  return (
    <footer className={styles.statusBar}>
      <ReadyIcon />
      <span className={styles.statusText} data-status={status}>
        {text[status]}
      </span>
      <a
        href={REPOSITORY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.repository}
        data-tip=""
        data-repository=""
      >
        <RepositoryIcon />
        <span className={styles.repositoryLabel}>{text.repository}</span>
        <ChevronIcon direction="up" size={12} />
        <span className="visually-hidden">
          {" ("}
          {text.repositoryHint}
          {`, ${newTab})`}
        </span>
      </a>
      <Tips text={text} />
    </footer>
  );
}
