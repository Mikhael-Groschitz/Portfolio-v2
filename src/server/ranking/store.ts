import type { RankingEntry, StoredEntry } from "@/ranking/leaderboard";
import type { Environment } from "../env";

export interface Submission {
  jti: string;
  tokenExpiresAt: Date;
  name: string;
  timeMs: number;
}

export type SubmitOutcome =
  | {
      kind: "entered";
      entry: StoredEntry;
      position: number;
      top: StoredEntry[];
    }
  | { kind: "outside"; top: StoredEntry[] }
  | { kind: "reused"; top: StoredEntry[] };

export interface TableCounts {
  entries: number;
  usedTokens: number;
  rateLimits: number;
}

export interface ExpiredRows {
  usedTokens: number;
  rateLimits: number;
}

export interface Hit {
  count: number;
  resetAt: Date;
}

export interface LeaderboardStore {
  top(): Promise<StoredEntry[]>;
  submit(submission: Submission): Promise<SubmitOutcome>;
  hit(key: string, windowMs: number): Promise<Hit>;
  list(): Promise<StoredEntry[]>;
  counts(): Promise<TableCounts>;
  expired(): Promise<ExpiredRows>;
  remove(id: number): Promise<boolean>;
  clear(): Promise<number>;
  restore(entries: readonly RankingEntry[], replace: boolean): Promise<number>;
  purge(): Promise<ExpiredRows>;
  close(): Promise<void>;
}

export class RestoreRefused extends Error {
  constructor(public readonly existing: number) {
    super(
      `O ranking já tem ${existing} entradas. Use --replace para substituir.`,
    );
  }
}

export type StoreChoice =
  { kind: "memory" } | { kind: "prisma"; url: string } | { kind: "off" };

export function chooseStore(env: Environment): StoreChoice {
  if (env.NODE_ENV !== "production" && env.RANKING_STORE === "memory") {
    return { kind: "memory" };
  }
  const url = env.DATABASE_URL?.trim();
  return url ? { kind: "prisma", url } : { kind: "off" };
}
