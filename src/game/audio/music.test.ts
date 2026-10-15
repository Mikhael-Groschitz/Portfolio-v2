import { describe, expect, it } from "vitest";
import { frequencyOf, midiOf, octaveUp } from "./notes";
import { octaves, rhythm, run } from "./score";
import { STOPS } from "./stops";
import { SCORES, TRACKS, type TrackEvent, partLength } from "./tracks";

const D_MINOR = new Set([2, 4, 5, 7, 9, 10, 0]);
const BORROWED = new Set([1, 3]);
const PICARDY = 6;

function pitchClasses(event: TrackEvent): number[] {
  return event.pitches.map((midi) => midi % 12);
}

function chordAt(name: keyof typeof TRACKS, beat: number): Set<number> {
  return new Set(
    TRACKS[name].events
      .filter((event) => event.beat <= beat && beat < event.beat + event.beats)
      .flatMap(pitchClasses),
  );
}

describe("pitches", () => {
  it("reads note names into MIDI numbers and frequencies", () => {
    expect(midiOf("A4")).toBe(69);
    expect(midiOf("C4")).toBe(60);
    expect(midiOf("C#4")).toBe(midiOf("Db4"));
    expect(midiOf("Bb3")).toBe(58);
    expect(frequencyOf(69)).toBe(440);
    expect(frequencyOf(81)).toBeCloseTo(880);
    expect(octaveUp("D2")).toBe("D3");
    expect(() => midiOf("H4")).toThrow('Unknown pitch "H4"');
  });

  it("writes scores with runs, rhythms and octave figures", () => {
    expect(run(0.5, "D4", null)).toEqual([
      ["D4", 0.5],
      [null, 0.5],
    ]);
    expect(rhythm(["D4"], [0.75, -0.25])).toEqual([
      ["D4", 0.75],
      [null, 0.25],
    ]);
    expect(octaves(["D2"], 4, 0.5).map(([sound]) => sound)).toEqual([
      "D2",
      "D3",
      "D2",
      "D3",
    ]);
  });
});

describe("music", () => {
  it("keeps every part of a track the same length, in whole bars", () => {
    for (const [name, score] of Object.entries(SCORES)) {
      const lengths = new Set(score.parts.map(partLength));
      expect([...lengths], name).toHaveLength(1);
      expect([...lengths][0] % score.beatsPerBar, name).toBe(0);
    }
  });

  it("plays every note inside the range of its organ stop", () => {
    for (const track of Object.values(TRACKS)) {
      for (const event of track.events) {
        const stop = STOPS[event.stop];
        for (const midi of event.pitches) {
          expect(midi, `${track.name} at ${event.beat}`).toBeGreaterThanOrEqual(
            stop.lowest,
          );
          expect(midi, `${track.name} at ${event.beat}`).toBeLessThanOrEqual(
            stop.highest,
          );
        }
      }
    }
  });

  it("stays in D minor, borrowing only C sharp and E flat", () => {
    for (const track of Object.values(TRACKS)) {
      const strangers = track.events
        .flatMap(pitchClasses)
        .filter(
          (pitch) =>
            !D_MINOR.has(pitch) &&
            !BORROWED.has(pitch) &&
            !(track.name === "victory" && pitch === PICARDY),
        );
      expect(strangers, track.name).toEqual([]);
    }
  });

  it("takes a slow title, a stage around 90 BPM and bosses around 130", () => {
    expect(SCORES.title.tempo).toBeLessThanOrEqual(70);
    expect(SCORES.stage.tempo).toBeGreaterThanOrEqual(85);
    expect(SCORES.stage.tempo).toBeLessThanOrEqual(95);
    expect(SCORES.boss.tempo).toBeGreaterThanOrEqual(125);
    expect(SCORES.boss.tempo).toBeLessThanOrEqual(135);
    expect(
      [TRACKS.title, TRACKS.stage, TRACKS.boss].every((track) => track.loop),
    ).toBe(true);
    expect(TRACKS.defeat.loop || TRACKS.victory.loop).toBe(false);
  });

  it("gives the first boss a lighter, slower march in F major", () => {
    expect(SCORES.vibe.tempo).toBeLessThan(SCORES.boss.tempo);
    expect(TRACKS.vibe.loop).toBe(true);
    for (const beat of [1, TRACKS.vibe.length - 3]) {
      expect([...chordAt("vibe", beat)]).toEqual(
        expect.arrayContaining([5, 9, 0]),
      );
    }
  });

  it("gives every new stage its own take on the stage theme, from the same notes", () => {
    const takes = ["catacombs", "tapes", "lab", "cron"] as const;
    const base = SCORES.stage;
    const classes = (notes: readonly (readonly [unknown, number])[]) =>
      notes.flatMap(([sound]) =>
        typeof sound === "string" ? [midiOf(sound) % 12] : [],
      );
    for (const name of takes) {
      const take = SCORES[name];
      expect(partLength(take.parts[0]), name).toBe(partLength(base.parts[0]));
      expect(classes(take.parts[0].notes), name).toEqual(
        classes(base.parts[0].notes),
      );
      expect(TRACKS[name].loop, name).toBe(true);
    }
    expect(SCORES.catacombs.tempo).toBeLessThan(base.tempo);
    expect(SCORES.tapes.tempo).toBeGreaterThan(base.tempo);
    expect(SCORES.lab.parts[0].notes.length).toBeGreaterThan(
      base.parts[0].notes.length,
    );
    expect(SCORES.cron.parts.length).toBeGreaterThan(base.parts.length);
    expect(
      new Set(takes.map((name) => JSON.stringify(SCORES[name]))).size,
    ).toBe(takes.length);
  });

  it("holds the title over a tonic pedal, almost a drone", () => {
    const pedal = TRACKS.title.events.filter((event) => event.stop === "pedal");
    expect(pedal).toHaveLength(1);
    expect(pedal[0]).toMatchObject({ beat: 0, beats: TRACKS.title.length });
    expect(pedal[0].pitches.map((midi) => midi % 12)).toEqual([2]);
  });

  it("keeps the tonic pedal under the first bars of the boss theme", () => {
    const pedal = TRACKS.boss.events.filter(
      (event) => event.stop === "pedal" && event.beat < 24,
    );
    expect(new Set(pedal.flatMap(pitchClasses))).toEqual(new Set([2]));
  });

  it("darkens the stage and the bosses with diminished chords", () => {
    for (const name of ["title", "stage", "boss"] as const) {
      const diminished = Array.from(
        { length: TRACKS[name].length },
        (_, beat) => chordAt(name, beat),
      ).some((chord) => [1, 4, 7, 10].every((pitch) => chord.has(pitch)));
      expect(diminished, name).toBe(true);
    }
  });

  it("ends a Crash with one short, low chord", () => {
    const { defeat } = TRACKS;
    const seconds = defeat.length * defeat.secondsPerBeat;
    expect(seconds).toBeLessThanOrEqual(3.5);
    expect(new Set(defeat.events.map((event) => event.beat))).toEqual(
      new Set([0]),
    );
    expect(Math.min(...defeat.events.flatMap((event) => event.pitches))).toBe(
      midiOf("D2"),
    );
  });

  it("resolves the victory in D major with a Picardy third", () => {
    const { victory } = TRACKS;
    const last = chordAt("victory", victory.length - 1);
    expect(last).toEqual(new Set([2, 6, 9]));
    const first = chordAt("victory", 0);
    expect(first.has(PICARDY)).toBe(false);
    expect(first.has(10)).toBe(true);
  });
});
