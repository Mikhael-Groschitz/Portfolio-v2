import { describe, expect, it } from "vitest";
import { RANKING_PATH, RANKING_START_PATH } from "@/ranking/protocol";
import {
  loadRanking,
  readEntries,
  startRun,
  submitRun,
} from "./ranking-client";

const entries = [{ position: 1, name: "MGC", timeMs: 343_250 }];

function answer(status: number, body: unknown): typeof fetch {
  return async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
}

describe("ranking client", () => {
  it("reads the top 10 from the API path, past the browser cache", async () => {
    let asked = "";
    const fetcher: typeof fetch = async (input, init) => {
      asked = String(input);
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      expect(init?.cache).toBe("no-cache");
      return answer(200, { entries })(input, init);
    };
    expect(await loadRanking(fetcher)).toEqual({ kind: "ready", entries });
    expect(asked).toBe(RANKING_PATH);
  });

  it("tells an off ranking from a broken one", async () => {
    expect(
      await loadRanking(answer(503, { error: "ranking_off", message: "x" })),
    ).toEqual({ kind: "off" });
    expect(
      await loadRanking(
        answer(503, { error: "ranking_unavailable", message: "x" }),
      ),
    ).toEqual({ kind: "error" });
    expect(await loadRanking(answer(500, "<html>"))).toEqual({ kind: "error" });
    expect(await loadRanking(answer(200, { entries: "nope" }))).toEqual({
      kind: "error",
    });
    expect(
      await loadRanking(async () => {
        throw new TypeError("offline");
      }),
    ).toEqual({ kind: "error" });
  });

  it("gives up after the timeout or when the game closes", async () => {
    const hanging: typeof fetch = (_, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      });
    const started = Date.now();
    expect(await loadRanking(hanging, undefined, 30)).toEqual({
      kind: "error",
    });
    expect(Date.now() - started).toBeLessThan(1_000);
    const closing = new AbortController();
    const pending = loadRanking(hanging, closing.signal, 10_000);
    closing.abort();
    expect(await pending).toEqual({ kind: "error" });
  });

  it("keeps only well-formed entries, at most ten", () => {
    expect(readEntries({ entries })).toEqual(entries);
    expect(readEntries({ entries: [{ position: 1, name: "MGC" }] })).toBeNull();
    expect(
      readEntries({
        entries: Array.from({ length: 11 }, (_, index) => ({
          position: index + 1,
          name: "AAA",
          timeMs: 1,
        })),
      }),
    ).toBeNull();
    expect(readEntries(null)).toBeNull();
  });
});

describe("starting a run", () => {
  it("asks for a token with an empty JSON body", async () => {
    let sent: RequestInit | undefined;
    let asked = "";
    const fetcher: typeof fetch = async (input, init) => {
      asked = String(input);
      sent = init;
      return answer(200, { token: "v1.abc", expiresAt: 1 })(input, init);
    };
    expect(await startRun(fetcher)).toEqual({ kind: "token", token: "v1.abc" });
    expect(asked).toBe(RANKING_START_PATH);
    expect(sent?.method).toBe("POST");
    expect(sent?.body).toBe("{}");
    expect(sent?.headers).toMatchObject({ "Content-Type": "application/json" });
  });

  it("plays on without a token when the ranking is off or away", async () => {
    expect(
      await startRun(answer(503, { error: "ranking_off", message: "x" })),
    ).toEqual({ kind: "off" });
    expect(await startRun(answer(500, "<html>"))).toEqual({ kind: "none" });
    expect(
      await startRun(async () => {
        throw new TypeError("offline");
      }),
    ).toEqual({ kind: "none" });
  });
});

describe("sending a result", () => {
  const run = { token: "v1.abc", name: "MGC", timeMs: 343_250 };

  it("sends the token, the name and the time as JSON", async () => {
    let sent: RequestInit | undefined;
    const fetcher: typeof fetch = async (input, init) => {
      sent = init;
      return answer(200, { status: "entered", position: 1, entries })(
        input,
        init,
      );
    };
    expect(await submitRun(run, fetcher)).toEqual({
      kind: "entered",
      position: 1,
      entries,
    });
    expect(JSON.parse(String(sent?.body))).toEqual(run);
  });

  it("turns every answer of the API into one outcome", async () => {
    const cases: [number, unknown, unknown][] = [
      [200, { status: "outside", entries }, { kind: "outside", entries }],
      [
        409,
        { error: "token_used", message: "x", entries },
        { kind: "used", entries },
      ],
      [
        409,
        { error: "token_used", message: "x" },
        { kind: "used", entries: null },
      ],
      [422, { error: "invalid_name", message: "x" }, { kind: "refused" }],
      [503, { error: "ranking_unavailable", message: "x" }, { kind: "retry" }],
      [500, "<html>", { kind: "retry" }],
      [
        403,
        { error: "token_expired", message: "x" },
        { kind: "closed", reason: "expired" },
      ],
      [
        429,
        { error: "too_many_requests", message: "x" },
        { kind: "closed", reason: "limit" },
      ],
      [
        422,
        { error: "invalid_time", message: "x" },
        { kind: "closed", reason: "time" },
      ],
      [
        503,
        { error: "ranking_off", message: "x" },
        { kind: "closed", reason: "off" },
      ],
      [
        403,
        { error: "token_invalid", message: "x" },
        { kind: "closed", reason: "invalid" },
      ],
      [
        400,
        { error: "bad_request", message: "x" },
        { kind: "closed", reason: "invalid" },
      ],
    ];
    for (const [status, body, outcome] of cases) {
      expect(await submitRun(run, answer(status, body))).toEqual(outcome);
    }
  });

  it("lets the player try again when the network fails or takes too long", async () => {
    expect(
      await submitRun(run, async () => {
        throw new TypeError("offline");
      }),
    ).toEqual({ kind: "retry" });
    const hanging: typeof fetch = (_, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      });
    expect(await submitRun(run, hanging, undefined, 20)).toEqual({
      kind: "retry",
    });
  });
});
