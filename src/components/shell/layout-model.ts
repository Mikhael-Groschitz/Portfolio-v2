import type { Profile } from "@/content/profiles";

export const TOOL_WINDOWS = ["explorer", "cheatsheet"] as const;

export type ToolWindowId = (typeof TOOL_WINDOWS)[number];

export const PLACEMENTS = ["docked", "autoHide", "floating"] as const;

export type Placement = (typeof PLACEMENTS)[number];

export const RESULTS_STATES = ["normal", "collapsed", "maximized"] as const;

type ResultsState = (typeof RESULTS_STATES)[number];

export const RESULTS_FORMATS = ["grid", "text"] as const;

export type ResultsFormat = (typeof RESULTS_FORMATS)[number];

export type WindowState =
  "docked" | "collapsed" | "auto-hide" | "floating" | "hidden";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Viewport {
  width: number;
  height: number;
}

interface ToolWindowLayout {
  placement: Placement;
  hidden: boolean;
  collapsed: boolean;
  width: number;
  floating: Box;
}

interface ResultsLayout {
  state: ResultsState;
  share: number;
  format: ResultsFormat;
}

export type Layout = Record<ToolWindowId, ToolWindowLayout> & {
  results: ResultsLayout;
};

interface WidthLimits {
  min: number;
  max: number;
  initial: number;
}

export const WINDOW_WIDTHS: Record<ToolWindowId, WidthLimits> = {
  explorer: { min: 200, max: 600, initial: 300 },
  cheatsheet: { min: 220, max: 520, initial: 270 },
};

export const WIDTH_STEPS = { step: 16, bigStep: 64 } as const;

export const RESULTS_SHARE = {
  min: 0.2,
  max: 0.8,
  initial: 0.55,
  step: 0.05,
} as const;

export const FLOATING = {
  minWidth: 220,
  minHeight: 180,
  maxSize: 4000,
  reachable: 48,
  step: 10,
} as const;

export const DEFAULT_LAYOUT: Layout = {
  explorer: {
    placement: "docked",
    hidden: false,
    collapsed: false,
    width: WINDOW_WIDTHS.explorer.initial,
    floating: { x: 72, y: 120, width: 300, height: 480 },
  },
  cheatsheet: {
    placement: "docked",
    hidden: false,
    collapsed: false,
    width: WINDOW_WIDTHS.cheatsheet.initial,
    floating: { x: 640, y: 120, width: 300, height: 480 },
  },
  results: { state: "normal", share: RESULTS_SHARE.initial, format: "grid" },
};

const AUTO_HIDDEN_PROFILE: Profile = "dev";

