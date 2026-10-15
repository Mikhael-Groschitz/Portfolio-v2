import type { Cue } from "../core/cues";

export interface ToneLayer {
  kind: "tone";
  wave: OscillatorType;
  from: number;
  to: number;
  duration: number;
  gain: number;
  delay?: number;
}

export interface NoiseLayer {
  kind: "noise";
  filter: BiquadFilterType;
  from: number;
  to: number;
  q: number;
  duration: number;
  gain: number;
  delay?: number;
}

export type Layer = ToneLayer | NoiseLayer;

const ATTACK = 0.005;
const FLOOR = 0.0001;
const TAIL = 0.02;
const NOISE_SECONDS = 2;

function chime(
  notes: readonly number[],
  wave: OscillatorType,
  step: number,
  duration: number,
  gain: number,
): ToneLayer[] {
  return notes.map((frequency, index) => ({
    kind: "tone",
    wave,
    from: frequency,
    to: frequency,
    duration,
    gain,
    delay: index * step,
  }));
}

export const EFFECTS: Readonly<Record<Cue, readonly Layer[]>> = {
  whip: [
    {
      kind: "noise",
      filter: "bandpass",
      from: 3200,
      to: 900,
      q: 2.5,
      duration: 0.14,
      gain: 0.32,
    },
    {
      kind: "tone",
      wave: "triangle",
      from: 1800,
      to: 1200,
      duration: 0.03,
      gain: 0.12,
    },
  ],
  cloud: [
    {
      kind: "noise",
      filter: "lowpass",
      from: 1400,
      to: 600,
      q: 0.7,
      duration: 0.28,
      gain: 0.12,
    },
    {
      kind: "tone",
      wave: "sine",
      from: 520,
      to: 860,
      duration: 0.24,
      gain: 0.08,
    },
  ],
  select: [
    {
      kind: "tone",
      wave: "triangle",
      from: 620,
      to: 1240,
      duration: 0.09,
      gain: 0.16,
    },
  ],
  join: [
    {
      kind: "tone",
      wave: "triangle",
      from: 420,
      to: 840,
      duration: 0.16,
      gain: 0.12,
    },
    {
      kind: "noise",
      filter: "bandpass",
      from: 1200,
      to: 2400,
      q: 1.5,
      duration: 0.18,
      gain: 0.12,
    },
  ],
  truncate: [
    {
      kind: "noise",
      filter: "lowpass",
      from: 6000,
      to: 220,
      q: 0.8,
      duration: 0.6,
      gain: 0.3,
    },
    {
      kind: "tone",
      wave: "sawtooth",
      from: 220,
      to: 55,
      duration: 0.55,
      gain: 0.12,
    },
  ],
  hit: [
    {
      kind: "tone",
      wave: "sine",
      from: 230,
      to: 80,
      duration: 0.1,
      gain: 0.32,
    },
    {
      kind: "noise",
      filter: "bandpass",
      from: 2200,
      to: 1500,
      q: 1.2,
      duration: 0.05,
      gain: 0.18,
    },
  ],
  smash: [
    {
      kind: "noise",
      filter: "lowpass",
      from: 2000,
      to: 260,
      q: 0.9,
      duration: 0.26,
      gain: 0.28,
    },
    {
      kind: "tone",
      wave: "square",
      from: 170,
      to: 60,
      duration: 0.2,
      gain: 0.08,
    },
  ],
  break: [
    {
      kind: "noise",
      filter: "highpass",
      from: 2600,
      to: 1800,
      q: 0.9,
      duration: 0.12,
      gain: 0.22,
    },
    {
      kind: "tone",
      wave: "triangle",
      from: 950,
      to: 620,
      duration: 0.08,
      gain: 0.1,
    },
  ],
  collect: chime([880, 1319], "sine", 0.06, 0.1, 0.16),
  relief: chime([1175, 1480, 1760], "sine", 0.07, 0.16, 0.15),
  relic: [
    ...chime([587, 740, 880], "triangle", 0, 0.6, 0.1),
    ...chime([1175], "triangle", 0.12, 0.5, 0.08),
  ],
  hurt: [
    {
      kind: "tone",
      wave: "square",
      from: 150,
      to: 92,
      duration: 0.22,
      gain: 0.12,
    },
    {
      kind: "noise",
      filter: "lowpass",
      from: 900,
      to: 300,
      q: 0.8,
      duration: 0.16,
      gain: 0.14,
    },
  ],
  door: [
    {
      kind: "noise",
      filter: "lowpass",
      from: 420,
      to: 160,
      q: 1.2,
      duration: 0.5,
      gain: 0.24,
    },
    {
      kind: "tone",
      wave: "sine",
      from: 74,
      to: 55,
      duration: 0.45,
      gain: 0.2,
    },
  ],
  bossHit: [
    {
      kind: "tone",
      wave: "sine",
      from: 170,
      to: 52,
      duration: 0.16,
      gain: 0.36,
    },
    {
      kind: "noise",
      filter: "bandpass",
      from: 1300,
      to: 800,
      q: 1,
      duration: 0.08,
      gain: 0.22,
    },
  ],
  bossDown: [
    {
      kind: "noise",
      filter: "lowpass",
      from: 3000,
      to: 120,
      q: 0.7,
      duration: 1.2,
      gain: 0.28,
    },
    {
      kind: "tone",
      wave: "sawtooth",
      from: 300,
      to: 45,
      duration: 1.1,
      gain: 0.1,
    },
  ],
  slash: [
    {
      kind: "noise",
      filter: "bandpass",
      from: 1100,
      to: 4200,
      q: 1.8,
      duration: 0.2,
      gain: 0.32,
    },
  ],
  mark: chime([880, 659], "triangle", 0.13, 0.12, 0.12),
  sweep: [
    {
      kind: "noise",
      filter: "highpass",
      from: 500,
      to: 6000,
      q: 0.8,
      duration: 0.36,
      gain: 0.24,
    },
  ],
  card: [
    {
      kind: "noise",
      filter: "bandpass",
      from: 3600,
      to: 2600,
      q: 3,
      duration: 0.05,
      gain: 0.14,
    },
  ],
  vanish: [
    {
      kind: "tone",
      wave: "sine",
      from: 950,
      to: 60,
      duration: 0.3,
      gain: 0.18,
    },
    {
      kind: "noise",
      filter: "highpass",
      from: 5000,
      to: 5000,
      q: 0.7,
      duration: 0.03,
      gain: 0.1,
    },
  ],
  appear: [
    {
      kind: "tone",
      wave: "sine",
      from: 60,
      to: 950,
      duration: 0.26,
      gain: 0.16,
    },
  ],
  landing: [
    {
      kind: "tone",
      wave: "sine",
      from: 95,
      to: 36,
      duration: 0.36,
      gain: 0.42,
    },
    {
      kind: "noise",
      filter: "lowpass",
      from: 700,
      to: 200,
      q: 0.8,
      duration: 0.3,
      gain: 0.28,
    },
  ],
  call: chime([554, 659, 784, 932], "triangle", 0.07, 0.12, 0.11),
  rollback: chime([420, 560, 740, 980, 1300, 1720], "sine", 0.07, 0.05, 0.11),
  commit: [
    ...chime([147, 220, 294, 349], "triangle", 0, 0.9, 0.08),
    {
      kind: "noise",
      filter: "lowpass",
      from: 2400,
      to: 150,
      q: 0.7,
      duration: 0.9,
      gain: 0.22,
    },
  ],
  drop: [
    {
      kind: "tone",
      wave: "triangle",
      from: 300,
      to: 520,
      duration: 0.14,
      gain: 0.12,
    },
    {
      kind: "noise",
      filter: "bandpass",
      from: 900,
      to: 1800,
      q: 1.2,
      duration: 0.2,
      gain: 0.14,
    },
  ],
  rise: [
    {
      kind: "noise",
      filter: "lowpass",
      from: 500,
      to: 160,
      q: 0.8,
      duration: 0.55,
      gain: 0.26,
    },
    {
      kind: "tone",
      wave: "sawtooth",
      from: 98,
      to: 82,
      duration: 0.5,
      gain: 0.07,
    },
  ],
  sink: [
    {
      kind: "tone",
      wave: "sine",
      from: 260,
      to: 70,
      duration: 0.4,
      gain: 0.16,
    },
    {
      kind: "noise",
      filter: "lowpass",
      from: 900,
      to: 200,
      q: 0.8,
      duration: 0.35,
      gain: 0.16,
    },
  ],
  clank: [
    {
      kind: "tone",
      wave: "square",
      from: 880,
      to: 840,
      duration: 0.06,
      gain: 0.08,
    },
    {
      kind: "tone",
      wave: "triangle",
      from: 1320,
      to: 1320,
      duration: 0.12,
      gain: 0.08,
    },
    {
      kind: "noise",
      filter: "highpass",
      from: 4000,
      to: 4000,
      q: 0.7,
      duration: 0.04,
      gain: 0.12,
    },
  ],
  windup: [
    {
      kind: "tone",
      wave: "sawtooth",
      from: 180,
      to: 420,
      duration: 0.55,
      gain: 0.05,
    },
    {
      kind: "noise",
      filter: "bandpass",
      from: 1500,
      to: 3000,
      q: 4,
      duration: 0.45,
      gain: 0.06,
    },
  ],
  axe: [
    {
      kind: "noise",
      filter: "bandpass",
      from: 2600,
      to: 700,
      q: 2,
      duration: 0.22,
      gain: 0.24,
    },
    {
      kind: "tone",
      wave: "triangle",
      from: 520,
      to: 300,
      duration: 0.08,
      gain: 0.08,
    },
  ],
  block: [
    ...chime([1046, 1568], "triangle", 0.04, 0.18, 0.12),
    {
      kind: "noise",
      filter: "highpass",
      from: 3000,
      to: 3000,
      q: 0.7,
      duration: 0.05,
      gain: 0.1,
    },
  ],
  boost: chime([523, 659, 784, 1046], "triangle", 0.06, 0.12, 0.1),
  typing: [0, 0.07, 0.13, 0.2, 0.26, 0.33].map((delay) => ({
    kind: "noise",
    filter: "highpass",
    from: 3500,
    to: 3500,
    q: 0.7,
    duration: 0.025,
    gain: 0.1,
    delay,
  })),
  paste: [
    {
      kind: "tone",
      wave: "triangle",
      from: 600,
      to: 900,
      duration: 0.06,
      gain: 0.12,
    },
    {
      kind: "tone",
      wave: "triangle",
      from: 700,
      to: 1050,
      duration: 0.06,
      gain: 0.12,
      delay: 0.09,
    },
  ],
  shield: [
    {
      kind: "tone",
      wave: "sine",
      from: 300,
      to: 900,
      duration: 0.3,
      gain: 0.12,
    },
    {
      kind: "noise",
      filter: "lowpass",
      from: 2000,
      to: 600,
      q: 0.7,
      duration: 0.25,
      gain: 0.06,
    },
  ],
  pop: [
    {
      kind: "tone",
      wave: "sine",
      from: 900,
      to: 200,
      duration: 0.12,
      gain: 0.16,
    },
    {
      kind: "noise",
      filter: "highpass",
      from: 3000,
      to: 3000,
      q: 0.7,
      duration: 0.04,
      gain: 0.1,
    },
  ],
  deploy: chime([523, 392, 311], "square", 0.16, 0.18, 0.06),
  buzz: [
    {
      kind: "tone",
      wave: "sawtooth",
      from: 180,
      to: 220,
      duration: 0.4,
      gain: 0.05,
    },
    {
      kind: "noise",
      filter: "bandpass",
      from: 400,
      to: 400,
      q: 6,
      duration: 0.4,
      gain: 0.05,
    },
  ],
  costume: [
    {
      kind: "noise",
      filter: "bandpass",
      from: 2500,
      to: 1200,
      q: 3,
      duration: 0.2,
      gain: 0.18,
    },
    ...chime([700, 900, 600], "triangle", 0.05, 0.06, 0.08),
  ],
};

