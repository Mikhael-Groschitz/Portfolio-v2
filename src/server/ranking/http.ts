import type {
  PublicEntry,
  RankingError,
  RankingErrorCode,
} from "@/ranking/protocol";

export const MAX_BODY_BYTES = 1024;
export const NO_STORE = "no-store";
export const SHARED_READ = "public, s-maxage=60, stale-while-revalidate=30";

const MESSAGES: Readonly<Record<RankingErrorCode, string>> = {
  bad_request: "A requisição não está no formato esperado.",
  forbidden_origin: "Esta API só aceita chamadas do próprio site.",
  unsupported_media_type: "Envie o corpo como application/json.",
  too_large: "O corpo da requisição é grande demais.",
  method_not_allowed: "Método não permitido nesta rota.",
  invalid_name: "Escolha outro nome, com três letras de A a Z.",
  invalid_time: "O tempo enviado não vale para esta partida.",
  token_invalid: "O token da partida não é válido.",
  token_expired: "O token da partida expirou.",
  token_used: "Este resultado já foi enviado.",
  too_many_requests: "Muitos envios em pouco tempo. Tente de novo mais tarde.",
  ranking_off: "O ranking está desligado no momento.",
  ranking_unavailable:
    "O ranking não respondeu agora. Tente de novo em instantes.",
};

export function json(
  body: unknown,
  status: number,
  cache = NO_STORE,
  headers: Record<string, string> = {},
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": cache,
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

export function failure(
  status: number,
  code: RankingErrorCode,
  options: {
    retryAfter?: number;
    allow?: string;
    entries?: PublicEntry[];
  } = {},
): Response {
  const body: RankingError = { error: code, message: MESSAGES[code] };
  if (options.entries) {
    body.entries = options.entries;
  }
  const headers: Record<string, string> = {};
  if (options.retryAfter !== undefined) {
    headers["Retry-After"] = String(Math.max(1, Math.ceil(options.retryAfter)));
  }
  if (options.allow) {
    headers.Allow = options.allow;
  }
  return json(body, status, NO_STORE, headers);
}

export function methodNotAllowed(allow: string): Response {
  return failure(405, "method_not_allowed", { allow });
}

export function isJson(request: Request): boolean {
  const type = request.headers.get("content-type") ?? "";
  return type.split(";")[0].trim().toLowerCase() === "application/json";
}

export function sameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin") {
    return false;
  }
  return request.headers.get("origin") === new URL(request.url).origin;
}

export function clientAddress(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return real || forwarded || "unknown";
}

export type BodyReading =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413; code: "bad_request" | "too_large" };

const TOO_LARGE = { ok: false, status: 413, code: "too_large" } as const;
const BAD_REQUEST = { ok: false, status: 400, code: "bad_request" } as const;

export async function readJson(
  request: Request,
  limit = MAX_BODY_BYTES,
): Promise<BodyReading> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > limit) {
    return TOO_LARGE;
  }
  if (!request.body) {
    return BAD_REQUEST;
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return TOO_LARGE;
    }
    chunks.push(value);
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.concat(chunks),
    );
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return BAD_REQUEST;
  }
}
