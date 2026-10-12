"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./commands.module.css";

const TIP_SELECTOR = "[data-tip], [data-tip-text]";
const HOVER_DELAY_MS = 450;
const GAP = 6;
const MARGIN = 4;

interface Tip {
  anchor: HTMLElement;
  text: string;
}

function textOf(element: Element | null): string {
  return (element instanceof HTMLElement ? element.innerText : "")
    .replace(/\s+/g, " ")
    .trim();
}

function nameOf(element: HTMLElement): string {
  const label = element.getAttribute("aria-label");
  if (label) {
    return label;
  }
  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    return labelledBy
      .split(" ")
      .map((id) => textOf(document.getElementById(id)))
      .filter(Boolean)
      .join(" ");
  }
  return textOf(element);
}

function tipTextOf(element: HTMLElement): string {
  const explicit = element.getAttribute("data-tip-text");
  if (explicit) {
    return explicit;
  }
  const name = nameOf(element);
  const shortcuts = element.getAttribute("aria-keyshortcuts");
  return shortcuts ? `${name} (${shortcuts.split(" ").join(", ")})` : name;
}

function tipAnchor(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element
    ? target.closest<HTMLElement>(TIP_SELECTOR)
    : null;
}

export function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const timer = useRef({ id: 0, anchor: null as HTMLElement | null });

  useLayoutEffect(() => {
    const element = tipRef.current;
    if (!tip || !element) {
      return;
    }
    const anchor = tip.anchor.getBoundingClientRect();
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const left = Math.min(
      Math.max(anchor.left + anchor.width / 2 - width / 2, MARGIN),
      window.innerWidth - width - MARGIN,
    );
    const below = anchor.bottom + GAP;
    const top =
      below + height > window.innerHeight - MARGIN
        ? anchor.top - GAP - height
        : below;
    element.style.left = `${Math.max(left, MARGIN)}px`;
    element.style.top = `${Math.max(top, MARGIN)}px`;
  }, [tip]);

  useEffect(() => {
    const pending = timer.current;

    function show(anchor: HTMLElement) {
      if (
        anchor.getAttribute("aria-expanded") === "true" ||
        !anchor.isConnected
      ) {
        return;
      }
      const text = tipTextOf(anchor);
      if (text) {
        setTip({ anchor, text });
      }
    }

    function hide() {
      window.clearTimeout(pending.id);
      pending.anchor = null;
      setTip(null);
    }

    function handlePointerOver(event: PointerEvent) {
      if (event.pointerType === "touch") {
        return;
      }
      const anchor = tipAnchor(event.target);
      if (!anchor || anchor === pending.anchor) {
        return;
      }
      window.clearTimeout(pending.id);
      pending.anchor = anchor;
      pending.id = window.setTimeout(() => show(anchor), HOVER_DELAY_MS);
    }

    function handlePointerOut(event: PointerEvent) {
      const anchor = tipAnchor(event.target);
      if (anchor && !anchor.contains(event.relatedTarget as Node | null)) {
        hide();
      }
    }

    function handleFocusIn(event: FocusEvent) {
      const anchor = tipAnchor(event.target);
      if (
        anchor &&
        anchor === event.target &&
        anchor.matches(":focus-visible")
      ) {
        window.clearTimeout(pending.id);
        show(anchor);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        hide();
      }
    }

    document.addEventListener("pointerover", handlePointerOver);
    document.addEventListener("pointerout", handlePointerOut);
    document.addEventListener("pointerdown", hide);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", hide);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.clearTimeout(pending.id);
      document.removeEventListener("pointerover", handlePointerOver);
      document.removeEventListener("pointerout", handlePointerOut);
      document.removeEventListener("pointerdown", hide);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", hide);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, []);

  if (!tip) {
    return null;
  }
  return (
    <div
      ref={tipRef}
      className={styles.tooltip}
      aria-hidden="true"
      data-tooltip=""
    >
      {tip.text}
    </div>
  );
}
