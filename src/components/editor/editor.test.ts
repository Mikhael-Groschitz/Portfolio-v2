import { describe, expect, it, vi } from "vitest";
import { completionAt, isWordCharacter } from "./completions";
import {
  chordCommand,
  completionTarget,
  editActionOf,
  historyKeyOf,
  isExecuteShortcut,
  isHelpShortcut,
  isModifierKey,
  isTyping,
  startsChord,
} from "./editor-keys";
import {
  findMatches,
  markSegments,
  matchAfter,
  stepMatch,
} from "./find-matches";
import { highlightTsql } from "./highlight";
import { applyLineCommand } from "./line-commands";
import {
  type QuerySnapshot,
  createQueryStore,
  cursorOf,
  queryToRun,
  replaceSelection,
} from "./query-store";

const labels = (text: string, caret = text.length, explicit = false) =>
  completionAt(text, caret, explicit)?.items.map((item) => item.label) ?? null;

describe("completionAt", () => {
  it("suggests keywords, tables and procedures while typing", () => {
    expect(labels("sel")).toEqual(["SELECT"]);
    expect(labels("he")).toEqual(["HELP"]);
    expect(labels("help")).toEqual(["HELP", "sp_help"]);
  });

  it("lists the tables right after FROM", () => {
    expect(labels("SELECT * FROM ")).toEqual([
      "dbo.About",
      "dbo.TechStack",
      "dbo.Career",
      "dbo.Projects",
      "dbo.BeyondTheTerminal",
      "dbo.Contact",
    ]);
  });

  it("matches tables by their short name too", () => {
    expect(labels("SELECT * FROM car")).toEqual(["dbo.Career"]);
    expect(labels("select * from DBO.Pro")).toEqual(["dbo.Projects"]);
  });

  it("lists procedures after EXEC and the database after USE", () => {
    expect(labels("EXEC ")).toEqual(["dbo.sp_DownloadCV", "sp_help"]);
    expect(labels("use ")).toEqual(["Portfolio"]);
  });

  it("also finds longer pieces in the middle of a name", () => {
    expect(labels("EXEC help")).toEqual(["sp_help"]);
    expect(labels("download")).toEqual(["dbo.sp_DownloadCV"]);
    expect(labels("ca")).toEqual(["dbo.Career"]);
  });

  it("keeps the secrets out of the list", () => {
    expect(labels("USE Portfolio_")).toBeNull();
    expect(labels("EXEC sp_Re")).toBeNull();
    expect(labels("", 0, true)).not.toContain("Portfolio_v1");
  });

  it("stays quiet until there is something to complete", () => {
    expect(labels("")).toBeNull();
    expect(labels("SELECT * ")).toBeNull();
    expect(labels("xyz")).toBeNull();
  });

  it("opens with everything when asked explicitly", () => {
    expect(labels("", 0, true)).toHaveLength(13);
  });

  it("replaces only the word under the caret", () => {
    const text = "SELECT * FROM dbo.Ca WHERE";
    expect(completionAt(text, 20)).toMatchObject({ from: 14, to: 20 });
  });

  it("knows which characters belong to a word", () => {
    expect(["a", "Z", "9", "_", ".", "ç"].every(isWordCharacter)).toBe(true);
    expect([" ", ";", ",", "(", "*", "\n"].some(isWordCharacter)).toBe(false);
  });
});

function keyEvent(key: string, code: string, modifiers: string[] = []) {
  return {
    key,
    code,
    altKey: modifiers.includes("alt"),
    ctrlKey: modifiers.includes("ctrl"),
    metaKey: modifiers.includes("meta"),
    shiftKey: modifiers.includes("shift"),
  };
}

describe("isExecuteShortcut", () => {
  it("runs on F5 and on Alt+X, like SSMS", () => {
    expect(isExecuteShortcut(keyEvent("F5", "F5"))).toBe(true);
    expect(isExecuteShortcut(keyEvent("x", "KeyX", ["alt"]))).toBe(true);
    expect(isExecuteShortcut(keyEvent("≈", "KeyX", ["alt"]))).toBe(true);
  });

  it("leaves every other combination alone", () => {
    for (const event of [
      keyEvent("F5", "F5", ["ctrl"]),
      keyEvent("F5", "F5", ["shift"]),
      keyEvent("F5", "F5", ["alt"]),
      keyEvent("x", "KeyX"),
      keyEvent("X", "KeyX", ["alt", "shift"]),
      keyEvent("x", "KeyX", ["alt", "ctrl"]),
      keyEvent("x", "KeyX", ["meta"]),
    ]) {
      expect(isExecuteShortcut(event), JSON.stringify(event)).toBe(false);
    }
  });
});

