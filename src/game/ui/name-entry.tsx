import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { TYPING_ATTRIBUTE } from "../core/input";
import {
  cycleLetter,
  emptyInitials,
  firstEmpty,
  initialsName,
  typedLetter,
} from "./initials";
import { type GameTexts, fill } from "./texts";
import type { EntryProblem } from "./victory-flow";
import styles from "./game.module.css";

interface NameEntryProps {
  text: GameTexts;
  place: string;
  time: string;
  saving: boolean;
  problem: EntryProblem | null;
  confirming: boolean;
  onSave: (name: string) => void;
  onIncomplete: () => void;
  onEscape: () => void;
  onKeep: () => void;
  onExit: () => void;
}

export function NameEntry({
  text,
  place,
  time,
  saving,
  problem,
  confirming,
  onSave,
  onIncomplete,
  onEscape,
  onKeep,
  onExit,
}: Readonly<NameEntryProps>) {
  const record = text.record;
  const titleId = useId();
  const [letters, setLetters] = useState(emptyInitials);
  const slots = useRef<(HTMLInputElement | null)[]>([]);
  const saveRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const lettersRef = useRef(letters);
  const wasConfirming = useRef(false);

  useEffect(() => {
    lettersRef.current = letters;
  }, [letters]);

  useEffect(() => {
    slots.current[0]?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (confirming) {
      keepRef.current?.focus({ preventScroll: true });
      wasConfirming.current = true;
    } else if (wasConfirming.current) {
      wasConfirming.current = false;
      slots.current[firstEmpty(lettersRef.current)]?.focus({
        preventScroll: true,
      });
    }
  }, [confirming]);

  useEffect(() => {
    if (problem === "failed") {
      saveRef.current?.focus({ preventScroll: true });
    } else if (problem !== null) {
      const index = problem === "refused" ? 0 : firstEmpty(lettersRef.current);
      slots.current[index]?.focus({ preventScroll: true });
    }
  }, [problem]);

  function focusSlot(index: number) {
    slots.current[index]?.focus({ preventScroll: true });
  }

  function setLetter(index: number, letter: string) {
    setLetters((current) =>
      current.map((value, slot) => (slot === index ? letter : value)),
    );
  }

  function save() {
    if (saving) {
      return;
    }
    const name = initialsName(letters);
    if (name) {
      onSave(name);
    } else {
      onIncomplete();
      focusSlot(firstEmpty(letters));
    }
  }

  function change(index: number, event: ChangeEvent<HTMLInputElement>) {
    if (saving) {
      return;
    }
    if (event.target.value === "") {
      setLetter(index, "");
      return;
    }
    const letter = typedLetter(letters[index], event.target.value);
    if (!letter) {
      return;
    }
    setLetter(index, letter);
    if (index < letters.length - 1) {
      focusSlot(index + 1);
    }
  }

  function slotKey(index: number, event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowUp":
      case "ArrowDown":
        event.preventDefault();
        if (!saving) {
          setLetter(
            index,
            cycleLetter(letters[index], event.key === "ArrowUp" ? 1 : -1),
          );
        }
        return;
      case "ArrowLeft":
        event.preventDefault();
        focusSlot(Math.max(index - 1, 0));
        return;
      case "ArrowRight":
        event.preventDefault();
        focusSlot(Math.min(index + 1, letters.length - 1));
        return;
      case "Backspace":
        event.preventDefault();
        if (saving) {
          return;
        }
        if (letters[index] !== "") {
          setLetter(index, "");
        } else if (index > 0) {
          setLetter(index - 1, "");
          focusSlot(index - 1);
        }
        return;
      default:
        return;
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save();
  }

  function cardKey(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Escape") {
      return;
    }
    event.preventDefault();
    onEscape();
  }

  let saveLabel = record.save;
  if (saving) {
    saveLabel = record.saving;
  } else if (problem === "failed") {
    saveLabel = record.retry;
  }

  return (
    <div className={styles.panel}>
      <form
        className={styles.record}
        aria-labelledby={titleId}
        onSubmit={submit}
        onKeyDown={cardKey}
        {...{ [TYPING_ATTRIBUTE]: "" }}
      >
        <p id={titleId} className={styles.recordTitle}>
          {record.title}
        </p>
        <p className={styles.recordPlace}>
          {fill(record.place, { place, time })}
        </p>
        <p>{record.invite}</p>
        <fieldset className={styles.initials}>
          <legend className="visually-hidden">{record.initials}</legend>
          {letters.map((letter, index) => (
            <input
              key={index}
              ref={(element) => {
                slots.current[index] = element;
              }}
              className={styles.initial}
              value={letter}
              readOnly={saving}
              aria-label={fill(record.letter, {
                n: index + 1,
                total: letters.length,
              })}
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => change(index, event)}
              onKeyDown={(event) => slotKey(index, event)}
            />
          ))}
        </fieldset>
        <p className={styles.recordHelp}>{record.help}</p>
        {problem && (
          <p className={styles.recordProblem}>{record.problems[problem]}</p>
        )}
        {confirming ? (
          <div className={styles.actions}>
            <p className={styles.recordConfirm}>{record.confirm}</p>
            <button
              ref={keepRef}
              type="button"
              className={styles.primary}
              onClick={onKeep}
            >
              <kbd className={styles.key}>Enter</kbd> {record.keep}
            </button>
            <button type="button" className={styles.secondary} onClick={onExit}>
              <kbd className={styles.key}>Esc</kbd> {record.leave}
            </button>
          </div>
        ) : (
          <div className={styles.actions}>
            <button
              ref={saveRef}
              type="submit"
              className={styles.primary}
              aria-disabled={saving || undefined}
            >
              <kbd className={styles.key}>Enter</kbd> {saveLabel}
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={onEscape}
            >
              <kbd className={styles.key}>Esc</kbd> {record.leave}
            </button>
          </div>
        )}
        <p className={styles.recordPrivacy}>{record.privacy}</p>
      </form>
    </div>
  );
}
