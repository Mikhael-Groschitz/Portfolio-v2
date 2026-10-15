import { type Score, vary } from "../score";
import { STAGE_MUSIC } from "./stage";

export const CATACOMBS_MUSIC: Score = vary(STAGE_MUSIC, {
  tempo: 74,
  parts: [
    { stop: "flute", octaves: -1, velocity: 0.7 },
    { velocity: 0.38 },
    { velocity: 0.82 },
  ],
});

export const TAPES_MUSIC: Score = vary(STAGE_MUSIC, {
  tempo: 104,
  parts: [{ stop: "flute", octaves: 1 }, { octaves: 1 }, {}],
});

export const LAB_MUSIC: Score = vary(STAGE_MUSIC, {
  tempo: 96,
  parts: [
    { stop: "reed", staccato: true, velocity: 0.7 },
    { staccato: true },
    { staccato: true },
  ],
});

export const CRON_MUSIC: Score = vary(STAGE_MUSIC, {
  tempo: 92,
  parts: [{ stop: "plenum", velocity: 0.5 }, {}, { velocity: 0.85 }],
  doubles: [{ of: 0, stop: "flute", octaves: 1, velocity: 0.32 }],
});
