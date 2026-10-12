"use client";

import { type SubmitEvent, useId, useRef, useState } from "react";
import { useLanguage } from "@/components/locale/language-context";
import {
  ZOOM_LEVELS,
  type Zoom,
  editorMetrics,
  isZoom,
} from "@/components/preferences/preferences-runtime";
import {
  readPreferences,
  savePreferences,
  useSystemReducesMotion,
} from "@/components/preferences/preferences-store";
import { getTexts } from "@/content";
import { LOCALES, isLocale } from "@/content/locales";
import { ModalDialog, closeDialogOf } from "./modal-dialog";
import styles from "./commands.module.css";

function zoomLabel(zoom: Zoom): string {
  const size = editorMetrics(zoom)["--editor-font-size"].replace("px", " px");
  return `${zoom} % (${size})`;
}

export function OptionsDialog({ onClose }: Readonly<{ onClose: () => void }>) {
  const { locale, setLocale } = useLanguage();
  const system = useSystemReducesMotion();
  const [draft, setDraft] = useState(() => ({
    locale,
    ...readPreferences(),
  }));
  const formRef = useRef<HTMLFormElement>(null);
  const zoomId = useId();
  const motionHintId = useId();
  const text = getTexts(locale).shell.options;

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    savePreferences({ zoom: draft.zoom, reduceMotion: draft.reduceMotion });
    if (draft.locale !== locale) {
      setLocale(draft.locale);
    }
    closeDialogOf(formRef.current);
  }

  return (
    <ModalDialog title={text.title} closeLabel={text.cancel} onClose={onClose}>
      <form
        ref={formRef}
        className={styles.dialogBody}
        onSubmit={handleSubmit}
        data-options-form=""
      >
        <fieldset className={styles.group}>
          <legend className={styles.legend}>{text.language}</legend>
          {LOCALES.map((option) => (
            <label key={option} className={styles.choice}>
              <input
                type="radio"
                name="language"
                value={option}
                checked={draft.locale === option}
                onChange={(event) => {
                  const next = event.currentTarget.value;
                  if (isLocale(next)) {
                    setDraft({ ...draft, locale: next });
                  }
                }}
              />
              <span lang={option}>{getTexts(option).shell.languageName}</span>
            </label>
          ))}
        </fieldset>
        <fieldset className={styles.group}>
          <legend className={styles.legend}>{text.editor}</legend>
          <label htmlFor={zoomId} className={styles.field}>
            {text.zoom}
          </label>
          <select
            id={zoomId}
            className={styles.select}
            value={draft.zoom}
            onChange={(event) => {
              const next = Number(event.currentTarget.value);
              if (isZoom(next)) {
                setDraft({ ...draft, zoom: next });
              }
            }}
          >
            {ZOOM_LEVELS.map((zoom) => (
              <option key={zoom} value={zoom}>
                {zoomLabel(zoom)}
              </option>
            ))}
          </select>
        </fieldset>
        <fieldset className={styles.group}>
          <legend className={styles.legend}>{text.motion}</legend>
          <label className={styles.choice}>
            <input
              type="checkbox"
              checked={draft.reduceMotion || system}
              disabled={system}
              aria-describedby={system ? motionHintId : undefined}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  reduceMotion: event.currentTarget.checked,
                })
              }
            />
            {text.reduceMotion}
          </label>
          {system && (
            <p id={motionHintId} className={styles.hint}>
              {text.systemMotion}
            </p>
          )}
        </fieldset>
        <div className={styles.dialogButtons}>
          <button
            type="submit"
            className={`${styles.dialogButton} ${styles.primary}`}
          >
            {text.ok}
          </button>
          <button
            type="button"
            className={styles.dialogButton}
            onClick={() => closeDialogOf(formRef.current)}
          >
            {text.cancel}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
