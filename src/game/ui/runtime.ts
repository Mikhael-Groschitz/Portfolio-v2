import { createGameAudio } from "../audio/engine";
import { STEP_MS, accumulate, framesToMs } from "../core/clock";
import { type Action, attachKeyboard } from "../core/input";
import {
  type Hud,
  type World,
  createWorld,
  hudMatches,
  hudOf,
  pause,
  resume,
  retry,
  skipIntro,
  startIntro,
  step,
  toggleSound,
} from "../core/world";
import type { DevTools } from "../dev/tools";
import { parseCampaign } from "../levels/campaign";
import { createArt } from "../render/art";
import { speakerSpot } from "../render/boss-poses";
import { render } from "../render/render";
import { readMuted, rememberMuted } from "./sound-preference";

export interface GameHud extends Hud {
  playMs: number;
  endedAt: number | null;
}

export interface Anchor {
  x: number;
  y: number;
}

export interface GameOptions {
  reducedMotion: boolean;
  onHud: (hud: GameHud) => void;
  onAnchor: (anchor: Anchor) => void;
  onExit: () => void;
  onRanking?: () => void;
}

export interface Game {
  start: () => void;
  command: (action: Action) => void;
  hold: () => void;
  lock: (onEscape: (() => void) | null) => void;
  destroy: () => void;
}

function confirm(world: World): void {
  switch (world.mode) {
    case "title":
      startIntro(world);
      break;
    case "intro":
      skipIntro(world);
      break;
    case "paused":
      resume(world);
      break;
    case "crash":
      retry(world);
      break;
    default:
      break;
  }
}

export function createGame(
  canvas: HTMLCanvasElement,
  { reducedMotion, onHud, onAnchor, onExit, onRanking }: GameOptions,
): Game {
  const context = canvas.getContext("2d");
  const rooms = parseCampaign();
  let world = createWorld(rooms, {
    reducedMotion,
    seed: Date.now(),
    muted: readMuted(),
  });
  const audio = createGameAudio();
  let art = createArt(rooms);
  let frame = 0;
  let last = 0;
  let lag = 0;
  let running = false;
  let alive = true;
  let dev: DevTools | null = null;
  let shown: GameHud | null = null;
  let locked: (() => void) | null = null;
  const spot: Anchor = { x: 0, y: 0 };
  const anchored: Anchor = { x: Number.NaN, y: Number.NaN };

  function publish() {
    if (shown && hudMatches(shown, world)) {
      return;
    }
    const ended = world.mode === "crash" || world.mode === "victory";
    shown = {
      ...hudOf(world),
      playMs: ended ? framesToMs(world.playFrames) : 0,
      endedAt: ended ? Date.now() : null,
    };
    onHud(shown);
  }

  function anchor() {
    if (
      !speakerSpot(world.room.boss, world.camera, spot) ||
      (anchored.x === spot.x && anchored.y === spot.y)
    ) {
      return;
    }
    anchored.x = spot.x;
    anchored.y = spot.y;
    onAnchor(spot);
  }

  function command(action: Action) {
    switch (action) {
      case "exit":
        onExit();
        return;
      case "pause":
        if (world.mode === "paused") {
          resume(world);
        } else {
          pause(world);
        }
        break;
      case "confirm":
        if (world.mode === "victory") {
          onExit();
          return;
        }
        if (world.mode === "title") {
          audio.start();
        }
        confirm(world);
        break;
      case "mute":
        toggleSound(world);
        rememberMuted(world.muted);
        break;
      case "retry":
        retry(world);
        break;
      case "ranking":
        onRanking?.();
        return;
      default:
        return;
    }
    audio.sync(world);
    publish();
  }

  const keyboard = attachKeyboard(window, (action) => {
    if (!locked) {
      command(action);
    } else if (action === "exit") {
      locked();
    }
  });

  function refresh() {
    if (world.mode !== "title") {
      audio.start();
    }
    audio.sync(world);
    publish();
  }

  function show(next: World) {
    world = next;
    art = createArt(next.rooms);
    shown = null;
    refresh();
  }

  if (process.env.NODE_ENV !== "production") {
    void import("../dev/tools").then(({ attachDevTools }) => {
      if (alive) {
        dev = attachDevTools({ current: () => world, show, refresh });
      }
    });
  }

  function leave() {
    keyboard.release();
    pause(world);
    audio.sync(world);
    publish();
  }

  function hide() {
    if (document.hidden) {
      leave();
    }
  }

  function loop(now: number) {
    if (!running) {
      return;
    }
    frame = window.requestAnimationFrame(loop);
    lag = accumulate(lag, now - last);
    last = now;
    while (lag >= STEP_MS) {
      step(world, keyboard.controls());
      dev?.afterStep();
      lag -= STEP_MS;
    }
    if (context) {
      render(context, world, art);
    }
    anchor();
    audio.sync(world);
    publish();
  }

  return {
    start() {
      running = true;
      window.addEventListener("blur", leave);
      document.addEventListener("visibilitychange", hide);
      frame = window.requestAnimationFrame((now) => {
        last = now;
        loop(now);
      });
      publish();
    },
    command,
    hold() {
      if (world.mode !== "playing") {
        return;
      }
      keyboard.release();
      pause(world);
      audio.sync(world);
      publish();
    },
    lock(onEscape) {
      locked = onEscape;
      keyboard.release();
    },
    destroy() {
      running = false;
      alive = false;
      dev?.detach();
      dev = null;
      window.cancelAnimationFrame(frame);
      audio.close();
      keyboard.detach();
      window.removeEventListener("blur", leave);
      document.removeEventListener("visibilitychange", hide);
    },
  };
}
