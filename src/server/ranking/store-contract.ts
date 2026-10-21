import { beforeEach, describe, expect, it } from "vitest";
import { RANKING } from "@/game/balance";
import {
  type LeaderboardStore,
  RestoreRefused,
  type Submission,
} from "./store";

let sequence = 0;

export function submission(
  timeMs: number,
  name = "AAA",
  overrides: Partial<Submission> = {},
): Submission {
  sequence += 1;
  return {
    jti: `t${sequence}-${Math.random().toString(36).slice(2, 12)}`,
    tokenExpiresAt: new Date(Date.now() + 3_600_000),
    name,
    timeMs,
    ...overrides,
  };
}

export const FULL_BOARD = Array.from(
  { length: RANKING.size },
  (_, index) => 201_000 + index * 1000,
);

export async function fill(
  store: LeaderboardStore,
  times: readonly number[] = FULL_BOARD,
): Promise<void> {
  for (const time of times) {
    await store.submit(submission(time));
  }
}

export function describeStoreContract(
  label: string,
  open: () => Promise<LeaderboardStore>,
): void {
  describe(`${label}: store contract`, () => {
    let store: LeaderboardStore;

    beforeEach(async () => {
      store = await open();
    });

    it("starts empty", async () => {
      expect(await store.top()).toEqual([]);
      expect(await store.list()).toEqual([]);
      expect(await store.counts()).toEqual({
        entries: 0,
        usedTokens: 0,
        rateLimits: 0,
      });
    });

    it("puts the first time in first place", async () => {
      const outcome = await store.submit(submission(230_000, "MGC"));
      expect(outcome.kind).toBe("entered");
      if (outcome.kind !== "entered") {
        return;
      }
      expect(outcome.position).toBe(1);
      expect(outcome.entry).toMatchObject({ name: "MGC", timeMs: 230_000 });
      expect(outcome.top).toHaveLength(1);
      expect(await store.top()).toEqual(outcome.top);
    });

    it("orders by time and answers each position", async () => {
      const positions = [];
      for (const time of [230_000, 210_000, 220_000]) {
        const outcome = await store.submit(submission(time));
        positions.push(outcome.kind === "entered" ? outcome.position : null);
      }
      expect(positions).toEqual([1, 1, 2]);
      expect((await store.top()).map(({ timeMs }) => timeMs)).toEqual([
        210_000, 220_000, 230_000,
      ]);
    });

    it("keeps the earlier one ahead on a tie", async () => {
      await store.submit(submission(220_000, "AAA"));
      const second = await store.submit(submission(220_000, "BBB"));
      expect(second).toMatchObject({ kind: "entered", position: 2 });
      expect((await store.top()).map(({ name }) => name)).toEqual([
        "AAA",
        "BBB",
      ]);
    });

    it("keeps only ten and drops the eleventh", async () => {
      await fill(store);
      const slower = await store.submit(submission(211_000));
      expect(slower.kind).toBe("outside");
      expect(slower.top).toHaveLength(RANKING.size);
      const faster = await store.submit(submission(200_500));
      expect(faster).toMatchObject({ kind: "entered", position: 1 });
      const rows = await store.list();
      expect(rows).toHaveLength(RANKING.size);
      expect(rows.map(({ timeMs }) => timeMs)).toEqual([
        200_500,
        ...FULL_BOARD.slice(0, -1),
      ]);
    });

    it("leaves a time equal to the tenth outside", async () => {
      await fill(store);
      const tie = await store.submit(submission(FULL_BOARD.at(-1) ?? 0));
      expect(tie.kind).toBe("outside");
      expect(await store.list()).toHaveLength(RANKING.size);
    });

    it("refuses a token used before, even with a better time", async () => {
      const first = submission(205_000);
      await store.submit(first);
      const again = await store.submit({ ...first, timeMs: 201_000 });
      expect(again.kind).toBe("reused");
      expect((await store.list()).map(({ timeMs }) => timeMs)).toEqual([
        205_000,
      ]);
    });

    it("spends the token even when the time stays outside", async () => {
      await fill(store);
      const late = submission(250_000);
      expect((await store.submit(late)).kind).toBe("outside");
      expect((await store.submit({ ...late, timeMs: 150_000 })).kind).toBe(
        "reused",
      );
      expect((await store.counts()).usedTokens).toBe(RANKING.size + 1);
    });

    it("counts hits per key inside a window", async () => {
      expect((await store.hit("ip-one", 60_000)).count).toBe(1);
      expect((await store.hit("ip-one", 60_000)).count).toBe(2);
      expect((await store.hit("ip-two", 60_000)).count).toBe(1);
      expect((await store.counts()).rateLimits).toBe(2);
    });

    it("removes one entry by id", async () => {
      const outcome = await store.submit(submission(240_000));
      const id = outcome.kind === "entered" ? outcome.entry.id : -1;
      expect(await store.remove(id)).toBe(true);
      expect(await store.remove(id)).toBe(false);
      expect(await store.list()).toEqual([]);
    });

    it("clears the whole ranking", async () => {
      await fill(store, [210_000, 220_000]);
      expect(await store.clear()).toBe(2);
      expect(await store.top()).toEqual([]);
    });

    it("restores entries and refuses to mix them with existing ones", async () => {
      const backup = [
        {
          name: "AAA",
          timeMs: 230_000,
          createdAt: new Date("2026-10-01T10:00:00.000Z"),
        },
        {
          name: "BBB",
          timeMs: 210_000,
          createdAt: new Date("2026-10-02T10:00:00.000Z"),
        },
      ];
      expect(await store.restore(backup, false)).toBe(2);
      await expect(store.restore(backup, false)).rejects.toBeInstanceOf(
        RestoreRefused,
      );
      expect(await store.restore(backup.slice(0, 1), true)).toBe(1);
      const rows = await store.list();
      expect(
        rows.map(({ name, timeMs, createdAt }) => ({
          name,
          timeMs,
          createdAt,
        })),
      ).toEqual(backup.slice(0, 1));
    });

    it("purges only expired tokens", async () => {
      await store.submit(
        submission(250_000, "OLD", {
          tokenExpiresAt: new Date(Date.now() - 60_000),
        }),
      );
      await store.submit(submission(260_000, "NEW"));
      expect((await store.expired()).usedTokens).toBe(1);
      expect((await store.purge()).usedTokens).toBe(1);
      expect((await store.counts()).usedTokens).toBe(1);
      expect((await store.expired()).usedTokens).toBe(0);
    });
  });
}
