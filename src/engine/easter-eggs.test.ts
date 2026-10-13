import { describe, expect, it } from "vitest";
import { getTable } from "@/content";
import { LOCALES } from "@/content/locales";
import {
  DATABASE_OFFLINE,
  DATE_CONVERSION_FAILED,
  DATE_IN_THE_FUTURE,
} from "./errors";
import { V2_LAUNCH_DATE, arrivalOutcome, parseSqlDate } from "./easter-eggs";
import { type ExecutionContext, execute, resultSetsOf } from "./execute";

const now = new Date("2026-10-15T12:00:00Z");
const online: ExecutionContext = { locale: "en", now, v1Available: true };
const offline: ExecutionContext = { locale: "en", now, v1Available: false };

function temporal(date: string, table = "Portfolio.dbo.Career") {
  return `SELECT * FROM ${table} FOR SYSTEM_TIME AS OF '${date}';`;
}

describe("USE Portfolio_v1", () => {
  it.each([
    "USE Portfolio_v1;",
    "use [portfolio_v1]",
    "  USE   PORTFOLIO_V1  GO",
  ])("travels to version 1 with %j", (command) => {
    expect(execute(command, online)).toEqual({
      kind: "results",
      database: "Portfolio_v1",
      results: [],
      effect: "travel",
    });
  });

  it("says the database is offline when version 1 has no address", () => {
    for (const locale of LOCALES) {
      expect(
        execute("USE Portfolio_v1;", { ...offline, locale }),
      ).toMatchObject({
        kind: "error",
        database: "Portfolio",
        error: {
          number: 942,
          level: 14,
          state: 4,
          line: 1,
          message: DATABASE_OFFLINE.text[locale],
        },
        hint: { kind: "offline" },
      });
    }
  });

  it("leaves the rest of the batch behind once the TARDIS leaves", () => {
    const outcome = execute(
      "SELECT * FROM dbo.About;\nUSE Portfolio_v1;\nSELECT * FROM dbo.Career;",
      online,
    );
    expect(outcome).toMatchObject({ kind: "results", effect: "travel" });
    expect(resultSetsOf(outcome).map((set) => set.source)).toEqual([
      "dbo.About",
    ]);
  });
});

describe("FOR SYSTEM_TIME AS OF", () => {
  it("travels to version 1 for dates before the launch of version 2", () => {
    for (const date of ["2025-01-01", "1963-11-23", "2026-10-11 23:59:59"]) {
      expect(execute(temporal(date), online), date).toMatchObject({
        effect: "travel",
        database: "Portfolio_v1",
      });
    }
  });

  it("returns today's rows between the launch and now", () => {
    for (const date of [V2_LAUNCH_DATE, "2026-10-13T08:30:00", "20261014"]) {
      const outcome = execute(temporal(date), online);
      expect(outcome, date).toMatchObject({ kind: "results" });
      expect(outcome).not.toHaveProperty("effect");
      expect(resultSetsOf(outcome)[0]?.rows).toHaveLength(
        getTable("career", "en").length,
      );
    }
  });

  it.each(["dbo.Projects", "Projects", "PORTFOLIO.DBO.PROJECTS"])(
    "works with any table, written as %j",
    (table) => {
      const outcome = execute(temporal("2026-10-13", table), online);
      expect(resultSetsOf(outcome)[0]?.source).toBe("dbo.Projects");
    },
  );

  it("accepts N'' strings", () => {
    expect(
      execute(
        "SELECT * FROM dbo.About FOR SYSTEM_TIME AS OF N'2025-06-01'",
        online,
      ),
    ).toMatchObject({ effect: "travel" });
  });

  it("refuses to spoil the future", () => {
    expect(execute(temporal("2999-01-01"), online)).toMatchObject({
      kind: "error",
      error: { number: 13542, message: DATE_IN_THE_FUTURE.text.en },
      hint: { kind: "date" },
    });
  });

  it("fails like SQL Server on dates that do not exist", () => {
    for (const date of [
      "2025-02-30",
      "2025-13-01",
      "banana",
      "2025-01-01 25:00",
    ]) {
      expect(execute(temporal(date), online), date).toMatchObject({
        kind: "error",
        error: { number: 241, message: DATE_CONVERSION_FAILED.text.en },
        hint: { kind: "date" },
      });
    }
  });

  it("needs version 1 to travel and says so", () => {
    expect(execute(temporal("2025-01-01"), offline)).toMatchObject({
      kind: "error",
      error: { number: 942 },
      hint: { kind: "offline" },
    });
  });

  it("only works on the portfolio tables", () => {
    for (const table of ["dbo.sp_DownloadCV", "dbo.Users", "konami"]) {
      const outcome = execute(temporal("2025-01-01", table), online);
      expect(outcome.kind, table).toBe("error");
      expect(outcome).not.toHaveProperty("effect");
      if (outcome.kind === "error") {
        expect([241, 942, 13542]).not.toContain(outcome.error.number);
      }
    }
  });
});

