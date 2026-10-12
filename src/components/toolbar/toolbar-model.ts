import type { PopupMenuItem } from "@/components/menu/menu-button";

export interface ToolbarEntry {
  key: string;
  separator?: boolean;
  essential?: boolean;
  compactOnly?: boolean;
  menu?: () => readonly PopupMenuItem[];
}

export interface EntryLayout {
  key: string;
  separator: boolean;
  shown: boolean;
}

export function hiddenEntries(layout: readonly EntryLayout[]): Set<string> {
  const hidden = new Set<string>();
  let seenEntry = false;
  let pending: string | null = null;
  for (const { key, separator, shown } of layout) {
    if (separator) {
      if (pending !== null) {
        hidden.add(pending);
      }
      pending = seenEntry ? key : null;
      if (!seenEntry) {
        hidden.add(key);
      }
      continue;
    }
    if (!shown) {
      hidden.add(key);
      continue;
    }
    seenEntry = true;
    pending = null;
  }
  if (pending !== null) {
    hidden.add(pending);
  }
  return hidden;
}

function joined(
  groups: readonly (readonly PopupMenuItem[])[],
): PopupMenuItem[] {
  return groups
    .filter((group) => group.length > 0)
    .flatMap((group, index) =>
      group.map((item, position) =>
        index > 0 && position === 0 ? { ...item, separatorBefore: true } : item,
      ),
    );
}

export function overflowMenu(
  entries: readonly ToolbarEntry[],
  hidden: ReadonlySet<string>,
  extras: readonly (readonly PopupMenuItem[])[] = [],
): PopupMenuItem[] {
  const groups: PopupMenuItem[][] = [[]];
  for (const entry of entries) {
    if (entry.separator) {
      groups.push([]);
    } else if (hidden.has(entry.key) && !entry.compactOnly && entry.menu) {
      groups[groups.length - 1].push(...entry.menu());
    }
  }
  return joined([...groups, ...extras]);
}
