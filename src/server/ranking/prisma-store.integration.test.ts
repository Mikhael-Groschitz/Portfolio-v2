import { afterAll, describe, expect, it } from "vitest";
import { RANKING } from "@/game/balance";
import { createBackup, readBackup } from "@/ranking/backup";
import { createPrismaClient } from "../db/client";
import { loadEnvironment } from "../env";
import { createPrismaStore } from "./prisma-store";
import { describeStoreContract, fill, submission } from "./store-contract";
import { integrationTarget } from "./target";

const REMOTE_LIMITS = { maxWait: 30_000, timeout: 60_000 };

loadEnvironment();
const check = integrationTarget(process.env);
if (!check.ok) {
  throw new Error(check.reason);
}
const prisma = createPrismaClient(check.url, { max: 10 });
const store = createPrismaStore(
  prisma,
  check.target.kind === "local" ? undefined : REMOTE_LIMITS,
);

async function wipe(): Promise<void> {
  await prisma.$executeRaw`TRUNCATE leaderboard_entry, used_token, rate_limit RESTART IDENTITY`;
}

afterAll(() => store.close());

describeStoreContract("Prisma", async () => {
  await wipe();
  return store;
});

describe("Prisma store against PostgreSQL", () => {
  it("keeps the ten best of 25 simultaneous submissions", async () => {
    await wipe();
    const times = Array.from(
      { length: 25 },
      (_, index) => 200_000 + index * 997,
    );
    const shuffled = [...times].sort(() => Math.random() - 0.5);
    const outcomes = await Promise.all(
      shuffled.map((time) => store.submit(submission(time))),
    );
    expect(outcomes.every(({ kind }) => kind !== "reused")).toBe(true);
    const rows = await store.list();
    expect(rows).toHaveLength(RANKING.size);
    expect(rows.map(({ timeMs }) => timeMs)).toEqual(
      times.slice(0, RANKING.size),
    );
    expect((await store.counts()).usedTokens).toBe(25);
  });

  it("lets only one of two simultaneous uses of a token through", async () => {
    await wipe();
    const token = submission(205_000);
    const outcomes = await Promise.all([
      store.submit(token),
      store.submit({ ...token, timeMs: 201_000 }),
    ]);
    expect(outcomes.map(({ kind }) => kind).sort()).toEqual([
      "entered",
      "reused",
    ]);
    expect(await store.list()).toHaveLength(1);
  });

  it("starts a new window once the database clock passes it", async () => {
    await wipe();
    await store.hit("ip", 60_000);
    await store.hit("ip", 60_000);
    await prisma.$executeRaw`UPDATE rate_limit SET reset_at = now() - interval '1 second'`;
    expect((await store.expired()).rateLimits).toBe(1);
    expect((await store.hit("ip", 60_000)).count).toBe(1);
    await prisma.$executeRaw`UPDATE rate_limit SET reset_at = now() - interval '1 second'`;
    expect(await store.purge()).toEqual({ usedTokens: 0, rateLimits: 1 });
    expect((await store.counts()).rateLimits).toBe(0);
  });

  it("goes through export and import keeping names, times and dates", async () => {
    await wipe();
    await fill(store, [215_000, 205_000, 225_000]);
    const before = await store.list();
    const text = JSON.stringify(createBackup(before, new Date()));
    await store.clear();
    const reading = readBackup(text, new Date());
    expect(reading.ok).toBe(true);
    if (!reading.ok) {
      return;
    }
    expect(await store.restore(reading.entries, false)).toBe(3);
    const after = await store.list();
    const shape = (rows: typeof before) =>
      rows.map(({ name, timeMs, createdAt }) => ({ name, timeMs, createdAt }));
    expect(shape(after)).toEqual(shape(before));
  });

  it("lets the database refuse a malformed name", async () => {
    await wipe();
    await expect(
      prisma.leaderboardEntry.create({
        data: { name: "ab1", timeMs: 200_000 },
      }),
    ).rejects.toThrow();
  });
});
