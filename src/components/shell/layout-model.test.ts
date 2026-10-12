import { describe, expect, it } from "vitest";
import {
  DEFAULT_LAYOUT,
  type Layout,
  RESULTS_SHARE,
  TOOL_WINDOWS,
  type ToolWindowId,
  WINDOW_WIDTHS,
  clampBox,
  defaultCheatsheet,
  expandResults,
  floatWindow,
  hideWindow,
  keepFloatingInside,
  layoutVariables,
  moveFloating,
  parseLayout,
  resizeFloating,
  resizeResults,
  resizeWindow,
  setPlacement,
  setResultsFormat,
  showWindow,
  toggleResultsCollapse,
  toggleResultsMaximize,
  toggleWindowCollapse,
  windowState,
} from "./layout-model";

const desktop = { width: 1440, height: 820 };

function floating(
  id: ToolWindowId = "explorer",
  layout: Layout = DEFAULT_LAYOUT,
): Layout {
  return floatWindow(
    layout,
    id,
    { x: 200, y: 150, width: 320, height: 400 },
    desktop,
  );
}

describe("tool window width", () => {
  it("starts docked, with the explorer at 300 px and the cheat sheet at 270 px", () => {
    expect(DEFAULT_LAYOUT.explorer).toMatchObject({
      placement: "docked",
      hidden: false,
      collapsed: false,
      width: 300,
    });
    expect(DEFAULT_LAYOUT.cheatsheet.width).toBe(270);
    for (const id of TOOL_WINDOWS) {
      expect(windowState(DEFAULT_LAYOUT[id])).toBe("docked");
    }
  });

  it.each(TOOL_WINDOWS)("keeps the %s width between sensible limits", (id) => {
    const { min, max } = WINDOW_WIDTHS[id];
    expect(resizeWindow(DEFAULT_LAYOUT, id, 120)[id].width).toBe(min);
    expect(resizeWindow(DEFAULT_LAYOUT, id, 2000)[id].width).toBe(max);
    expect(resizeWindow(DEFAULT_LAYOUT, id, 412.6)[id].width).toBe(413);
  });

  it("changes one window without touching the other", () => {
    const wide = resizeWindow(DEFAULT_LAYOUT, "cheatsheet", 400);
    expect(wide.explorer).toBe(DEFAULT_LAYOUT.explorer);
    expect(wide.cheatsheet.width).toBe(400);
  });

  it("collapses and restores the previous width", () => {
    const wide = resizeWindow(DEFAULT_LAYOUT, "explorer", 420);
    const collapsed = toggleWindowCollapse(wide, "explorer");
    expect(windowState(collapsed.explorer)).toBe("collapsed");
    const restored = toggleWindowCollapse(collapsed, "explorer");
    expect(restored.explorer).toMatchObject({ collapsed: false, width: 420 });
  });

  it("opens again when resized from the collapsed state", () => {
    const collapsed = toggleWindowCollapse(DEFAULT_LAYOUT, "cheatsheet");
    expect(
      resizeWindow(collapsed, "cheatsheet", 260).cheatsheet.collapsed,
    ).toBe(false);
  });
});

describe("tool window placement", () => {
  it("hides and shows without forgetting where it was", () => {
    const autoHidden = setPlacement(DEFAULT_LAYOUT, "cheatsheet", "autoHide");
    const hidden = hideWindow(autoHidden, "cheatsheet");
    expect(windowState(hidden.cheatsheet)).toBe("hidden");
    const shown = showWindow(hidden, "cheatsheet");
    expect(shown.cheatsheet).toMatchObject({
      placement: "autoHide",
      hidden: false,
    });
    expect(windowState(shown.cheatsheet)).toBe("auto-hide");
  });

  it("showing also undoes a collapse and leaves a visible window alone", () => {
    const collapsed = toggleWindowCollapse(DEFAULT_LAYOUT, "explorer");
    expect(showWindow(collapsed, "explorer").explorer.collapsed).toBe(false);
    expect(showWindow(DEFAULT_LAYOUT, "explorer")).toBe(DEFAULT_LAYOUT);
  });

  it("docks again from any other placement", () => {
    for (const layout of [
      setPlacement(DEFAULT_LAYOUT, "explorer", "autoHide"),
      floating(),
      hideWindow(floating(), "explorer"),
    ]) {
      expect(
        windowState(setPlacement(layout, "explorer", "docked").explorer),
      ).toBe("docked");
    }
  });
});

