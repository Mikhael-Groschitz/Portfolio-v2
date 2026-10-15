const LETTERS: Readonly<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const ACCIDENTALS: Readonly<Record<string, number>> = {
  "": 0,
  "#": 1,
  b: -1,
};

const PITCH = /^([A-G])(#|b)?(\d)$/;

const A4_MIDI = 69;
const A4_HZ = 440;

export function midiOf(pitch: string): number {
  const match = PITCH.exec(pitch);
  if (!match) {
    throw new Error(`Unknown pitch "${pitch}"`);
  }
  const [, letter, accidental = "", octave] = match;
  return (Number(octave) + 1) * 12 + LETTERS[letter] + ACCIDENTALS[accidental];
}

export function frequencyOf(midi: number): number {
  return A4_HZ * 2 ** ((midi - A4_MIDI) / 12);
}

export function shiftOctaves(pitch: string, octaves: number): string {
  return pitch.replace(/\d$/, (octave) => String(Number(octave) + octaves));
}

export function octaveUp(pitch: string): string {
  return shiftOctaves(pitch, 1);
}
