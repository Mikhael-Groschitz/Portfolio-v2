import { describe, expect, it } from "vitest";
import { ENTRANCE } from "../levels/campaign";
import { TILE, parseLevel } from "../levels/level";
import { VIEW_HEIGHT, VIEW_WIDTH, aimCamera, descend } from "./camera";

const level = parseLevel(ENTRANCE);

function target(x: number, feet: number) {
  return { x, y: feet - 28, width: 12, height: 28 };
}

describe("camera", () => {
  it("centers the hero and stays inside the level", () => {
    const camera = { x: 0, y: 0 };
    aimCamera(camera, level, target(40 * TILE, 10 * TILE));
    expect(camera.x).toBe(40 * TILE + 6 - VIEW_WIDTH / 2);
    aimCamera(camera, level, target(TILE, 10 * TILE));
    expect(camera.x).toBe(0);
    aimCamera(camera, level, target(level.width - TILE, 10 * TILE));
    expect(camera.x).toBe(level.width - VIEW_WIDTH);
  });

  it("only moves up and down when the feet leave the comfortable band", () => {
    const camera = { x: 0, y: 0 };
    aimCamera(camera, level, target(TILE, 10 * TILE));
    const resting = camera.y;
    expect(resting).toBeGreaterThan(0);
    expect(resting).toBeLessThanOrEqual(level.height - VIEW_HEIGHT);
    aimCamera(camera, level, target(TILE, 9 * TILE));
    expect(camera.y).toBe(resting);
    aimCamera(camera, level, target(TILE, 3 * TILE));
    expect(camera.y).toBe(0);
  });

  it("eases the opening from the sky to the gate", () => {
    expect(descend(-200, 8, 0)).toBe(-200);
    expect(descend(-200, 8, 1)).toBe(8);
    expect(descend(-200, 8, 0.5)).toBeCloseTo(-96);
    expect(descend(-200, 8, 0.1)).toBeLessThan(-200 + 208 * 0.1);
    expect(descend(-200, 8, 2)).toBe(8);
  });
});
