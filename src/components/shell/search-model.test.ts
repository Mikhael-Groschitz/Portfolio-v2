import { describe, expect, it } from "vitest";
import {
  type SearchEntry,
  normalizeSearch,
  searchEntries,
  searchShortcutFor,
} from "./search-model";

const entries: SearchEntry[] = [
  {
    key: "career",
    group: "sections",
    label: "Carreira",
    detail: "SELECT * FROM dbo.Career",
  },
  {
    key: "projects",
    group: "sections",
    label: "Projetos",
    detail: "SELECT * FROM dbo.Projects",
  },
  { key: "new", group: "commands", label: "Nova Consulta", shortcut: "Alt+N" },
  { key: "options", group: "commands", label: "Opções" },
  {
    key: "help",
    group: "examples",
    label: "HELP",
    detail: "Lista as tabelas e os comandos.",
  },
];

const keys = (query: string) =>
  searchEntries(entries, query).map((entry) => entry.key);

describe("search", () => {
  it("ignores case, accents and extra spaces", () => {
    expect(normalizeSearch("  Opções   do  SSMS ")).toBe("opcoes do ssms");
    expect(keys("opcoes")).toEqual(["options"]);
    expect(keys("CARREIRA")).toEqual(["career"]);
  });

  it("also looks at the detail and needs every word", () => {
    expect(keys("dbo projects")).toEqual(["projects"]);
    expect(keys("tabelas")).toEqual(["help"]);
    expect(keys("nova tabela")).toEqual([]);
  });

  it("keeps the groups in order and ranks the best labels first", () => {
    expect(keys("o")).toEqual(["projects", "career", "options", "new", "help"]);
    expect(keys("")).toEqual(entries.map((entry) => entry.key));
  });

  it("offers Ctrl+Q everywhere except Linux, where Firefox quits on it", () => {
    expect(searchShortcutFor("Win32")).toBe("Ctrl+Q");
    expect(searchShortcutFor("MacIntel")).toBe("Ctrl+Q");
    expect(searchShortcutFor("Linux x86_64")).toBeNull();
    expect(searchShortcutFor("Linux armv8l Android")).toBe("Ctrl+Q");
  });
});
