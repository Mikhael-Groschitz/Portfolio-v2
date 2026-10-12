import { describe, expect, it } from "vitest";
import { getTexts } from "@/content";
import { LOCALES } from "@/content/locales";
import type { CommandId } from "@/content/types";
import {
  COMMANDS,
  type CommandContext,
  MENUS,
  commandLabel,
  isAvailable,
  isMenuCommand,
  isMenuShown,
  shortcutText,
} from "./command-model";

const ids = Object.keys(COMMANDS) as CommandId[];
const inMenus = MENUS.flatMap((menu) => menu.entries.filter(isMenuCommand));
const queryMenu = MENUS.find((menu) => menu.id === "query");

const disconnected: CommandContext = {
  connected: false,
  document: "none",
  canUndo: false,
  canRedo: false,
  canGoBack: false,
  canGoForward: false,
  executing: false,
  hasResults: false,
  tabs: 0,
};
const empty: CommandContext = { ...disconnected, connected: true };
const section: CommandContext = {
  ...empty,
  document: "section",
  hasResults: true,
  tabs: 1,
};
const query: CommandContext = { ...section, document: "query", tabs: 2 };
const executing: CommandContext = { ...query, executing: true };

function enabledIn(context: CommandContext): CommandId[] {
  return inMenus.filter((id) => isAvailable(id, context));
}

describe("commands", () => {
  it("has a label for every command in both languages", () => {
    for (const locale of LOCALES) {
      expect(Object.keys(getTexts(locale).shell.commands).sort()).toEqual(
        [...ids].sort(),
      );
    }
  });

  it("follows the menu order of the texts and shows each command once", () => {
    expect(MENUS.map((menu) => menu.id)).toEqual(
      Object.keys(getTexts().shell.menu.menus),
    );
    expect(new Set(inMenus).size).toBe(inMenus.length);
  });

  it("starts the File menu with the connection, like SSMS", () => {
    expect(MENUS[0].entries.slice(0, 2)).toEqual(["connect", "disconnect"]);
  });

  it("keeps only connecting, New Query and app commands while disconnected", () => {
    expect(enabledIn(disconnected)).toEqual([
      "connect",
      "newQuery",
      "objectExplorer",
      "cheatsheet",
      "fullScreen",
      "cloneRepository",
      "createRepository",
      "openOnGitHub",
      "gitSettings",
      "options",
      "manageExtensions",
      "customizeMenu",
      "resetWindowLayout",
      "openCheatsheet",
      "about",
    ]);
  });

  it("leaves the document commands off until a tab is open", () => {
    const off = inMenus.filter((id) => !isAvailable(id, empty));
    expect(off).toEqual([
      "closeDocument",
      "save",
      "saveAll",
      "undo",
      "redo",
      "cut",
      "copy",
      "paste",
      "find",
      "selectAll",
      "resultsPane",
      ...(queryMenu?.entries.filter(isMenuCommand) ?? []),
      "closeAllDocuments",
    ]);
  });

  it("lets a script be copied, saved and run but not edited", () => {
    for (const id of [
      "copy",
      "selectAll",
      "save",
      "closeDocument",
      "execute",
      "parse",
      "resultsToText",
    ] as const) {
      expect(isAvailable(id, section), id).toBe(true);
    }
    for (const id of [
      "cut",
      "paste",
      "find",
      "undo",
      "commentLines",
      "increaseIndent",
    ] as const) {
      expect(isAvailable(id, section), id).toBe(false);
    }
  });

  it("edits a query and follows its history", () => {
    expect(isAvailable("paste", query)).toBe(true);
    expect(isAvailable("commentLines", query)).toBe(true);
    expect(isAvailable("undo", query)).toBe(false);
    expect(isAvailable("undo", { ...query, canUndo: true })).toBe(true);
    expect(isAvailable("redo", { ...query, canRedo: true })).toBe(true);
  });

  it("only lets the query be canceled while it runs", () => {
    expect(isAvailable("cancelQuery", query)).toBe(false);
    expect(isAvailable("cancelQuery", executing)).toBe(true);
    expect(isAvailable("execute", executing)).toBe(false);
    expect(isAvailable("parse", executing)).toBe(false);
    expect(isAvailable("cancelQuery", { ...executing, connected: false })).toBe(
      false,
    );
  });

  it("goes back and forward only when there is a way to go", () => {
    expect(isAvailable("navigateBackward", query)).toBe(false);
    expect(isAvailable("navigateBackward", { ...query, canGoBack: true })).toBe(
      true,
    );
    expect(
      isAvailable("navigateForward", { ...disconnected, canGoForward: true }),
    ).toBe(true);
  });

  it("connects the editor only while disconnected", () => {
    expect(isAvailable("editorConnect", disconnected)).toBe(true);
    expect(isAvailable("editorConnect", query)).toBe(false);
    expect(isAvailable("editorDisconnect", disconnected)).toBe(false);
    expect(isAvailable("editorDisconnect", empty)).toBe(true);
  });

  it("never enables Stop in the Object Explorer nor Deploy", () => {
    for (const context of [disconnected, empty, section, query, executing]) {
      expect(isAvailable("explorerStop", context)).toBe(false);
      expect(isAvailable("deploy", context)).toBe(false);
    }
  });

  it("shows the Query menu only while a tab is open, like SSMS", () => {
    expect(queryMenu && isMenuShown(queryMenu, empty)).toBe(false);
    expect(queryMenu && isMenuShown(queryMenu, section)).toBe(true);
    expect(MENUS.filter((menu) => !isMenuShown(menu, empty))).toEqual([
      queryMenu,
    ]);
  });

  it("marks the commands that only show a friendly notice", () => {
    expect(ids.filter((id) => COMMANDS[id].illustrative)).toEqual([
      "openFile",
      "openFolder",
      "saveAll",
      "estimatedPlan",
      "queryDesigner",
      "templateParameters",
      "queryOptions",
      "actualPlan",
      "liveStatistics",
      "clientStatistics",
      "resultsToFile",
      "cloneRepository",
      "createRepository",
      "gitSettings",
      "manageExtensions",
      "customizeMenu",
      "databaseEngineQuery",
      "customizeToolbar",
      "explorerFilter",
      "explorerRefresh",
      "activityMonitor",
      "pinTab",
    ]);
  });

  it("shows plain shortcuts and the comment chords", () => {
    expect(shortcutText("execute")).toBe("F5");
    expect(shortcutText("commentLines")).toBe("Ctrl+K, Ctrl+C");
    expect(shortcutText("uncommentLines")).toBe("Ctrl+K, Ctrl+U");
    expect(shortcutText("parse")).toBeUndefined();
  });

  it("drops the trailing dots of dialog commands in notices", () => {
    expect(commandLabel("Abrir Arquivo...")).toBe("Abrir Arquivo");
    expect(commandLabel("Salvar Tudo")).toBe("Salvar Tudo");
  });
});
