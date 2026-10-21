import { describe, expect, it } from "vitest";
import { chooseStore } from "./store";

const URL = "postgresql://ranking:ranking@127.0.0.1:5433/ranking";

describe("store choice", () => {
  it("uses the database when DATABASE_URL is set", () => {
    expect(chooseStore({ DATABASE_URL: URL })).toEqual({
      kind: "prisma",
      url: URL,
    });
  });

  it("turns the ranking off without a database", () => {
    expect(chooseStore({})).toEqual({ kind: "off" });
    expect(chooseStore({ DATABASE_URL: "  " })).toEqual({ kind: "off" });
  });

  it("keeps the ranking in memory in development when asked", () => {
    expect(
      chooseStore({
        NODE_ENV: "development",
        RANKING_STORE: "memory",
        DATABASE_URL: URL,
      }),
    ).toEqual({ kind: "memory" });
    expect(chooseStore({ RANKING_STORE: "memory" })).toEqual({
      kind: "memory",
    });
  });

  it("ignores RANKING_STORE in production", () => {
    expect(
      chooseStore({
        NODE_ENV: "production",
        RANKING_STORE: "memory",
        DATABASE_URL: URL,
      }),
    ).toEqual({ kind: "prisma", url: URL });
    expect(
      chooseStore({ NODE_ENV: "production", RANKING_STORE: "memory" }),
    ).toEqual({ kind: "off" });
  });
});
