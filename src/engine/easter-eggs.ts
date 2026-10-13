import {
  CATALOG,
  type CatalogObject,
  DATABASE,
  SCHEMA,
  V1_DATABASE,
  objectReferences,
} from "./catalog";
import {
  DATABASE_OFFLINE,
  DATE_CONVERSION_FAILED,
  DATE_IN_THE_FUTURE,
  type FixedError,
} from "./errors";
import type { ExecutionOutcome, StatementOutput } from "./execute";
import type { QueryHint } from "./hints";
import { normalizeStatement } from "./normalize";

export const V2_LAUNCH_DATE = "2026-10-12";

export type Effect = "travel" | "regenerate" | "return" | "game";

export interface EasterEggContext {
  now?: Date;
  v1Available: boolean;
  run: (statement: string) => readonly StatementOutput[];
}

export type EasterEggOutcome =
  | { kind: "results"; results: readonly StatementOutput[]; effect?: Effect }
  | { kind: "error"; error: FixedError; hint: QueryHint };

interface EasterEgg {
  match: (statement: string) => boolean;
  run: (statement: string, context: EasterEggContext) => EasterEggOutcome;
}

const SQL_DATE =
  /^(\d{4})-?(\d{2})-?(\d{2})(?:[ t](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,7})?)?)?$/;

const LAUNCH = new Date(`${V2_LAUNCH_DATE}T00:00:00Z`);

const USE_V1 = normalizeStatement(`USE ${V1_DATABASE}`);

const REGENERATE = new Set(
  objectReferences("sp_Regenerate").flatMap((target) =>
    [target, `EXEC ${target}`, `EXECUTE ${target}`].map(normalizeStatement),
  ),
);

const KONAMI = new Set(
  objectReferences("konami").map((target) =>
    normalizeStatement(`SELECT * FROM ${target}`),
  ),
);

const TABLES = new Map(
  CATALOG.filter((object) => object.kind === "table").map(
    (object): [string, CatalogObject] => [object.name.toLowerCase(), object],
  ),
);

const TEMPORAL_QUERY = new RegExp(
  String.raw`^select \* from (?:${DATABASE.toLowerCase()}\.)?(?:${SCHEMA}\.)?(\w+) for system_time as of n?'([^']*)'$`,
);

export function parseSqlDate(text: string): Date | null {
  const match = SQL_DATE.exec(text.trim());
  if (!match) {
    return null;
  }
  const [year, month, day, hours, minutes, seconds] = match
    .slice(1, 7)
    .map((part) => Number(part ?? 0));
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hours, minutes, seconds, 0);
  const valid =
    year >= 1 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    hours < 24 &&
    minutes < 60 &&
    seconds < 60;
  return valid ? date : null;
}

function temporalQuery(
  statement: string,
): { table: CatalogObject; date: Date | null } | null {
  const match = TEMPORAL_QUERY.exec(statement);
  const table = match ? TABLES.get(match[1]) : undefined;
  return match && table ? { table, date: parseSqlDate(match[2]) } : null;
}

function travel({ v1Available }: EasterEggContext): EasterEggOutcome {
  return v1Available
    ? { kind: "results", results: [], effect: "travel" }
    : { kind: "error", error: DATABASE_OFFLINE, hint: { kind: "offline" } };
}

function travelInTime(
  statement: string,
  context: EasterEggContext,
): EasterEggOutcome {
  const query = temporalQuery(statement);
  if (!query?.date) {
    return {
      kind: "error",
      error: DATE_CONVERSION_FAILED,
      hint: { kind: "date" },
    };
  }
  if (query.date > (context.now ?? new Date())) {
    return { kind: "error", error: DATE_IN_THE_FUTURE, hint: { kind: "date" } };
  }
  if (query.date < LAUNCH) {
    return travel(context);
  }
  return {
    kind: "results",
    results: context.run(`SELECT * FROM ${SCHEMA}.${query.table.name}`),
  };
}

export const EASTER_EGGS: readonly EasterEgg[] = [
  {
    match: (statement) => statement === USE_V1,
    run: (_, context) => travel(context),
  },
  {
    match: (statement) => temporalQuery(statement) !== null,
    run: travelInTime,
  },
  {
    match: (statement) => REGENERATE.has(statement),
    run: () => ({ kind: "results", results: [], effect: "regenerate" }),
  },
  {
    match: (statement) => KONAMI.has(statement),
    run: () => ({ kind: "results", results: [], effect: "game" }),
  },
];

export function databaseAfter(effect: Effect | undefined): string {
  return effect === "travel" ? V1_DATABASE : DATABASE;
}

export function arrivalOutcome(): ExecutionOutcome {
  return { kind: "results", database: DATABASE, results: [], effect: "return" };
}
