import { RANKING_METHODS } from "@/server/ranking/api";
import { methodNotAllowed } from "@/server/ranking/http";
import { rankingApi } from "@/server/ranking/runtime";

export function GET(request: Request): Promise<Response> {
  return rankingApi().read(request);
}

export function POST(request: Request): Promise<Response> {
  return rankingApi().submit(request);
}

export function PUT(): Response {
  return methodNotAllowed(RANKING_METHODS);
}

export function PATCH(): Response {
  return methodNotAllowed(RANKING_METHODS);
}

export function DELETE(): Response {
  return methodNotAllowed(RANKING_METHODS);
}
