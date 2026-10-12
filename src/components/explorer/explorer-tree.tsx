"use client";

import {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DatabaseIcon,
  ExpanderIcon,
  FolderIcon,
  ProcedureIcon,
  ServerIcon,
  TableIcon,
} from "@/components/icons";
import { isPlainClick } from "@/components/interaction";
import { ProfileText } from "@/components/connect/profile-text";
import { LocaleText } from "@/components/locale/locale-text";
import {
  type TreeIcon,
  type TreeLabel,
  type TreeNode,
  expandableIds,
  isExpandable,
  isProfileLabel,
  moveForKey,
  visibleNodes,
} from "./tree-model";
import styles from "./object-explorer.module.css";

const INDENT = 18;

const NODE_ICONS: Record<TreeIcon, ReactNode> = {
  server: <ServerIcon />,
  folder: <FolderIcon />,
  database: <DatabaseIcon />,
  table: <TableIcon />,
  procedure: <ProcedureIcon />,
};

function NodeLabel({ label }: Readonly<{ label: TreeLabel }>) {
  if (typeof label === "string") {
    return label;
  }
  return isProfileLabel(label) ? (
    <ProfileText text={label} />
  ) : (
    <LocaleText text={label} />
  );
}

interface ExplorerTreeProps {
  nodes: readonly TreeNode[];
  labelledBy: string;
  selectedId: string | null;
  onActivate: (id: string) => void;
}

export function ExplorerTree({
  nodes,
  labelledBy,
  selectedId,
  onActivate,
}: Readonly<ExplorerTreeProps>) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(expandableIds(nodes)),
  );
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const visible = useMemo(
    () => visibleNodes(nodes, expanded),
    [nodes, expanded],
  );
  const tabStopId =
    [focusedId, selectedId].find((id) =>
      visible.some((node) => node.id === id),
    ) ?? visible[0]?.id;

  function focusNode(id: string) {
    setFocusedId(id);
    itemRefs.current.get(id)?.focus();
  }

  function toggle(id: string) {
    const next = new Set(expanded);
    if (!next.delete(id)) {
      next.add(id);
    }
    setExpanded(next);
    const focusStillVisible = visibleNodes(nodes, next).some(
      (node) => node.id === focusedId,
    );
    if (focusedId !== null && !focusStillVisible) {
      focusNode(id);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || !tabStopId) {
      return;
    }
    const move = moveForKey(event.key, visible, focusedId ?? tabStopId);
    if (!move) {
      return;
    }
    event.preventDefault();
    if (move.type === "focus") {
      focusNode(move.id);
    } else if (move.type === "toggle") {
      toggle(move.id);
    } else {
      onActivate(move.id);
    }
  }

  function handleFocus(event: FocusEvent<HTMLUListElement>) {
    const { nodeId } = (event.target as HTMLElement).dataset;
    if (nodeId) {
      setFocusedId(nodeId);
    }
  }

  function handleBlur(event: FocusEvent<HTMLUListElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setFocusedId(null);
    }
  }

  function keepRef(id: string) {
    return (element: HTMLElement | null) => {
      if (element) {
        itemRefs.current.set(id, element);
      }
      return () => {
        itemRefs.current.delete(id);
      };
    };
  }

  function rowOf(node: TreeNode, isOpen: boolean) {
    return (
      <>
        <span className={styles.expander}>
          {isExpandable(node) && <ExpanderIcon expanded={isOpen} />}
        </span>
        <span className={styles.nodeIcon}>{NODE_ICONS[node.icon]}</span>
        <span className={styles.label}>
          <NodeLabel label={node.label} />
        </span>
      </>
    );
  }

  function indentOf(level: number) {
    return { paddingInlineStart: (level - 1) * INDENT + 2 };
  }

  function openLink(event: MouseEvent, id: string) {
    if (isPlainClick(event)) {
      event.preventDefault();
      onActivate(id);
    }
  }

  function renderNode(node: TreeNode, level: number): ReactNode {
    const expandable = isExpandable(node);
    const isOpen = expandable && expanded.has(node.id);

    if (node.href && !expandable) {
      return (
        <li key={node.id} role="none">
          <a
            ref={keepRef(node.id)}
            href={node.href}
            data-node-id={node.id}
            role="treeitem"
            aria-level={level}
            aria-selected={node.id === selectedId}
            tabIndex={node.id === tabStopId ? 0 : -1}
            className={styles.item}
            onClick={(event) => openLink(event, node.id)}
          >
            <span className={styles.row} style={indentOf(level)}>
              {rowOf(node, false)}
            </span>
          </a>
        </li>
      );
    }

    return (
      <li
        key={node.id}
        ref={keepRef(node.id)}
        data-node-id={node.id}
        role="treeitem"
        aria-level={level}
        aria-expanded={expandable ? isOpen : undefined}
        aria-selected={expandable ? undefined : node.id === selectedId}
        tabIndex={node.id === tabStopId ? 0 : -1}
        className={styles.item}
      >
        <div
          className={styles.row}
          style={indentOf(level)}
          onClick={() => (expandable ? toggle(node.id) : onActivate(node.id))}
        >
          {rowOf(node, isOpen)}
        </div>
        {isOpen && (
          <ul role="group" className={styles.group}>
            {node.children?.map((child) => renderNode(child, level + 1))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <ul
      role="tree"
      aria-labelledby={labelledBy}
      className={styles.tree}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {nodes.map((node) => renderNode(node, 1))}
    </ul>
  );
}
