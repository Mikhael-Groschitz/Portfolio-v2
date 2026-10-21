export const PANEL = {
  maxWidth: 257,
  minWidth: 200,
  gap: 30,
  tightGap: 16,
  ring: 6,
  buttonRow: 40,
  sideButton: 112,
} as const;

export interface PanelSpace {
  viewportWidth: number;
  viewportHeight: number;
  stageWidth: number;
  stageHeight: number;
}

export type PanelLayout =
  | { mode: "wide"; width: number; gap: number }
  | { mode: "medium" }
  | { mode: "narrow"; buttons: "beside" | "none" };

export function panelLayout({
  viewportWidth,
  viewportHeight,
  stageWidth,
  stageHeight,
}: PanelSpace): PanelLayout {
  const side = (viewportWidth - stageWidth) / 2 - PANEL.ring;
  const below = (viewportHeight - stageHeight) / 2 - PANEL.ring;
  const gap = side - PANEL.minWidth >= PANEL.gap ? PANEL.gap : PANEL.tightGap;
  const width = Math.floor(Math.min(PANEL.maxWidth, side - gap));
  if (width >= PANEL.minWidth) {
    return { mode: "wide", width, gap };
  }
  if (below >= PANEL.buttonRow) {
    return { mode: "medium" };
  }
  return {
    mode: "narrow",
    buttons: side >= PANEL.sideButton ? "beside" : "none",
  };
}

export function sameLayout(a: PanelLayout, b: PanelLayout): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
