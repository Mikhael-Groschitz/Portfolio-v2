import { START_METHODS } from "@/server/ranking/api";
import { methodNotAllowed } from "@/server/ranking/http";
import { rankingApi } from "@/server/ranking/runtime";

export function POST(request: Request): Promise<Response> {
  return rankingApi().start(request);
}

export function GET(): Response {
  return methodNotAllowed(START_METHODS);
}

export function PUT(): Response {
  return methodNotAllowed(START_METHODS);
}

export function PATCH(): Response {
  return methodNotAllowed(START_METHODS);
}

export function DELETE(): Response {
  return methodNotAllowed(START_METHODS);
}
