import "server-only";
import { createPrismaClient } from "../db/client";
import { type RankingApi, createRankingApi, minTimeFor } from "./api";
import { createMemoryStore } from "./memory-store";
import { createPrismaStore } from "./prisma-store";
import { type LeaderboardStore, chooseStore } from "./store";
import { readSecret } from "./token";

const holder = globalThis as unknown as {
  rankingStore?: LeaderboardStore | null;
  rankingApi?: RankingApi;
};

function openStore(): LeaderboardStore | null {
  const choice = chooseStore(process.env);
  if (choice.kind === "memory") {
    return createMemoryStore();
  }
  if (choice.kind === "prisma") {
    return createPrismaStore(createPrismaClient(choice.url));
  }
  return null;
}

export function rankingStore(): LeaderboardStore | null {
  if (holder.rankingStore === undefined) {
    holder.rankingStore = openStore();
  }
  return holder.rankingStore;
}

export function rankingApi(): RankingApi {
  holder.rankingApi ??= createRankingApi({
    store: rankingStore,
    secret: () => readSecret(process.env),
    now: () => Date.now(),
    log: (message) => console.warn(message),
    minTimeMs: minTimeFor(process.env),
  });
  return holder.rankingApi;
}
