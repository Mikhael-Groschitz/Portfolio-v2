import { useEffect, useId, useRef } from "react";
import { InputAware } from "@/components/input-variants";
import { inputText } from "@/content";
import type { ConnectText } from "@/content/types";
import styles from "./connect-dialog.module.css";

interface HelpPopoverProps {
  id: string;
  text: ConnectText["help"];
  onClose: () => void;
}

export function HelpPopover({ id, text, onClose }: Readonly<HelpPopoverProps>) {
  const titleId = useId();
  const bodyId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <section
      id={id}
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      className={styles.help}
    >
      <h3 id={titleId} className={styles.helpTitle}>
        {text.title}
      </h3>
      <div id={bodyId} className={styles.helpBody}>
        {text.body.map((paragraph) => (
          <p key={inputText(paragraph, "keyboard")}>
            <InputAware text={paragraph} />
          </p>
        ))}
      </div>
      <div className={styles.helpActions}>
        <button
          ref={closeRef}
          type="button"
          className={styles.button}
          onClick={onClose}
        >
          {text.close}
        </button>
      </div>
    </section>
  );
}
