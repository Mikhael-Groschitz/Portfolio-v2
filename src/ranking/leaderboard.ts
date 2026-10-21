import { RANKING } from "@/game/balance";

export interface RankingEntry {
  name: string;
  timeMs: number;
  createdAt: Date;
}

export interface StoredEntry extends RankingEntry {
  id: number;
}

const NAME_PATTERN = new RegExp(`^[A-Z]{${RANKING.nameLength}}$`);

export function isValidName(name: unknown): name is string {
  return typeof name === "string" && NAME_PATTERN.test(name);
}

export function isPlausibleTime(timeMs: unknown): timeMs is number {
  return (
    typeof timeMs === "number" &&
    Number.isInteger(timeMs) &&
    timeMs >= RANKING.minTimeMs &&
    timeMs <= RANKING.maxTimeMs
  );
}

export function compareEntries(a: StoredEntry, b: StoredEntry): number {
  return (
    a.timeMs - b.timeMs ||
    a.createdAt.getTime() - b.createdAt.getTime() ||
    a.id - b.id
  );
}

export function rankEntries(entries: readonly StoredEntry[]): StoredEntry[] {
  return [...entries].sort(compareEntries).slice(0, RANKING.size);
}

export function placementOf(
  top: readonly Pick<RankingEntry, "timeMs">[],
  timeMs: number,
): number | null {
  const ahead = top.filter((entry) => entry.timeMs <= timeMs).length;
  return ahead < RANKING.size ? ahead + 1 : null;
}