describe("floating tool windows", () => {
  it.each(TOOL_WINDOWS)("floats the %s inside the window", (id) => {
    const layout = floating(id);
    expect(windowState(layout[id])).toBe("floating");
    expect(layout[id].floating).toEqual({
      x: 200,
      y: 150,
      width: 320,
      height: 400,
    });
  });

  it("never leaves the window when moved", () => {
    const right = moveFloating(floating(), "explorer", 5000, 0, desktop);
    expect(right.explorer.floating.x).toBe(desktop.width - 320);
    const up = moveFloating(floating(), "explorer", 0, -5000, desktop);
    expect(up.explorer.floating.y).toBe(0);
    const down = moveFloating(floating(), "explorer", 0, 5000, desktop);
    expect(down.explorer.floating.y).toBe(desktop.height - 48);
  });

  it("resizes within limits and without crossing the window edge", () => {
    const small = resizeFloating(floating(), "explorer", -1000, -1000, desktop);
    expect(small.explorer.floating).toMatchObject({ width: 220, height: 180 });
    const big = resizeFloating(floating(), "explorer", 5000, 5000, desktop);
    expect(big.explorer.floating).toMatchObject({
      width: desktop.width - 200,
      height: desktop.height - 150,
    });
  });

  it("brings every floating window back inside when the window shrinks", () => {
    const layout = floating("cheatsheet", floating());
    const narrow = keepFloatingInside(layout, { width: 400, height: 300 });
    for (const id of TOOL_WINDOWS) {
      expect(narrow[id].floating).toEqual({
        x: 80,
        y: 150,
        width: 320,
        height: 300,
      });
    }
    expect(keepFloatingInside(layout, desktop)).toBe(layout);
  });

  it("keeps boxes bigger than the window usable", () => {
    expect(
      clampBox(
        { x: -20, y: -20, width: 9000, height: 9000 },
        { width: 360, height: 640 },
      ),
    ).toEqual({ x: 0, y: 0, width: 360, height: 640 });
  });
});

describe("results pane", () => {
  it("starts with a little more than half of the space", () => {
    expect(DEFAULT_LAYOUT.results).toEqual({
      state: "normal",
      share: 0.55,
      format: "grid",
    });
    expect(layoutVariables(DEFAULT_LAYOUT)).toMatchObject({
      "--results-grow": "55",
      "--editor-grow": "45",
      "--explorer-width": "300px",
      "--cheatsheet-width": "270px",
    });
  });

  it("keeps the share between the limits", () => {
    expect(resizeResults(DEFAULT_LAYOUT, 0.05).results.share).toBe(
      RESULTS_SHARE.min,
    );
    expect(resizeResults(DEFAULT_LAYOUT, 0.99).results.share).toBe(
      RESULTS_SHARE.max,
    );
    expect(resizeResults(DEFAULT_LAYOUT, 0.333).results.share).toBe(0.33);
  });

  it("collapses to its header and restores the same size", () => {
    const sized = resizeResults(DEFAULT_LAYOUT, 0.4);
    const collapsed = toggleResultsCollapse(sized);
    expect(collapsed.results).toEqual({
      state: "collapsed",
      share: 0.4,
      format: "grid",
    });
    expect(toggleResultsCollapse(collapsed).results).toEqual({
      state: "normal",
      share: 0.4,
      format: "grid",
    });
    expect(expandResults(collapsed).results.state).toBe("normal");
    expect(expandResults(sized)).toBe(sized);
  });

  it("maximizes and restores, and resizing brings it back to normal", () => {
    const maximized = toggleResultsMaximize(DEFAULT_LAYOUT);
    expect(maximized.results.state).toBe("maximized");
    expect(toggleResultsMaximize(maximized).results.state).toBe("normal");
    expect(resizeResults(maximized, 0.5).results.state).toBe("normal");
  });

  it("shows the results as a grid or as text", () => {
    const text = setResultsFormat(DEFAULT_LAYOUT, "text");
    expect(text.results.format).toBe("text");
    expect(setResultsFormat(text, "text")).toBe(text);
    expect(setResultsFormat(text, "grid").results.format).toBe("grid");
    expect(toggleResultsCollapse(text).results.format).toBe("text");
  });
});

describe("parseLayout", () => {
  it("returns the default layout for missing or broken storage", () => {
    for (const raw of [null, "", "{", "5", "[]", "null", '"docked"']) {
      expect(parseLayout(raw)).toEqual(DEFAULT_LAYOUT);
    }
  });

  it("reads back what was stored", () => {
    const layout = setResultsFormat(
      toggleResultsMaximize(
        resizeWindow(
          floating(
            "cheatsheet",
            setPlacement(DEFAULT_LAYOUT, "explorer", "autoHide"),
          ),
          "explorer",
          420,
        ),
      ),
      "text",
    );
    expect(parseLayout(JSON.stringify(layout))).toEqual(layout);
  });

  it("fixes values that are out of range or of the wrong kind", () => {
    const parsed = parseLayout(
      JSON.stringify({
        explorer: {
          placement: "sideways",
          hidden: "yes",
          collapsed: 1,
          width: 90000,
          floating: { x: -5, y: "10", width: 10, height: null },
        },
        cheatsheet: { width: 1 },
        results: { state: "huge", share: -3, format: "pdf" },
      }),
    );
    expect(parsed).toEqual({
      explorer: {
        placement: "docked",
        hidden: false,
        collapsed: false,
        width: WINDOW_WIDTHS.explorer.max,
        floating: { x: 0, y: 120, width: 220, height: 480 },
      },
      cheatsheet: {
        ...DEFAULT_LAYOUT.cheatsheet,
        width: WINDOW_WIDTHS.cheatsheet.min,
      },
      results: { state: "normal", share: RESULTS_SHARE.min, format: "grid" },
    });
  });
});

describe("cheat sheet default", () => {
  it("stays docked for visitors and tucks itself away for devs", () => {
    expect(defaultCheatsheet("visitor")).toBe("docked");
    expect(defaultCheatsheet("dev")).toBe("autoHide");
  });
});