describe("isHelpShortcut", () => {
  it("answers Alt+F1 only, like the SSMS query shortcut", () => {
    expect(isHelpShortcut(keyEvent("F1", "F1", ["alt"]))).toBe(true);
    expect(isHelpShortcut(keyEvent("F1", "F1"))).toBe(false);
    expect(isHelpShortcut(keyEvent("F1", "F1", ["alt", "shift"]))).toBe(false);
    expect(isHelpShortcut(keyEvent("F1", "F1", ["alt", "ctrl"]))).toBe(false);
  });
});

describe("historyKeyOf", () => {
  it("maps undo, redo and find", () => {
    expect(historyKeyOf(keyEvent("z", "KeyZ", ["ctrl"]))).toBe("undo");
    expect(historyKeyOf(keyEvent("y", "KeyY", ["ctrl"]))).toBe("redo");
    expect(historyKeyOf(keyEvent("Z", "KeyZ", ["ctrl", "shift"]))).toBe("redo");
    expect(historyKeyOf(keyEvent("f", "KeyF", ["meta"]))).toBe("find");
  });

  it("ignores other keys, Alt and the shifted find", () => {
    expect(historyKeyOf(keyEvent("z", "KeyZ"))).toBeNull();
    expect(historyKeyOf(keyEvent("z", "KeyZ", ["ctrl", "alt"]))).toBeNull();
    expect(historyKeyOf(keyEvent("F", "KeyF", ["ctrl", "shift"]))).toBeNull();
    expect(historyKeyOf(keyEvent("a", "KeyA", ["ctrl"]))).toBeNull();
  });
});

describe("comment chord", () => {
  it("starts with Ctrl+K and ends with C or U", () => {
    expect(startsChord(keyEvent("k", "KeyK", ["ctrl"]))).toBe(true);
    expect(chordCommand(keyEvent("c", "KeyC", ["ctrl"]))).toBe("commentLines");
    expect(chordCommand(keyEvent("u", "KeyU", ["meta"]))).toBe(
      "uncommentLines",
    );
  });

  it("needs Control without Shift or Alt", () => {
    expect(startsChord(keyEvent("k", "KeyK"))).toBe(false);
    expect(startsChord(keyEvent("K", "KeyK", ["ctrl", "shift"]))).toBe(false);
    expect(chordCommand(keyEvent("c", "KeyC"))).toBeUndefined();
    expect(
      chordCommand(keyEvent("c", "KeyC", ["ctrl", "alt"])),
    ).toBeUndefined();
    expect(chordCommand(keyEvent("x", "KeyX", ["ctrl"]))).toBeUndefined();
  });

  it("waits through a lone modifier", () => {
    expect(["Control", "Meta", "Shift", "Alt"].every(isModifierKey)).toBe(true);
    expect(isModifierKey("k")).toBe(false);
  });
});

describe("editActionOf", () => {
  it.each([
    { inputType: "insertText", action: "typing" },
    { inputType: "insertLineBreak", action: "typing" },
    { inputType: "insertFromPaste", action: "paste" },
    { inputType: "insertFromPasteAsQuotation", action: "paste" },
    { inputType: "insertFromDrop", action: "insert" },
    { inputType: "deleteByCut", action: "cut" },
    { inputType: "deleteContentBackward", action: "delete" },
    { inputType: "historyUndo", action: undefined },
    { inputType: "", action: undefined },
  ])("records $inputType as $action", ({ inputType, action }) => {
    expect(editActionOf(inputType)).toBe(action);
  });
});

describe("isTyping", () => {
  it("only counts words and spaces as typing", () => {
    expect(isTyping("s")).toBe(true);
    expect(isTyping("ç")).toBe(true);
    expect(isTyping(" ")).toBe(true);
    expect(isTyping("")).toBe(false);
    expect(isTyping(";")).toBe(false);
    expect(isTyping("a;")).toBe(false);
  });
});

