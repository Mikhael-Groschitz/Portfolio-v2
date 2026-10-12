import { describe, expect, it } from "vitest";
import { MENU_TRIGGERS, MORE_MENUS, isTabStop } from "./menu-model";

describe("menu triggers", () => {
  it("keeps Help visible and folds the other menus on small screens", () => {
    const more = MENU_TRIGGERS.find((trigger) => trigger.id === MORE_MENUS);
    expect(more?.menus.map((menu) => menu.id)).toEqual([
      "file",
      "edit",
      "view",
      "query",
      "git",
      "tools",
      "extensions",
      "window",
    ]);
    expect(
      MENU_TRIGGERS.find((trigger) => trigger.id === "help")?.visibility,
    ).toBe("always");
  });
});

describe("isTabStop", () => {
  it("starts on the first menu of each layout", () => {
    const stops = MENU_TRIGGERS.filter((trigger) =>
      isTabStop(trigger.id, null),
    ).map((trigger) => trigger.id);
    expect(stops).toEqual([MORE_MENUS, "file"]);
  });

  it("follows the focused menu and keeps the other layout reachable", () => {
    const stopsFor = (focused: (typeof MENU_TRIGGERS)[number]["id"]) =>
      MENU_TRIGGERS.filter((trigger) => isTabStop(trigger.id, focused)).map(
        (trigger) => trigger.id,
      );
    expect(stopsFor("tools")).toEqual([MORE_MENUS, "tools"]);
    expect(stopsFor(MORE_MENUS)).toEqual([MORE_MENUS, "file"]);
    expect(stopsFor("help")).toEqual(["help"]);
  });
});
