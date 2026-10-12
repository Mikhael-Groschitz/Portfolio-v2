"use client";

import { type KeyboardEvent, type PointerEvent, useRef } from "react";
import styles from "./splitter.module.css";

interface SplitterKeys {
  decrease: string;
  increase: string;
}

interface SplitterProps {
  orientation: "horizontal" | "vertical";
  keys: SplitterKeys;
  label: string;
  controls: string;
  value: number;
  min: number;
  max: number;
  valueText?: string;
  className?: string;
  onMove: (clientX: number, clientY: number) => void;
  onStep: (direction: -1 | 1, big: boolean) => void;
  onEdge: (edge: "min" | "max") => void;
  onToggle: () => void;
  onReset: () => void;
}

const DRAGGING_ATTRIBUTE = "data-dragging";

export function Splitter({
  orientation,
  keys,
  label,
  controls,
  value,
  min,
  max,
  valueText,
  className,
  onMove,
  onStep,
  onEdge,
  onToggle,
  onReset,
}: Readonly<SplitterProps>) {
  const dragging = useRef(false);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
    document.documentElement.setAttribute(DRAGGING_ATTRIBUTE, orientation);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (dragging.current) {
      onMove(event.clientX, event.clientY);
    }
  }

  function stopDragging(event: PointerEvent<HTMLDivElement>) {
    if (!dragging.current) {
      return;
    }
    dragging.current = false;
    document.documentElement.removeAttribute(DRAGGING_ATTRIBUTE);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case keys.decrease:
        onStep(-1, event.shiftKey);
        break;
      case keys.increase:
        onStep(1, event.shiftKey);
        break;
      case "Home":
        onEdge("min");
        break;
      case "End":
        onEdge("max");
        break;
      case "Enter":
        onToggle();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation={orientation}
      aria-label={label}
      aria-controls={controls}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={valueText}
      className={
        className ? `${styles.splitter} ${className}` : styles.splitter
      }
      data-orientation={orientation}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
    />
  );
}
