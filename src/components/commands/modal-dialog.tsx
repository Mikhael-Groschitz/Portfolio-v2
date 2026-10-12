"use client";

import { type ReactNode, useId, useLayoutEffect, useRef } from "react";
import { CloseIcon } from "@/components/icons";
import styles from "./commands.module.css";

interface ModalDialogProps {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}

export function ModalDialog({
  title,
  closeLabel,
  onClose,
  children,
}: Readonly<ModalDialogProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={styles.dialog}
      onClose={onClose}
    >
      <div className={styles.dialogTitleBar}>
        <h2 id={titleId} className={styles.dialogTitle}>
          {title}
        </h2>
        <button
          type="button"
          className={styles.dialogClose}
          aria-label={closeLabel}
          onClick={() => dialogRef.current?.close()}
        >
          <CloseIcon />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function closeDialogOf(element: HTMLElement | null) {
  element?.closest("dialog")?.close();
}
