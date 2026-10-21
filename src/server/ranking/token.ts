import { RANKING } from "@/game/balance";
import type { Environment } from "../env";

const SECRET_PATTERN = /^[A-Za-z0-9+/_-]{43,}={0,2}$/;
const MIN_SECRET_BYTES = 32;
const TOKEN_PATTERN =
  /^v1\.([A-Za-z0-9_-]{22})\.(\d{1,15})\.([A-Za-z0-9_-]{43})$/;
const JTI_BYTES = 16;

export type TokenCheck =
  | { ok: true; jti: string; issuedAt: number; expiresAt: number }
  | { ok: false; reason: "token_invalid" | "token_expired" };

export function readSecret(env: Environment): Uint8Array<ArrayBuffer> | null {
  const value = env.RANKING_SECRET?.trim() ?? "";
  if (!SECRET_PATTERN.test(value)) {
    return null;
  }
  const bytes = Buffer.from(
    value.replace(/\+/g, "-").replace(/\//g, "_"),
    "base64url",
  );
  return bytes.length >= MIN_SECRET_BYTES ? new Uint8Array(bytes) : null;
}

export function importSecret(
  secret: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function encode(text: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(text);
}

function signedPart(jti: string, issuedAt: number): string {
  return `token:v1.${jti}.${issuedAt}`;
}

export async function issueToken(
  key: CryptoKey,
  now: number,
): Promise<{ token: string; jti: string; expiresAt: number }> {
  const issuedAt = Math.floor(now);
  const jti = Buffer.from(
    crypto.getRandomValues(new Uint8Array(JTI_BYTES)),
  ).toString("base64url");
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encode(signedPart(jti, issuedAt)),
  );
  return {
    token: `v1.${jti}.${issuedAt}.${Buffer.from(signature).toString("base64url")}`,
    jti,
    expiresAt: issuedAt + RANKING.tokenTtlMs,
  };
}

export async function verifyToken(
  key: CryptoKey,
  token: string,
  now: number,
): Promise<TokenCheck> {
  const match = TOKEN_PATTERN.exec(token);
  if (!match) {
    return { ok: false, reason: "token_invalid" };
  }
  const [, jti, issued, signature] = match;
  const issuedAt = Number(issued);
  const signatureBytes = new Uint8Array(Buffer.from(signature, "base64url"));
  if (Buffer.from(signatureBytes).toString("base64url") !== signature) {
    return { ok: false, reason: "token_invalid" };
  }
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encode(signedPart(jti, issuedAt)),
  );
  if (!valid || issuedAt > now + RANKING.clockToleranceMs) {
    return { ok: false, reason: "token_invalid" };
  }
  const expiresAt = issuedAt + RANKING.tokenTtlMs;
  if (now >= expiresAt) {
    return { ok: false, reason: "token_expired" };
  }
  return { ok: true, jti, issuedAt, expiresAt };
}

export async function hashAddress(
  key: CryptoKey,
  address: string,
): Promise<string> {
  const digest = await crypto.subtle.sign("HMAC", key, encode(`ip:${address}`));
  return Buffer.from(digest).toString("hex");
}
