import {
  type Box,
  type Placement,
  type ToolWindowId,
  floatWindow,
  hideWindow,
  setPlacement,
  showWindow,
} from "./layout-model";
import { readLayout, readPeek, setPeek, updateLayout } from "./layout-store";

const FLOAT_OFFSET = 24;

export function viewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

function focusContent() {
  const target =
    document.querySelector<HTMLElement>("[data-editor] textarea") ??
    document.querySelector<HTMLElement>("[data-editor]") ??
    document.querySelector<HTMLElement>("main");
  target?.focus();
}

export function panelBox(panelId: string): Box | null {
  const rect = document.getElementById(panelId)?.getBoundingClientRect();
  if (!rect || rect.width === 0 || rect.height === 0) {
    return null;
  }
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
}

function isShowing(id: ToolWindowId): boolean {
  const { hidden, placement } = readLayout()[id];
  return !hidden && (placement !== "autoHide" || readPeek() === id);
}

export function revealWindow(id: ToolWindowId, focus: () => void) {
  updateLayout((layout) => showWindow(layout, id));
  if (readLayout()[id].placement === "autoHide") {
    setPeek(id);
  }
  requestAnimationFrame(() => {
    if (isShowing(id)) {
      focus();
    }
  });
}

export function concealWindow(id: ToolWindowId) {
  if (readPeek() === id) {
    setPeek(null);
  }
  updateLayout((layout) => hideWindow(layout, id));
  focusContent();
}

export function placeWindow(id: ToolWindowId, placement: Placement) {
  setPeek(null);
  updateLayout((layout) => setPlacement(layout, id, placement));
  if (placement === "autoHide") {
    focusContent();
  }
}

export function floatAt(id: ToolWindowId, box: Box) {
  setPeek(null);
  updateLayout((layout) => floatWindow(layout, id, box, viewport()));
}

export function popOut(id: ToolWindowId, panelId: string) {
  const stored = readLayout()[id].floating;
  const box = panelBox(panelId);
  floatAt(
    id,
    box
      ? {
          x: box.x + FLOAT_OFFSET,
          y: box.y + FLOAT_OFFSET,
          width: box.width,
          height: Math.min(box.height, stored.height),
        }
      : stored,
  );
}
