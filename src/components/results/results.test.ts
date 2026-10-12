import { describe, expect, it } from "vitest";
import { getTexts } from "@/content";
import { formatCompletionTime } from "@/content/format";
import { arrivalOutcome } from "@/engine/easter-eggs";
import { type ResultSet, execute } from "@/engine/execute";
import { type RunTiming, messageBlocks } from "./messages";
import { resultsAsText } from "./results-text";

const text = getTexts("pt-BR").shell.results;
const completedAt = new Date(Date.UTC(2026, 9, 10, 22, 22, 10, 305));
const timing: RunTiming = { completedAt, elapsedMs: 150 };

function blocksOf(command: string, run: RunTiming = timing) {
  return messageBlocks(
    execute(command, { locale: "pt-BR", random: () => 0 }),
    text,
    run,
  );
}

describe("messageBlocks", () => {
  it("gives each query its own rows, execution time and completion time", () => {
    const blocks = blocksOf(
      "SELECT * FROM dbo.About;\nSELECT * FROM dbo.Contact;",
    );
    expect(blocks).toHaveLength(2);
    const [about, contact] = blocks.map((block) => block.text.split("\n"));
    expect(about[0]).toBe("(1 linha afetada)");
    expect(about[1]).toMatch(/^Tempo de execução: 00:00:00\.\d{3}$/);
    expect(about[2]).toMatch(/^Horário de conclusão: /);
    expect(contact[0]).toMatch(/^\(\d+ linhas afetadas\)$/);
    expect(contact[2]).toBe(
      `Horário de conclusão: ${formatCompletionTime(completedAt)}`,
    );
  });

  it("splits the run time by the work of each query, adding up to the total", () => {
    const blocks = blocksOf(
      "SELECT * FROM dbo.About; SELECT * FROM dbo.TechStack",
    );
    const durations = blocks.map((block) =>
      Number(/\.(\d{3})\n/.exec(block.text)?.[1]),
    );
    expect(durations[0]).toBeLessThan(durations[1]);
    expect(durations[0] + durations[1]).toBe(150);
  });

  it("keeps the result sets of one statement in the same block", () => {
    const [help] = blocksOf("HELP");
    expect(
      help.text.startsWith("(7 linhas afetadas)\n(11 linhas afetadas)\n"),
    ).toBe(true);
  });

  it("prints sp_help notes with the rows of that call", () => {
    const [block] = blocksOf("sp_help 'dbo.About'");
    expect(block.text).toContain(
      "\nNenhuma chave estrangeira faz referência à tabela 'dbo.About'",
    );
  });

  it("says the commands completed when nothing returns rows", () => {
    const [block] = blocksOf("USE Portfolio");
    expect(block.text).toMatch(
      /^Comandos concluídos com êxito\.\nTempo de execução: 00:00:00\.150\n/,
    );
  });

  it("leaves the times out while the run is not confirmed yet", () => {
    expect(
      blocksOf("SELECT * FROM dbo.About", { completedAt: null, elapsedMs: 0 }),
    ).toEqual([{ error: null, text: "(1 linha afetada)" }]);
  });

  it("keeps the effect lines first, as the easter eggs expect", () => {
    const [block] = messageBlocks(arrivalOutcome(), text, timing);
    expect(
      block.text.startsWith(
        "Contexto do banco de dados alterado para 'Portfolio'.\nDe volta ao presente.\n",
      ),
    ).toBe(true);
  });

  it("shows errors with the hint and a single completion time", () => {
    const [block] = blocksOf("SELECT * FROM dbo.Carrer");
    expect(block.error).toMatch(/^Msg \d+, Nível 16, Estado 1, Linha 1\n/);
    expect(block.text).toBe(
      `\n\nDica: você quis dizer SELECT * FROM dbo.Career?\n\nHorário de conclusão: ${formatCompletionTime(completedAt)}`,
    );
  });
});

const people: ResultSet = {
  source: "dbo.People",
  columns: [
    { name: "Name", type: "text" },
    { name: "Note", type: "long" },
  ],
  rows: [
    [
      { kind: "text", text: "Ana" },
      { kind: "text", text: "Gosta de\nSQL" },
    ],
    [{ kind: "text", text: "Bernardo" }, { kind: "null" }],
  ],
};

const single: ResultSet = {
  source: "dbo.Single",
  columns: [{ name: "Id", type: "text" }],
  rows: [[{ kind: "link", text: "https://example.com", href: "#" }]],
};

describe("results as text", () => {
  it("lines the columns up under a dashed header, like SSMS", () => {
    expect(resultsAsText([people], text)).toBe(
      [
        "Name     Note",
        "-------- ------------",
        "Ana      Gosta de SQL",
        "Bernardo NULL",
        "",
        "(2 linhas afetadas)",
      ].join("\n"),
    );
  });

  it("separates the result sets with a blank line", () => {
    expect(resultsAsText([single, single], text)).toBe(
      [
        "Id",
        "-------------------",
        "https://example.com",
        "",
        "(1 linha afetada)",
        "",
        "Id",
        "-------------------",
        "https://example.com",
        "",
        "(1 linha afetada)",
      ].join("\n"),
    );
  });

  it("writes nothing when there is no result set", () => {
    expect(resultsAsText([], text)).toBe("");
  });
});
