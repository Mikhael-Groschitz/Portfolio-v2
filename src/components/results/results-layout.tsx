"use client";

import { useId } from "react";
import { ChevronIcon, MaximizeIcon, RestoreIcon } from "@/components/icons";
import { DOCUMENT_PANEL_ID } from "@/components/shell/element-ids";
import {
  RESULTS_SHARE,
  resizeResults,
  toggleResultsCollapse,
  toggleResultsMaximize,
} from "@/components/shell/layout-model";
import { updateLayout } from "@/components/shell/layout-store";
import { useLayout } from "@/components/shell/use-layout";
import { Splitter } from "@/components/shell/splitter";
import type { ResultsText } from "@/content/types";
import styles from "./results.module.css";

const BIG_STEP = 0.15;

function percent(share: number): number {
  return Math.round(share * 100);
}

export function ResultsSplitter({
  text,
  controls,
}: Readonly<{ text: ResultsText; controls: string }>) {
  const { share } = useLayout().results;
  const value = percent(share);

  function moveTo(clientY: number) {
    const panel = document.getElementById(DOCUMENT_PANEL_ID);
    if (!panel) {
      return;
    }
    const box = panel.getBoundingClientRect();
    const bar =
      panel.querySelector<HTMLElement>("[data-editor-bar]")?.offsetHeight ?? 0;
    const free = box.height - bar;
    if (free > 0) {
      updateLayout((layout) =>
        resizeResults(layout, (box.bottom - clientY) / free),
      );
    }
  }

  return (
    <Splitter
      orientation="horizontal"
      keys={{ decrease: "ArrowDown", increase: "ArrowUp" }}
      label={text.resize}
      controls={controls}
      value={value}
      min={percent(RESULTS_SHARE.min)}
      max={percent(RESULTS_SHARE.max)}
      valueText={`${value}%`}
      onMove={(_, clientY) => moveTo(clientY)}
      onStep={(direction, big) =>
        updateLayout((layout) =>
          resizeResults(
            layout,
            layout.results.share +
              direction * (big ? BIG_STEP : RESULTS_SHARE.step),
          ),
        )
      }
      onEdge={(edge) =>
        updateLayout((layout) =>
          resizeResults(
            layout,
            edge === "min" ? RESULTS_SHARE.min : RESULTS_SHARE.max,
          ),
        )
      }
      onToggle={() => updateLayout(toggleResultsCollapse)}
      onReset={() =>
        updateLayout((layout) => resizeResults(layout, RESULTS_SHARE.initial))
      }
    />
  );
}

export function ResultsControls({ text }: Readonly<{ text: ResultsText }>) {
  const { state } = useLayout().results;
  const collapsed = state === "collapsed";
  const maximized = state === "maximized";
  const collapseId = useId();
  const maximizeId = useId();

  return (
    <div className={styles.controls}>
      <span id={collapseId} className="visually-hidden">
        {collapsed ? text.expand : text.collapse}
      </span>
      <button
        type="button"
        className={styles.control}
        aria-labelledby={collapseId}
        aria-expanded={!collapsed}
        data-results-collapse=""
        data-tip=""
        onClick={() => updateLayout(toggleResultsCollapse)}
      >
        <ChevronIcon direction={collapsed ? "up" : "down"} />
      </button>
      <span id={maximizeId} className="visually-hidden">
        {maximized ? text.restore : text.maximize}
      </span>
      <button
        type="button"
        className={styles.control}
        aria-labelledby={maximizeId}
        data-results-maximize=""
        data-tip=""
        onClick={() => updateLayout(toggleResultsMaximize)}
      >
        {maximized ? <RestoreIcon /> : <MaximizeIcon />}
      </button>
    </div>
  );
}
