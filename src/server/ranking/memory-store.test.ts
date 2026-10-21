import { describe, expect, it } from "vitest";
import { createMemoryStore } from "./memory-store";
import { describeStoreContract, submission } from "./store-contract";

describeStoreContract("memory", async () => createMemoryStore());

describe("memory store clock", () => {
  function clock(start: number) {
    let now = start;
    return {
      now: () => new Date(now),
      advance: (ms: number) => {
        now += ms;
      },
    };
  }

  it("starts a new window once the old one ends", async () => {
    const time = clock(1_000_000);
    const store = createMemoryStore(time.now);
    await store.hit("ip", 60_000);
    expect((await store.hit("ip", 60_000)).count).toBe(2);
    time.advance(60_000);
    expect(await store.hit("ip", 60_000)).toEqual({
      count: 1,
      resetAt: new Date(1_120_000),
    });
  });

  it("purges counters whose window ended", async () => {
    const time = clock(1_000_000);
    const store = createMemoryStore(time.now);
    await store.hit("old", 1_000);
    time.advance(5_000);
    await store.hit("new", 60_000);
    expect(await store.expired()).toEqual({ usedTokens: 0, rateLimits: 1 });
    expect(await store.purge()).toEqual({ usedTokens: 0, rateLimits: 1 });
    expect((await store.counts()).rateLimits).toBe(1);
  });

  it("stamps each entry with the store clock", async () => {
    const store = createMemoryStore(() => new Date("2026-10-20T12:00:00.000Z"));
    const outcome = await store.submit(submission(240_000));
    expect(outcome.kind === "entered" && outcome.entry.createdAt).toEqual(
      new Date("2026-10-20T12:00:00.000Z"),
    );
  });
});
