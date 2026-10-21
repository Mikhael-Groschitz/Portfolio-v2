import { formatRankingTime } from "@/ranking/format";
import { placementOf } from "@/ranking/leaderboard";
import type { PublicEntry } from "@/ranking/protocol";
import type { ClosedReason, SubmitOutcome, Ticket } from "./ranking-client";
import type { RankingState } from "./ranking-view";
import { type GameTexts, fill } from "./texts";

export type EntryProblem = keyof GameTexts["record"]["problems"];

export type Finish =
  | { kind: "quiet" | "ineligible" | "checking" | "unknown" | "sent" }
  | {
      kind: "entry";
      position: number;
      saving: boolean;
      problem: EntryProblem | null;
    }
  | { kind: "saved"; position: number; name: string }
  | { kind: "outside"; tenthMs: number }
  | { kind: "closed"; reason: ClosedReason };

export interface Saved {
  finish: Finish;
  entries: PublicEntry[] | null;
  highlight: number | null;
  reload: boolean;
}

export function toRankingMs(playMs: number): number {
  return Math.floor(playMs);
}

export function planFinish(
  ticket: Ticket,
  ranking: RankingState,
  timeMs: number,
): Finish {
  if (ticket.kind === "off" || ranking.kind === "off") {
    return { kind: "quiet" };
  }
  if (ranking.kind === "loading") {
    return ticket.kind === "token"
      ? { kind: "checking" }
      : { kind: "ineligible" };
  }
  if (ranking.kind === "error") {
    return ticket.kind === "token"
      ? { kind: "unknown" }
      : { kind: "ineligible" };
  }
  const position = placementOf(ranking.entries, timeMs);
  if (position === null) {
    return {
      kind: "outside",
      tenthMs: ranking.entries.at(-1)?.timeMs ?? timeMs,
    };
  }
  return ticket.kind === "token"
    ? { kind: "entry", position, saving: false, problem: null }
    : { kind: "ineligible" };
}

function rowOf(
  entries: readonly PublicEntry[],
  name: string,
  timeMs: number,
): PublicEntry | undefined {
  return entries.find(
    (entry) => entry.name === name && entry.timeMs === timeMs,
  );
}

export function findSaved(
  entries: PublicEntry[],
  name: string,
  timeMs: number,
): Saved {
  const row = rowOf(entries, name, timeMs);
  return row
    ? {
        finish: { kind: "saved", position: row.position, name },
        entries,
        highlight: row.position,
        reload: false,
      }
    : { finish: { kind: "sent" }, entries, highlight: null, reload: false };
}

export function afterSubmit(
  outcome: SubmitOutcome,
  {
    name,
    timeMs,
    position,
  }: { name: string; timeMs: number; position: number },
): Saved {
  switch (outcome.kind) {
    case "entered":
      return {
        finish: { kind: "saved", position: outcome.position, name },
        entries: outcome.entries,
        highlight: outcome.position,
        reload: false,
      };
    case "outside":
      return {
        finish: {
          kind: "outside",
          tenthMs: outcome.entries.at(-1)?.timeMs ?? timeMs,
        },
        entries: outcome.entries,
        highlight: null,
        reload: false,
      };
    case "used":
      return outcome.entries
        ? findSaved(outcome.entries, name, timeMs)
        : {
            finish: { kind: "entry", position, saving: true, problem: null },
            entries: null,
            highlight: null,
            reload: true,
          };
    case "refused":
      return {
        finish: { kind: "entry", position, saving: false, problem: "refused" },
        entries: null,
        highlight: null,
        reload: false,
      };
    case "retry":
      return {
        finish: { kind: "entry", position, saving: false, problem: "failed" },
        entries: null,
        highlight: null,
        reload: false,
      };
    case "closed":
      return {
        finish: { kind: "closed", reason: outcome.reason },
        entries: null,
        highlight: null,
        reload: false,
      };
  }
}

export function placeName(position: number, text: GameTexts): string {
  return text.record.places[position - 1] ?? String(position);
}

export function finishLine(
  finish: Finish,
  timeMs: number,
  text: GameTexts,
): string | null {
  const { lines } = text.record;
  switch (finish.kind) {
    case "quiet":
    case "entry":
      return null;
    case "checking":
    case "unknown":
    case "ineligible":
    case "sent":
      return lines[finish.kind];
    case "saved":
      return fill(lines.saved, {
        name: finish.name,
        place: placeName(finish.position, text),
      });
    case "outside":
      return finish.tenthMs === timeMs
        ? lines.tie
        : fill(lines.outside, {
            missing: formatRankingTime(timeMs - finish.tenthMs),
            tenth: formatRankingTime(finish.tenthMs),
          });
    case "closed":
      return lines.closed[finish.reason];
  }
}

export function finishAnnouncement(
  finish: Finish,
  timeMs: number,
  text: GameTexts,
): string | null {
  if (finish.kind === "entry") {
    if (finish.problem) {
      return text.record.problems[finish.problem];
    }
    return finish.saving
      ? text.record.saving
      : fill(text.record.announce, {
          place: placeName(finish.position, text),
          time: formatRankingTime(timeMs),
        });
  }
  if (finish.kind === "saved") {
    return fill(text.record.lines.savedAnnounce, {
      name: finish.name,
      place: placeName(finish.position, text),
    });
  }
  return finishLine(finish, timeMs, text);
}
