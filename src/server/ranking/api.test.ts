import { describe, expect, it } from "vitest";
import { RANKING } from "@/game/balance";
import type { PublicEntry } from "@/ranking/protocol";
import { type RankingApiOptions, createRankingApi, minTimeFor } from "./api";
import { MAX_BODY_BYTES, SHARED_READ } from "./http";
import { createMemoryStore } from "./memory-store";
import type { LeaderboardStore } from "./store";

const ORIGIN = "http://localhost:3000";
const SECRET = new Uint8Array(32).fill(7);
const START = 1_800_000_000_000;
const FAST = 1_000;

interface Call {
  method: string;
  args: unknown[];
}

function watch(store: LeaderboardStore): {
  store: LeaderboardStore;
  calls: Call[];
} {
  const calls: Call[] = [];
  const watched = new Proxy(store, {
    get(target, property) {
      const value = Reflect.get(target, property);
      return typeof value === "function"
        ? (...args: unknown[]) => {
            calls.push({ method: String(property), args });
            return value.apply(target, args);
          }
        : value;
    },
  });
  return { store: watched, calls };
}

function setup(overrides: Partial<RankingApiOptions> = {}) {
  let now = START;
  const { store, calls } = watch(createMemoryStore(() => new Date(now)));
  const logs: string[] = [];
  const api = createRankingApi({
    store: () => store,
    secret: () => SECRET,
    now: () => now,
    log: (message) => logs.push(message),
    minTimeMs: RANKING.minTimeMs,
    ...overrides,
  });
  return {
    api,
    calls,
    logs,
    advance(ms: number) {
      now += ms;
    },
  };
}

type Context = ReturnType<typeof setup>;

function post(
  path: string,
  body: string,
  headers: Record<string, string> = {},
) {
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: ORIGIN,
      "sec-fetch-site": "same-origin",
      "x-real-ip": "203.0.113.7",
      ...headers,
    },
    body,
  });
}

async function startRun(context: Context): Promise<string> {
  const response = await context.api.start(post("/api/ranking/start", "{}"));
  expect(response.status).toBe(200);
  return (await response.json()).token;
}

function send(
  context: Context,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return context.api.submit(
    post(
      "/api/ranking",
      typeof body === "string" ? body : JSON.stringify(body),
      headers,
    ),
  );
}

async function finish(
  context: Context,
  name: string,
  timeMs: number,
  headers: Record<string, string> = {},
): Promise<Response> {
  const token = await startRun(context);
  context.advance(timeMs + 500);
  return send(context, { token, name, timeMs }, headers);
}

function names(entries: PublicEntry[]): string[] {
  return entries.map(({ name }) => name);
}

