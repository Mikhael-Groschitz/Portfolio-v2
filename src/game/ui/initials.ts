import { RANKING } from "../balance";

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const LETTER = /^[A-Z]$/;

export function emptyInitials(): string[] {
  return Array.from({ length: RANKING.nameLength }, () => "");
}

export function toLetter(typed: string): string | null {
  const plain = typed.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
  return LETTER.test(plain) ? plain : null;
}

export function typedLetter(previous: string, value: string): string | null {
  const typed =
    previous !== "" && value.length > 1 ? value.replace(previous, "") : value;
  return toLetter(typed.slice(-1));
}

export function cycleLetter(letter: string, step: 1 | -1): string {
  const index = LETTERS.indexOf(letter);
  if (letter === "" || index === -1) {
    return step === 1 ? LETTERS[0] : LETTERS[LETTERS.length - 1];
  }
  return LETTERS[(index + step + LETTERS.length) % LETTERS.length];
}

export function initialsName(letters: readonly string[]): string | null {
  return letters.length === RANKING.nameLength &&
    letters.every((letter) => LETTER.test(letter))
    ? letters.join("")
    : null;
}

export function firstEmpty(letters: readonly string[]): number {
  const index = letters.indexOf("");
  return index === -1 ? letters.length - 1 : index;
}
