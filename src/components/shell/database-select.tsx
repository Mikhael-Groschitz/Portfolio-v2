"use client";

import { useConnectionStatus } from "@/components/connect/use-connection-status";
import { useEasterEggs } from "@/components/easter-eggs/easter-egg-context";
import { DATABASE, V1_DATABASE } from "@/engine/catalog";
import { useWorkspace } from "./workspace-context";
import styles from "@/components/toolbar/toolbar.module.css";

export function DatabaseSelect() {
  const { traveling } = useEasterEggs();
  const { activeDocument } = useWorkspace();
  const connected = useConnectionStatus() === "connected";
  const database = traveling ? V1_DATABASE : DATABASE;

  if (!connected || activeDocument === null) {
    return (
      <select key="none" className={styles.select} disabled defaultValue="">
        <option value="" />
      </select>
    );
  }

  return (
    <select key={database} className={styles.select} defaultValue={database}>
      <option value={DATABASE}>{DATABASE}</option>
      {traveling && <option value={V1_DATABASE}>{V1_DATABASE}</option>}
    </select>
  );
}
