import { describe, expect, it } from "vitest";
import { CATALOG, catalogObject } from "./catalog";
import { type ExecutionOutcome, execute, resultSetsOf } from "./execute";
import { OBJECT_NOT_FOUND, helpCall } from "./sp-help";

function run(command: string, locale: "pt-BR" | "en" = "en") {
  return execute(command, { locale, random: () => 0 });
}

function columnsOf(outcome: ExecutionOutcome): string[][] {
  return resultSetsOf(outcome).map((set) =>
    set.columns.map((column) => column.name),
  );
}

function infoOf(outcome: ExecutionOutcome): string[] {
  return outcome.kind === "results"
    ? outcome.results.flatMap((result) =>
        result.kind === "info" ? [result.text] : [],
      )
    : [];
}

describe("sp_help with an object", () => {
  it.each([
    "EXEC sp_help 'dbo.Career'",
    "sp_help N'Career'",
    "exec sys.sp_help @objname = 'Portfolio.dbo.Career'",
    "sp_help [dbo].[Career]",
    "EXECUTE sp_help '[dbo].[Career]';",
  ])("describes the table with %j", (command) => {
    const outcome = run(command);
    expect(columnsOf(outcome).map((columns) => columns[0])).toEqual([
      "Name",
      "Column_name",
      "Identity",
      "RowGuidCol",
      "Data_located_on_filegroup",
      "index_name",
      "constraint_type",
    ]);
  });

  it("lists every column with its type, size and nullability", () => {
    const [, columns] = resultSetsOf(run("sp_help 'dbo.Career'"));
    const career = catalogObject("career");
    expect(columns.rows.map((row) => row[0])).toEqual(
      career.columns.map((column) => ({ kind: "text", text: column.name })),
    );
    const byName = new Map(
      columns.rows.map((row) => [
        row[0].kind === "text" ? row[0].text : "",
        row.map((cell) => (cell.kind === "text" ? cell.text : null)),
      ]),
    );
    expect(byName.get("Company")?.slice(1, 7)).toEqual([
      "nvarchar",
      "no",
      "200",
      "",
      "",
      "no",
    ]);
    expect(byName.get("EndDate")?.slice(1, 9)).toEqual([
      "char",
      "no",
      "7",
      "",
      "",
      "yes",
      "no",
      "yes",
    ]);
    expect(byName.get("Description")?.[3]).toBe("-1");
  });

  it("names the primary key and its columns", () => {
    const sets = resultSetsOf(run("sp_help 'dbo.TechStack'"));
    expect(sets[5].rows[0]).toEqual([
      { kind: "text", text: "PK_TechStack" },
      {
        kind: "text",
        text: "clustered, unique, primary key located on PRIMARY",
      },
      { kind: "text", text: "Category, Technology" },
    ]);
  });

  it("adds the notes SQL Server prints in the Messages tab", () => {
    expect(infoOf(run("sp_help 'dbo.About'"))).toEqual([
      "No foreign keys reference table 'dbo.About', or you do not have permissions on referencing tables.",
      "No views with schema binding reference table 'dbo.About'.",
    ]);
    expect(infoOf(run("sp_help 'dbo.About'", "pt-BR"))[1]).toBe(
      "Nenhuma exibição com associação de esquema faz referência à tabela 'dbo.About'.",
    );
  });

  it("describes a procedure with a single result", () => {
    const outcome = run("EXEC sp_help 'dbo.sp_DownloadCV'");
    expect(resultSetsOf(outcome)).toHaveLength(1);
    expect(resultSetsOf(outcome)[0].rows[0][2]).toEqual({
      kind: "text",
      text: "stored procedure",
    });
    expect(infoOf(outcome)).toEqual([]);
  });

  it("answers an unknown object like SQL Server, keeping the name as typed", () => {
    expect(run("EXEC sp_help 'dbo.Carrer'")).toMatchObject({
      kind: "error",
      error: {
        number: OBJECT_NOT_FOUND,
        level: 16,
        message:
          "The object 'dbo.Carrer' does not exist in database 'Portfolio' or is invalid for this operation.",
      },
      hint: { kind: "similar", command: "EXEC sp_help 'dbo.Career'" },
    });
    expect(run("sp_help 'nothing here'")).toMatchObject({
      kind: "error",
      hint: { kind: "help" },
    });
  });

  it("works for every object in the catalog", () => {
    for (const object of CATALOG) {
      expect(run(`sp_help '${object.name}'`).kind, object.name).toBe("results");
    }
  });
});

describe("helpCall", () => {
  it("turns the selected text into an sp_help call, like Alt+F1", () => {
    expect(helpCall("  dbo.Career \n")).toBe("EXEC sp_help N'dbo.Career'");
    expect(helpCall("")).toBe("EXEC sp_help");
    expect(helpCall("it's")).toBe("EXEC sp_help N'it''s'");
  });

  it("round-trips quotes and line breaks through the engine", () => {
    expect(run(helpCall("Career"))).toMatchObject({ kind: "results" });
    expect(run(helpCall("it's\nodd"))).toMatchObject({
      kind: "error",
      error: { message: expect.stringContaining("'it's\nodd'") },
    });
    expect(resultSetsOf(run(helpCall(""))).map((set) => set.source)).toEqual([
      "sp_help",
      "HELP",
    ]);
  });
});
