import { formatCount } from "@/content/format";
import type { ResultsText } from "@/content/types";
import type { Cell, ResultSet } from "@/engine/execute";

const NULL_TEXT = "NULL";

function cellText(cell: Cell): string {
  return cell.kind === "null" ? NULL_TEXT : cell.text.replace(/\s+/g, " ");
}

function resultSetText(set: ResultSet, text: ResultsText): string {
  const header = set.columns.map((column) => column.name);
  const rows = set.rows.map((row) => row.map(cellText));
  const widths = header.map((name, index) =>
    Math.max(name.length, ...rows.map((row) => row[index].length)),
  );
  const line = (cells: readonly string[]) =>
    cells
      .map((cell, index) => cell.padEnd(widths[index]))
      .join(" ")
      .trimEnd();
  return [
    line(header),
    widths.map((width) => "-".repeat(width)).join(" "),
    ...rows.map(line),
    "",
    formatCount(text.rowsAffected, set.rows.length),
  ].join("\n");
}

export function resultsAsText(
  sets: readonly ResultSet[],
  text: ResultsText,
): string {
  return sets.map((set) => resultSetText(set, text)).join("\n\n");
}
