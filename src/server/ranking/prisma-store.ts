import { RANKING } from "@/game/balance";
import { placementOf, rankEntries } from "@/ranking/leaderboard";
import type { PrismaClient } from "../db/client";
import { type LeaderboardStore, RestoreRefused } from "./store";

const TOP_LOCK = BigInt(1_400_014);
const ORDER = [{ timeMs: "asc" }, { createdAt: "asc" }, { id: "asc" }] as const;
const COLUMNS = {
  id: true,
  name: true,
  timeMs: true,
  createdAt: true,
} as const;
export interface TransactionLimits {
  maxWait: number;
  timeout: number;
}

export const TRANSACTION: TransactionLimits = {
  maxWait: 1_500,
  timeout: 3_000,
};

type Transaction = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

function readTop(client: PrismaClient | Transaction) {
  return client.leaderboardEntry.findMany({
    orderBy: [...ORDER],
    take: RANKING.size,
    select: COLUMNS,
  });
}

async function lockTop(tx: Transaction): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${TOP_LOCK})`;
}

export function createPrismaStore(
  prisma: PrismaClient,
  limits: TransactionLimits = TRANSACTION,
): LeaderboardStore {
  return {
    top() {
      return readTop(prisma);
    },
    submit({ jti, tokenExpiresAt, name, timeMs }) {
      return prisma.$transaction(async (tx) => {
        await lockTop(tx);
        const marked = await tx.$executeRaw`
          INSERT INTO used_token (jti, expires_at)
          VALUES (${jti}, ${tokenExpiresAt})
          ON CONFLICT (jti) DO NOTHING`;
        const top = await readTop(tx);
        if (marked === 0) {
          return { kind: "reused", top } as const;
        }
        const position = placementOf(top, timeMs);
        if (position === null) {
          return { kind: "outside", top } as const;
        }
        const entry = await tx.leaderboardEntry.create({
          data: { name, timeMs },
          select: COLUMNS,
        });
        await tx.$executeRaw`
          DELETE FROM leaderboard_entry
          WHERE id IN (
            SELECT id FROM leaderboard_entry
            ORDER BY time_ms, created_at, id
            OFFSET ${RANKING.size}
          )`;
        return {
          kind: "entered",
          entry,
          position,
          top: rankEntries([...top, entry]),
        } as const;
      }, limits);
    },
    async hit(key, windowMs) {
      const [row] = await prisma.$queryRaw<{ count: number; reset_at: Date }[]>`
        INSERT INTO rate_limit (key, count, reset_at)
        VALUES (${key}, 1, now() + ${windowMs}::integer * interval '1 millisecond')
        ON CONFLICT (key) DO UPDATE SET
          count = CASE WHEN rate_limit.reset_at <= now() THEN 1 ELSE rate_limit.count + 1 END,
          reset_at = CASE WHEN rate_limit.reset_at <= now() THEN EXCLUDED.reset_at ELSE rate_limit.reset_at END
        RETURNING count, reset_at`;
      return { count: row.count, resetAt: row.reset_at };
    },
    list() {
      return prisma.leaderboardEntry.findMany({
        orderBy: [...ORDER],
        select: COLUMNS,
      });
    },
    async counts() {
      const [row] = await prisma.$queryRaw<
        { entries: bigint; used_tokens: bigint; rate_limits: bigint }[]
      >`
        SELECT
          (SELECT count(*) FROM leaderboard_entry) AS entries,
          (SELECT count(*) FROM used_token) AS used_tokens,
          (SELECT count(*) FROM rate_limit) AS rate_limits`;
      return {
        entries: Number(row.entries),
        usedTokens: Number(row.used_tokens),
        rateLimits: Number(row.rate_limits),
      };
    },
    async expired() {
      const [row] = await prisma.$queryRaw<
        { used_tokens: bigint; rate_limits: bigint }[]
      >`
        SELECT
          (SELECT count(*) FROM used_token WHERE expires_at <= now()) AS used_tokens,
          (SELECT count(*) FROM rate_limit WHERE reset_at <= now()) AS rate_limits`;
      return {
        usedTokens: Number(row.used_tokens),
        rateLimits: Number(row.rate_limits),
      };
    },
    async remove(id) {
      const { count } = await prisma.leaderboardEntry.deleteMany({
        where: { id },
      });
      return count > 0;
    },
    clear() {
      return prisma.$transaction(async (tx) => {
        await lockTop(tx);
        const { count } = await tx.leaderboardEntry.deleteMany();
        return count;
      }, limits);
    },
    restore(entries, replace) {
      return prisma.$transaction(async (tx) => {
        await lockTop(tx);
        const existing = await tx.leaderboardEntry.count();
        if (existing > 0 && !replace) {
          throw new RestoreRefused(existing);
        }
        await tx.leaderboardEntry.deleteMany();
        const { count } = await tx.leaderboardEntry.createMany({
          data: entries.map(({ name, timeMs, createdAt }) => ({
            name,
            timeMs,
            createdAt,
          })),
        });
        return count;
      }, limits);
    },
    async purge() {
      const [row] = await prisma.$queryRaw<
        { used_tokens: bigint; rate_limits: bigint }[]
      >`
        WITH tokens AS (
          DELETE FROM used_token WHERE expires_at <= now() RETURNING 1
        ), limits AS (
          DELETE FROM rate_limit WHERE reset_at <= now() RETURNING 1
        )
        SELECT
          (SELECT count(*) FROM tokens) AS used_tokens,
          (SELECT count(*) FROM limits) AS rate_limits`;
      return {
        usedTokens: Number(row.used_tokens),
        rateLimits: Number(row.rate_limits),
      };
    },
    close() {
      return prisma.$disconnect();
    },
  };
}