export function defaultCheatsheet(profile: Profile): Placement {
  return profile === AUTO_HIDDEN_PROFILE ? "autoHide" : "docked";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function withWindow(
  layout: Layout,
  id: ToolWindowId,
  change: Partial<ToolWindowLayout>,
): Layout {
  return { ...layout, [id]: { ...layout[id], ...change } };
}

function withResults(layout: Layout, change: Partial<ResultsLayout>): Layout {
  return { ...layout, results: { ...layout.results, ...change } };
}

export function resizeWindow(
  layout: Layout,
  id: ToolWindowId,
  width: number,
): Layout {
  const { min, max } = WINDOW_WIDTHS[id];
  return withWindow(layout, id, {
    width: Math.round(clamp(width, min, max)),
    collapsed: false,
  });
}

export function toggleWindowCollapse(layout: Layout, id: ToolWindowId): Layout {
  return withWindow(layout, id, { collapsed: !layout[id].collapsed });
}

export function hideWindow(layout: Layout, id: ToolWindowId): Layout {
  return withWindow(layout, id, { hidden: true });
}

export function showWindow(layout: Layout, id: ToolWindowId): Layout {
  const { hidden, collapsed } = layout[id];
  return hidden || collapsed
    ? withWindow(layout, id, { hidden: false, collapsed: false })
    : layout;
}

export function clampBox(box: Box, viewport: Viewport): Box {
  const width = clamp(
    box.width,
    FLOATING.minWidth,
    Math.max(FLOATING.minWidth, viewport.width),
  );
  const height = clamp(
    box.height,
    FLOATING.minHeight,
    Math.max(FLOATING.minHeight, viewport.height),
  );
  return {
    x: Math.round(clamp(box.x, 0, Math.max(0, viewport.width - width))),
    y: Math.round(
      clamp(box.y, 0, Math.max(0, viewport.height - FLOATING.reachable)),
    ),
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function setPlacement(
  layout: Layout,
  id: ToolWindowId,
  placement: Placement,
): Layout {
  return withWindow(layout, id, {
    placement,
    hidden: false,
    collapsed: false,
  });
}

export function floatWindow(
  layout: Layout,
  id: ToolWindowId,
  box: Box,
  viewport: Viewport,
): Layout {
  return withWindow(layout, id, {
    placement: "floating",
    hidden: false,
    collapsed: false,
    floating: clampBox(box, viewport),
  });
}

export function moveFloating(
  layout: Layout,
  id: ToolWindowId,
  dx: number,
  dy: number,
  viewport: Viewport,
): Layout {
  const { floating } = layout[id];
  return withWindow(layout, id, {
    floating: clampBox(
      { ...floating, x: floating.x + dx, y: floating.y + dy },
      viewport,
    ),
  });
}

export function resizeFloating(
  layout: Layout,
  id: ToolWindowId,
  dw: number,
  dh: number,
  viewport: Viewport,
): Layout {
  const { floating } = layout[id];
  return withWindow(layout, id, {
    floating: clampBox(
      {
        ...floating,
        width: Math.min(floating.width + dw, viewport.width - floating.x),
        height: Math.min(floating.height + dh, viewport.height - floating.y),
      },
      viewport,
    ),
  });
}

function sameBox(a: Box, b: Box): boolean {
  return (
    a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
  );
}

export function keepFloatingInside(layout: Layout, viewport: Viewport): Layout {
  return TOOL_WINDOWS.reduce((current, id) => {
    const { floating } = current[id];
    const kept = clampBox(floating, viewport);
    return sameBox(kept, floating)
      ? current
      : withWindow(current, id, { floating: kept });
  }, layout);
}

export function resizeResults(layout: Layout, share: number): Layout {
  return withResults(layout, {
    state: "normal",
    share:
      Math.round(clamp(share, RESULTS_SHARE.min, RESULTS_SHARE.max) * 100) /
      100,
  });
}

export function toggleResultsCollapse(layout: Layout): Layout {
  return withResults(layout, {
    state: layout.results.state === "collapsed" ? "normal" : "collapsed",
  });
}

export function toggleResultsMaximize(layout: Layout): Layout {
  return withResults(layout, {
    state: layout.results.state === "maximized" ? "normal" : "maximized",
  });
}

export function setResultsFormat(
  layout: Layout,
  format: ResultsFormat,
): Layout {
  return layout.results.format === format
    ? layout
    : withResults(layout, { format });
}

export function expandResults(layout: Layout): Layout {
  return layout.results.state === "collapsed"
    ? withResults(layout, { state: "normal" })
    : layout;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function oneOf<T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T,
): T {
  return options.find((option) => option === value) ?? fallback;
}

function parseBox(value: unknown, fallback: Box): Box {
  const box = isRecord(value) ? value : {};
  return {
    x: Math.round(clamp(numberOr(box.x, fallback.x), 0, FLOATING.maxSize)),
    y: Math.round(clamp(numberOr(box.y, fallback.y), 0, FLOATING.maxSize)),
    width: Math.round(
      clamp(
        numberOr(box.width, fallback.width),
        FLOATING.minWidth,
        FLOATING.maxSize,
      ),
    ),
    height: Math.round(
      clamp(
        numberOr(box.height, fallback.height),
        FLOATING.minHeight,
        FLOATING.maxSize,
      ),
    ),
  };
}

function parseWindow(value: unknown, id: ToolWindowId): ToolWindowLayout {
  const stored = isRecord(value) ? value : {};
  const fallback = DEFAULT_LAYOUT[id];
  const { min, max } = WINDOW_WIDTHS[id];
  return {
    placement: oneOf(stored.placement, PLACEMENTS, fallback.placement),
    hidden: stored.hidden === true,
    collapsed: stored.collapsed === true,
    width: Math.round(clamp(numberOr(stored.width, fallback.width), min, max)),
    floating: parseBox(stored.floating, fallback.floating),
  };
}

export function parseLayout(raw: string | null): Layout {
  let value: unknown = null;
  try {
    value = raw === null ? null : JSON.parse(raw);
  } catch {
    return DEFAULT_LAYOUT;
  }
  if (!isRecord(value)) {
    return DEFAULT_LAYOUT;
  }
  const results = isRecord(value.results) ? value.results : {};
  const fallback = DEFAULT_LAYOUT.results;
  return {
    explorer: parseWindow(value.explorer, "explorer"),
    cheatsheet: parseWindow(value.cheatsheet, "cheatsheet"),
    results: {
      state: oneOf(results.state, RESULTS_STATES, fallback.state),
      share:
        Math.round(
          clamp(
            numberOr(results.share, fallback.share),
            RESULTS_SHARE.min,
            RESULTS_SHARE.max,
          ) * 100,
        ) / 100,
      format: oneOf(results.format, RESULTS_FORMATS, fallback.format),
    },
  };
}

export function windowState(window: ToolWindowLayout): WindowState {
  if (window.hidden) {
    return "hidden";
  }
  if (window.placement === "autoHide") {
    return "auto-hide";
  }
  if (window.placement === "floating") {
    return "floating";
  }
  return window.collapsed ? "collapsed" : "docked";
}

export function layoutVariables(layout: Layout): Record<string, string> {
  const results = Math.round(layout.results.share * 100);
  const windows = TOOL_WINDOWS.flatMap((id) => {
    const { width, floating } = layout[id];
    return [
      [`--${id}-width`, `${width}px`],
      [`--${id}-float-x`, `${floating.x}px`],
      [`--${id}-float-y`, `${floating.y}px`],
      [`--${id}-float-width`, `${floating.width}px`],
      [`--${id}-float-height`, `${floating.height}px`],
    ];
  });
  return Object.fromEntries([
    ...windows,
    ["--results-grow", String(results)],
    ["--editor-grow", String(100 - results)],
  ]);
}
