import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_LAYOUT,
  floatWindow,
  hideWindow,
  parseLayout,
  resizeResults,
  resizeWindow,
  setPlacement,
  setResultsFormat,
  toggleResultsCollapse,
  toggleWindowCollapse,
} from "./layout-model";
import { LAYOUT_SCRIPT, applyLayout } from "./layout-store";

function fakeRoot() {
  const attributes = new Map<string, string>();
  const styles = new Map<string, string>();
  return {
    attributes,
    styles,
    setAttribute: (name: string, value: string) => {
      attributes.set(name, value);
    },
    style: {
      setProperty: (name: string, value: string | null) => {
        styles.set(name, String(value));
      },
    },
  };
}

function snapshot(root: ReturnType<typeof fakeRoot>) {
  return {
    attributes: Object.fromEntries(root.attributes),
    styles: Object.fromEntries(root.styles),
  };
}

function runHeadScript(getItem: () => string | null) {
  const root = fakeRoot();
  runInNewContext(LAYOUT_SCRIPT, {
    document: { documentElement: root },
    sessionStorage: { getItem },
  });
  return snapshot(root);
}

function applied(raw: string | null) {
  const root = fakeRoot();
  applyLayout(parseLayout(raw), root);
  return snapshot(root);
}

const viewport = { width: 1440, height: 820 };

describe("layout head script", () => {
  it("paints the default layout on a first visit", () => {
    expect(runHeadScript(() => null)).toEqual({
      attributes: {
        "data-explorer": "docked",
        "data-cheatsheet": "docked",
        "data-results": "normal",
        "data-results-format": "grid",
      },
      styles: {
        "--explorer-width": "300px",
        "--explorer-float-x": "72px",
        "--explorer-float-y": "120px",
        "--explorer-float-width": "300px",
        "--explorer-float-height": "480px",
        "--cheatsheet-width": "270px",
        "--cheatsheet-float-x": "640px",
        "--cheatsheet-float-y": "120px",
        "--cheatsheet-float-width": "300px",
        "--cheatsheet-float-height": "480px",
        "--results-grow": "55",
        "--editor-grow": "45",
      },
    });
  });

  it.each([
    ["docked and wide", resizeWindow(DEFAULT_LAYOUT, "explorer", 420)],
    ["collapsed", toggleWindowCollapse(DEFAULT_LAYOUT, "explorer")],
    ["auto hidden", setPlacement(DEFAULT_LAYOUT, "explorer", "autoHide")],
    [
      "floating",
      floatWindow(
        DEFAULT_LAYOUT,
        "explorer",
        { x: 40, y: 90, width: 280, height: 500 },
        viewport,
      ),
    ],
    ["hidden", hideWindow(DEFAULT_LAYOUT, "explorer")],
    [
      "cheat sheet auto hidden and wide",
      setPlacement(
        resizeWindow(DEFAULT_LAYOUT, "cheatsheet", 360),
        "cheatsheet",
        "autoHide",
      ),
    ],
    [
      "cheat sheet floating",
      floatWindow(
        DEFAULT_LAYOUT,
        "cheatsheet",
        { x: 900, y: 60, width: 300, height: 420 },
        viewport,
      ),
    ],
    ["cheat sheet hidden", hideWindow(DEFAULT_LAYOUT, "cheatsheet")],
    [
      "results collapsed",
      toggleResultsCollapse(resizeResults(DEFAULT_LAYOUT, 0.3)),
    ],
    ["results as text", setResultsFormat(DEFAULT_LAYOUT, "text")],
  ])("paints the stored layout (%s) like the app does", (_, layout) => {
    const raw = JSON.stringify(layout);
    expect(runHeadScript(() => raw)).toEqual(applied(raw));
  });

  it.each([
    "{",
    "5",
    "[]",
    '{"explorer":{"placement":"up","width":"wide"},"results":{"share":9}}',
    '{"explorer":{"floating":{"x":-40,"y":99999,"width":1,"height":1}}}',
    '{"results":{"format":"csv"}}',
  ])("cleans up broken storage the same way: %s", (raw) => {
    expect(runHeadScript(() => raw)).toEqual(applied(raw));
  });

  it("falls back to the default when storage is blocked", () => {
    expect(
      runHeadScript(() => {
        throw new Error("blocked");
      }),
    ).toEqual(applied(null));
  });
});
