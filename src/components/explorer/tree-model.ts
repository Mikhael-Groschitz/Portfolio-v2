import type { Localized } from "@/content/locales";
import { type ByProfile, PROFILES } from "@/content/profiles";

export type TreeIcon = "server" | "folder" | "database" | "table" | "procedure";

export type TreeLabel = string | Localized | ByProfile<Localized>;

export function isProfileLabel(
  label: TreeLabel,
): label is ByProfile<Localized> {
  return (
    typeof label === "object" && PROFILES.every((profile) => profile in label)
  );
}

export interface TreeNode {
  id: string;
  label: TreeLabel;
  icon: TreeIcon;
  href?: string;
  children?: readonly TreeNode[];
}

interface VisibleNode {
  id: string;
  parentId: string | null;
  expandable: boolean;
  expanded: boolean;
}

type TreeMove =
  | { type: "focus"; id: string }
  | { type: "toggle"; id: string }
  | { type: "activate"; id: string };

export function isExpandable(node: TreeNode): boolean {
  return (node.children?.length ?? 0) > 0;
}

export function expandableIds(nodes: readonly TreeNode[]): string[] {
  return nodes.flatMap((node) =>
    isExpandable(node) ? [node.id, ...expandableIds(node.children ?? [])] : [],
  );
}

export function visibleNodes(
  nodes: readonly TreeNode[],
  expanded: ReadonlySet<string>,
  parentId: string | null = null,
): VisibleNode[] {
  return nodes.flatMap((node) => {
    const expandable = isExpandable(node);
    const isOpen = expandable && expanded.has(node.id);
    const entry: VisibleNode = {
      id: node.id,
      parentId,
      expandable,
      expanded: isOpen,
    };
    return isOpen
      ? [entry, ...visibleNodes(node.children ?? [], expanded, node.id)]
      : [entry];
  });
}

export function moveForKey(
  key: string,
  visible: readonly VisibleNode[],
  currentId: string,
): TreeMove | null {
  const index = visible.findIndex((node) => node.id === currentId);
  const current = visible[index];
  if (!current) {
    return null;
  }

  switch (key) {
    case "ArrowDown":
      return index < visible.length - 1
        ? { type: "focus", id: visible[index + 1].id }
        : null;
    case "ArrowUp":
      return index > 0 ? { type: "focus", id: visible[index - 1].id } : null;
    case "Home":
      return { type: "focus", id: visible[0].id };
    case "End":
      return { type: "focus", id: visible[visible.length - 1].id };
    case "ArrowRight":
      if (!current.expandable) {
        return null;
      }
      return current.expanded
        ? { type: "focus", id: visible[index + 1].id }
        : { type: "toggle", id: current.id };
    case "ArrowLeft":
      if (current.expanded) {
        return { type: "toggle", id: current.id };
      }
      return current.parentId === null
        ? null
        : { type: "focus", id: current.parentId };
    case "Enter":
    case " ":
      return current.expandable
        ? { type: "toggle", id: current.id }
        : { type: "activate", id: current.id };
    default:
      return null;
  }
}