export function createNoise(context: BaseAudioContext): AudioBuffer {
  const buffer = context.createBuffer(
    1,
    Math.round(context.sampleRate * NOISE_SECONDS),
    context.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index++) {
    data[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

function envelope(
  context: BaseAudioContext,
  gain: number,
  start: number,
  end: number,
): GainNode {
  const amplifier = context.createGain();
  amplifier.gain.setValueAtTime(FLOOR, start);
  amplifier.gain.exponentialRampToValueAtTime(gain, start + ATTACK);
  amplifier.gain.exponentialRampToValueAtTime(FLOOR, end);
  return amplifier;
}

function release(
  source: AudioScheduledSourceNode,
  nodes: readonly AudioNode[],
) {
  source.addEventListener("ended", () => {
    source.disconnect();
    for (const node of nodes) {
      node.disconnect();
    }
  });
}

function tone(
  context: BaseAudioContext,
  output: AudioNode,
  layer: ToneLayer,
  start: number,
): void {
  const end = start + layer.duration;
  const oscillator = context.createOscillator();
  oscillator.type = layer.wave;
  oscillator.frequency.setValueAtTime(layer.from, start);
  oscillator.frequency.exponentialRampToValueAtTime(layer.to, end);
  const amplifier = envelope(context, layer.gain, start, end);
  oscillator.connect(amplifier).connect(output);
  release(oscillator, [amplifier]);
  oscillator.start(start);
  oscillator.stop(end + TAIL);
}

function noise(
  context: BaseAudioContext,
  output: AudioNode,
  buffer: AudioBuffer,
  layer: NoiseLayer,
  start: number,
): void {
  const end = start + layer.duration;
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = layer.filter;
  filter.Q.value = layer.q;
  filter.frequency.setValueAtTime(layer.from, start);
  filter.frequency.exponentialRampToValueAtTime(layer.to, end);
  const amplifier = envelope(context, layer.gain, start, end);
  source.connect(filter).connect(amplifier).connect(output);
  release(source, [filter, amplifier]);
  source.start(
    start,
    Math.random() * Math.max(buffer.duration - layer.duration, 0),
  );
  source.stop(end + TAIL);
}

export function playEffect(
  context: BaseAudioContext,
  output: AudioNode,
  buffer: AudioBuffer,
  name: Cue,
  time: number,
): void {
  for (const layer of EFFECTS[name]) {
    const start = time + (layer.delay ?? 0);
    if (layer.kind === "tone") {
      tone(context, output, layer, start);
    } else {
      noise(context, output, buffer, layer, start);
    }
  }
}
