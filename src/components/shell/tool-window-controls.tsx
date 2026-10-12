"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useId,
  useRef,
} from "react";
import { CaretDownIcon, CloseIcon, PinIcon } from "@/components/icons";
import { MenuButton, type PopupMenuItem } from "@/components/menu/menu-button";
import type { WindowText } from "@/content/types";
import {
  type Box,
  FLOATING,
  type Placement,
  type ToolWindowId,
  moveFloating,
  resizeFloating,
} from "./layout-model";
import { readLayout, updateLayout } from "./layout-store";
import {
  floatAt,
  panelBox,
  placeWindow,
  popOut,
  viewport,
} from "./tool-window-actions";
import { useLayout } from "./use-layout";
import styles from "./tool-window.module.css";

export type ToolWindowText = WindowText & { move: string; close: string };

const DRAG_THRESHOLD = 6;
const DRAGGING_ATTRIBUTE = "data-dragging";

const MOVES: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

const PLACEMENT_LABELS: readonly [
  Placement,
  keyof Pick<WindowText, "float" | "dock" | "autoHide">,
][] = [
  ["floating", "float"],
  ["docked", "dock"],
  ["autoHide", "autoHide"],
];

interface WindowProps {
  windowId: ToolWindowId;
  panelId: string;
  text: ToolWindowText;
  onChoice?: () => void;
}

interface DragStart {
  x: number;
  y: number;
  box: Box;
  moved: boolean;
}

function choosePlacement(
  windowId: ToolWindowId,
  panelId: string,
  placement: Placement,
) {
  if (placement === "floating") {
    popOut(windowId, panelId);
  } else {
    placeWindow(windowId, placement);
  }
}

function MoveHandle({ windowId, panelId, text, onChoice }: WindowProps) {
  const floating = useLayout()[windowId].placement === "floating";
  const drag = useRef<DragStart | null>(null);
  const labelId = useId();
  const hintId = useId();

  function toggleFloating() {
    onChoice?.();
    const placement =
      readLayout()[windowId].placement === "floating" ? "docked" : "floating";
    choosePlacement(windowId, panelId, placement);
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) {
      return;
    }
    const stored = readLayout()[windowId].floating;
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      box: floating ? stored : (panelBox(panelId) ?? stored),
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const start = drag.current;
    if (!start) {
      return;
    }
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
      return;
    }
    if (!start.moved) {
      start.moved = true;
      onChoice?.();
    }
    document.documentElement.setAttribute(DRAGGING_ATTRIBUTE, "move");
    floatAt(windowId, {
      ...start.box,
      x: start.box.x + dx,
      y: start.box.y + dy,
    });
  }

  function stopDragging(event: PointerEvent<HTMLButtonElement>) {
    drag.current = null;
    document.documentElement.removeAttribute(DRAGGING_ATTRIBUTE);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (event.detail === 0) {
      toggleFloating();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const move = MOVES[event.key];
    if (!move || !floating) {
      return;
    }
    event.preventDefault();
    const [x, y] = move;
    const distance = FLOATING.step;
    updateLayout((layout) =>
      event.shiftKey
        ? resizeFloating(
            layout,
            windowId,
            x * distance,
            y * distance,
            viewport(),
          )
        : moveFloating(
            layout,
            windowId,
            x * distance,
            y * distance,
            viewport(),
          ),
    );
  }

  return (
    <>
      <span id={labelId} className="visually-hidden">
        {text.move}
      </span>
      <span id={hintId} className="visually-hidden">
        {text.moveHint}
      </span>
      <button
        type="button"
        className={styles.grip}
        aria-labelledby={labelId}
        aria-describedby={hintId}
        data-grip=""
        data-tip=""
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onDoubleClick={toggleFloating}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      />
    </>
  );
}

function WindowMenu({
  windowId,
  panelId,
  text,
  onChoice,
  onClose,
}: WindowProps & { onClose: () => void }) {
  const placement = useLayout()[windowId].placement;

  function choose(next: Placement) {
    onChoice?.();
    choosePlacement(windowId, panelId, next);
  }

  return (
    <MenuButton
      label={text.menu}
      className={styles.button}
      triggerData={{ "data-window-menu": "" }}
      items={() => [
        ...PLACEMENT_LABELS.map(([option, key]): PopupMenuItem => ({
          key: option,
          label: text[key],
          role: "menuitemradio",
          checked: placement === option,
          onSelect: () => choose(option),
        })),
        {
          key: "hide",
          label: text.hide,
          separatorBefore: true,
          onSelect: onClose,
        },
      ]}
    >
      <CaretDownIcon />
    </MenuButton>
  );
}

export function ToolWindowControls({
  windowId,
  panelId,
  text,
  onChoice,
  onClose,
}: Readonly<WindowProps & { onClose: () => void }>) {
  const placement = useLayout()[windowId].placement;
  const autoHidden = placement === "autoHide";
  const pinLabelId = useId();
  const closeLabelId = useId();

  return (
    <>
      <MoveHandle
        windowId={windowId}
        panelId={panelId}
        text={text}
        onChoice={onChoice}
      />
      <span className={styles.buttons} data-window-buttons="">
        <WindowMenu
          windowId={windowId}
          panelId={panelId}
          text={text}
          onChoice={onChoice}
          onClose={onClose}
        />
        {placement !== "floating" && (
          <>
            <span id={pinLabelId} className="visually-hidden">
              {text.autoHide}
            </span>
            <button
              type="button"
              className={styles.button}
              aria-labelledby={pinLabelId}
              aria-pressed={autoHidden}
              data-pin=""
              data-tip=""
              onClick={() => {
                onChoice?.();
                placeWindow(windowId, autoHidden ? "docked" : "autoHide");
              }}
            >
              <PinIcon />
            </button>
          </>
        )}
      </span>
      <span id={closeLabelId} className="visually-hidden">
        {text.close}
      </span>
      <button
        type="button"
        className={styles.closeButton}
        aria-labelledby={closeLabelId}
        data-window-close=""
        data-tip=""
        onClick={onClose}
      >
        <CloseIcon />
      </button>
    </>
  );
}
