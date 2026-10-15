import { BOSS_MUSIC } from "./music/boss";
import { DEFEAT_MUSIC, VICTORY_MUSIC } from "./music/endings";
import { STAGE_MUSIC } from "./music/stage";
import {
  CATACOMBS_MUSIC,
  CRON_MUSIC,
  LAB_MUSIC,
  TAPES_MUSIC,
} from "./music/stages";
import { TITLE } from "./music/title";
import { VIBE_MUSIC } from "./music/vibe";
import { midiOf } from "./notes";
import type { Note, Part, Score, StopName } from "./score";

export type TrackName =
  | "title"
  | "stage"
  | "catacombs"
  | "tapes"
  | "lab"
  | "cron"
  | "boss"
  | "vibe"
  | "defeat"
  | "victory";

export interface TrackEvent {
  beat: number;
  beats: number;
  pitches: readonly number[];
  stop: StopName;
  velocity: number;
}

export interface Track {
  name: TrackName;
  secondsPerBeat: number;
  length: number;
  loop: boolean;
  events: readonly TrackEvent[];
}

export function partLength(part: Part): number {
  return part.notes.reduce((total, [, beats]) => total + beats, 0);
}

function eventsOf(part: Part): TrackEvent[] {
  let beat = 0;
  return part.notes.flatMap(([sound, beats]: Note): TrackEvent[] => {
    const at = beat;
    beat += beats;
    if (sound === null) {
      return [];
    }
    const pitches = typeof sound === "string" ? [sound] : sound;
    return [
      {
        beat: at,
        beats,
        pitches: pitches.map(midiOf),
        stop: part.stop,
        velocity: part.velocity,
      },
    ];
  });
}

export function compile(name: TrackName, score: Score): Track {
  return {
    name,
    secondsPerBeat: 60 / score.tempo,
    length: Math.max(...score.parts.map(partLength)),
    loop: score.loop,
    events: score.parts.flatMap(eventsOf).sort((a, b) => a.beat - b.beat),
  };
}

export const SCORES: Readonly<Record<TrackName, Score>> = {
  title: TITLE,
  stage: STAGE_MUSIC,
  catacombs: CATACOMBS_MUSIC,
  tapes: TAPES_MUSIC,
  lab: LAB_MUSIC,
  cron: CRON_MUSIC,
  boss: BOSS_MUSIC,
  vibe: VIBE_MUSIC,
  defeat: DEFEAT_MUSIC,
  victory: VICTORY_MUSIC,
};

export const TRACKS = Object.fromEntries(
  Object.entries(SCORES).map(([name, score]) => [
    name,
    compile(name as TrackName, score),
  ]),
) as Readonly<Record<TrackName, Track>>;
