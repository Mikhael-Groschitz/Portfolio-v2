export type Action =
  | "left"
  | "right"
  | "down"
  | "jump"
  | "attack"
  | "subweapon"
  | "switch"
  | "pause"
  | "exit"
  | "confirm"
  | "retry"
  | "mute"
  | "ranking";

export const ACTION_KEYS: Readonly<Record<Action, readonly string[]>> = {
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  down: ["ArrowDown", "KeyS"],
  jump: ["ArrowUp", "KeyW", "Space"],
  attack: ["KeyZ"],
  subweapon: ["KeyX"],
  switch: ["KeyC"],
  pause: ["KeyP"],
  exit: ["Escape"],
  confirm: ["Enter", "NumpadEnter"],
  retry: ["KeyR"],
  mute: ["KeyM"],
  ranking: ["KeyT"],
};

export type CommandId =
  | "move"
  | "jump"
  | "cloud"
  | "crouch"
  | "dropThrough"
  | "whip"
  | "subweapon"
  | "switchSubweapon"
  | "pause"
  | "mute"
  | "confirm"
  | "retry"
  | "ranking"
  | "exit";

export type CommandGroup = "move" | "attack" | "game";

export interface Command {
  id: CommandId;
  group: CommandGroup;
  actions: readonly Action[];
  gesture?: "midair" | "together";
}

export const COMMANDS: readonly Command[] = [
  { id: "move", group: "move", actions: ["left", "right"] },
  { id: "jump", group: "move", actions: ["jump"] },
  { id: "cloud", group: "move", actions: ["jump"], gesture: "midair" },
  { id: "crouch", group: "move", actions: ["down"] },
  {
    id: "dropThrough",
    group: "move",
    actions: ["down", "jump"],
    gesture: "together",
  },
  { id: "whip", group: "attack", actions: ["attack"] },
  { id: "subweapon", group: "attack", actions: ["subweapon"] },
  { id: "switchSubweapon", group: "attack", actions: ["switch"] },
  { id: "pause", group: "game", actions: ["pause"] },
  { id: "mute", group: "game", actions: ["mute"] },
  { id: "confirm", group: "game", actions: ["confirm"] },
  { id: "retry", group: "game", actions: ["retry"] },
  { id: "ranking", group: "game", actions: ["ranking"] },
  { id: "exit", group: "game", actions: ["exit"] },
];
