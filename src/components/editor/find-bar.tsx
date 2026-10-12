"use client";

import type { KeyboardEvent, RefObject } from "react";
import { ChevronIcon, CloseIcon } from "@/components/icons";
import type { FindText } from "@/content/types";
import styles from "./query-editor.module.css";

interface FindBarProps {
  text: FindText;
  value: string;
  current: number;
  total: number;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  onStep: (direction: -1 | 1) => void;
  onClose: () => void;
}

function findStatus(
  text: FindText,
  value: string,
  current: number,
  total: number,
): string {
  if (value === "") {
    return "";
  }
  if (total === 0) {
    return text.none;
  }
  return text.count
    .replace("{current}", String(current + 1))
    .replace("{total}", String(total));
}

export function FindBar({
  text,
  value,
  current,
  total,
  inputRef,
  onChange,
  onStep,
  onClose,
}: Readonly<FindBarProps>) {
  const status = findStatus(text, value, current, total);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === "F3") {
      event.preventDefault();
      onStep(event.shiftKey ? -1 : 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <div className={styles.findBar} role="search" data-find-bar="">
      <input
        ref={inputRef}
        type="text"
        className={styles.findInput}
        value={value}
        placeholder={text.label}
        aria-label={text.label}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => onChange(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
      />
      <span className={styles.findCount} role="status">
        {status}
      </span>
      <button
        type="button"
        className={styles.findButton}
        aria-label={text.previous}
        aria-keyshortcuts="Shift+F3"
        data-tip=""
        disabled={total === 0}
        onClick={() => onStep(-1)}
      >
        <ChevronIcon direction="up" size={14} />
      </button>
      <button
        type="button"
        className={styles.findButton}
        aria-label={text.next}
        aria-keyshortcuts="F3"
        data-tip=""
        disabled={total === 0}
        onClick={() => onStep(1)}
      >
        <ChevronIcon direction="down" size={14} />
      </button>
      <button
        type="button"
        className={styles.findButton}
        aria-label={text.close}
        aria-keyshortcuts="Escape"
        data-tip=""
        onClick={onClose}
      >
        <CloseIcon size={14} />
      </button>
    </div>
  );
}