describe("completionTarget", () => {
  it("moves by one or by a page and stops at both ends", () => {
    expect(completionTarget("ArrowDown", 0, 20)).toBe(1);
    expect(completionTarget("ArrowUp", 0, 20)).toBe(0);
    expect(completionTarget("PageDown", 0, 20)).toBe(8);
    expect(completionTarget("PageDown", 15, 20)).toBe(19);
    expect(completionTarget("PageUp", 5, 20)).toBe(0);
    expect(completionTarget("ArrowDown", 19, 20)).toBe(19);
  });

  it("ignores other keys", () => {
    expect(completionTarget("Enter", 0, 20)).toBeUndefined();
  });
});

const text = "SELECT * FROM dbo.About;\nselect * from dbo.Career";

describe("findMatches", () => {
  it("finds every occurrence, ignoring case", () => {
    expect(findMatches(text, "select")).toEqual([
      { start: 0, end: 6 },
      { start: 25, end: 31 },
    ]);
    expect(findMatches(text, "")).toEqual([]);
    expect(findMatches(text, "Projects")).toEqual([]);
  });

  it("does not overlap matches", () => {
    expect(findMatches("aaaa", "aa")).toEqual([
      { start: 0, end: 2 },
      { start: 2, end: 4 },
    ]);
  });
});

describe("moving between matches", () => {
  const matches = findMatches(text, "dbo.");

  it("starts at the first match after the caret and wraps around", () => {
    expect(matchAfter(matches, 0)).toBe(0);
    expect(matchAfter(matches, 20)).toBe(1);
    expect(matchAfter(matches, text.length)).toBe(0);
    expect(matchAfter([], 3)).toBe(-1);
  });

  it("steps forward and back in a loop", () => {
    expect(stepMatch(matches, 0, 1)).toBe(1);
    expect(stepMatch(matches, 1, 1)).toBe(0);
    expect(stepMatch(matches, 0, -1)).toBe(1);
    expect(stepMatch([], 0, 1)).toBe(-1);
  });
});

describe("markSegments", () => {
  it("splits the text around the matches and flags the current one", () => {
    const matches = findMatches("a-b-a", "a");
    expect(markSegments("a-b-a", matches, 1)).toEqual([
      { text: "a", mark: "match" },
      { text: "-b-", mark: null },
      { text: "a", mark: "current" },
    ]);
  });
});

const identifiers = new Set(["Name", "Role", "Description", "Url", "Career"]);

function colorsOf(code: string) {
  const lines = highlightTsql(code, identifiers);
  const tokens = lines.flat().filter((token) => token.content.trim());
  return (text: string) =>
    tokens.find((token) => token.content === text)?.color;
}

describe("highlightTsql", () => {
  it("keeps keywords blue and column names in the identifier color", () => {
    const colorOf = colorsOf(
      "SELECT Name, Role, Description\nFROM dbo.Career\nORDER BY Role DESC;",
    );
    for (const keyword of ["SELECT", "FROM", "ORDER", "BY", "DESC"]) {
      expect(colorOf(keyword), keyword).toBe("var(--syntax-keyword)");
    }
    for (const identifier of ["Name", "Role", "Description", "Career"]) {
      expect(colorOf(identifier), identifier).toBe("var(--syntax-variable)");
    }
  });

  it("paints punctuation and logical operators gray, like SSMS", () => {
    const colorOf = colorsOf(
      "SELECT Name, Url FROM dbo.Career WHERE Url LIKE 'x%' AND Name IS NOT NULL;",
    );
    for (const operator of [",", ".", ";", "LIKE", "AND"]) {
      expect(colorOf(operator), operator).toBe("var(--syntax-operator)");
    }
  });

  it("leaves comments and strings untouched", () => {
    const colorOf = colorsOf(
      "-- Role, Name and Description\nSELECT 'Role, Name' AS Name;",
    );
    expect(colorOf("-- Role, Name and Description")).toBe(
      "var(--syntax-comment)",
    );
    expect(colorOf("'Role, Name'")).toBe("var(--syntax-string)");
  });
});

