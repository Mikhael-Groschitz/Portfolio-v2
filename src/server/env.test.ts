import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_ENV_FILE,
  type Environment,
  cliDatabaseUrl,
  envFileFor,
  loadEnvironment,
  mergeMissing,
} from "./env";

const folders: string[] = [];

function folder(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "ranking-env-"));
  folders.push(dir);
  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(join(dir, name), contents);
  }
  return dir;
}

afterEach(() => {
  for (const dir of folders.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("environment file choice", () => {
  it("uses .env.local unless ENV_FILE says otherwise", () => {
    expect(envFileFor({})).toBe(DEFAULT_ENV_FILE);
    expect(envFileFor({ ENV_FILE: " .env.ranking-prod " })).toBe(
      ".env.ranking-prod",
    );
  });

  it("refuses files that Next loads on its own", () => {
    for (const name of [
      ".env",
      ".env.production",
      ".env.production.local",
      ".env.development.local",
      ".env.test.local",
      "config/.env.production",
    ]) {
      expect(() => envFileFor({ ENV_FILE: name })).toThrow(/Next carrega/);
    }
  });
});

describe("environment loading", () => {
  it("fills only what the session does not have yet", () => {
    const env: Environment = { DATABASE_URL: "from-session" };
    expect(
      mergeMissing(env, { DATABASE_URL: "from-file", DIRECT_URL: "direct" }),
    ).toEqual(["DIRECT_URL"]);
    expect(env).toEqual({ DATABASE_URL: "from-session", DIRECT_URL: "direct" });
  });

  it("reads .env.local when it exists and carries on without it", () => {
    const env: Environment = {};
    const dir = folder({
      ".env.local": "DATABASE_URL=postgresql://a:b@127.0.0.1:5433/ranking\n",
    });
    expect(loadEnvironment(env, dir)).toEqual({
      file: ".env.local",
      found: true,
    });
    expect(env.DATABASE_URL).toBe("postgresql://a:b@127.0.0.1:5433/ranking");
    expect(loadEnvironment({}, folder({}))).toEqual({
      file: ".env.local",
      found: false,
    });
  });

  it("reads the file named by ENV_FILE and fails when it is missing", () => {
    const dir = folder({
      ".env.ranking-preview":
        "DIRECT_URL=postgresql://x:y@db.example.com:5432/postgres\n",
    });
    const env: Environment = { ENV_FILE: ".env.ranking-preview" };
    loadEnvironment(env, dir);
    expect(env.DIRECT_URL).toBe(
      "postgresql://x:y@db.example.com:5432/postgres",
    );
    expect(() =>
      loadEnvironment({ ENV_FILE: ".env.ranking-prod" }, dir),
    ).toThrow(/não existe/);
  });

  it("gives the CLI the direct address first", () => {
    expect(
      cliDatabaseUrl({ DATABASE_URL: "pooled", DIRECT_URL: "direct" }),
    ).toBe("direct");
    expect(cliDatabaseUrl({ DATABASE_URL: "pooled", DIRECT_URL: " " })).toBe(
      "pooled",
    );
    expect(cliDatabaseUrl({})).toBe("");
  });
});
