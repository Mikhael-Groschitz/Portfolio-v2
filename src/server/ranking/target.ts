import type { Environment } from "../env";

export const LOCAL_DATABASE = {
  port: "5433",
  names: ["ranking", "ranking_test"],
} as const;

const LOOPBACK: ReadonlySet<string> = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
]);

export type TargetKind = "local" | "remote" | "invalid";

export interface Target {
  kind: TargetKind;
  masked: string;
}

function parse(url: string): URL | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "postgres:" || parsed.protocol === "postgresql:"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function maskUrl(url: string): string {
  const parsed = parse(url);
  if (!parsed) {
    return "(endereço inválido)";
  }
  if (parsed.password) {
    parsed.password = "****";
  }
  for (const key of [...parsed.searchParams.keys()]) {
    if (/pass|secret|token|key/i.test(key)) {
      parsed.searchParams.set(key, "****");
    }
  }
  return parsed.toString();
}

export function describeTarget(url: string): Target {
  const parsed = parse(url);
  if (!parsed) {
    return { kind: "invalid", masked: maskUrl(url) };
  }
  const database = decodeURIComponent(parsed.pathname.slice(1));
  const local =
    LOOPBACK.has(parsed.hostname) &&
    parsed.port === LOCAL_DATABASE.port &&
    (LOCAL_DATABASE.names as readonly string[]).includes(database);
  return { kind: local ? "local" : "remote", masked: maskUrl(url) };
}

export function targetLabel(target: Target): string {
  return target.kind === "local" ? "LOCAL" : "REMOTO";
}

export function scrub(message: string, url: string): string {
  const parsed = parse(url);
  const secrets = [
    url,
    parsed?.password ? decodeURIComponent(parsed.password) : "",
  ].filter((secret) => secret.length >= 4);
  return secrets.reduce(
    (text, secret) => text.split(secret).join("****"),
    message,
  );
}

export type IntegrationTarget =
  { ok: true; url: string; target: Target } | { ok: false; reason: string };

export function integrationTarget(env: Environment): IntegrationTarget {
  const url = env.TEST_DATABASE_URL?.trim() ?? "";
  if (!url) {
    return {
      ok: false,
      reason:
        "Defina TEST_DATABASE_URL (no .env.local ou no arquivo de ENV_FILE) para rodar os testes de integração.",
    };
  }
  const target = describeTarget(url);
  if (target.kind === "invalid") {
    return {
      ok: false,
      reason: `TEST_DATABASE_URL não é um endereço PostgreSQL válido: ${target.masked}`,
    };
  }
  const shared = [env.DATABASE_URL, env.DIRECT_URL].some(
    (other) => other?.trim() === url,
  );
  if (shared) {
    return {
      ok: false,
      reason:
        "TEST_DATABASE_URL é igual a DATABASE_URL ou DIRECT_URL. Os testes apagam as tabelas, então usam um banco só deles.",
    };
  }
  if (target.kind === "remote" && env.RANKING_TEST_REMOTE !== "1") {
    return {
      ok: false,
      reason: `TEST_DATABASE_URL aponta para um banco REMOTO (${target.masked}). Para confirmar, defina RANKING_TEST_REMOTE=1 na sessão.`,
    };
  }
  return { ok: true, url, target };
}