function at(text: string, start: number, end = start): QuerySnapshot {
  return { text, selectionStart: start, selectionEnd: end };
}

const script = "SELECT *\n  FROM dbo.About\n\nWHERE 1 = 1";

describe("line commands", () => {
  it("comments the line with the caret and keeps the caret on its word", () => {
    expect(applyLineCommand(at("SELECT 1", 3), "comment")).toEqual(
      at("--SELECT 1", 5),
    );
  });

  it("comments every selected line from the first column", () => {
    const selected = at(script, 2, 20);
    expect(applyLineCommand(selected, "comment")).toEqual(
      at("--SELECT *\n--  FROM dbo.About\n\nWHERE 1 = 1", 0, 29),
    );
  });

  it("leaves out the line where the selection only touches the start", () => {
    expect(applyLineCommand(at(script, 0, 9), "comment")?.text).toBe(
      "--SELECT *\n  FROM dbo.About\n\nWHERE 1 = 1",
    );
  });

  it("skips blank lines inside a selection", () => {
    expect(
      applyLineCommand(at(script, 0, script.length), "comment")?.text,
    ).toBe("--SELECT *\n--  FROM dbo.About\n\n--WHERE 1 = 1");
  });

  it("removes the comment marks and keeps the indentation", () => {
    const commented = "--SELECT *\n  --FROM dbo.About\nWHERE 1 = 1";
    expect(
      applyLineCommand(at(commented, 0, commented.length), "uncomment"),
    ).toEqual(at("SELECT *\n  FROM dbo.About\nWHERE 1 = 1", 0, 37));
    expect(applyLineCommand(at("--", 1), "uncomment")).toEqual(at("", 0));
  });

  it("does nothing when there is nothing to change", () => {
    expect(applyLineCommand(at("SELECT 1", 0), "uncomment")).toBeNull();
    expect(applyLineCommand(at("SELECT 1", 0), "outdent")).toBeNull();
  });

  it("indents by four spaces and takes them back", () => {
    const indented = applyLineCommand(at(script, 0, 20), "indent");
    expect(indented).toEqual(
      at("    SELECT *\n      FROM dbo.About\n\nWHERE 1 = 1", 0, 33),
    );
    expect(indented && applyLineCommand(indented, "outdent")).toEqual(
      at(script, 0, 25),
    );
  });

  it("takes back a tab or the spaces that are there", () => {
    expect(applyLineCommand(at("\tSELECT 1", 4), "outdent")).toEqual(
      at("SELECT 1", 3),
    );
    expect(applyLineCommand(at("  SELECT 1", 1), "outdent")).toEqual(
      at("SELECT 1", 0),
    );
  });
});

