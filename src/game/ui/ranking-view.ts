import { RANKING } from "../balance";
import { formatRankingTime } from "@/ranking/format";
import type { PublicEntry } from "@/ranking/protocol";
import type { GameTexts } from "./texts";

export const EMPTY_NAME = "---";
export const EMPTY_TIME = "--:--.--";

export type RankingState =
  | { kind: "loading" }
  | { kind: "ready"; entries: PublicEntry[] }
  | { kind: "off" }
  | { kind: "error" };

export interface RankingRow {
  position: number;
  name: string;
  time: string;
  empty: boolean;
  highlighted: boolean;
}

export function rankingRows(
  state: RankingState,
  highlight: number | null = null,
): RankingRow[] {
  const entries = state.kind === "ready" ? state.entries : [];
  return Array.from({ length: RANKING.size }, (_, index) => {
    const position = index + 1;
    const entry = entries.find((item) => item.position === position);
    return entry
      ? {
          position,
          name: entry.name,
          time: formatRankingTime(entry.timeMs),
          empty: false,
          highlighted: highlight === position,
        }
      : {
          position,
          name: EMPTY_NAME,
          time: EMPTY_TIME,
          empty: true,
          highlighted: false,
        };
  });
}

export function rankingMessage(
  state: RankingState,
  text: GameTexts,
): string | null {
  const messages = text.panels.ranking;
  switch (state.kind) {
    case "loading":
      return messages.loading;
    case "off":
      return messages.off;
    case "error":
      return messages.error;
    default:
      return state.entries.length === 0 ? messages.empty : null;
  }
}

export function canRetry(state: RankingState): boolean {
  return state.kind === "off" || state.kind === "error";
}