describe("reading the ranking", () => {
  it("answers the top 10 with a short shared cache", async () => {
    const context = setup();
    const response = await context.api.read(
      new Request(`${ORIGIN}/api/ranking`),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ entries: [] });
    expect(response.headers.get("cache-control")).toBe(SHARED_READ);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("refuses a query string without touching the database", async () => {
    const context = setup();
    const response = await context.api.read(
      new Request(`${ORIGIN}/api/ranking?fresh=1`),
    );
    expect(response.status).toBe(400);
    expect(context.calls).toEqual([]);
  });

  it("reads the database once a minute at most per server", async () => {
    const context = setup();
    const read = () => context.api.read(new Request(`${ORIGIN}/api/ranking`));
    await read();
    await read();
    context.advance(60_001);
    await read();
    expect(context.calls.filter(({ method }) => method === "top")).toHaveLength(
      2,
    );
  });

  it("turns off softly without a secret or a database, and says why once", async () => {
    const context = setup({ secret: () => null });
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await context.api.read(
        new Request(`${ORIGIN}/api/ranking`),
      );
      expect(response.status).toBe(503);
      expect((await response.json()).error).toBe("ranking_off");
    }
    expect(context.logs).toEqual([
      "ranking: desligado (RANKING_SECRET ausente ou curto)",
    ]);
    const noStore = setup({ store: () => null });
    expect(
      (await noStore.api.read(new Request(`${ORIGIN}/api/ranking`))).status,
    ).toBe(503);
  });

  it("answers 503 with Retry-After when the database fails or is slow", async () => {
    const broken = setup({
      store: () =>
        ({
          top: () =>
            Promise.reject(
              Object.assign(new Error("boom at host"), {
                code: "ECONNREFUSED",
              }),
            ),
        }) as unknown as LeaderboardStore,
    });
    const failed = await broken.api.read(new Request(`${ORIGIN}/api/ranking`));
    expect(failed.status).toBe(503);
    expect(failed.headers.get("retry-after")).toBe("30");
    expect(failed.headers.get("cache-control")).toBe("no-store");
    const body = await failed.json();
    expect(body.error).toBe("ranking_unavailable");
    expect(JSON.stringify(body)).not.toContain("host");
    expect(broken.logs).toEqual(["ranking: banco indisponível (ECONNREFUSED)"]);
    const slow = setup({
      deadlineMs: 20,
      store: () =>
        ({ top: () => new Promise(() => {}) }) as unknown as LeaderboardStore,
    });
    expect(
      (await slow.api.read(new Request(`${ORIGIN}/api/ranking`))).status,
    ).toBe(503);
    expect(slow.logs).toEqual(["ranking: banco indisponível (tempo esgotado)"]);
  });
});