describe("sp_Regenerate", () => {
  it.each([
    "EXEC dbo.sp_Regenerate;",
    "exec sp_regenerate",
    "EXECUTE Portfolio.dbo.sp_Regenerate",
    "sp_Regenerate",
  ])("regenerates with %j and stays put", (command) => {
    expect(execute(command, offline)).toEqual({
      kind: "results",
      database: "Portfolio",
      results: [],
      effect: "regenerate",
    });
  });

  it("keeps running the rest of the batch", () => {
    const outcome = execute(
      "EXEC dbo.sp_Regenerate; SELECT * FROM dbo.About;",
      offline,
    );
    expect(outcome).toMatchObject({ effect: "regenerate" });
    expect(resultSetsOf(outcome)).toHaveLength(1);
  });
});

describe("SELECT * FROM konami", () => {
  it.each([
    "SELECT * FROM konami",
    "select * from dbo.KONAMI;",
    "SELECT * FROM Portfolio.dbo.konami",
  ])("opens the game with %j", (command) => {
    expect(execute(command, offline)).toEqual({
      kind: "results",
      database: "Portfolio",
      results: [],
      effect: "game",
    });
  });

  it("keeps the batch running around the game", () => {
    const outcome = execute(
      "SELECT * FROM konami; SELECT * FROM dbo.About;",
      offline,
    );
    expect(outcome).toMatchObject({ effect: "game" });
    expect(resultSetsOf(outcome)).toHaveLength(1);
  });
});

describe("secrets", () => {
  it("stay out of HELP", () => {
    const listed = JSON.stringify(execute("HELP", online));
    expect(listed).not.toMatch(
      /Portfolio_v1|sp_Regenerate|SYSTEM_TIME|konami/i,
    );
  });

  it("bring the window back to the present", () => {
    expect(arrivalOutcome()).toEqual({
      kind: "results",
      database: "Portfolio",
      results: [],
      effect: "return",
    });
  });
});

describe("parseSqlDate", () => {
  it.each([
    ["2025-01-01", "2025-01-01T00:00:00.000Z"],
    ["20250101", "2025-01-01T00:00:00.000Z"],
    ["2024-02-29 13:45", "2024-02-29T13:45:00.000Z"],
    ["2025-06-01t08:00:05.1234567", "2025-06-01T08:00:05.000Z"],
    ["0050-03-04", "0050-03-04T00:00:00.000Z"],
  ])("reads %j", (text, iso) => {
    expect(parseSqlDate(text)?.toISOString()).toBe(iso);
  });

  it.each(["2025-02-29", "0000-01-01", "2025-1-1", "2025-01-01 24:00", ""])(
    "rejects %j",
    (text) => {
      expect(parseSqlDate(text)).toBeNull();
    },
  );
});
