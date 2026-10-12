"use client";

import {
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  useEffect,
  useRef,
} from "react";
import { useLanguage } from "@/components/locale/language-context";
import type { Localized } from "@/content/locales";
import {
  type ToolWindowId,
  WIDTH_STEPS,
  WINDOW_WIDTHS,
  resizeFloating,
  resizeWindow,
  toggleWindowCollapse,
} from "./layout-model";
import { readLayout, readPeek, setPeek, updateLayout } from "./layout-store";
import { Splitter } from "./splitter";
import { viewport } from "./tool-window-actions";
import { useLayout, usePeek } from "./use-layout";

const HOVER_OPEN_MS = 250;
const HOVER_CLOSE_MS = 400;
const DRAGGING_ATTRIBUTE = "data-dragging";

interface WindowSplitterProps {
  windowId: ToolWindowId;
  side: "start" | "end";
  containerId: string;
  controls: string;
  label: Localized;
  className?: string;
}

export function WindowSplitter({
  windowId,
  side,
  containerId,
  controls,
  label,
  className,
}: Readonly<WindowSplitterProps>) {
  const { width, collapsed } = useLayout()[windowId];
  const { locale } = useLanguage();
  const limits = WINDOW_WIDTHS[windowId];
  const growKey = side === "start" ? "ArrowRight" : "ArrowLeft";
  const shrinkKey = side === "start" ? "ArrowLeft" : "ArrowRight";

  function moveTo(clientX: number) {
    const box = document.getElementById(containerId)?.getBoundingClientRect();
    if (!box) {
      return;
    }
    const next = side === "start" ? clientX - box.left : box.right - clientX;
    updateLayout((layout) => resizeWindow(layout, windowId, next));
  }

  function step(direction: -1 | 1, big: boolean) {
    const size = big ? WIDTH_STEPS.bigStep : WIDTH_STEPS.step;
    updateLayout((layout) => {
      if (layout[windowId].collapsed) {
        return direction > 0 ? toggleWindowCollapse(layout, windowId) : layout;
      }
      return resizeWindow(
        layout,
        windowId,
        layout[windowId].width + direction * size,
      );
    });
  }

  return (
    <Splitter
      orientation="vertical"
      keys={{ decrease: shrinkKey, increase: growKey }}
      label={label[locale]}
      controls={controls}
      value={collapsed ? limits.min : width}
      min={limits.min}
      max={limits.max}
      className={className}
      onMove={moveTo}
      onStep={step}
      onEdge={(edge) =>
        updateLayout((layout) =>
          resizeWindow(
            layout,
            windowId,
            edge === "min" ? limits.min : limits.max,
          ),
        )
      }
      onToggle={() =>
        updateLayout((layout) => toggleWindowCollapse(layout, windowId))
      }
      onReset={() =>
        updateLayout((layout) => resizeWindow(layout, windowId, limits.initial))
      }
    />
  );
}

interface DragStart {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function FloatingResizer({
  windowId,
  className,
}: Readonly<{ windowId: ToolWindowId; className?: string }>) {
  const start = useRef<DragStart | null>(null);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    const { floating } = readLayout()[windowId];
    start.current = {
      x: event.clientX,
      y: event.clientY,
      width: floating.width,
      height: floating.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.documentElement.setAttribute(DRAGGING_ATTRIBUTE, "corner");
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const origin = start.current;
    if (!origin) {
      return;
    }
    updateLayout((layout) => {
      const { floating } = layout[windowId];
      return resizeFloating(
        layout,
        windowId,
        origin.width + event.clientX - origin.x - floating.width,
        origin.height + event.clientY - origin.y - floating.height,
        viewport(),
      );
    });
  }

  function stop(event: PointerEvent<HTMLDivElement>) {
    start.current = null;
    document.documentElement.removeAttribute(DRAGGING_ATTRIBUTE);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      className={className}
      aria-hidden="true"
      data-floating-resizer=""
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
    />
  );
}

interface AutoHideOptions {
  containerRef: RefObject<HTMLElement | null>;
  tabRef: RefObject<HTMLButtonElement | null>;
  focusInside: () => void;
}

export function useAutoHide(
  windowId: ToolWindowId,
  { containerRef, tabRef, focusInside }: AutoHideOptions,
) {
  const peek = usePeek() === windowId;
  const timer = useRef({ id: 0 });

  useEffect(() => {
    const pending = timer.current;
    return () => window.clearTimeout(pending.id);
  }, []);

  function cancel() {
    window.clearTimeout(timer.current.id);
  }

  function schedule(callback: () => void, delay: number) {
    cancel();
    timer.current.id = window.setTimeout(callback, delay);
  }

  function open() {
    cancel();
    setPeek(windowId);
    requestAnimationFrame(() => {
      if (readPeek() === windowId) {
        focusInside();
      }
    });
  }

  function close(returnToTab: boolean) {
    cancel();
    if (readPeek() === windowId) {
      setPeek(null);
    }
    if (returnToTab) {
      tabRef.current?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent): boolean {
    if (event.key !== "Escape" || !peek) {
      return false;
    }
    event.preventDefault();
    close(true);
    return true;
  }

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (peek && !event.currentTarget.contains(event.relatedTarget)) {
      close(false);
    }
  }

  function focusInPanel(): boolean {
    const focused = document.activeElement;
    return (
      focused !== tabRef.current &&
      (containerRef.current?.contains(focused) ?? false)
    );
  }

  function handleMouseLeave() {
    if (peek && !focusInPanel()) {
      schedule(() => {
        if (!focusInPanel()) {
          close(false);
        }
      }, HOVER_CLOSE_MS);
    } else {
      cancel();
    }
  }

  return {
    peek,
    handleKeyDown,
    containerProps: {
      "data-peek": peek || undefined,
      onBlur: handleBlur,
      onMouseEnter: cancel,
      onMouseLeave: handleMouseLeave,
    },
    tabProps: {
      ref: tabRef,
      "aria-expanded": peek,
      onClick: () => (peek ? close(false) : open()),
      onMouseEnter: () => {
        if (!peek) {
          schedule(() => setPeek(windowId), HOVER_OPEN_MS);
        }
      },
    },
  };
}
