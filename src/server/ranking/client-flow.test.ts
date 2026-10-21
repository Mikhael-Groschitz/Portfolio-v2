import { describe, expect, it } from "vitest";
import { loadRanking, startRun, submitRun } from "@/game/ui/ranking-client";
import { afterSubmit, planFinish } from "@/game/ui/victory-flow";
import { RANKING_PATH, RANKING_START_PATH } from "@/ranking/protocol";
import { type RankingApiOptions, createRankingApi } from "./api";
import { createMemoryStore } from "./memory-store";
import type { LeaderboardStore } from "./store";

const ORIGIN = "http://localhost:3000";
const SECRET = new Uint8Array(32).fill(9);
const MINUTE = 60_000;

function browser(overrides: Partial<RankingApiOptions> = {}) {
  let now = 1_800_000_000_000;
  let address = "203.0.113.10";
  const store = createMemoryStore(() => new Date(now));
  const api = createRankingApi({
    store: () => store,
    secret: () => SECRET,
    now: () => now,
    log: () => {},
    minTimeMs: MINUTE,
    ...overrides,
  });
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input), ORIGIN);
    const request = new Request(url, {
      method: init?.method,
      body: init?.body,
      signal: init?.signal,
      headers: {
        ...(init?.headers as Record<string, string>),
        origin: ORIGIN,
        "sec-fetch-site": "same-origin",
        "x-real-ip": address,
      },
    });
    if (url.pathname === RANKING_START_PATH) {
      return api.start(request);
    }
    if (url.pathname === RANKING_PATH) {
      return request.method === "POST"
        ? api.submit(request)
        : api.read(request);
    }
    return new Response(null, { status: 404 });
  };
  return {
    fetcher,
    store,
    play(ms: number) {
      now += ms;
    },
    from(next: string) {
      address = next;
    },
  };
}

async function finishRun(
  context: ReturnType<typeof browser>,
  name: string,
  timeMs: number,
) {
  const ticket = await startRun(context.fetcher);
  context.play(timeMs + 1_000);
  const ranking = await loadRanking(context.fetcher);
  const plan = planFinish(ticket, ranking, timeMs);
  if (plan.kind !== "entry" || ticket.kind !== "token") {
    return { plan, ticket };
  }
  const outcome = await submitRun(
    { token: ticket.token, name, timeMs },
    context.fetcher,
  );
  return {
    plan,
    ticket,
    outcome,
    saved: afterSubmit(outcome, { name, timeMs, position: plan.position }),
  };
}

describe("the game client against the ranking API", () => {
  it("takes a run from the token to the highlighted row", async () => {
    const context = browser();
    const first = await finishRun(context, "MGC", 5 * MINUTE);
    expect(first.plan).toMatchObject({ kind: "entry", position: 1 });
    expect(first.saved).toMatchObject({
      finish: { kind: "saved", position: 1, name: "MGC" },
      highlight: 1,
    });
    context.from("203.0.113.11");
    const second = await finishRun(context, "ANA", 4 * MINUTE);
    expect(second.saved).toMatchObject({
      finish: { kind: "saved", position: 1, name: "ANA" },
    });
    expect(await loadRanking(context.fetcher)).toMatchObject({
      kind: "ready",
      entries: [
        { position: 1, name: "ANA" },
        { position: 2, name: "MGC" },
      ],
    });
  });

  it("finds the row again when a lost answer is sent a second time", async () => {
    const context = browser();
    const run = await finishRun(context, "LEO", 3 * MINUTE);
    expect(run.outcome?.kind).toBe("entered");
    if (run.ticket.kind !== "token") {
      throw new Error("no token");
    }
    const again = await submitRun(
      { token: run.ticket.token, name: "LEO", timeMs: 3 * MINUTE },
      context.fetcher,
    );
    expect(again.kind).toBe("used");
    expect(
      afterSubmit(again, { name: "LEO", timeMs: 3 * MINUTE, position: 1 }),
    ).toMatchObject({
      finish: { kind: "saved", position: 1, name: "LEO" },
      highlight: 1,
    });
  });

  it("asks for other letters and keeps the same token", async () => {
    const context = browser();
    const ticket = await startRun(context.fetcher);
    context.play(3 * MINUTE);
    if (ticket.kind !== "token") {
      throw new Error("no token");
    }
    const refused = await submitRun(
      { token: ticket.token, name: "FDP", timeMs: 2 * MINUTE },
      context.fetcher,
    );
    expect(refused).toEqual({ kind: "refused" });
    expect(
      await submitRun(
        { token: ticket.token, name: "BIA", timeMs: 2 * MINUTE },
        context.fetcher,
      ),
    ).toMatchObject({ kind: "entered", position: 1 });
  });

  it("refuses a time longer than the run itself", async () => {
    const context = browser();
    const ticket = await startRun(context.fetcher);
    context.play(2 * MINUTE);
    if (ticket.kind !== "token") {
      throw new Error("no token");
    }
    expect(
      await submitRun(
        { token: ticket.token, name: "KAI", timeMs: 10 * MINUTE },
        context.fetcher,
      ),
    ).toEqual({ kind: "closed", reason: "time" });
  });

  it("keeps the game going when the ranking is off or the database is down", async () => {
    const off = browser({ secret: () => null });
    const ticket = await startRun(off.fetcher);
    expect(ticket).toEqual({ kind: "off" });
    expect(
      planFinish(ticket, await loadRanking(off.fetcher), 5 * MINUTE),
    ).toEqual({ kind: "quiet" });

    const failing: LeaderboardStore = {
      ...createMemoryStore(),
      top: () => Promise.reject(new Error("down")),
      hit: () => Promise.reject(new Error("down")),
    };
    const down = browser({ store: () => failing });
    const run = await startRun(down.fetcher);
    down.play(5 * MINUTE);
    expect(await loadRanking(down.fetcher)).toEqual({ kind: "error" });
    if (run.kind !== "token") {
      throw new Error("no token");
    }
    expect(
      await submitRun(
        { token: run.token, name: "IVO", timeMs: 4 * MINUTE },
        down.fetcher,
      ),
    ).toEqual({ kind: "retry" });
  });
});
