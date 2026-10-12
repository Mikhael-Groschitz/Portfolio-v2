"use client";

import {
  type ChangeEvent,
  type KeyboardEvent,
  type SyntheticEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useCommands } from "@/components/commands/command-context";
import { useLanguage } from "@/components/locale/language-context";
import { LocaleText } from "@/components/locale/locale-text";
import { documentTabId } from "@/components/shell/element-ids";
import {
  type QueryDocumentId,
  isQueryDocument,
} from "@/components/shell/section-routes";
import { useWorkspace } from "@/components/shell/workspace-context";
import { getTexts } from "@/content";
import { type Localized, mapLocalized } from "@/content/locales";
import type { QueryText } from "@/content/types";
import { catalogIdentifiers } from "@/engine/catalog";
import { MAX_QUERY_LENGTH } from "@/engine/execute";
import { CompletionList, type OpenCompletion } from "./completion-list";
import { type CompletionItem, completionAt } from "./completions";
import {
  chordCommand,
  completionTarget,
  editActionOf,
  historyKeyOf,
  isExecuteShortcut,
  isModifierKey,
  isTyping,
  startsChord,
} from "./editor-keys";
import { FindBar } from "./find-bar";
import {
  type Match,
  findMatches,
  markSegments,
  matchAfter,
  stepMatch,
} from "./find-matches";
import { highlightTsql } from "./highlight";
import { type QueryStore, cursorOf } from "./query-store";
import styles from "./query-editor.module.css";

const IDENTIFIERS = catalogIdentifiers();

interface QueryDocumentProps {
  documentId: QueryDocumentId;
  query: QueryStore;
  text: Localized<QueryText>;
}

interface FindState {
  open: boolean;
  value: string;
  current: number;
}

const CLOSED_FIND: FindState = { open: false, value: "", current: -1 };
const GUTTER_WIDTH = 52;
const SURFACE_PADDING = 6;

let measureContext: CanvasRenderingContext2D | null = null;

function characterWidth(element: HTMLElement): number {
  measureContext ??= document.createElement("canvas").getContext("2d");
  if (!measureContext) {
    return 8;
  }
  measureContext.font = getComputedStyle(element).font;
  return measureContext.measureText("0").width;
}

function revealOffset(
  scroller: HTMLElement,
  input: HTMLTextAreaElement,
  text: string,
  offset: number,
) {
  const { line, column } = cursorOf(text, offset);
  const lineHeight = Number.parseFloat(getComputedStyle(input).lineHeight);
  const top = SURFACE_PADDING + (line - 1) * lineHeight;
  if (top < scroller.scrollTop) {
    scroller.scrollTop = Math.max(0, top - lineHeight);
  } else if (top + lineHeight > scroller.scrollTop + scroller.clientHeight) {
    scroller.scrollTop = top + 2 * lineHeight - scroller.clientHeight;
  }
  const left =
    GUTTER_WIDTH + SURFACE_PADDING + (column - 1) * characterWidth(input);
  const visibleStart = scroller.scrollLeft + GUTTER_WIDTH;
  if (left < visibleStart) {
    scroller.scrollLeft = Math.max(0, left - GUTTER_WIDTH - 24);
  } else if (left > scroller.scrollLeft + scroller.clientWidth - 48) {
    scroller.scrollLeft = left - scroller.clientWidth + 96;
  }
}

export function QueryEditor({
  text,
}: Readonly<{ text: Localized<QueryText> }>) {
  const { activeDocument, queryStore } = useWorkspace();
  if (activeDocument === null || !isQueryDocument(activeDocument)) {
    return null;
  }
  return (
    <QueryDocument
      key={activeDocument}
      documentId={activeDocument}
      query={queryStore(activeDocument)}
      text={text}
    />
  );
}

