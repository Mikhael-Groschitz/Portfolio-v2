import { describe, expect, it } from "vitest";
import { type Action, actionFor, attachKeyboard } from "./input";

function key(
  type: "keydown" | "keyup",
  code: string,
  extra: Partial<{ repeat: boolean; ctrlKey: boolean }> = {},
) {
  return Object.assign(new Event(type, { cancelable: true }), {
    code,
    repeat: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    ...extra,
  });
}

function setup() {
  const target = new EventTarget();
  const presses: Action[] = [];
  const keyboard = attachKeyboard(target, (action) => presses.push(action));
  return { target, presses, keyboard };
}

describe("game keys", () => {
  it("maps arrows, WASD and the action keys", () => {
    expect(actionFor("ArrowLeft")).toBe("left");
    expect(actionFor("KeyA")).toBe("left");
    expect(actionFor("KeyD")).toBe("right");
    expect(actionFor("ArrowUp")).toBe("jump");
    expect(actionFor("KeyW")).toBe("jump");
    expect(actionFor("Space")).toBe("jump");
    expect(actionFor("KeyZ")).toBe("attack");
    expect(actionFor("ArrowDown")).toBe("down");
    expect(actionFor("KeyS")).toBe("down");
    expect(actionFor("KeyX")).toBe("subweapon");
    expect(actionFor("KeyC")).toBe("switch");
    expect(actionFor("KeyP")).toBe("pause");
    expect(actionFor("KeyR")).toBe("retry");
    expect(actionFor("KeyM")).toBe("mute");
    expect(actionFor("Escape")).toBe("exit");
    expect(actionFor("Enter")).toBe("confirm");
    expect(actionFor("KeyQ")).toBeNull();
    expect(actionFor("toString")).toBeNull();
  });

  it("leaves the developer shortcuts to the dev tools", () => {
    for (const code of ["Equal", "NumpadAdd", "PageDown", "BracketRight"]) {
      expect(actionFor(code)).toBeNull();
    }
    expect(actionFor("F9")).toBeNull();
    expect(actionFor("Digit1")).toBeNull();
  });

  it("keeps held keys and reports a press only once", () => {
    const { target, presses, keyboard } = setup();
    const down = key("keydown", "KeyZ");
    target.dispatchEvent(down);
    target.dispatchEvent(key("keydown", "ArrowRight"));
    target.dispatchEvent(key("keydown", "ArrowRight", { repeat: true }));
    expect(down.defaultPrevented).toBe(true);
    expect(presses).toEqual(["attack", "right"]);
    expect(keyboard.controls()).toMatchObject({
      right: true,
      attackPressed: true,
    });
    expect(keyboard.controls()).toMatchObject({
      right: true,
      attackPressed: false,
    });
    target.dispatchEvent(key("keyup", "ArrowRight"));
    expect(keyboard.controls().right).toBe(false);
  });

  it("reports crouching, subweapon and switch presses", () => {
    const { target, keyboard } = setup();
    target.dispatchEvent(key("keydown", "KeyS"));
    target.dispatchEvent(key("keydown", "KeyX"));
    target.dispatchEvent(key("keydown", "KeyC"));
    expect(keyboard.controls()).toMatchObject({
      down: true,
      subweaponPressed: true,
      switchPressed: true,
    });
    expect(keyboard.controls()).toMatchObject({
      down: true,
      subweaponPressed: false,
      switchPressed: false,
    });
  });

  it("reuses the same controls object every frame", () => {
    const { keyboard } = setup();
    expect(keyboard.controls()).toBe(keyboard.controls());
  });

  it("lets buttons handle Enter and Space themselves", () => {
    const { target, presses } = setup();
    const event = key("keydown", "Enter");
    Object.defineProperty(event, "target", { value: { tagName: "BUTTON" } });
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(presses).toEqual([]);
  });

  it("leaves browser shortcuts and unknown keys alone", () => {
    const { target, presses } = setup();
    const reload = key("keydown", "KeyR", { ctrlKey: true });
    const unknown = key("keydown", "KeyQ");
    target.dispatchEvent(reload);
    target.dispatchEvent(unknown);
    expect(reload.defaultPrevented).toBe(false);
    expect(unknown.defaultPrevented).toBe(false);
    expect(presses).toEqual([]);
  });

  it("stops listening once detached", () => {
    const { target, presses, keyboard } = setup();
    keyboard.detach();
    target.dispatchEvent(key("keydown", "Escape"));
    expect(presses).toEqual([]);
    expect(keyboard.controls()).toMatchObject({ left: false, right: false });
  });

  it("forgets every key when the window loses focus", () => {
    const { target, keyboard } = setup();
    target.dispatchEvent(key("keydown", "ArrowLeft"));
    keyboard.release();
    expect(keyboard.controls().left).toBe(false);
  });
});
