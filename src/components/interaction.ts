import { type MouseEvent, type RefObject, useEffect, useRef } from "react";

type Axis = "horizontal" | "vertical";

const STEPS: Record<Axis, Record<string, number>> = {
  horizontal: { ArrowLeft: -1, ArrowRight: 1 },
  vertical: { ArrowUp: -1, ArrowDown: 1 },
};

export function wrapIndex(index: number, length: number): number {
  return (index + length) % length;
}

export function arrowTarget(
  key: string,
  index: number,
  count: number,
  axis: Axis,
): number | undefined {
  if (count === 0) {
    return undefined;
  }
  if (key === "Home") {
    return 0;
  }
  if (key === "End") {
    return count - 1;
  }
  const step = STEPS[axis][key];
  return step === undefined ? undefined : wrapIndex(index + step, count);
}

export function isPlainClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export function useOutsidePointerDown(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onOutside: () => void,
): void {
  const latest = useRef(onOutside);

  useEffect(() => {
    latest.current = onOutside;
  });

  useEffect(() => {
    if (!active) {
      return;
    }
    function handlePointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        latest.current();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [active, ref]);
}
