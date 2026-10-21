import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceDir = fileURLToPath(new URL("..", import.meta.url));
const serverDir = join(sourceDir, "server");

const sources = readdirSync(sourceDir, { recursive: true, encoding: "utf8" })
  .filter((file) => /\.(ts|tsx)$/.test(file) && !/\.test\.tsx?$/.test(file))
  .map((file) => ({
    file: join(sourceDir, file),
    code: readFileSync(join(sourceDir, file), "utf8"),
  }));

function isClientCode(file: string, code: string): boolean {
  return (
    /^\s*["']use client["']/.test(code) ||
    relative(sourceDir, file).startsWith("game")
  );
}

function specifiers(code: string): string[] {
  return [...code.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map(
    ([, specifier]) => specifier,
  );
}

function reachesServer(file: string, specifier: string): boolean {
  if (/^(@prisma\/|pg$|pg\/|prisma\/)/.test(specifier)) {
    return true;
  }
  const target = specifier.startsWith("@/")
    ? join(sourceDir, specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(file), specifier)
      : null;
  return target !== null && !relative(serverDir, target).startsWith("..");
}

describe("client and server boundary", () => {
  const client = sources.filter(({ file, code }) => isClientCode(file, code));

  it("finds the client code it guards", () => {
    expect(client.length).toBeGreaterThan(50);
  });

  it("keeps the database and server modules out of client code", () => {
    const leaks = client.flatMap(({ file, code }) =>
      specifiers(code)
        .filter((specifier) => reachesServer(file, specifier))
        .map((specifier) => `${relative(sourceDir, file)} -> ${specifier}`),
    );
    expect(leaks).toEqual([]);
  });

  it("marks the runtime store as server only", () => {
    const runtime = readFileSync(
      join(serverDir, "ranking", "runtime.ts"),
      "utf8",
    );
    expect(runtime).toMatch(/^import "server-only";/);
  });
});
