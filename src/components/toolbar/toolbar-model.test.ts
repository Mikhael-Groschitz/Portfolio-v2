import { describe, expect, it } from "vitest";
import { commandItemRole } from "./command-menu-item";
import {
  type EntryLayout,
  type ToolbarEntry,
  hiddenEntries,
  overflowMenu,
} from "./toolbar-model";

function entry(key: string, shown = true): EntryLayout {
  return { key, separator: false, shown };
}

function separator(key: string): EntryLayout {
  return { key, separator: true, shown: true };
}

function item(key: string): ToolbarEntry {
  return { key, menu: () => [{ key, label: key }] };
}

describe("hiddenEntries", () => {
  it("hides what did not fit and the separator left at the end", () => {
    const hidden = hiddenEntries([
      entry("back"),
      separator("s1"),
      entry("save"),
      separator("s2"),
      entry("undo", false),
      entry("redo", false),
    ]);
    expect([...hidden]).toEqual(["undo", "redo", "s2"]);
  });

  it("keeps one separator between groups that are still visible", () => {
    const hidden = hiddenEntries([
      entry("back"),
      separator("s1"),
      entry("open", false),
      separator("s2"),
      entry("query"),
    ]);
    expect([...hidden]).toEqual(["open", "s1"]);
  });

  it("never starts with a separator", () => {
    expect([
      ...hiddenEntries([
        entry("toggle", false),
        separator("s1"),
        entry("query"),
      ]),
    ]).toEqual(["toggle", "s1"]);
  });
});

describe("overflowMenu", () => {
  const entries: ToolbarEntry[] = [
    item("back"),
    { key: "s1", separator: true },
    item("save"),
    item("saveAll"),
    { key: "s2", separator: true },
    item("undo"),
  ];

  it("lists the hidden buttons in order, with a line between groups", () => {
    expect(overflowMenu(entries, new Set(["saveAll", "undo"]))).toEqual([
      { key: "saveAll", label: "saveAll" },
      { key: "undo", label: "undo", separatorBefore: true },
    ]);
  });

  it("adds the extra groups at the end", () => {
    expect(
      overflowMenu(entries, new Set(), [
        [{ key: "contact", label: "contact" }],
        [{ key: "customize", label: "customize" }],
      ]),
    ).toEqual([
      { key: "contact", label: "contact" },
      { key: "customize", label: "customize", separatorBefore: true },
    ]);
  });
});

describe("commandItemRole", () => {
  it("keeps plain commands as menu items", () => {
    expect(commandItemRole("newQuery", undefined)).toBe("menuitem");
  });

  it("shows result formats as radios and toggles as checkboxes", () => {
    expect(commandItemRole("resultsToGrid", true)).toBe("menuitemradio");
    expect(commandItemRole("resultsToText", false)).toBe("menuitemradio");
    expect(commandItemRole("cheatsheet", false)).toBe("menuitemcheckbox");
  });
});
