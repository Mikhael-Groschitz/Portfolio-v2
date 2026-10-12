"use client";

import {
  type KeyboardEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useGuide } from "@/components/cheatsheet/guide-context";
import { useCommands } from "@/components/commands/command-context";
import {
  COMMANDS,
  MENUS,
  commandLabel,
  isMenuCommand,
} from "@/components/commands/command-model";
import { useConnectionStatus } from "@/components/connect/use-connection-status";
import { CaretDownIcon, SearchIcon } from "@/components/icons";
import { useOutsidePointerDown } from "@/components/interaction";
import { useLanguage } from "@/components/locale/language-context";
import { formatCount } from "@/content/format";
import { getTexts } from "@/content";
import type { CommandId, SectionId } from "@/content/types";
import { CATALOG } from "@/engine/catalog";
import { commandFor } from "@/engine/hints";
import {
  SEARCH_GROUPS,
  type SearchEntry,
  searchEntries,
  searchShortcutFor,
} from "./search-model";
import { useWorkspace } from "./workspace-context";
import styles from "./title-bar.module.css";

interface RunnableEntry extends SearchEntry {
  run: () => void;
}

function readShortcut(): string | null {
  return searchShortcutFor(navigator.platform);
}

function serverShortcut(): string | null {
  return "Ctrl+Q";
}

function noop(): () => void {
  return () => undefined;
}

function isSearchShortcut(event: globalThis.KeyboardEvent): boolean {
  return (
    event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey &&
    !event.metaKey &&
    event.code === "KeyQ"
  );
}

export function SearchBox({ label }: Readonly<{ label: string }>) {
  const { locale } = useLanguage();
  const commands = useCommands();
  const workspace = useWorkspace();
  const guide = useGuide();
  const connected = useConnectionStatus() === "connected";
  const shortcut = useSyncExternalStore(noop, readShortcut, serverShortcut);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const listId = useId();
  const texts = getTexts(locale).shell;

  useLayoutEffect(() => {
    const popup = popupRef.current;
    const trigger = triggerRef.current?.getBoundingClientRect();
    if (!open || !popup || !trigger) {
      return;
    }
    const width = popup.offsetWidth;
    const left = Math.min(
      Math.max(trigger.left, 4),
      window.innerWidth - width - 4,
    );
    popup.style.left = `${Math.max(left, 4)}px`;
    popup.style.top = `${trigger.bottom + 3}px`;
    inputRef.current?.focus();
  }, [open]);

  useOutsidePointerDown(wrapperRef, open, () => setOpen(false));

  useEffect(() => {
    if (shortcut === null) {
      return;
    }
    function openOnShortcut(event: globalThis.KeyboardEvent) {
      if (isSearchShortcut(event)) {
        event.preventDefault();
        setQuery("");
        setActive(0);
        setOpen(true);
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", openOnShortcut);
    return () => document.removeEventListener("keydown", openOnShortcut);
  }, [shortcut]);

  function openSection(section: SectionId) {
    if (connected) {
      workspace.openSection(section);
      guide.stepDone("tables");
    } else {
      workspace.requestConnection({ kind: "section", section });
    }
  }

  function writeExample(command: string) {
    if (connected) {
      workspace.writeQuery(command);
    } else {
      workspace.requestConnection({ kind: "query", text: command });
    }
  }

  function entries(): RunnableEntry[] {
    const sections = CATALOG.map((object): RunnableEntry => ({
      key: `section-${object.section}`,
      group: "sections",
      label: texts.cheatsheet.sections[object.section],
      detail: commandFor(object),
      run: () => openSection(object.section),
    }));
    const menuCommands = MENUS.flatMap((menu) =>
      menu.entries.filter(isMenuCommand),
    ).filter(
      (id: CommandId) =>
        commands.isEnabled(id) &&
        !COMMANDS[id].illustrative &&
        id !== "openCheatsheet",
    );
    const commandEntries = menuCommands.map((id): RunnableEntry => ({
      key: `command-${id}`,
      group: "commands",
      label: commandLabel(commands.label(id)),
      shortcut: COMMANDS[id].shortcut,
      run: () => commands.run(id),
    }));
    const examples = texts.cheatsheet.examples.map(
      (example, index): RunnableEntry => ({
        key: `example-${index}`,
        group: "examples",
        label: example.command.replace(/\s*\n\s*/g, " "),
        detail: example.description,
        run: () => writeExample(example.command),
      }),
    );
    return [...sections, ...commandEntries, ...examples];
  }

  const results = open ? searchEntries(entries(), query) : [];
  const current = Math.min(active, Math.max(results.length - 1, 0));

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }

  function choose(entry: RunnableEntry) {
    close(false);
    entry.run();
    if (document.activeElement === document.body) {
      triggerRef.current?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const last = results.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: current >= last ? 0 : current + 1,
      ArrowUp: current <= 0 ? last : current - 1,
    };
    if (event.key in moves && results.length > 0) {
      event.preventDefault();
      setActive(moves[event.key]);
    } else if (event.key === "Enter" && results[current]) {
      event.preventDefault();
      choose(results[current]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  const optionId = (index: number) => `${listId}-${index}`;
  const countText = formatCount(texts.search.results, results.length);

  return (
    <div ref={wrapperRef} className={styles.searchWrapper}>
      <span id={labelId} className="visually-hidden">
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        className={styles.search}
        aria-labelledby={labelId}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-keyshortcuts={shortcut ?? undefined}
        data-tip=""
        data-search-trigger=""
        onClick={() => {
          setQuery("");
          setActive(0);
          setOpen(!open);
        }}
      >
        <SearchIcon />
        <span className={styles.searchLabel} aria-hidden="true">
          {label}
        </span>
        <CaretDownIcon className={styles.searchCaret} />
      </button>
      {open && (
        <div
          ref={popupRef}
          role="dialog"
          aria-label={texts.search.label}
          className={styles.searchPopup}
        >
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            className={styles.searchInput}
            value={query}
            placeholder={texts.search.placeholder}
            aria-label={texts.search.placeholder}
            aria-expanded={results.length > 0}
            aria-controls={results.length > 0 ? listId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={
              results.length > 0 ? optionId(current) : undefined
            }
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setActive(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <p className="visually-hidden" role="status">
            {countText}
          </p>
          {results.length > 0 ? (
            <div
              id={listId}
              role="listbox"
              aria-label={texts.search.label}
              className={styles.searchList}
            >
              {SEARCH_GROUPS.map((group) => {
                const items = results
                  .map((entry, index) => ({ entry, index }))
                  .filter(({ entry }) => entry.group === group);
                if (items.length === 0) {
                  return null;
                }
                return (
                  <div
                    key={group}
                    role="group"
                    aria-label={texts.search.groups[group]}
                  >
                    <div className={styles.searchGroup} aria-hidden="true">
                      {texts.search.groups[group]}
                    </div>
                    {items.map(({ entry, index }) => (
                      <div
                        key={entry.key}
                        id={optionId(index)}
                        role="option"
                        aria-selected={index === current}
                        className={styles.searchOption}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          choose(entry);
                        }}
                        onMouseMove={() => setActive(index)}
                      >
                        <span className={styles.searchOptionLabel}>
                          {entry.label}
                        </span>
                        {entry.detail && (
                          <span className={styles.searchOptionDetail}>
                            {entry.detail}
                          </span>
                        )}
                        {entry.shortcut && (
                          <span className={styles.searchOptionShortcut}>
                            {entry.shortcut}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={styles.searchEmpty}>
              {texts.search.empty.replace("{query}", query.trim())}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
