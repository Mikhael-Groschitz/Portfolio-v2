export interface Match {
  start: number;
  end: number;
}

type MarkKind = "match" | "current";

interface Segment {
  text: string;
  mark: MarkKind | null;
}

export function findMatches(text: string, query: string): Match[] {
  if (query === "") {
    return [];
  }
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  const matches: Match[] = [];
  let from = haystack.indexOf(needle);
  while (from !== -1) {
    matches.push({ start: from, end: from + needle.length });
    from = haystack.indexOf(needle, from + needle.length);
  }
  return matches;
}

export function matchAfter(matches: readonly Match[], offset: number): number {
  if (matches.length === 0) {
    return -1;
  }
  const index = matches.findIndex((match) => match.start >= offset);
  return index === -1 ? 0 : index;
}

export function stepMatch(
  matches: readonly Match[],
  current: number,
  direction: -1 | 1,
): number {
  if (matches.length === 0) {
    return -1;
  }
  return (current + direction + matches.length) % matches.length;
}

export function markSegments(
  text: string,
  matches: readonly Match[],
  current: number,
): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  matches.forEach((match, index) => {
    if (match.start > cursor) {
      segments.push({ text: text.slice(cursor, match.start), mark: null });
    }
    segments.push({
      text: text.slice(match.start, match.end),
      mark: index === current ? "current" : "match",
    });
    cursor = match.end;
  });
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), mark: null });
  }
  return segments;
}
