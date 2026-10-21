import { describe, expect, it } from "vitest";
import { SUBWEAPONS } from "../balance";
import { COMMANDS } from "../core/commands";
import {
  TITLE_COMMANDS,
  commandLines,
  commandSheet,
  keyLabel,
} from "./command-sheet";
import { GAME_TEXTS } from "./texts";

const pt = GAME_TEXTS["pt-BR"];
const en = GAME_TEXTS.en;

function sheetIds(collapsed: boolean): string[] {
  return commandSheet(pt, collapsed)
    .filter(({ id }) => id !== "subweapons")
    .flatMap(({ lines }) => lines.map(({ id }) => id));
}

describe("command sheet", () => {
  it("lists every command of the game map once, and nothing else", () => {
    expect(sheetIds(true).sort()).toEqual(COMMANDS.map(({ id }) => id).sort());
  });

  it("leaves T out where the ranking is always on screen", () => {
    expect(sheetIds(false)).not.toContain("ranking");
    expect(sheetIds(false)).toHaveLength(COMMANDS.length - 1);
  });

  it("names each subweapon by its SQL command with its cost", () => {
    const subweapons = commandSheet(pt, false).find(
      ({ id }) => id === "subweapons",
    );
    expect(subweapons?.lines.map(({ keys }) => keys)).toEqual([
      "SELECT",
      "JOIN",
      "TRUNCATE",
      "DROP",
    ]);
    expect(subweapons?.lines.map(({ id }) => id)).toEqual(
      Object.keys(SUBWEAPONS),
    );
    expect(subweapons?.lines[2].action).toContain(
      `${SUBWEAPONS.truncate.cost} de Query Energy`,
    );
  });

  it("builds the key labels from the key codes in both languages", () => {
    const keys = Object.fromEntries(
      commandLines(pt, TITLE_COMMANDS).map(({ id, keys }) => [id, keys]),
    );
    expect(keys).toMatchObject({
      move: "← → ou A D",
      jump: "↑ ou W ou Espaço",
      cloud: "Pulo no ar",
      crouch: "↓ ou S",
      dropThrough: "↓ + pulo",
      whip: "Z",
      exit: "Esc",
    });
    expect(
      commandLines(en, ["jump", "confirm"]).map(({ keys }) => keys),
    ).toEqual(["↑ or W or Space", "Enter"]);
    expect(keyLabel("KeyT", en)).toBe("T");
  });

  it("keeps the title list in the order of the game map", () => {
    expect(commandLines(pt, TITLE_COMMANDS).map(({ id }) => id)).toEqual(
      TITLE_COMMANDS,
    );
  });
});
