"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from "react";
import { GridIcon, MessagesIcon, ResultsTextIcon } from "@/components/icons";
import { arrowTarget } from "@/components/interaction";
import { LocaleBlocks, LocaleText } from "@/components/locale/locale-text";
import { expandResults } from "@/components/shell/layout-model";
import type { ResultsFormat } from "@/components/shell/layout-model";
import { updateLayout } from "@/components/shell/layout-store";
import { useLayout } from "@/components/shell/use-layout";
import { useLoadedAt } from "@/components/shell/use-loaded-at";
import { useWorkspace } from "@/components/shell/workspace-context";
import { type Run, isProvisional } from "@/components/shell/workspace-state";
import type { Localized } from "@/content/locales";
import type { ResultsText } from "@/content/types";
import { resultSetsOf } from "@/engine/execute";
import { MessagesPane } from "./messages-pane";
import { ResultSets } from "./result-sets";
import { ResultsControls, ResultsSplitter } from "./results-layout";
import { resultsAsText } from "./results-text";
import styles from "./results.module.css";

const VIEWS = ["results", "messages"] as const;

type ResultsView = (typeof VIEWS)[number];

function viewIcon(view: ResultsView, format: ResultsFormat): ReactNode {
  if (view === "messages") {
    return <MessagesIcon size={14} />;
  }
  return format === "text" ? (
    <ResultsTextIcon size={14} />
  ) : (
    <GridIcon size={14} />
  );
}

const VIEW_CLASSES: Record<ResultsView, string> = {
  results: `${styles.view} ${styles.resultsView}`,
  messages: `${styles.view} ${styles.messagesView}`,
};

interface ResultsPanelProps {
  labels: Record<ResultsView | "heading", Localized>;
  text: Localized<ResultsText>;
}

interface RunViewsProps extends ResultsPanelProps {
  run: Run;
  headingId: string;
}

function viewsOf(run: Run): readonly ResultsView[] {
  if (run.status === "executing") {
    return VIEWS;
  }
  const hasGrids =
    run.status === "done" && resultSetsOf(run.outcomes["pt-BR"]).length > 0;
  return hasGrids ? VIEWS : ["messages"];
}

function RunViews({ run, headingId, labels, text }: Readonly<RunViewsProps>) {
  const baseId = useId();
  const loadedAt = useLoadedAt();
  const views = viewsOf(run);
  const { format } = useLayout().results;
  const [chosen, setChosen] = useState<ResultsView>("results");
  const [shares, setShares] = useState<number[]>([]);
  const active = views.includes(chosen) ? chosen : views[0];
  const tabRefs = useRef(new Map<ResultsView, HTMLButtonElement>());

  function select(view: ResultsView) {
    setChosen(view);
    tabRefs.current.get(view)?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = arrowTarget(
      event.key,
      views.indexOf(active),
      views.length,
      "horizontal",
    );
    if (target === undefined) {
      return;
    }
    event.preventDefault();
    select(views[target]);
  }

  function content(view: ResultsView): ReactNode {
    if (run.status === "executing") {
      return null;
    }
    const timing = {
      completedAt: run.completedAt ?? loadedAt,
      elapsedMs: run.elapsedMs,
    };
    return (
      <LocaleBlocks>
        {(locale) => {
          const outcome = run.outcomes[locale];
          if (view === "messages") {
            return (
              <MessagesPane
                outcome={outcome}
                text={text[locale]}
                timing={timing}
              />
            );
          }
          if (format === "text") {
            return (
              <pre
                className={styles.textResults}
                tabIndex={0}
                aria-label={text[locale].textResults}
                data-text-results=""
              >
                {resultsAsText(resultSetsOf(outcome), text[locale])}
              </pre>
            );
          }
          return (
            <ResultSets
              sets={resultSetsOf(outcome)}
              shares={shares}
              onShares={setShares}
              text={text[locale]}
            />
          );
        }}
      </LocaleBlocks>
    );
  }

  return (
    <>
      <div className={styles.header}>
        <div
          role="tablist"
          aria-labelledby={headingId}
          className={styles.tabs}
          onKeyDown={handleKeyDown}
        >
          {views.map((view) => (
            <button
              key={view}
              ref={(element) => {
                if (element) {
                  tabRefs.current.set(view, element);
                }
                return () => {
                  tabRefs.current.delete(view);
                };
              }}
              id={`${baseId}-${view}-tab`}
              type="button"
              role="tab"
              aria-selected={active === view}
              aria-controls={`${baseId}-${view}-panel`}
              tabIndex={active === view ? 0 : -1}
              className={styles.tab}
              onClick={() => {
                setChosen(view);
                updateLayout(expandResults);
              }}
            >
              {viewIcon(view, format)}
              <LocaleText text={labels[view]} />
            </button>
          ))}
        </div>
        <ResultsControls text={text} />
      </div>
      {views.map((view) => (
        <div
          key={view}
          id={`${baseId}-${view}-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-${view}-tab`}
          tabIndex={view === "messages" ? 0 : undefined}
          hidden={active !== view}
          className={VIEW_CLASSES[view]}
        >
          {content(view)}
        </div>
      ))}
    </>
  );
}

export function ResultsPanel(props: Readonly<ResultsPanelProps>) {
  const { activeDocument, activeRun } = useWorkspace();
  const headingId = useId();
  const panelId = useId();
  if (!activeRun) {
    return null;
  }
  return (
    <div
      id={panelId}
      className={styles.panel}
      data-provisional={isProvisional(activeRun) || undefined}
    >
      <ResultsSplitter text={props.text} controls={panelId} />
      <h2 id={headingId} className="visually-hidden">
        <LocaleText text={props.labels.heading} />
      </h2>
      <RunViews
        key={`${activeDocument}-${activeRun.id}`}
        run={activeRun}
        headingId={headingId}
        {...props}
      />
    </div>
  );
}
