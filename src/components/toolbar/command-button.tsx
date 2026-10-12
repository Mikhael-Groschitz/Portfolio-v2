"use client";

import type { ReactNode } from "react";
import { useCommands } from "@/components/commands/command-context";
import { COMMANDS, commandLabel } from "@/components/commands/command-model";
import { LocaleText } from "@/components/locale/locale-text";
import { getTexts } from "@/content";
import { byLocale } from "@/content/locales";
import type { CommandId } from "@/content/types";
import styles from "./toolbar.module.css";

type LabelMode = "aria" | "visible" | "hidden";

interface CommandButtonProps {
  command: CommandId;
  icon: ReactNode;
  labelMode?: LabelMode;
  unstyled?: boolean;
  keyShortcuts?: string;
  className?: string;
  data?: Record<`data-${string}`, string | undefined>;
}

const LABEL_CLASSES: Record<Exclude<LabelMode, "aria">, string> = {
  visible: styles.label,
  hidden: "visually-hidden",
};

function buttonClass(unstyled: boolean, className: string | undefined) {
  if (unstyled) {
    return className;
  }
  return className ? `${styles.button} ${className}` : styles.button;
}

export function CommandButton({
  command,
  icon,
  labelMode = "aria",
  unstyled = false,
  keyShortcuts,
  className,
  data,
}: Readonly<CommandButtonProps>) {
  const commands = useCommands();
  const { shortcut, chord, format } = COMMANDS[command];
  const label = commandLabel(commands.label(command));

  return (
    <button
      type="button"
      className={buttonClass(unstyled, className)}
      aria-label={labelMode === "aria" ? label : undefined}
      aria-keyshortcuts={keyShortcuts ?? shortcut}
      aria-pressed={format ? commands.isChecked(command) : undefined}
      disabled={!commands.isEnabled(command)}
      data-tip=""
      data-tip-text={chord ? `${label} (${chord})` : undefined}
      data-command={command}
      onClick={() => commands.run(command)}
      {...data}
    >
      {icon}
      {labelMode !== "aria" && (
        <span className={LABEL_CLASSES[labelMode]}>
          <LocaleText
            text={byLocale((locale) =>
              commandLabel(getTexts(locale).shell.commands[command]),
            )}
          />
        </span>
      )}
    </button>
  );
}
