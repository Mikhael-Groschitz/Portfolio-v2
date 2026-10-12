import type { QuerySnapshot } from "./query-store";

export type LineCommand = "comment" | "uncomment" | "indent" | "outdent";

interface LineEdit {
  at: number;
  remove: number;
  insert: string;
}

interface Line {
  start: number;
  text: string;
}

const COMMENT_MARK = "--";
const INDENT = "    ";
const COMMENTED = /^(\s*)--/;
const LEADING = /^( {1,4}|\t)/;

function lineIndexAt(text: string, offset: number): number {
  return text.slice(0, offset).split("\n").length - 1;
}

function linesOf(text: string): Line[] {
  let start = 0;
  return text.split("\n").map((line) => {
    const entry = { start, text: line };
    start += line.length + 1;
    return entry;
  });
}

function editFor(
  command: LineCommand,
  line: Line,
  skipBlank: boolean,
): LineEdit | null {
  if (skipBlank && line.text.trim() === "") {
    return null;
  }
  switch (command) {
    case "comment":
      return { at: line.start, remove: 0, insert: COMMENT_MARK };
    case "indent":
      return { at: line.start, remove: 0, insert: INDENT };
    case "uncomment": {
      const match = COMMENTED.exec(line.text);
      return match
        ? {
            at: line.start + match[1].length,
            remove: COMMENT_MARK.length,
            insert: "",
          }
        : null;
    }
    case "outdent": {
      const match = LEADING.exec(line.text);
      return match
        ? { at: line.start, remove: match[0].length, insert: "" }
        : null;
    }
  }
}

function mapOffset(offset: number, edits: readonly LineEdit[]): number {
  let shift = 0;
  for (const edit of edits) {
    if (offset >= edit.at + edit.remove) {
      shift += edit.insert.length - edit.remove;
    } else if (offset > edit.at) {
      shift += edit.at - offset;
    }
  }
  return offset + shift;
}

export function applyLineCommand(
  snapshot: QuerySnapshot,
  command: LineCommand,
): QuerySnapshot | null {
  const { text, selectionStart, selectionEnd } = snapshot;
  const selected = selectionEnd > selectionStart;
  const endsAtLineStart = selected && text[selectionEnd - 1] === "\n";
  const first = lineIndexAt(text, selectionStart);
  const last = lineIndexAt(
    text,
    endsAtLineStart ? selectionEnd - 1 : selectionEnd,
  );
  const lines = linesOf(text).slice(first, last + 1);
  const edits = lines
    .map((line) => editFor(command, line, lines.length > 1))
    .filter((edit): edit is LineEdit => edit !== null);
  if (edits.length === 0) {
    return null;
  }
  let next = text;
  for (const edit of [...edits].reverse()) {
    next =
      next.slice(0, edit.at) + edit.insert + next.slice(edit.at + edit.remove);
  }
  if (!selected) {
    const caret = mapOffset(selectionStart, edits);
    return { text: next, selectionStart: caret, selectionEnd: caret };
  }
  const firstLine = lines[0];
  const lastLine = lines.at(-1) ?? firstLine;
  return {
    text: next,
    selectionStart: firstLine.start,
    selectionEnd: mapOffset(lastLine.start + lastLine.text.length, edits),
  };
}
