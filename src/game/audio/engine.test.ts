import { describe, expect, it, vi } from "vitest";
import {
  type World,
  createWorld,
  pause,
  resume,
  skipIntro,
  startIntro,
} from "../core/world";
import { parseCampaign } from "../levels/campaign";
import { VOLUME, createGameAudio } from "./engine";
import { frequencyOf, midiOf } from "./notes";

class FakeParam {
  value = 0;
  target: number | null = null;

  setValueAtTime(value: number) {
    this.value = value;
    return this;
  }

  linearRampToValueAtTime(value: number) {
    this.value = value;
    return this;
  }

  exponentialRampToValueAtTime(value: number) {
    this.value = value;
    return this;
  }

  setTargetAtTime(value: number) {
    this.target = value;
    return this;
  }
}

class FakeNode extends EventTarget {
  outputs: unknown[] = [];
  gain = new FakeParam();
  frequency = new FakeParam();
  detune = new FakeParam();
  Q = new FakeParam();
  threshold = new FakeParam();
  knee = new FakeParam();
  ratio = new FakeParam();
  attack = new FakeParam();
  release = new FakeParam();
  type = "";
  buffer: unknown = null;
  started: number | null = null;
  stopped: number | null = null;

  connect<T>(target: T): T {
    this.outputs.push(target);
    return target;
  }

  disconnect() {
    this.outputs = [];
  }

  start(time = 0) {
    this.started = time;
  }

  stop(time = 0) {
    this.stopped = time;
  }

  setPeriodicWave() {
    return undefined;
  }
}

class FakeContext {
  currentTime = 0;
  sampleRate = 8000;
  state: AudioContextState = "running";
  destination = new FakeNode();
  oscillators: FakeNode[] = [];
  sources: FakeNode[] = [];
  convolvers: FakeNode[] = [];
  gains: FakeNode[] = [];
  calls: string[] = [];

  createGain() {
    const node = new FakeNode();
    node.gain.value = 1;
    this.gains.push(node);
    return node;
  }

  createOscillator() {
    const node = new FakeNode();
    this.oscillators.push(node);
    return node;
  }

  createBufferSource() {
    const node = new FakeNode();
    this.sources.push(node);
    return node;
  }

  createBiquadFilter() {
    return new FakeNode();
  }

  createConvolver() {
    const node = new FakeNode();
    this.convolvers.push(node);
    return node;
  }

  createDynamicsCompressor() {
    return new FakeNode();
  }

  createPeriodicWave() {
    return {};
  }

  createBuffer(channels: number, length: number, sampleRate: number) {
    return {
      numberOfChannels: channels,
      duration: length / sampleRate,
      getChannelData: () => new Float32Array(length),
      copyToChannel: () => undefined,
    };
  }

  resume() {
    this.calls.push("resume");
    this.state = "running";
    return Promise.resolve();
  }

  suspend() {
    this.calls.push("suspend");
    this.state = "suspended";
    return Promise.resolve();
  }

  close() {
    this.calls.push("close");
    this.state = "closed";
    return Promise.resolve();
  }
}

const rooms = parseCampaign();

function setup(muted = false) {
  const context = new FakeContext();
  const factory = vi.fn(() => context as unknown as AudioContext);
  const audio = createGameAudio({ createContext: factory });
  const world = createWorld(rooms, { reducedMotion: false, muted });
  return { context, factory, audio, world };
}

function open(world: World) {
  startIntro(world);
}

function frequencies(nodes: readonly FakeNode[]): number[] {
  return nodes.map((node) => Math.round(node.frequency.value * 100) / 100);
}

function hz(pitch: string): number {
  return Math.round(frequencyOf(midiOf(pitch)) * 100) / 100;
}

describe("game audio", () => {
  it("creates no audio context before the Enter of the title screen", () => {
    const { factory, audio, world } = setup();
    world.cues.whip = 2;
    audio.sync(world);
    expect(factory).not.toHaveBeenCalled();
    expect(world.cues.whip).toBe(0);
  });

  it("builds a cathedral and plays the title theme over the opening", () => {
    const { context, factory, audio, world } = setup();
    audio.start();
    audio.start();
    open(world);
    audio.sync(world);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(context.convolvers).toHaveLength(1);
    expect(context.convolvers[0].buffer).not.toBeNull();
    expect(frequencies(context.oscillators)).toContain(hz("D2"));
  });

  it("goes quiet while paused and comes back when the game resumes", () => {
    const { context, audio, world } = setup();
    audio.start();
    open(world);
    skipIntro(world);
    audio.sync(world);
    pause(world);
    audio.sync(world);
    audio.sync(world);
    resume(world);
    audio.sync(world);
    expect(context.calls).toEqual(["suspend", "resume"]);
  });

  it("starts muted when the session says so and unmutes smoothly", () => {
    const { context, audio, world } = setup(true);
    audio.sync(world);
    audio.start();
    open(world);
    audio.sync(world);
    const master = context.gains.find((gain) => gain.gain.value === 0);
    expect(master).toBeDefined();
    world.muted = false;
    audio.sync(world);
    expect(master?.gain.target).toBe(VOLUME);
  });

  it("fades the current track out when the next one starts", () => {
    const { context, audio, world } = setup();
    audio.start();
    open(world);
    audio.sync(world);
    const title = [...context.oscillators];
    context.currentTime = 1;
    world.mode = "crash";
    audio.sync(world);
    const playing = title.filter((voice) => voice.frequency.value > 30);
    expect(
      playing.every(
        (voice) => voice.stopped !== null && voice.stopped <= 1.3 + 1e-9,
      ),
    ).toBe(true);
    const defeat = context.oscillators.slice(title.length);
    expect(frequencies(defeat)).toContain(hz("A2"));
  });

  it("plays each sound cue once, and none while muted", () => {
    const { context, audio, world } = setup();
    audio.start();
    open(world);
    skipIntro(world);
    world.cues.whip = 3;
    audio.sync(world);
    expect(context.sources).toHaveLength(1);
    expect(world.cues.whip).toBe(0);
    world.muted = true;
    world.cues.hit = 1;
    audio.sync(world);
    expect(context.sources).toHaveLength(1);
    expect(world.cues.hit).toBe(0);
  });

  it("drops notes that come too late instead of firing them all at once", () => {
    const { context, audio, world } = setup();
    audio.start();
    open(world);
    audio.sync(world);
    const before = context.oscillators.length;
    context.currentTime = 30;
    audio.sync(world);
    const late = context.oscillators
      .slice(before)
      .filter((voice) => (voice.started ?? 0) < 30);
    expect(late).toEqual([]);
  });

  it("closes the context when the game closes and ignores calls after that", () => {
    const { context, audio, world } = setup();
    audio.start();
    open(world);
    audio.sync(world);
    const voices = context.oscillators.length;
    audio.close();
    audio.close();
    audio.sync(world);
    expect(context.calls).toEqual(["close"]);
    expect(context.oscillators).toHaveLength(voices);
  });

  it("keeps the game running in a browser without Web Audio", () => {
    const audio = createGameAudio({ createContext: () => null });
    const world = createWorld(rooms, { reducedMotion: false });
    expect(() => {
      audio.start();
      open(world);
      audio.sync(world);
      audio.close();
    }).not.toThrow();
  });
});
