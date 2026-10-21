import { describe, expect, it } from "vitest";
import { PANEL, panelLayout } from "./panel-layout";

function space(
  innerWidth: number,
  innerHeight: number,
  stageWidth: number,
  hud = 46,
) {
  return {
    viewportWidth: innerWidth - 32,
    viewportHeight: innerHeight - 32 - hud - 10,
    stageWidth,
    stageHeight: (stageWidth * 9) / 16,
  };
}

describe("panel layout", () => {
  it("matches the screenshot at 1918 x 911: 257 px, 26 px to the edge, 30 px to the frame", () => {
    const layout = panelLayout(space(1918, 911, 1280));
    expect(layout).toEqual({ mode: "wide", width: 257, gap: 30 });
    const side = (1918 - 1280) / 2 - PANEL.ring;
    expect(side - 257 - 30).toBe(26);
  });

  it("keeps three columns while two panels of 200 px still fit", () => {
    expect(panelLayout(space(1600, 773, 960))).toEqual({
      mode: "wide",
      width: 257,
      gap: 30,
    });
    expect(panelLayout(space(1440, 773, 960))).toEqual({
      mode: "wide",
      width: 202,
      gap: 16,
    });
    expect(panelLayout(space(1366, 641, 640, 70))).toMatchObject({
      mode: "wide",
      width: 257,
    });
  });

  it("collapses with the buttons below the canvas when there is room there", () => {
    expect(panelLayout(space(1024, 641, 640, 70))).toEqual({ mode: "medium" });
    expect(panelLayout(space(768, 900, 640, 70))).toEqual({ mode: "medium" });
  });

  it("puts the buttons beside the canvas when the screen is short", () => {
    expect(panelLayout(space(1280, 673, 960))).toEqual({
      mode: "narrow",
      buttons: "beside",
    });
    expect(panelLayout(space(700, 420, 640, 70))).toEqual({
      mode: "narrow",
      buttons: "none",
    });
  });

  it("never asks for more width than the viewport has", () => {
    for (const [width, height, stage] of [
      [1918, 911, 1280],
      [1440, 773, 960],
      [1534, 729, 1024],
    ] as const) {
      const layout = panelLayout(space(width, height, stage));
      if (layout.mode === "wide") {
        const used = stage + 2 * PANEL.ring + 2 * (layout.gap + layout.width);
        expect(used).toBeLessThanOrEqual(width - 32);
      }
    }
  });
});
