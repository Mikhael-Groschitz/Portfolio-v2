"use client";

import { useRef } from "react";
import { ExternalLink } from "@/components/external-link";
import { AppIcon } from "@/components/icons";
import { useLanguage } from "@/components/locale/language-context";
import { getTexts } from "@/content";
import { SERVER } from "@/engine/catalog";
import { ModalDialog, closeDialogOf } from "./modal-dialog";
import { REPOSITORY_URL } from "./site-links";
import styles from "./commands.module.css";

export function AboutDialog({ onClose }: Readonly<{ onClose: () => void }>) {
  const { locale } = useLanguage();
  const texts = getTexts(locale).shell;
  const text = texts.about;
  const bodyRef = useRef<HTMLDivElement>(null);

  return (
    <ModalDialog title={text.title} closeLabel={text.close} onClose={onClose}>
      <div ref={bodyRef} className={styles.dialogBody} data-about="">
        <div className={styles.aboutHeader}>
          <AppIcon size={40} />
          <p className={styles.aboutName}>
            {texts.windowTitle}
            <span className={styles.aboutVersion}>
              {text.version.replace("{version}", SERVER.version)}
            </span>
          </p>
        </div>
        <p>{text.description}</p>
        <p>{text.built}</p>
        <p className={styles.hint}>{text.disclaimer}</p>
        <p>
          <ExternalLink
            href={REPOSITORY_URL}
            newTabLabel={texts.results.opensInNewTab}
          >
            {text.source}
          </ExternalLink>
        </p>
        <div className={styles.dialogButtons}>
          <button
            type="button"
            className={`${styles.dialogButton} ${styles.primary}`}
            onClick={() => closeDialogOf(bodyRef.current)}
          >
            {text.close}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
