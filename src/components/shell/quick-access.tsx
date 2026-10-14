"use client";

import { CHEATSHEET_ID, useGuide } from "@/components/cheatsheet/guide-context";
import { useCommands } from "@/components/commands/command-context";
import { commandLabel } from "@/components/commands/command-model";
import { CheatsheetIcon } from "@/components/icons";
import styles from "@/components/toolbar/toolbar.module.css";
import { ExplorerToggle } from "./explorer-toggle";
import layout from "./toolbar.module.css";

const BUTTON = `${styles.button} ${layout.quickButton}`;

export function QuickAccess() {
  const commands = useCommands();
  const { sheetOpen, openCheatsheet, pulse } = useGuide();

  return (
    <div className={layout.quick}>
      <div className={styles.toolbar}>
        <ExplorerToggle
          label={commandLabel(commands.label("objectExplorer"))}
          className={BUTTON}
          data={{
            "data-tour": "explorer-toggle",
            "data-highlight": pulse ? "" : undefined,
          }}
        />
      </div>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={BUTTON}
          aria-expanded={sheetOpen}
          aria-controls={CHEATSHEET_ID}
          data-tour="cheatsheet-toggle"
          onClick={(event) => {
            event.currentTarget.focus();
            openCheatsheet();
          }}
        >
          <CheatsheetIcon />
          <span>{commandLabel(commands.label("cheatsheet"))}</span>
        </button>
      </div>
    </div>
  );
}
