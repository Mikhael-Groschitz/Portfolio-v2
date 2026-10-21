import { RANKING } from "@/game/balance";
import { type StoredEntry, isValidName } from "@/ranking/leaderboard";
import type {
  PublicEntry,
  RankingRead,
  StartedRun,
  SubmitBody,
  SubmitResult,
} from "@/ranking/protocol";
import type { Environment } from "../env";
import {
  clientAddress,
  failure,
  isJson,
  json,
  readJson,
  sameOrigin,
  SHARED_READ,
} from "./http";
import { isAllowedName } from "./names";
import type { LeaderboardStore } from "./store";
import { hashAddress, importSecret, issueToken, verifyToken } from "./token";

export const RANKING_METHODS = "GET, POST";
export const START_METHODS = "POST";

export interface RankingApiOptions {
  store(): LeaderboardStore | null;
  secret(): Uint8Array<ArrayBuffer> | null;
  now(): number;
  log(message: string): void;
  minTimeMs: number;
  deadlineMs?: number;
  readCacheMs?: number;
  purgeEveryMs?: number;
}

export interface RankingApi {
  read(request: Request): Promise<Response>;
  start(request: Request): Promise<Response>;
  submit(request: Request): Promise<Response>;
}

const DEADLINE_MS = 3_500;
const READ_CACHE_MS = 60_000;
const PURGE_EVERY_MS = 600_000;
const RETRY_AFTER_SECONDS = 30;
const SUBMIT_KEYS = ["name", "timeMs", "token"];

class DeadlineExceeded extends Error {}

export function minTimeFor(env: Environment): number {
  if (env.NODE_ENV === "production") {
    return RANKING.minTimeMs;
  }
  const relaxed = Number(env.RANKING_DEV_MIN_TIME_MS);
  return Number.isInteger(relaxed) &&
    relaxed >= 1 &&
    relaxed < RANKING.minTimeMs
    ? relaxed
    : RANKING.minTimeMs;
}

export function toPublic(entries: readonly StoredEntry[]): PublicEntry[] {
  return entries.map(({ name, timeMs }, index) => ({
    position: index + 1,
    name,
    timeMs,
  }));
}

function within<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DeadlineExceeded()), ms);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSubmitBody(value: unknown): value is SubmitBody {
  return (
    isPlainObject(value) &&
    Object.keys(value).sort().join() === SUBMIT_KEYS.join() &&
    typeof value.token === "string" &&
    value.token.length <= 128 &&
    typeof value.name === "string" &&
    value.name.length <= 16 &&
    typeof value.timeMs === "number"
  );
}

function describe(error: unknown): string {
  if (error instanceof DeadlineExceeded) {
    return "tempo esgotado";
  }
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string"
    ? code
    : error instanceof Error
      ? error.name
      : "erro";
}

