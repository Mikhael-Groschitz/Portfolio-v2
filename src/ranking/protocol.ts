export const RANKING_PATH = "/api/ranking";
export const RANKING_START_PATH = "/api/ranking/start";

export interface PublicEntry {
  position: number;
  name: string;
  timeMs: number;
}

export interface RankingRead {
  entries: PublicEntry[];
}

export interface StartedRun {
  token: string;
  expiresAt: number;
}

export interface SubmitBody {
  token: string;
  name: string;
  timeMs: number;
}

export type SubmitResult =
  | { status: "entered"; position: number; entries: PublicEntry[] }
  | { status: "outside"; entries: PublicEntry[] };

export type RankingErrorCode =
  | "bad_request"
  | "forbidden_origin"
  | "unsupported_media_type"
  | "too_large"
  | "method_not_allowed"
  | "invalid_name"
  | "invalid_time"
  | "token_invalid"
  | "token_expired"
  | "token_used"
  | "too_many_requests"
  | "ranking_off"
  | "ranking_unavailable";

export interface RankingError {
  error: RankingErrorCode;
  message: string;
  entries?: PublicEntry[];
}
