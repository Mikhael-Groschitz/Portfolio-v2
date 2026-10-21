import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";

export const POOL = {
  max: 3,
  connectionTimeoutMillis: 2_500,
  idleTimeoutMillis: 10_000,
  query_timeout: 3_000,
} as const;

export type PoolSize = Partial<Record<keyof typeof POOL, number>>;

export function createPrismaClient(
  connectionString: string,
  pool: PoolSize = {},
): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, ...POOL, ...pool }),
  });
}

export type { PrismaClient };
