"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import {
  DatabaseIcon,
  KeywordIcon,
  ProcedureIcon,
  TableIcon,
} from "@/components/icons";
import type { CompletionKind, QueryText } from "@/content/types";
import type { Completion, CompletionItem } from "./completions";
import styles from "./query-editor.module.css";

const KIND_ICONS: Record<CompletionKind, ReactNode> = {
  keyword: <KeywordIcon />,
  table: <TableIcon />,
  procedure: <ProcedureIcon />,
  database: <DatabaseIcon />,
};

export interface OpenCompletion extends Completion {
  active: number;
  line: number;
  column: number;
}

interface CompletionListProps {
  id: string;
  completion: OpenCompletion;
  text: QueryText;
  onPick: (item: CompletionItem) => void;
}

export function CompletionList({
  id,
  completion,
  text,
  onPick,
}: Readonly<CompletionListProps>) {
  const listRef = useRef<HTMLDivElement>(null);
  const { items, active, line, column } = completion;
  const selected = items[active];

  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <div
      className={styles.completion}
      style={{ "--line": line, "--column": column } as CSSProperties}
    >
      <div
        ref={listRef}
        id={id}
        role="listbox"
        aria-label={text.suggestions}
        className={styles.list}
      >
        {items.map((item, index) => (
          <div
            key={item.label}
            id={`${id}-${index}`}
            role="option"
            aria-selected={index === active}
            className={styles.option}
            onMouseDown={(event) => {
              event.preventDefault();
              onPick(item);
            }}
          >
            <span className={styles.optionIcon}>{KIND_ICONS[item.kind]}</span>
            <span className={styles.optionLabel}>{item.label}</span>
            <span className={styles.optionOwner}>{item.owner}</span>
            <span className="visually-hidden">{text.kinds[item.kind]}</span>
          </div>
        ))}
      </div>
      <div className={styles.detail} aria-hidden="true">
        {KIND_ICONS[selected.kind]}
        {`${text.kinds[selected.kind]} ${selected.label}`}
      </div>
    </div>
  );
}