function QueryDocument({
  documentId,
  query,
  text,
}: Readonly<QueryDocumentProps>) {
  const { locale } = useLanguage();
  const snapshot = useSyncExternalStore(
    query.subscribe,
    query.getSnapshot,
    query.getSnapshot,
  );
  const [completion, setCompletion] = useState<OpenCompletion | null>(null);
  const [find, setFind] = useState<FindState>(CLOSED_FIND);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollerRef = useRef<HTMLElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const openFindRef = useRef<() => void>(() => undefined);
  const accepting = useRef(false);
  const chordStarted = useRef(false);
  const commands = useCommands();
  const labelId = useId();
  const hintId = useId();
  const listId = useId();
  const lines = useMemo(
    () => highlightTsql(snapshot.text, IDENTIFIERS),
    [snapshot.text],
  );
  const empty = snapshot.text === "";
  const matches = useMemo(
    () => (find.open ? findMatches(snapshot.text, find.value) : []),
    [find.open, find.value, snapshot.text],
  );
  const current = matches.length === 0 ? -1 : find.current;

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const { selectionStart, selectionEnd } = snapshot;
    if (
      textarea &&
      (textarea.selectionStart !== selectionStart ||
        textarea.selectionEnd !== selectionEnd)
    ) {
      textarea.setSelectionRange(selectionStart, selectionEnd);
    }
  }, [snapshot]);

  useEffect(() => {
    function focusIfRequested() {
      if (query.takeFocusRequest()) {
        textareaRef.current?.focus();
      }
    }
    focusIfRequested();
    return query.subscribe(() => {
      focusIfRequested();
      if (query.takeFindRequest()) {
        openFindRef.current();
      }
    });
  }, [query]);

  useEffect(() => {
    openFindRef.current = openFind;
  });

  function selectMatch(match: Match | undefined) {
    const scroller = scrollerRef.current;
    const textarea = textareaRef.current;
    if (!match) {
      return;
    }
    query.update({ selectionStart: match.start, selectionEnd: match.end });
    if (scroller && textarea) {
      revealOffset(scroller, textarea, snapshot.text, match.start);
    }
  }

  function searchFor(value: string) {
    const found = findMatches(snapshot.text, value);
    const index = matchAfter(found, snapshot.selectionStart);
    setFind({ open: true, value, current: index });
    selectMatch(found[index]);
  }

  function openFind() {
    const selection = snapshot.text.slice(
      snapshot.selectionStart,
      snapshot.selectionEnd,
    );
    const value =
      selection !== "" && !selection.includes("\n") ? selection : find.value;
    setCompletion(null);
    searchFor(value);
    requestAnimationFrame(() => {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    });
  }

  function stepFind(direction: -1 | 1) {
    const index = stepMatch(matches, current, direction);
    setFind({ ...find, current: index });
    selectMatch(matches[index]);
  }

  function closeFind() {
    setFind({ ...CLOSED_FIND, value: find.value });
    textareaRef.current?.focus();
  }

  function suggest(value: string, caret: number, explicit: boolean) {
    const next = completionAt(value, caret, explicit);
    if (!next) {
      setCompletion(null);
      return;
    }
    setCompletion({ ...next, active: 0, ...cursorOf(value, next.from) });
  }

  function accept(item: CompletionItem) {
    const textarea = textareaRef.current;
    if (!textarea || !completion) {
      return;
    }
    textarea.focus();
    textarea.setSelectionRange(completion.from, completion.to);
    accepting.current = true;
    const inserted = document.execCommand("insertText", false, item.label);
    accepting.current = false;
    if (!inserted) {
      textarea.setRangeText(item.label, completion.from, completion.to, "end");
      query.update(
        {
          text: textarea.value,
          selectionStart: textarea.selectionStart,
          selectionEnd: textarea.selectionEnd,
        },
        "complete",
      );
    }
    setCompletion(null);
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const { value, selectionStart, selectionEnd } = event.target;
    const { inputType, data } = event.nativeEvent as InputEvent;
    query.update(
      { text: value, selectionStart, selectionEnd },
      accepting.current ? "complete" : editActionOf(inputType ?? ""),
    );
    if (accepting.current) {
      return;
    }
    if (completion || isTyping(data ?? "")) {
      suggest(value, selectionStart, false);
    }
  }

  function handleSelect(event: SyntheticEvent<HTMLTextAreaElement>) {
    const { value, selectionStart, selectionEnd } = event.currentTarget;
    query.update({ selectionStart, selectionEnd });
    if (!completion) {
      return;
    }
    if (selectionStart !== selectionEnd || selectionStart < completion.from) {
      setCompletion(null);
    } else if (selectionStart !== completion.to) {
      suggest(value, selectionStart, false);
    }
  }

  function handleChord(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
    if (isModifierKey(event.key)) {
      return false;
    }
    const started = chordStarted.current;
    chordStarted.current = false;
    const command = started ? chordCommand(event) : undefined;
    if (command) {
      event.preventDefault();
      setCompletion(null);
      commands.run(command);
      return true;
    }
    if (startsChord(event)) {
      event.preventDefault();
      chordStarted.current = true;
      return true;
    }
    return false;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (handleChord(event)) {
      return;
    }
    const historyKey = historyKeyOf(event);
    if (historyKey) {
      event.preventDefault();
      setCompletion(null);
      if (historyKey === "find") {
        openFind();
      } else {
        query[historyKey]();
      }
      return;
    }
    if (event.key === "F3" && find.value !== "") {
      event.preventDefault();
      if (!find.open) {
        searchFor(find.value);
      } else {
        stepFind(event.shiftKey ? -1 : 1);
      }
      return;
    }
    if (event.ctrlKey && event.key === " ") {
      event.preventDefault();
      suggest(
        event.currentTarget.value,
        event.currentTarget.selectionStart,
        true,
      );
      return;
    }
    if (!completion) {
      return;
    }
    if (isExecuteShortcut(event)) {
      setCompletion(null);
      return;
    }
    const target = completionTarget(
      event.key,
      completion.active,
      completion.items.length,
    );
    if (target !== undefined) {
      event.preventDefault();
      setCompletion({ ...completion, active: target });
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      accept(completion.items[completion.active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setCompletion(null);
    }
  }

  const findText = getTexts(locale).shell.find;

  return (
    <div className={styles.frame}>
      {find.open && (
        <FindBar
          text={findText}
          value={find.value}
          current={current}
          total={matches.length}
          inputRef={findInputRef}
          onChange={searchFor}
          onStep={stepFind}
          onClose={closeFind}
        />
      )}
      <section
        ref={scrollerRef}
        aria-labelledby={documentTabId(documentId)}
        data-editor=""
        className={styles.editor}
      >
        <span id={labelId} className="visually-hidden">
          <LocaleText text={mapLocalized(text, (entry) => entry.editorLabel)} />
        </span>
        <div className={styles.gutter} aria-hidden="true">
          {lines.map((_, index) => (
            <span key={index}>{index + 1}</span>
          ))}
        </div>
        <div className={styles.surface}>
          {matches.length > 0 && (
            <pre className={styles.marks} aria-hidden="true">
              {markSegments(snapshot.text, matches, current).map(
                (segment, index) =>
                  segment.mark ? (
                    <mark
                      key={index}
                      className={styles.mark}
                      data-current={segment.mark === "current" || undefined}
                    >
                      {segment.text}
                    </mark>
                  ) : (
                    segment.text
                  ),
              )}
              {"\n"}
            </pre>
          )}
          <pre className={styles.highlight} aria-hidden="true">
            {lines.map((line, index) => (
              <span key={index}>
                {line.map((token, position) => (
                  <span
                    key={position}
                    style={token.color ? { color: token.color } : undefined}
                  >
                    {token.content}
                  </span>
                ))}
                {"\n"}
              </span>
            ))}
          </pre>
          {empty && (
            <p id={hintId} className={styles.placeholder}>
              <LocaleText
                text={mapLocalized(text, (entry) => entry.placeholder)}
              />
            </p>
          )}
          <textarea
            ref={textareaRef}
            className={styles.input}
            value={snapshot.text}
            maxLength={MAX_QUERY_LENGTH}
            wrap="off"
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            aria-labelledby={labelId}
            aria-describedby={empty ? hintId : undefined}
            aria-autocomplete="list"
            aria-controls={completion ? listId : undefined}
            aria-activedescendant={
              completion ? `${listId}-${completion.active}` : undefined
            }
            onChange={handleChange}
            onSelect={handleSelect}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              chordStarted.current = false;
              setCompletion(null);
            }}
          />
          {completion && (
            <CompletionList
              id={listId}
              completion={completion}
              text={text[locale]}
              onPick={accept}
            />
          )}
        </div>
      </section>
    </div>
  );
}
