"use client";

import { useEffect } from "react";
import styles from "./commands.module.css";

const TOAST_MS = 4500;

export interface ToastMessage {
  id: number;
  text: string;
}

let nextId = 0;

export function toastOf(text: string): ToastMessage {
  nextId += 1;
  return { id: nextId, text };
}

export function ToastRegion({
  toast,
  onDismiss,
}: Readonly<{ toast: ToastMessage | null; onDismiss: () => void }>) {
  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(onDismiss, TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <output
      className={styles.toastRegion}
      aria-atomic="true"
      data-toast-region=""
    >
      {toast && (
        <span key={toast.id} className={styles.toast}>
          {toast.text}
        </span>
      )}
    </output>
  );
}
