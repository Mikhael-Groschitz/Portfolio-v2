"use client";

import { type CSSProperties, Fragment, useId, useRef } from "react";
import { Splitter } from "@/components/shell/splitter";
import type { ResultsText } from "@/content/types";
import type { ResultSet } from "@/engine/execute";
import { ResultsGrid } from "./results-grid";
import styles from "./results.module.css";

const MIN_RATIO = 0.1;
const STEP = 0.05;
const BIG_STEP = 0.15;

interface ResultSetsProps {
  sets: readonly ResultSet[];
  shares: readonly number[];
  onShares: (shares: number[]) => void;
  text: ResultsText;
}

function clamp(value: number): number {
  return Math.min(Math.max(value, MIN_RATIO), 1 - MIN_RATIO);
}

function percent(ratio: number): number {
  return Math.round(ratio * 100);
}

export function ResultSets({
  sets,
  shares,
  onShares,
  text,
}: Readonly<ResultSetsProps>) {
  const baseId = useId();
  const panes = useRef(new Map<number, HTMLDivElement>());
  const collapsedFrom = useRef(new Map<number, number>());
  const total = sets.length;

  function shareOf(index: number): number {
    return shares[index] ?? 1;
  }

  function ratioOf(index: number): number {
    const upper = shareOf(index - 1);
    return upper / (upper + shareOf(index));
  }

  function setRatio(index: number, ratio: number) {
    const next = sets.map((_, position) => shareOf(position));
    const pair = next[index - 1] + next[index];
    next[index - 1] = pair * clamp(ratio);
    next[index] = pair - next[index - 1];
    onShares(next);
  }

  function moveTo(index: number, clientY: number) {
    const upper = panes.current.get(index - 1)?.getBoundingClientRect();
    const lower = panes.current.get(index)?.getBoundingClientRect();
    if (!upper || !lower) {
      return;
    }
    const space = upper.height + lower.height;
    if (space > 0) {
      setRatio(index, (clientY - upper.top) / space);
    }
  }

  function toggle(index: number) {
    const ratio = ratioOf(index);
    const previous = collapsedFrom.current.get(index);
    if (ratio > MIN_RATIO + 0.001 || previous === undefined) {
      collapsedFrom.current.set(index, ratio);
      setRatio(index, MIN_RATIO);
    } else {
      collapsedFrom.current.delete(index);
      setRatio(index, previous);
    }
  }

  function paneLabel(index: number): string {
    const source = sets[index].source;
    if (total === 1) {
      return source;
    }
    const position = text.resultSet
      .replace("{index}", String(index + 1))
      .replace("{total}", String(total));
    return `${position}: ${source}`;
  }

  return sets.map((resultSet, index) => {
    const value = index > 0 ? percent(ratioOf(index)) : 0;
    return (
      <Fragment key={index}>
        {index > 0 && (
          <Splitter
            orientation="horizontal"
            keys={{ decrease: "ArrowUp", increase: "ArrowDown" }}
            label={text.resizeGrids}
            controls={`${baseId}-${index - 1}`}
            value={value}
            min={percent(MIN_RATIO)}
            max={percent(1 - MIN_RATIO)}
            valueText={`${value}%`}
            className={styles.gridSplitter}
            onMove={(_, clientY) => moveTo(index, clientY)}
            onStep={(direction, big) =>
              setRatio(
                index,
                ratioOf(index) + direction * (big ? BIG_STEP : STEP),
              )
            }
            onEdge={(edge) =>
              setRatio(index, edge === "min" ? MIN_RATIO : 1 - MIN_RATIO)
            }
            onToggle={() => toggle(index)}
            onReset={() => setRatio(index, 0.5)}
          />
        )}
        <div
          ref={(element) => {
            if (element) {
              panes.current.set(index, element);
            }
            return () => {
              panes.current.delete(index);
            };
          }}
          id={`${baseId}-${index}`}
          role="group"
          aria-label={paneLabel(index)}
          tabIndex={0}
          className={styles.pane}
          style={{ "--pane-grow": shareOf(index) } as CSSProperties}
          data-result-pane=""
        >
          <ResultsGrid
            resultSet={resultSet}
            rowNumberLabel={text.rowNumber}
            newTabLabel={text.opensInNewTab}
          />
        </div>
      </Fragment>
    );
  });
}