describe("starting a run", () => {
  it("hands out a signed token without touching the database", async () => {
    const context = setup();
    const response = await context.api.start(post("/api/ranking/start", "{}"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.token).toMatch(/^v1\./);
    expect(body.expiresAt).toBe(START + RANKING.tokenTtlMs);
    expect(context.calls).toEqual([]);
  });

  it("only answers its own site, in JSON, with an empty object", async () => {
    const context = setup();
    const cases: [Request, number, string][] = [
      [
        post("/api/ranking/start", "{}", { origin: "https://evil.example" }),
        403,
        "forbidden_origin",
      ],
      [
        post("/api/ranking/start", "{}", { "sec-fetch-site": "cross-site" }),
        403,
        "forbidden_origin",
      ],
      [
        post("/api/ranking/start", "{}", { "content-type": "text/plain" }),
        415,
        "unsupported_media_type",
      ],
      [post("/api/ranking/start", '{"a":1}'), 400, "bad_request"],
      [post("/api/ranking/start", "[]"), 400, "bad_request"],
      [post("/api/ranking/start", "{"), 400, "bad_request"],
      [
        post("/api/ranking/start", " ".repeat(MAX_BODY_BYTES + 1)),
        413,
        "too_large",
      ],
    ];
    for (const [request, status, error] of cases) {
      const response = await context.api.start(request);
      expect(response.status, error).toBe(status);
      expect((await response.json()).error).toBe(error);
    }
    const missing = new Request(`${ORIGIN}/api/ranking/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect((await context.api.start(missing)).status).toBe(403);
  });
});

describe("sending a result", () => {
  it("puts a valid run in the ranking and answers the position", async () => {
    const context = setup();
    const response = await finish(context, "MGC", 343_250);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      status: "entered",
      position: 1,
      entries: [{ position: 1, name: "MGC", timeMs: 343_250 }],
    });
  });

  it("keeps ten of twelve, in order, the earlier one first on a tie", async () => {
    const context = setup({ minTimeMs: FAST });
    const runs: [string, number][] = [
      ["ANA", 9_000],
      ["BIA", 4_000],
      ["CAU", 7_000],
      ["DUO", 4_000],
      ["EVA", 12_000],
      ["FIO", 3_000],
      ["GUI", 8_000],
      ["HUG", 11_000],
      ["IVO", 5_000],
      ["JOE", 6_000],
      ["KAI", 10_000],
      ["LEO", 13_000],
    ];
    const statuses = [];
    for (const [index, [name, time]] of runs.entries()) {
      const response = await finish(context, name, time, {
        "x-real-ip": `198.51.100.${index}`,
      });
      statuses.push((await response.json()).status);
    }
    expect(statuses.filter((status) => status === "outside")).toHaveLength(1);
    const read = await (
      await context.api.read(new Request(`${ORIGIN}/api/ranking`))
    ).json();
    expect(read.entries.map(({ timeMs }: PublicEntry) => timeMs)).toEqual([
      3_000, 4_000, 4_000, 5_000, 6_000, 7_000, 8_000, 9_000, 10_000, 11_000,
    ]);
    expect(names(read.entries).slice(1, 3)).toEqual(["BIA", "DUO"]);
  });

  it("answers outside the top 10 with the current ranking", async () => {
    const context = setup({ minTimeMs: FAST });
    for (let index = 0; index < RANKING.size; index++) {
      await finish(context, "AAA", 2_000 + index * 100, {
        "x-real-ip": `198.51.100.${index}`,
      });
    }
    const late = await finish(context, "ZZZ", 9_000, {
      "x-real-ip": "198.51.100.99",
    });
    const body = await late.json();
    expect(body.status).toBe("outside");
    expect(body.entries).toHaveLength(RANKING.size);
  });

  it("refuses an invalid or offensive name", async () => {
    const context = setup();
    for (const name of ["mgc", "MG", "MGCX", "M1C", "FDP", "KKK"]) {
      const response = await finish(context, name, 343_250, {
        "x-real-ip": `name-${name}`,
      });
      expect(response.status, name).toBe(422);
      expect((await response.json()).error).toBe("invalid_name");
    }
  });

  it("refuses times outside the plausible range or longer than the run", async () => {
    const context = setup();
    for (const timeMs of [
      RANKING.minTimeMs - 1,
      RANKING.maxTimeMs + 1,
      343_250.5,
    ]) {
      const response = await finish(context, "MGC", timeMs);
      expect(response.status, String(timeMs)).toBe(422);
      expect((await response.json()).error).toBe("invalid_time");
    }
    const token = await startRun(context);
    context.advance(200_000);
    const tooLong = await send(context, {
      token,
      name: "MGC",
      timeMs: 200_000 + RANKING.clockToleranceMs + 1,
    });
    expect(tooLong.status).toBe(422);
    const justRight = await send(context, {
      token,
      name: "MGC",
      timeMs: 200_000 + RANKING.clockToleranceMs,
    });
    expect(justRight.status).toBe(200);
  });

  it("refuses changed, expired, foreign and reused tokens", async () => {
    const context = setup();
    const token = await startRun(context);
    context.advance(300_000);
    const changed = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
    const tampered = await send(context, {
      token: changed,
      name: "MGC",
      timeMs: 250_000,
    });
    expect(tampered.status).toBe(403);
    expect((await tampered.json()).error).toBe("token_invalid");
    const other = setup({ secret: () => new Uint8Array(32).fill(9) });
    const foreign = await send(other, { token, name: "MGC", timeMs: 250_000 });
    expect((await foreign.json()).error).toBe("token_invalid");
    expect(
      (await send(context, { token, name: "MGC", timeMs: 250_000 })).status,
    ).toBe(200);
    const reused = await send(context, { token, name: "MGC", timeMs: 240_000 });
    expect(reused.status).toBe(409);
    expect(await reused.json()).toMatchObject({
      error: "token_used",
      entries: [{ position: 1, name: "MGC", timeMs: 250_000 }],
    });
    const old = await startRun(context);
    context.advance(RANKING.tokenTtlMs);
    const expired = await send(context, {
      token: old,
      name: "MGC",
      timeMs: 250_000,
    });
    expect((await expired.json()).error).toBe("token_expired");
  });

  it("refuses a token started in the future", async () => {
    const context = setup();
    const ahead = setup();
    ahead.advance(RANKING.clockToleranceMs + 60_000);
    const token = await startRun(ahead);
    const response = await send(context, {
      token,
      name: "MGC",
      timeMs: 250_000,
    });
    expect((await response.json()).error).toBe("token_invalid");
  });

  it("limits sends per address and keeps only a hash of it", async () => {
    const context = setup({ minTimeMs: FAST });
    for (let attempt = 0; attempt < RANKING.submitLimit; attempt++) {
      expect((await finish(context, "AAA", 2_000)).status).toBe(200);
    }
    const blocked = await finish(context, "AAA", 2_000);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(
      (await finish(context, "AAA", 2_000, { "x-real-ip": "198.51.100.1" }))
        .status,
    ).toBe(200);
    context.advance(RANKING.submitWindowMs);
    expect((await finish(context, "AAA", 2_000)).status).toBe(200);
    const keys = context.calls
      .filter(({ method }) => method === "hit")
      .map(({ args }) => args[0]);
    for (const key of keys) {
      expect(key).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(JSON.stringify(context.calls)).not.toContain("203.0.113.7");
  });

  it("counts sends across servers in the database", async () => {
    let now = START;
    const store = createMemoryStore(() => new Date(now));
    const server = (): Context =>
      ({
        api: createRankingApi({
          store: () => store,
          secret: () => SECRET,
          now: () => now,
          log: () => {},
          minTimeMs: FAST,
        }),
        calls: [],
        logs: [],
        advance(ms: number) {
          now += ms;
        },
      }) as Context;
    const first = server();
    const second = server();
    for (let attempt = 0; attempt < 3; attempt++) {
      expect((await finish(first, "AAA", 2_000)).status).toBe(200);
    }
    for (let attempt = 0; attempt < RANKING.submitLimit - 3; attempt++) {
      expect((await finish(second, "AAA", 2_000)).status).toBe(200);
    }
    expect((await finish(second, "AAA", 2_000)).status).toBe(429);
  });

  it("never touches the database for requests it can refuse alone", async () => {
    const context = setup();
    const token = await startRun(context);
    context.advance(300_000);
    const valid = { token, name: "MGC", timeMs: 250_000 };
    const refused = [
      send(context, valid, { origin: "https://evil.example" }),
      send(context, valid, { "content-type": "text/plain" }),
      send(context, " ".repeat(MAX_BODY_BYTES + 1)),
      send(context, "{not json"),
      send(context, { ...valid, extra: true }),
      send(context, { ...valid, timeMs: "250000" }),
      send(context, { ...valid, name: "FDP" }),
      send(context, { ...valid, token: `${token}x` }),
      send(context, { ...valid, timeMs: 1_000 }),
      send(context, { ...valid, timeMs: 900_000 }),
    ];
    const statuses = await Promise.all(
      refused.map(async (response) => (await response).status),
    );
    expect(statuses).toEqual([
      403, 415, 413, 400, 400, 400, 422, 403, 422, 422,
    ]);
    expect(context.calls).toEqual([]);
  });

  it("cleans expired defense rows at most once every ten minutes", async () => {
    const context = setup({ minTimeMs: FAST });
    await finish(context, "AAA", 2_000);
    await finish(context, "BBB", 2_000);
    expect(
      context.calls.filter(({ method }) => method === "purge"),
    ).toHaveLength(1);
    context.advance(600_000);
    await finish(context, "CCC", 2_000);
    expect(
      context.calls.filter(({ method }) => method === "purge"),
    ).toHaveLength(2);
  });
});

describe("development settings", () => {
  it("relaxes the minimum time only outside production", () => {
    expect(minTimeFor({ RANKING_DEV_MIN_TIME_MS: "1000" })).toBe(1_000);
    expect(
      minTimeFor({ NODE_ENV: "development", RANKING_DEV_MIN_TIME_MS: "1000" }),
    ).toBe(1_000);
    expect(
      minTimeFor({ NODE_ENV: "production", RANKING_DEV_MIN_TIME_MS: "1000" }),
    ).toBe(RANKING.minTimeMs);
    for (const value of ["0", "-5", "abc", "1.5", "999999999", ""]) {
      expect(minTimeFor({ RANKING_DEV_MIN_TIME_MS: value })).toBe(
        RANKING.minTimeMs,
      );
    }
  });
});
