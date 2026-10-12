import type { CommandId, EditAction } from "@/content/types";
import { isWordCharacter } from "./completions";

export const EXECUTE_SHORTCUTS = "F5 Alt+X";

const PAGE_SIZE = 8;

const COMPLETION_MOVES: Record<string, number> = {
  ArrowDown: 1,
  ArrowUp: -1,
  PageDown: PAGE_SIZE,
  PageUp: -PAGE_SIZE,
};

const INPUT_ACTIONS: Record<string, EditAction> = {
  insertFromPaste: "paste",
  insertFromPasteAsQuotation: "paste",
  deleteByCut: "cut",
  insertFromDrop: "insert",
};

const CHORD_COMMANDS: Record<string, CommandId> = {
  KeyC: "commentLines",
  KeyU: "uncommentLines",
};

const MODIFIER_KEYS = new Set(["Control", "Meta", "Shift", "Alt"]);

type HistoryKey = "undo" | "redo" | "find";

interface ShortcutEvent {
  key: string;
  code: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

export function isExecuteShortcut(event: ShortcutEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.shiftKey) {
    return false;
  }
  return event.altKey ? event.code === "KeyX" : event.key === "F5";
}

export function isHelpShortcut(event: ShortcutEvent): boolean {
  return (
    event.altKey &&
    event.key === "F1" &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  );
}

function withControlOnly(event: ShortcutEvent): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;
}

export function historyKeyOf(event: ShortcutEvent): HistoryKey | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) {
    return null;
  }
  const keys: Record<string, HistoryKey> = event.shiftKey
    ? { KeyZ: "redo" }
    : { KeyZ: "undo", KeyY: "redo", KeyF: "find" };
  return keys[event.code] ?? null;
}

export function isModifierKey(key: string): boolean {
  return MODIFIER_KEYS.has(key);
}

export function startsChord(event: ShortcutEvent): boolean {
  return withControlOnly(event) && event.code === "KeyK";
}

export function chordCommand(event: ShortcutEvent): CommandId | undefined {
  return withControlOnly(event) ? CHORD_COMMANDS[event.code] : undefined;
}

export function editActionOf(inputType: string): EditAction | undefined {
  if (INPUT_ACTIONS[inputType]) {
    return INPUT_ACTIONS[inputType];
  }
  if (inputType.startsWith("delete")) {
    return "delete";
  }
  return inputType.startsWith("insert") ? "typing" : undefined;
}

export function isTyping(typed: string): boolean {
  return (
    typed.length > 0 &&
    [...typed].every(
      (character) => isWordCharacter(character) || character === " ",
    )
  );
}

export function completionTarget(
  key: string,
  active: number,
  count: number,
): number | undefined {
  const move = COMPLETION_MOVES[key];
  return move === undefined
    ? undefined
    : Math.min(Math.max(active + move, 0), count - 1);
}
