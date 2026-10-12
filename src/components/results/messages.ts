import {
  formatCompletionTime,
  formatCount,
  formatDuration,
} from "@/content/format";
import type { ResultsText } from "@/content/types";
import type { ExecutionOutcome, StatementResult } from "@/engine/execute";
import type { QueryHint } from "@/engine/hints";

interface MessageBlock {
  error: string | null;
  text: string;
}

export interface RunTiming {
  completedAt: Date | null;
  elapsedMs: number;
}

type ErrorOutcome = Extract<ExecutionOutcome, { kind: "error" }>;

type SqlError = ErrorOutcome["error"];

type ResultsOutcome = Extract<ExecutionOutcome, { kind: "results" }>;

interface Section {
  lines: string[];
  weight: number;
}

export function errorLines(
  { number, level, state, line, message }: SqlError,
  text: ResultsText,
): string {
  const header = text.errorHeader
    .replace("{number}", String(number))
    .replace("{level}", String(level))
    .replace("{state}", String(state))
    .replace("{line}", String(line));
  return `${header}\n${message}`;
}

function hintLine(hint: QueryHint, text: ResultsText): string {
  switch (hint.kind) {
    case "similar":
      return text.similarHint.replace("{command}", hint.command);
    case "help":
      return text.helpHint.replace("{command}", hint.command);
    case "offline":
      return text.offlineHint;
    case "date":
      return text.dateHint;
  }
}

function effectLines(
  { effect, database }: ResultsOutcome,
  text: ResultsText,
): string[] {
  const changed = text.databaseChanged.replace("{database}", database);
  switch (effect) {
    case "travel":
      return [changed, text.travelFarewell];
    case "return":
      return [changed, text.returned];
    case "regenerate":
      return [text.regenerated];
    case "game":
      return [text.gameStarted];
    default:
      return [];
  }
}

function statementSections(
  results: readonly StatementResult[],
  text: ResultsText,
): Section[] {
  const sections = new Map<number, Section>();
  for (const result of results) {
    const section = sections.get(result.statement) ?? { lines: [], weight: 1 };
    if (result.kind === "rows") {
      const count = result.resultSet.rows.length;
      section.lines.push(formatCount(text.rowsAffected, count));
      section.weight += count;
    } else if (result.kind === "info") {
      section.lines.push(result.text);
    }
    sections.set(result.statement, section);
  }
  return [...sections.values()].filter((section) => section.lines.length > 0);
}

function sectionsOf(outcome: ResultsOutcome, text: ResultsText): Section[] {
  const sections = statementSections(outcome.results, text);
  const effect = effectLines(outcome, text);
  if (effect.length > 0) {
    sections.push({ lines: effect, weight: 1 });
  }
  return sections.length > 0
    ? sections
    : [{ lines: [text.commandsCompleted], weight: 1 }];
}

function timed(
  sections: readonly Section[],
  text: ResultsText,
  { completedAt, elapsedMs }: RunTiming,
): string[] {
  if (!completedAt) {
    return sections.map((section) => section.lines.join("\n"));
  }
  const total = sections.reduce((sum, section) => sum + section.weight, 0);
  const elapsed = Math.max(0, Math.round(elapsedMs));
  const startedAt = completedAt.getTime() - elapsed;
  let spent = 0;
  return sections.map((section, index) => {
    const last = index === sections.length - 1;
    const duration = last
      ? elapsed - spent
      : Math.round((elapsed * section.weight) / total);
    spent += duration;
    return [
      ...section.lines,
      `${text.executionTime}: ${formatDuration(duration)}`,
      `${text.completionTime}: ${formatCompletionTime(new Date(startedAt + spent))}`,
    ].join("\n");
  });
}

export function messageBlocks(
  outcome: ExecutionOutcome,
  text: ResultsText,
  timing: RunTiming,
): MessageBlock[] {
  if (outcome.kind === "error") {
    const completion = timing.completedAt
      ? `\n\n${text.completionTime}: ${formatCompletionTime(timing.completedAt)}`
      : "";
    return [
      {
        error: errorLines(outcome.error, text),
        text: `\n\n${hintLine(outcome.hint, text)}${completion}`,
      },
    ];
  }
  return timed(sectionsOf(outcome, text), text, timing).map((block) => ({
    error: null,
    text: block,
  }));
}
