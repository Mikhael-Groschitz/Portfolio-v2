"use client";

import { ExplorerIcon } from "@/components/icons";
import styles from "@/components/toolbar/toolbar.module.css";
import { EXPLORER_ID } from "./element-ids";
import { useShell } from "./shell-frame";

export function ExplorerToggle({ label }: Readonly<{ label: string }>) {
  const { explorerOpen, openExplorer } = useShell();

  return (
    <button
      type="button"
      className={styles.button}
      aria-expanded={explorerOpen}
      aria-controls={EXPLORER_ID}
      data-tour="explorer-toggle"
      data-tip=""
      onClick={openExplorer}
    >
      <ExplorerIcon />
      <span className="visually-hidden">{label}</span>
    </button>
  );
}
