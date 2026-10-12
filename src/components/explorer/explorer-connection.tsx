"use client";

import { useRef } from "react";
import { useConnectionStatus } from "@/components/connect/use-connection-status";
import { CaretDownIcon, DisconnectIcon } from "@/components/icons";
import { LocaleText } from "@/components/locale/locale-text";
import { useWorkspace } from "@/components/shell/workspace-context";
import type { Localized } from "@/content/locales";
import styles from "./object-explorer.module.css";

export function ConnectButton({ label }: Readonly<{ label: Localized }>) {
  const { requestConnection } = useWorkspace();

  return (
    <button
      type="button"
      className={styles.connect}
      data-explorer-connect=""
      data-tip=""
      onClick={() => requestConnection()}
    >
      <LocaleText text={label} />
      <CaretDownIcon />
    </button>
  );
}

export function DisconnectButton({ label }: Readonly<{ label: Localized }>) {
  const { disconnect } = useWorkspace();
  const connected = useConnectionStatus() === "connected";
  const buttonRef = useRef<HTMLButtonElement>(null);

  function handleClick() {
    disconnect();
    buttonRef.current
      ?.closest("nav")
      ?.querySelector<HTMLElement>("[data-explorer-connect]")
      ?.focus();
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className={styles.toolButton}
      disabled={!connected}
      data-tip=""
      onClick={handleClick}
    >
      <DisconnectIcon />
      <span className="visually-hidden">
        <LocaleText text={label} />
      </span>
    </button>
  );
}
