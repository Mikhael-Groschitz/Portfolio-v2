import type { Controls } from "../entities/hero";

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
  | "mute";

const ACTIONS: Readonly<Record<string, Action>> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowDown: "down",
  KeyS: "down",
  ArrowUp: "jump",
  KeyW: "jump",
  Space: "jump",
  KeyZ: "attack",
  KeyX: "subweapon",
  KeyC: "switch",
  KeyP: "pause",
  Escape: "exit",
  Enter: "confirm",
  NumpadEnter: "confirm",
  KeyR: "retry",
  KeyM: "mute",
};

const BUTTON_KEYS = new Set<Action>(["confirm", "jump"]);

export function actionFor(code: string): Action | null {
  return Object.hasOwn(ACTIONS, code) ? ACTIONS[code] : null;
}

interface KeyEvent extends Event {
  code: string;
  repeat: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

export interface Keyboard {
  controls: () => Controls;
  release: () => void;
  detach: () => void;
}

function pressesButton(event: Event, action: Action): boolean {
  const target = event.target as { tagName?: string } | null;
  return target?.tagName === "BUTTON" && BUTTON_KEYS.has(action);
}

export function attachKeyboard(
  target: EventTarget,
  onPress: (action: Action) => void,
): Keyboard {
  const held = new Set<Action>();
  const pressed = new Set<Action>();
  const controls: Controls = {
    left: false,
    right: false,
    down: false,
    jump: false,
    jumpPressed: false,
    attackPressed: false,
    subweaponPressed: false,
    switchPressed: false,
  };

  function keydown(event: Event) {
    const key = event as KeyEvent;
    const action = actionFor(key.code);
    if (!action || key.ctrlKey || key.altKey || key.metaKey) {
      return;
    }
    if (pressesButton(event, action)) {
      return;
    }
    event.preventDefault();
    held.add(action);
    if (!key.repeat) {
      pressed.add(action);
      onPress(action);
    }
  }

  function keyup(event: Event) {
    const action = actionFor((event as KeyEvent).code);
    if (action) {
      held.delete(action);
    }
  }

  function clear() {
    held.clear();
    pressed.clear();
  }

  target.addEventListener("keydown", keydown);
  target.addEventListener("keyup", keyup);

  return {
    controls() {
      controls.left = held.has("left");
      controls.right = held.has("right");
      controls.down = held.has("down");
      controls.jump = held.has("jump");
      controls.jumpPressed = pressed.has("jump");
      controls.attackPressed = pressed.has("attack");
      controls.subweaponPressed = pressed.has("subweapon");
      controls.switchPressed = pressed.has("switch");
      pressed.clear();
      return controls;
    },
    release: clear,
    detach() {
      target.removeEventListener("keydown", keydown);
      target.removeEventListener("keyup", keyup);
      clear();
    },
  };
}
