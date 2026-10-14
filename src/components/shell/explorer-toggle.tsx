"use client";

import { ExplorerIcon } from "@/components/icons";
import { EXPLORER_ID } from "./element-ids";
import { useShell } from "./shell-frame";

interface ExplorerToggleProps {
  label: string;
  className: string;
  data?: Record<`data-${string}`, string | undefined>;
}

export function ExplorerToggle({
  label,
  className,
  data,
}: Readonly<ExplorerToggleProps>) {
  const { explorerOpen, openExplorer } = useShell();

  return (
    <button
      type="button"
      className={className}
      aria-expanded={explorerOpen}
      aria-controls={EXPLORER_ID}
      onClick={(event) => {
        event.currentTarget.focus();
        openExplorer();
      }}
      {...data}
    >
      <ExplorerIcon />
      <span>{label}</span>
    </button>
  );
}
