import { octaveUp, shiftOctaves } from "./notes";

export type StopName = "flute" | "principal" | "plenum" | "reed" | "pedal";

export type Pitch = string;

export type Sound = Pitch | readonly Pitch[] | null;

export type Note = readonly [sound: Sound, beats: number];

export interface Part {
  stop: StopName;
  velocity: number;
  notes: readonly Note[];
}

export interface Score {
  tempo: number;
  beatsPerBar: number;
  loop: boolean;
  parts: readonly Part[];
}

export function run(beats: number, ...sounds: readonly Sound[]): Note[] {
  return sounds.map((sound) => [sound, beats] as const);
}

export function rhythm(
  sounds: readonly Sound[],
  pattern: readonly number[],
): Note[] {
  return sounds.flatMap((sound) =>
    pattern.map((beats): Note => (beats > 0 ? [sound, beats] : [null, -beats])),
  );
}

export interface PartChange {
  stop?: StopName;
  velocity?: number;
  octaves?: number;
  staccato?: boolean;
}

export interface Variation {
  tempo: number;
  parts: readonly PartChange[];
  doubles?: readonly (PartChange & { of: number })[];
}

function shiftSound(sound: Sound, octaves: number): Sound {
  if (sound === null || octaves === 0) {
    return sound;
  }
  return typeof sound === "string"
    ? shiftOctaves(sound, octaves)
    : sound.map((pitch) => shiftOctaves(pitch, octaves));
}

function change(part: Part, edit: PartChange): Part {
  const notes = part.notes.flatMap(([sound, beats]): Note[] => {
    const shifted = shiftSound(sound, edit.octaves ?? 0);
    return edit.staccato && shifted !== null
      ? [
          [shifted, beats / 2],
          [null, beats / 2],
        ]
      : [[shifted, beats]];
  });
  return {
    stop: edit.stop ?? part.stop,
    velocity: edit.velocity ?? part.velocity,
    notes,
  };
}

export function vary(score: Score, variation: Variation): Score {
  return {
    ...score,
    tempo: variation.tempo,
    parts: [
      ...score.parts.map((part, index) =>
        change(part, variation.parts[index] ?? {}),
      ),
      ...(variation.doubles ?? []).map((double) =>
        change(score.parts[double.of], double),
      ),
    ],
  };
}

export function octaves(
  roots: readonly Pitch[],
  hits: number,
  beats: number,
): Note[] {
  return roots.flatMap((root) =>
    Array.from({ length: hits }, (_, hit): Note => [
      hit % 2 === 0 ? root : octaveUp(root),
      beats,
    ]),
  );
}
