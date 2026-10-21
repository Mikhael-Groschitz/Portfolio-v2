import { SUBWEAPONS } from "../balance";
import {
  ACTION_KEYS,
  COMMANDS,
  type Command,
  type CommandGroup,
  type CommandId,
} from "../core/commands";
import type { Subweapon } from "../entities/hero";
import { type GameTexts, fill } from "./texts";

const SYMBOLS: Readonly<Record<string, string>> = {
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  Escape: "Esc",
  Enter: "Enter",
  NumpadEnter: "Enter",
};

const GROUPS: readonly CommandGroup[] = ["move", "attack", "game"];

export const TITLE_COMMANDS: readonly CommandId[] = [
  "move",
  "jump",
  "cloud",
  "crouch",
  "dropThrough",
  "whip",
  "subweapon",
  "switchSubweapon",
  "pause",
  "exit",
];

export interface CommandLine {
  id: string;
  kind: "keys" | "sql";
  keys: string;
  action: string;
}

export interface SheetSection {
  id: CommandGroup | "subweapons";
  title: string;
  lines: CommandLine[];
}

export function keyLabel(code: string, text: GameTexts): string {
  if (code === "Space") {
    return text.keys.space;
  }
  return Object.hasOwn(SYMBOLS, code)
    ? SYMBOLS[code]
    : code.replace(/^(Key|Digit)/, "");
}

export function commandKeys(command: Command, text: GameTexts): string {
  if (command.gesture === "midair") {
    return text.gestures.midair;
  }
  if (command.gesture === "together") {
    return fill(text.gestures.together, {
      key: keyLabel(ACTION_KEYS[command.actions[0]][0], text),
    });
  }
  const depth = Math.max(
    ...command.actions.map((action) => ACTION_KEYS[action].length),
  );
  const groups: string[] = [];
  for (let index = 0; index < depth; index++) {
    const labels = command.actions
      .map((action) => ACTION_KEYS[action][index])
      .filter((code) => code !== undefined)
      .map((code) => keyLabel(code, text));
    const group = [...new Set(labels)].join(" ");
    if (group && !groups.includes(group)) {
      groups.push(group);
    }
  }
  return groups.join(` ${text.keys.or} `);
}

function line(command: Command, text: GameTexts): CommandLine {
  return {
    id: command.id,
    kind: "keys",
    keys: commandKeys(command, text),
    action: text.commands[command.id],
  };
}

export function commandLines(
  text: GameTexts,
  ids: readonly CommandId[],
): CommandLine[] {
  return COMMANDS.filter(({ id }) => ids.includes(id)).map((command) =>
    line(command, text),
  );
}

export function commandSheet(
  text: GameTexts,
  collapsed: boolean,
): SheetSection[] {
  const sections: SheetSection[] = GROUPS.map((group) => ({
    id: group,
    title: text.panels.commands.groups[group],
    lines: COMMANDS.filter(
      (command) =>
        command.group === group && (collapsed || command.id !== "ranking"),
    ).map((command) => line(command, text)),
  }));
  const subweapons = Object.keys(SUBWEAPONS) as Subweapon[];
  sections.push({
    id: "subweapons",
    title: text.panels.commands.groups.subweapons,
    lines: subweapons.map((name) => ({
      id: name,
      kind: "sql",
      keys: text.subweapons[name],
      action: fill(text.subweaponHints[name], {
        cost: SUBWEAPONS[name].cost,
      }),
    })),
  });
  return sections;
}
