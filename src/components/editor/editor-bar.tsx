"use client";

import { useId, useSyncExternalStore } from "react";
import { CheckCircleIcon } from "@/components/icons";
import { LocaleText } from "@/components/locale/locale-text";
import {
  ZOOM_LEVELS,
  isZoom,
} from "@/components/preferences/preferences-runtime";
import {
  readPreferences,
  savePreferences,
  usePreferences,
} from "@/components/preferences/preferences-store";
import { isQueryDocument } from "@/components/shell/section-routes";
import { useWorkspace } from "@/components/shell/workspace-context";
import { type Localized, mapLocalized } from "@/content/locales";
import type { ShellText } from "@/content/types";
import { createQueryStore, cursorOf } from "./query-store";
import styles from "./editor.module.css";

const READ_ONLY = createQueryStore();

export function EditorBar({
  text,
}: Readonly<{ text: Localized<ShellText["editor"]> }>) {
  const { activeDocument, queryStore } = useWorkspace();
  const store =
    activeDocument !== null && isQueryDocument(activeDocument)
      ? queryStore(activeDocument)
      : READ_ONLY;
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const { zoom } = usePreferences();
  const zoomId = useId();
  if (activeDocument === null) {
    return null;
  }
  const cursor = cursorOf(snapshot.text, snapshot.selectionEnd);

  return (
    <div className={styles.editorBar} data-editor-bar="">
      <label htmlFor={zoomId} className="visually-hidden">
        <LocaleText text={mapLocalized(text, (editor) => editor.zoom)} />
      </label>
      <select
        id={zoomId}
        className={styles.zoom}
        value={zoom}
        data-tip=""
        data-zoom=""
        onChange={(event) => {
          const next = Number(event.currentTarget.value);
          if (isZoom(next)) {
            savePreferences({ ...readPreferences(), zoom: next });
          }
        }}
      >
        {ZOOM_LEVELS.map((level) => (
          <option key={level} value={level}>
            {`${level} %`}
          </option>
        ))}
      </select>
      <span className={styles.issues}>
        <CheckCircleIcon size={14} />
        <LocaleText text={mapLocalized(text, (editor) => editor.noIssues)} />
      </span>
      <span className={styles.position}>
        <span>
          <LocaleText text={mapLocalized(text, (editor) => editor.line)} />
          {`: ${cursor.line}`}
        </span>
        <span>
          <LocaleText text={mapLocalized(text, (editor) => editor.column)} />
          {`: ${cursor.column}`}
        </span>
      </span>
    </div>
  );
}
