import { type ReactNode, type Ref, useId, useRef } from "react";
import { type SheetSection, commandSheet } from "./command-sheet";
import {
  type RankingState,
  canRetry,
  rankingMessage,
  rankingRows,
} from "./ranking-view";
import type { GameTexts } from "./texts";
import styles from "./game.module.css";

export type PanelPlace = "left" | "right" | "over";

interface FrameProps {
  title: string;
  footer: string;
  place: PanelPlace;
  children: ReactNode;
  close?: PanelClose;
}

export interface PanelClose {
  label: string;
  onClose: () => void;
}

function PanelFrame({
  title,
  footer,
  place,
  children,
  close,
  closeRef,
  bodyRef,
}: FrameProps & {
  closeRef?: Ref<HTMLButtonElement>;
  bodyRef?: Ref<HTMLDivElement>;
}) {
  const titleId = useId();
  return (
    <aside
      className={styles.sidePanel}
      data-place={place}
      aria-labelledby={titleId}
    >
      <header className={styles.sideHeader}>
        <h3 id={titleId} className={styles.sideTitle}>
          {title}
        </h3>
        {close && (
          <button
            ref={closeRef}
            type="button"
            className={styles.sideClose}
            onClick={close.onClose}
          >
            {close.label}
          </button>
        )}
      </header>
      <div
        ref={bodyRef}
        className={styles.sideBody}
        tabIndex={0}
        data-scroll
        aria-labelledby={titleId}
      >
        {children}
      </div>
      <footer className={styles.sideFooter}>{footer}</footer>
    </aside>
  );
}

export function RankingPanel({
  text,
  state,
  highlight,
  place,
  onRetry,
  close,
  closeRef,
}: Readonly<{
  text: GameTexts;
  state: RankingState;
  highlight: number | null;
  place: PanelPlace;
  onRetry: () => void;
  close?: PanelClose;
  closeRef?: Ref<HTMLButtonElement>;
}>) {
  const labels = text.panels.ranking;
  const message = rankingMessage(state, text);
  const bodyRef = useRef<HTMLDivElement>(null);

  function retry() {
    bodyRef.current?.focus({ preventScroll: true });
    onRetry();
  }

  return (
    <PanelFrame
      title={labels.title}
      footer={labels.privacy}
      place={place}
      close={close}
      closeRef={closeRef}
      bodyRef={bodyRef}
    >
      <table
        className={styles.rankingTable}
        data-loading={state.kind === "loading" || undefined}
      >
        <caption className="visually-hidden">{labels.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{labels.position}</th>
            <th scope="col">{labels.name}</th>
            <th scope="col">{labels.time}</th>
          </tr>
        </thead>
        <tbody>
          {rankingRows(state, highlight).map((row) => (
            <tr
              key={row.position}
              data-empty={row.empty || undefined}
              data-highlighted={row.highlighted || undefined}
              aria-current={row.highlighted || undefined}
            >
              <th scope="row">{row.position}</th>
              <td>{row.name}</td>
              <td>{row.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.rankingStatus}>
        <p role="status">{message}</p>
        {canRetry(state) && (
          <button type="button" className={styles.secondary} onClick={retry}>
            {labels.retry}
          </button>
        )}
      </div>
    </PanelFrame>
  );
}

function Section({ section }: Readonly<{ section: SheetSection }>) {
  return (
    <section className={styles.sheetSection}>
      <h4 className={styles.sheetTitle}>{section.title}</h4>
      <dl className={styles.sheetList}>
        {section.lines.map((line) => (
          <div key={line.id} className={styles.sheetLine} data-kind={line.kind}>
            <dt>
              {line.kind === "keys" ? (
                <kbd className={styles.key}>{line.keys}</kbd>
              ) : (
                <code className={styles.sqlName}>{line.keys}</code>
              )}
            </dt>
            <dd>{line.action}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function CommandsPanel({
  text,
  collapsed,
  place,
  close,
  closeRef,
}: Readonly<{
  text: GameTexts;
  collapsed: boolean;
  place: PanelPlace;
  close?: PanelClose;
  closeRef?: Ref<HTMLButtonElement>;
}>) {
  return (
    <PanelFrame
      title={text.panels.commands.title}
      footer={text.panels.commands.footer}
      place={place}
      close={close}
      closeRef={closeRef}
    >
      {commandSheet(text, collapsed).map((section) => (
        <Section key={section.id} section={section} />
      ))}
    </PanelFrame>
  );
}
