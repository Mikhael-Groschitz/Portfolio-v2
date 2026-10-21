import {
  type RankingEntry,
  type StoredEntry,
  compareEntries,
  placementOf,
  rankEntries,
} from "@/ranking/leaderboard";
import {
  type ExpiredRows,
  type LeaderboardStore,
  RestoreRefused,
} from "./store";

interface Counter {
  count: number;
  resetAt: Date;
}

export function createMemoryStore(
  now: () => Date = () => new Date(),
): LeaderboardStore {
  let entries: StoredEntry[] = [];
  let nextId = 1;
  const usedTokens = new Map<string, Date>();
  const counters = new Map<string, Counter>();

  function add(entry: RankingEntry): StoredEntry {
    const stored = { id: nextId, ...entry };
    nextId += 1;
    entries.push(stored);
    return stored;
  }

  function expiredRows(): ExpiredRows {
    const moment = now().getTime();
    return {
      usedTokens: [...usedTokens.values()].filter(
        (expiresAt) => expiresAt.getTime() <= moment,
      ).length,
      rateLimits: [...counters.values()].filter(
        ({ resetAt }) => resetAt.getTime() <= moment,
      ).length,
    };
  }

  return {
    async top() {
      return rankEntries(entries);
    },
    async submit({ jti, tokenExpiresAt, name, timeMs }) {
      const top = rankEntries(entries);
      if (usedTokens.has(jti)) {
        return { kind: "reused", top };
      }
      usedTokens.set(jti, tokenExpiresAt);
      const position = placementOf(top, timeMs);
      if (position === null) {
        return { kind: "outside", top };
      }
      const entry = add({ name, timeMs, createdAt: now() });
      entries = rankEntries(entries);
      return { kind: "entered", entry, position, top: entries };
    },
    async hit(key, windowMs) {
      const moment = now();
      const current = counters.get(key);
      const counter =
        current && current.resetAt > moment
          ? { count: current.count + 1, resetAt: current.resetAt }
          : { count: 1, resetAt: new Date(moment.getTime() + windowMs) };
      counters.set(key, counter);
      return { ...counter };
    },
    async list() {
      return [...entries].sort(compareEntries);
    },
    async counts() {
      return {
        entries: entries.length,
        usedTokens: usedTokens.size,
        rateLimits: counters.size,
      };
    },
    async expired() {
      return expiredRows();
    },
    async remove(id) {
      const before = entries.length;
      entries = entries.filter((entry) => entry.id !== id);
      return entries.length < before;
    },
    async clear() {
      const removed = entries.length;
      entries = [];
      return removed;
    },
    async restore(restored, replace) {
      if (entries.length > 0 && !replace) {
        throw new RestoreRefused(entries.length);
      }
      entries = [];
      for (const entry of restored) {
        add(entry);
      }
      return restored.length;
    },
    async purge() {
      const removed = expiredRows();
      const moment = now().getTime();
      for (const [jti, expiresAt] of usedTokens) {
        if (expiresAt.getTime() <= moment) {
          usedTokens.delete(jti);
        }
      }
      for (const [key, { resetAt }] of counters) {
        if (resetAt.getTime() <= moment) {
          counters.delete(key);
        }
      }
      return removed;
    },
    async close() {},
  };
}
