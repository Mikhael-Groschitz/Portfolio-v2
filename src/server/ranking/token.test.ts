import { describe, expect, it } from "vitest";
import { RANKING } from "@/game/balance";
import {
  hashAddress,
  importSecret,
  issueToken,
  readSecret,
  verifyToken,
} from "./token";

const SECRET = Buffer.alloc(32, 7).toString("base64url");
const OTHER = Buffer.alloc(32, 9).toString("base64url");
const NOW = 1_800_000_000_000;

async function key(secret = SECRET): Promise<CryptoKey> {
  const bytes = readSecret({ RANKING_SECRET: secret });
  if (!bytes) {
    throw new Error("secret");
  }
  return importSecret(bytes);
}

describe("ranking secret", () => {
  it("accepts 32 random bytes or more in base64", () => {
    expect(readSecret({ RANKING_SECRET: SECRET })?.length).toBe(32);
    expect(
      readSecret({ RANKING_SECRET: Buffer.alloc(48, 250).toString("base64") }),
    ).toHaveLength(48);
  });

  it("turns the ranking off with a missing, short or malformed secret", () => {
    for (const value of [
      undefined,
      "",
      "short",
      Buffer.alloc(31, 1).toString("base64url"),
      "x".repeat(42),
      `${"a".repeat(40)} ${"b".repeat(10)}`,
    ]) {
      expect(readSecret({ RANKING_SECRET: value })).toBeNull();
    }
  });
});

describe("run token", () => {
  it("round-trips with a random id and a short life", async () => {
    const signing = await key();
    const first = await issueToken(signing, NOW);
    const second = await issueToken(signing, NOW);
    expect(first.jti).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(first.jti).not.toBe(second.jti);
    expect(first.expiresAt).toBe(NOW + RANKING.tokenTtlMs);
    expect(await verifyToken(signing, first.token, NOW + 60_000)).toEqual({
      ok: true,
      jti: first.jti,
      issuedAt: NOW,
      expiresAt: NOW + RANKING.tokenTtlMs,
    });
  });

  it("refuses a token that was changed or signed with another secret", async () => {
    const signing = await key();
    const { token } = await issueToken(signing, NOW);
    const [version, jti, issued, signature] = token.split(".");
    const flipped = signature.endsWith("A") ? "B" : "A";
    for (const changed of [
      `${version}.${jti}.${issued}.${signature.slice(0, -1)}${flipped}`,
      `${version}.${jti}.${Number(issued) - 60_000}.${signature}`,
      `v2.${jti}.${issued}.${signature}`,
      `${version}.${jti}.${issued}`,
      "",
    ]) {
      expect(await verifyToken(signing, changed, NOW)).toEqual({
        ok: false,
        reason: "token_invalid",
      });
    }
    expect(await verifyToken(await key(OTHER), token, NOW)).toMatchObject({
      ok: false,
      reason: "token_invalid",
    });
  });

  it("refuses an expired token and one started in the future", async () => {
    const signing = await key();
    const { token } = await issueToken(signing, NOW);
    expect(await verifyToken(signing, token, NOW + RANKING.tokenTtlMs)).toEqual(
      { ok: false, reason: "token_expired" },
    );
    expect(
      await verifyToken(signing, token, NOW - RANKING.clockToleranceMs - 1),
    ).toEqual({ ok: false, reason: "token_invalid" });
    expect(
      (await verifyToken(signing, token, NOW - RANKING.clockToleranceMs)).ok,
    ).toBe(true);
  });
});

describe("run token clock", () => {
  it("signs whole milliseconds even if the clock has a fraction", async () => {
    const signing = await key();
    const { token, expiresAt } = await issueToken(signing, NOW + 0.75);
    expect(token.split(".")[2]).toBe(String(NOW));
    expect(expiresAt).toBe(NOW + RANKING.tokenTtlMs);
    expect((await verifyToken(signing, token, NOW + 1)).ok).toBe(true);
  });
});

describe("address hash", () => {
  it("keeps no readable address and depends on the secret", async () => {
    const hash = await hashAddress(await key(), "203.0.113.7");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("203");
    expect(await hashAddress(await key(), "203.0.113.7")).toBe(hash);
    expect(await hashAddress(await key(OTHER), "203.0.113.7")).not.toBe(hash);
    expect(await hashAddress(await key(), "203.0.113.8")).not.toBe(hash);
  });
});
