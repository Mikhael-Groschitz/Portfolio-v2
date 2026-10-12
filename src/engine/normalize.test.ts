import { describe, expect, it } from "vitest";
import { splitStatements } from "./normalize";

const texts = (input: string) =>
  splitStatements(input).map((statement) => statement.text);

describe("splitStatements", () => {
  it("lowercases and collapses spaces", () => {
    expect(texts("  SELECT   Name,\n\tRole  FROM dbo.About ")).toEqual([
      "select name , role from dbo.about",
    ]);
  });

  it("drops semicolons, GO and both kinds of comments", () => {
    expect(
      texts(
        "-- Oi!\nUSE Portfolio;\nGO\n\n/* tudo\nisto some */ SELECT * FROM dbo.About; -- fim",
      ),
    ).toEqual(["use portfolio", "select * from dbo.about"]);
  });

  it("splits statements written one after the other", () => {
    expect(
      texts("use portfolio select * from about exec sp_help help"),
    ).toEqual(["use portfolio", "select * from about", "exec sp_help", "help"]);
  });

  it("removes brackets around names", () => {
    expect(texts("SELECT * FROM [Portfolio].[dbo].[About]")).toEqual([
      "select * from portfolio.dbo.about",
    ]);
  });

  it("keeps strings whole, comment marks and semicolons included", () => {
    expect(texts("SELECT '--;GO', N'it''s'")).toEqual([
      "select '--;go' , n'it''s'",
    ]);
  });

  it("keeps words that only contain go", () => {
    expect(texts("SELECT Category FROM dbo.TechStack")).toEqual([
      "select category from dbo.techstack",
    ]);
  });

  it("remembers the line where each statement starts", () => {
    expect(
      splitStatements("-- one\n\nUSE Portfolio\nGO\n/* a\nb */ SELECT 1"),
    ).toEqual([
      { text: "use portfolio", line: 3, original: "USE Portfolio" },
      { text: "select 1", line: 6, original: "SELECT 1" },
    ]);
  });

  it("keeps the statement as typed, without comments", () => {
    expect(
      splitStatements("EXEC sp_help N'dbo.Career' -- estrutura")[0]?.original,
    ).toBe("EXEC sp_help N'dbo.Career'");
    expect(splitStatements("sp_help [dbo].[About];")[0]?.original).toBe(
      "sp_help [dbo].[About]",
    );
  });

  it("returns nothing for blank input or comments only", () => {
    expect(splitStatements("  \n-- nada\n/* nada */ ;; GO")).toEqual([]);
  });

  it("treats markup as plain symbols", () => {
    expect(texts("<img src=x onerror=alert(1)>")).toEqual([
      "< img src = x onerror = alert ( 1 ) >",
    ]);
  });
});
