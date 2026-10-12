type SearchGroup = "sections" | "commands" | "examples";

export interface SearchEntry {
  key: string;
  group: SearchGroup;
  label: string;
  detail?: string;
  shortcut?: string;
}

export const SEARCH_GROUPS: readonly SearchGroup[] = [
  "sections",
  "commands",
  "examples",
];

const MAX_RESULTS = 12;

export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function score(entry: SearchEntry, words: readonly string[]): number {
  const label = normalizeSearch(entry.label);
  const haystack = `${label} ${normalizeSearch(entry.detail ?? "")}`;
  if (!words.every((word) => haystack.includes(word))) {
    return -1;
  }
  if (label.startsWith(words[0])) {
    return 2;
  }
  return words.every((word) => label.includes(word)) ? 1 : 0;
}

export function searchEntries<T extends SearchEntry>(
  entries: readonly T[],
  query: string,
): T[] {
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  if (words.length === 0) {
    return entries.slice(0, MAX_RESULTS);
  }
  return entries
    .map((entry, index) => ({ entry, index, score: score(entry, words) }))
    .filter((match) => match.score >= 0)
    .sort(
      (a, b) =>
        SEARCH_GROUPS.indexOf(a.entry.group) -
          SEARCH_GROUPS.indexOf(b.entry.group) ||
        b.score - a.score ||
        a.index - b.index,
    )
    .slice(0, MAX_RESULTS)
    .map((match) => match.entry);
}

export function searchShortcutFor(platform: string): string | null {
  return /linux/i.test(platform) && !/android/i.test(platform)
    ? null
    : "Ctrl+Q";
}
