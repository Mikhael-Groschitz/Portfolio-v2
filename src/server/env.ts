import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { parseEnv } from "node:util";

export type Environment = Record<string, string | undefined>;

export const DEFAULT_ENV_FILE = ".env.local";

const FILES_NEXT_LOADS: ReadonlySet<string> = new Set([
  ".env",
  ".env.development",
  ".env.development.local",
  ".env.production",
  ".env.production.local",
  ".env.test",
  ".env.test.local",
]);

export function envFileFor(env: Environment): string {
  const chosen = env.ENV_FILE?.trim();
  if (!chosen) {
    return DEFAULT_ENV_FILE;
  }
  if (FILES_NEXT_LOADS.has(basename(chosen))) {
    throw new Error(
      `ENV_FILE não pode apontar para ${basename(chosen)}, porque o Next carrega esse arquivo sozinho. Use um nome como .env.ranking-prod.`,
    );
  }
  return chosen;
}

export function mergeMissing(
  env: Environment,
  values: Readonly<Record<string, string | undefined>>,
): string[] {
  const applied: string[] = [];
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && env[key] === undefined) {
      env[key] = value;
      applied.push(key);
    }
  }
  return applied;
}

export function loadEnvironment(
  env: Environment = process.env,
  cwd = process.cwd(),
): { file: string; found: boolean } {
  const file = envFileFor(env);
  const path = resolve(cwd, file);
  if (!existsSync(path)) {
    if (env.ENV_FILE?.trim()) {
      throw new Error(
        `ENV_FILE aponta para ${file}, mas o arquivo não existe.`,
      );
    }
    return { file, found: false };
  }
  mergeMissing(env, parseEnv(readFileSync(path, "utf8")));
  return { file, found: true };
}

export function cliDatabaseUrl(env: Environment): string {
  return env.DIRECT_URL?.trim() || env.DATABASE_URL?.trim() || "";
}