describe("query store", () => {
  it("starts empty and notifies only real changes", () => {
    const store = createQueryStore();
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.getSnapshot()).toEqual({
      text: "",
      selectionStart: 0,
      selectionEnd: 0,
    });
    store.update({ text: "HELP", selectionStart: 4, selectionEnd: 4 });
    store.update({ text: "HELP" });
    expect(listener).toHaveBeenCalledTimes(1);
    store.reset();
    expect(store.getSnapshot().text).toBe("");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("hands out a focus request once", () => {
    const store = createQueryStore();
    expect(store.takeFocusRequest()).toBe(false);
    store.requestFocus();
    expect(store.takeFocusRequest()).toBe(true);
    expect(store.takeFocusRequest()).toBe(false);
  });

  it("stops notifying after unsubscribing", () => {
    const store = createQueryStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.update({ text: "x" });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("query history", () => {
  function typing() {
    let clock = 0;
    const store = createQueryStore({ now: () => clock });
    function type(text: string, after = 100) {
      clock += after;
      store.update({
        text,
        selectionStart: text.length,
        selectionEnd: text.length,
      });
    }
    return { store, type };
  }

  it("undoes a burst of typing in one step and redoes it", () => {
    const { store, type } = typing();
    type("S");
    type("SE");
    type("SEL");
    expect(store.getHistory()).toEqual({ canUndo: true, canRedo: false });
    expect(store.undo()).toBe(true);
    expect(store.getSnapshot()).toEqual({
      text: "",
      selectionStart: 0,
      selectionEnd: 0,
    });
    expect(store.getHistory()).toEqual({ canUndo: false, canRedo: true });
    expect(store.redo()).toBe(true);
    expect(store.getSnapshot().text).toBe("SEL");
    expect(store.undo()).toBe(true);
    expect(store.undo()).toBe(false);
  });

  it("starts a new step after a pause, a paste or a change of direction", () => {
    const { store, type } = typing();
    type("SELECT");
    type("SELECT *", 2000);
    type("SELECT * FROM dbo.About");
    type("SELECT * FROM dbo.Abou");
    store.undo();
    expect(store.getSnapshot().text).toBe("SELECT * FROM dbo.About");
    store.undo();
    expect(store.getSnapshot().text).toBe("SELECT *");
    store.undo();
    expect(store.getSnapshot().text).toBe("SELECT");
  });

  it("forgets the redo steps after a new edit and keeps selection moves out", () => {
    const { store, type } = typing();
    type("HELP");
    store.undo();
    type("USE Portfolio");
    expect(store.getHistory().canRedo).toBe(false);
    const history = store.getHistory();
    store.update({ selectionStart: 0, selectionEnd: 3 });
    expect(store.getHistory()).toBe(history);
    store.reset();
    expect(store.getHistory()).toEqual({ canUndo: false, canRedo: false });
  });

  it("hands out a find request once", () => {
    const store = createQueryStore();
    store.requestFind();
    expect(store.takeFindRequest()).toBe(true);
    expect(store.takeFindRequest()).toBe(false);
  });

  it("names every step, newest first, for the undo and redo lists", () => {
    const { store, type } = typing();
    type("SELECT");
    store.update({ text: "SELECT * FROM dbo.About" }, "paste");
    store.update({ text: "--SELECT * FROM dbo.About" }, "comment");
    type("--SELECT * FROM dbo.Abou");
    expect(store.getHistoryActions()).toEqual({
      undo: ["delete", "comment", "paste", "typing"],
      redo: [],
    });
    store.undo();
    store.undo();
    expect(store.getHistoryActions()).toEqual({
      undo: ["paste", "typing"],
      redo: ["comment", "delete"],
    });
  });

  it("undoes and redoes several steps at once", () => {
    const { store, type } = typing();
    type("A");
    store.update({ text: "A B" }, "paste");
    store.update({ text: "A B C" }, "paste");
    const notified = vi.fn();
    store.subscribe(notified);
    expect(store.undo(2)).toBe(true);
    expect(store.getSnapshot().text).toBe("A");
    expect(notified).toHaveBeenCalledTimes(1);
    expect(store.redo(5)).toBe(true);
    expect(store.getSnapshot().text).toBe("A B C");
    expect(store.undo(0)).toBe(false);
  });

  it("never merges a named step with the typing around it", () => {
    const { store, type } = typing();
    type("A");
    store.update({ text: "AB" }, "complete");
    type("ABC");
    store.undo();
    expect(store.getSnapshot().text).toBe("AB");
    store.undo();
    expect(store.getSnapshot().text).toBe("A");
  });
});

describe("selection helpers", () => {
  const snapshot = {
    text: "SELECT * FROM x",
    selectionStart: 14,
    selectionEnd: 15,
  };

  it("replaces the selection and puts the caret after it", () => {
    expect(replaceSelection(snapshot, "dbo.About")).toEqual({
      text: "SELECT * FROM dbo.About",
      selectionStart: 23,
      selectionEnd: 23,
    });
  });
});

describe("cursorOf", () => {
  it("counts lines and columns from 1", () => {
    expect(cursorOf("", 0)).toEqual({ line: 1, column: 1 });
    expect(cursorOf("SELECT *\nFROM dbo.About", 13)).toEqual({
      line: 2,
      column: 5,
    });
  });
});

describe("queryToRun", () => {
  it("runs the selection when there is one, else everything", () => {
    const text = "SELECT * FROM dbo.About;\nHELP";
    expect(queryToRun({ text, selectionStart: 3, selectionEnd: 3 })).toBe(text);
    expect(queryToRun({ text, selectionStart: 25, selectionEnd: 29 })).toBe(
      "HELP",
    );
  });
});