export function createRankingApi(options: RankingApiOptions): RankingApi {
  const deadlineMs = options.deadlineMs ?? DEADLINE_MS;
  const readCacheMs = options.readCacheMs ?? READ_CACHE_MS;
  const purgeEveryMs = options.purgeEveryMs ?? PURGE_EVERY_MS;
  const counters = new Map<string, { count: number; resetAt: number }>();
  let key: Promise<CryptoKey> | null = null;
  let warned = false;
  let cache: { entries: PublicEntry[]; until: number } | null = null;
  let lastPurge = Number.NEGATIVE_INFINITY;

  function ready(): {
    store: LeaderboardStore;
    key: Promise<CryptoKey>;
  } | null {
    const secret = options.secret();
    const store = options.store();
    if (!secret || !store) {
      if (!warned) {
        warned = true;
        options.log(
          `ranking: desligado (${secret ? "nenhum banco configurado" : "RANKING_SECRET ausente ou curto"})`,
        );
      }
      return null;
    }
    key ??= importSecret(secret);
    return { store, key };
  }

  function remember(top: readonly StoredEntry[], now: number): PublicEntry[] {
    const entries = toPublic(top);
    cache = { entries, until: now + readCacheMs };
    return entries;
  }

  function unavailable(error: unknown): Response {
    options.log(`ranking: banco indisponível (${describe(error)})`);
    return failure(503, "ranking_unavailable", {
      retryAfter: RETRY_AFTER_SECONDS,
    });
  }

  function overLocalLimit(address: string, now: number): number | null {
    if (counters.size > 1000) {
      for (const [stored, counter] of counters) {
        if (counter.resetAt <= now) {
          counters.delete(stored);
        }
      }
    }
    const current = counters.get(address);
    const counter =
      current && current.resetAt > now
        ? { count: current.count + 1, resetAt: current.resetAt }
        : { count: 1, resetAt: now + RANKING.submitWindowMs };
    counters.set(address, counter);
    return counter.count > RANKING.submitLimit
      ? (counter.resetAt - now) / 1000
      : null;
  }

  async function checkWrite(request: Request): Promise<Response | unknown> {
    if (!sameOrigin(request)) {
      return failure(403, "forbidden_origin");
    }
    if (!isJson(request)) {
      return failure(415, "unsupported_media_type");
    }
    const body = await readJson(request);
    return body.ok ? body.value : failure(body.status, body.code);
  }

  return {
    async read(request) {
      if (new URL(request.url).search !== "") {
        return failure(400, "bad_request");
      }
      const parts = ready();
      if (!parts) {
        return failure(503, "ranking_off");
      }
      const now = options.now();
      if (cache && cache.until > now) {
        return json(
          { entries: cache.entries } satisfies RankingRead,
          200,
          SHARED_READ,
        );
      }
      try {
        const top = await within(parts.store.top(), deadlineMs);
        const entries = remember(top, now);
        return json({ entries } satisfies RankingRead, 200, SHARED_READ);
      } catch (error) {
        return unavailable(error);
      }
    },

    async start(request) {
      const body = await checkWrite(request);
      if (body instanceof Response) {
        return body;
      }
      if (!isPlainObject(body) || Object.keys(body).length > 0) {
        return failure(400, "bad_request");
      }
      const parts = ready();
      if (!parts) {
        return failure(503, "ranking_off");
      }
      const run = await issueToken(await parts.key, options.now());
      return json(
        { token: run.token, expiresAt: run.expiresAt } satisfies StartedRun,
        200,
      );
    },

    async submit(request) {
      const body = await checkWrite(request);
      if (body instanceof Response) {
        return body;
      }
      if (!isSubmitBody(body)) {
        return failure(400, "bad_request");
      }
      const parts = ready();
      if (!parts) {
        return failure(503, "ranking_off");
      }
      if (!isValidName(body.name) || !isAllowedName(body.name)) {
        return failure(422, "invalid_name");
      }
      const key = await parts.key;
      const now = options.now();
      const token = await verifyToken(key, body.token, now);
      if (!token.ok) {
        return failure(403, token.reason);
      }
      const elapsed = now - token.issuedAt;
      const { timeMs } = body;
      if (
        !Number.isInteger(timeMs) ||
        timeMs < options.minTimeMs ||
        timeMs > RANKING.maxTimeMs ||
        timeMs > elapsed + RANKING.clockToleranceMs
      ) {
        return failure(422, "invalid_time");
      }
      const address = await hashAddress(key, clientAddress(request.headers));
      const waitLocal = overLocalLimit(address, now);
      if (waitLocal !== null) {
        return failure(429, "too_many_requests", { retryAfter: waitLocal });
      }
      const { store } = parts;
      try {
        const answer = await within(
          (async () => {
            const hit = await store.hit(address, RANKING.submitWindowMs);
            if (hit.count > RANKING.submitLimit) {
              return failure(429, "too_many_requests", {
                retryAfter: (hit.resetAt.getTime() - now) / 1000,
              });
            }
            const outcome = await store.submit({
              jti: token.jti,
              tokenExpiresAt: new Date(token.expiresAt),
              name: body.name,
              timeMs,
            });
            const entries = remember(outcome.top, now);
            if (now - lastPurge >= purgeEveryMs) {
              lastPurge = now;
              await store.purge().catch((error: unknown) => {
                options.log(`ranking: limpeza falhou (${describe(error)})`);
              });
            }
            if (outcome.kind === "reused") {
              return failure(409, "token_used", { entries });
            }
            const result: SubmitResult =
              outcome.kind === "entered"
                ? { status: "entered", position: outcome.position, entries }
                : { status: "outside", entries };
            return json(result, 200);
          })(),
          deadlineMs,
        );
        return answer;
      } catch (error) {
        return unavailable(error);
      }
    },
  };
}
