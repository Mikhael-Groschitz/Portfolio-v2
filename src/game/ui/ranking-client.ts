import { RANKING } from "../balance";
import {
  type PublicEntry,
  RANKING_PATH,
  RANKING_START_PATH,
  type SubmitBody,
} from "@/ranking/protocol";
import type { RankingState } from "./ranking-view";

export const CLIENT_TIMEOUT_MS = 4_000;

export type Ticket =
  { kind: "token"; token: string } | { kind: "off" | "none" };

export type ClosedReason = "expired" | "limit" | "time" | "off" | "invalid";

export type SubmitOutcome =
  | { kind: "entered"; position: number; entries: PublicEntry[] }
  | { kind: "outside"; entries: PublicEntry[] }
  | { kind: "used"; entries: PublicEntry[] | null }
  | { kind: "refused" }
  | { kind: "retry" }
  | { kind: "closed"; reason: ClosedReason };

const CLOSED: Readonly<Record<string, ClosedReason>> = {
  token_expired: "expired",
  too_many_requests: "limit",
  invalid_time: "time",
  ranking_off: "off",
};

function isEntry(value: unknown): value is PublicEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { position, name, timeMs } = value as Record<string, unknown>;
  return (
    Number.isInteger(position) &&
    typeof name === "string" &&
    Number.isInteger(timeMs)
  );
}

export function readEntries(value: unknown): PublicEntry[] | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const { entries } = value as { entries?: unknown };
  return Array.isArray(entries) &&
    entries.length <= RANKING.size &&
    entries.every(isEntry)
    ? entries.map(({ position, name, timeMs }) => ({ position, name, timeMs }))
    : null;
}

interface Send {
  method?: "POST";
  headers?: Record<string, string>;
  body?: string;
}

async function call(
  fetcher: typeof fetch,
  path: string,
  init: Send,
  signal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<{ status: number; body: unknown } | null> {
  const controller = new AbortController();
  const stop = () => controller.abort();
  signal?.addEventListener("abort", stop);
  const timer = setTimeout(stop, timeoutMs);
  try {
    const response = await fetcher(path, {
      ...init,
      signal: controller.signal,
      cache: "no-cache",
      headers: { Accept: "application/json", ...init.headers },
    });
    const body: unknown = await response.json().catch(() => null);
    return { status: response.status, body };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", stop);
  }
}

function errorCode(body: unknown): unknown {
  return (body as { error?: unknown } | null)?.error;
}

function post(body: unknown): Send {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export async function loadRanking(
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
  timeoutMs = CLIENT_TIMEOUT_MS,
): Promise<RankingState> {
  const answer = await call(fetcher, RANKING_PATH, {}, signal, timeoutMs);
  if (!answer) {
    return { kind: "error" };
  }
  if (answer.status === 200) {
    const entries = readEntries(answer.body);
    return entries ? { kind: "ready", entries } : { kind: "error" };
  }
  return errorCode(answer.body) === "ranking_off"
    ? { kind: "off" }
    : { kind: "error" };
}

export async function startRun(
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
  timeoutMs = CLIENT_TIMEOUT_MS,
): Promise<Ticket> {
  const answer = await call(
    fetcher,
    RANKING_START_PATH,
    post({}),
    signal,
    timeoutMs,
  );
  const token = (answer?.body as { token?: unknown } | null)?.token;
  if (answer?.status === 200 && typeof token === "string") {
    return { kind: "token", token };
  }
  return errorCode(answer?.body) === "ranking_off"
    ? { kind: "off" }
    : { kind: "none" };
}

export async function submitRun(
  run: SubmitBody,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
  timeoutMs = CLIENT_TIMEOUT_MS,
): Promise<SubmitOutcome> {
  const answer = await call(
    fetcher,
    RANKING_PATH,
    post(run),
    signal,
    timeoutMs,
  );
  if (!answer) {
    return { kind: "retry" };
  }
  const entries = readEntries(answer.body);
  const { status } = (answer.body ?? {}) as { status?: unknown };
  const position = (answer.body as { position?: unknown } | null)?.position;
  if (answer.status === 200 && entries) {
    if (status === "entered" && Number.isInteger(position)) {
      return { kind: "entered", position: position as number, entries };
    }
    if (status === "outside") {
      return { kind: "outside", entries };
    }
    return { kind: "retry" };
  }
  const code = errorCode(answer.body);
  if (code === "token_used") {
    return { kind: "used", entries };
  }
  if (code === "invalid_name") {
    return { kind: "refused" };
  }
  if (typeof code === "string" && Object.hasOwn(CLOSED, code)) {
    return { kind: "closed", reason: CLOSED[code] };
  }
  return answer.status >= 500 || code === undefined
    ? { kind: "retry" }
    : { kind: "closed", reason: "invalid" };
}
