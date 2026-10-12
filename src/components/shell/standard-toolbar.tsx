"use client";

import type { ReactNode } from "react";
import { useGuide } from "@/components/cheatsheet/guide-context";
import { useCommands } from "@/components/commands/command-context";
import {
  ActivityIcon,
  ChevronIcon,
  DeployIcon,
  EngineQueryIcon,
  NavigateBackIcon,
  NavigateForwardIcon,
  NewQueryIcon,
  OpenFileIcon,
  RedoIcon,
  SaveAllIcon,
  SaveIcon,
  UndoIcon,
} from "@/components/icons";
import { useLanguage } from "@/components/locale/language-context";
import { LocaleText } from "@/components/locale/locale-text";
import { MenuButton, type PopupMenuItem } from "@/components/menu/menu-button";
import { CommandButton } from "@/components/toolbar/command-button";
import { commandMenuItem } from "@/components/toolbar/command-menu-item";
import {
  type RenderedEntry,
  ToolbarStrip,
} from "@/components/toolbar/toolbar-strip";
import styles from "@/components/toolbar/toolbar.module.css";
import { getTexts } from "@/content";
import { byLocale } from "@/content/locales";
import type { CommandId } from "@/content/types";
import { ExplorerToggle } from "./explorer-toggle";
import { backVisits } from "./navigation-history";
import { documentFileName, isQueryDocument } from "./section-routes";
import { useWorkspace } from "./workspace-context";
import layout from "./toolbar.module.css";

type ListLabel = "backList" | "openList" | "undoList" | "redoList";

interface SplitProps {
  command: CommandId;
  icon: ReactNode;
  list: ListLabel;
  items: () => readonly PopupMenuItem[];
  disabled: boolean;
}

function SplitButton({
  command,
  icon,
  list,
  items,
  disabled,
}: Readonly<SplitProps>) {
  return (
    <>
      <CommandButton command={command} icon={icon} />
      <MenuButton
        label={
          <LocaleText
            text={byLocale((locale) => getTexts(locale).shell.toolbar[list])}
          />
        }
        className={`${styles.button} ${styles.caret}`}
        items={items}
        disabled={disabled}
        triggerData={{ "data-list": command }}
      >
        <ChevronIcon direction="down" size={12} />
      </MenuButton>
    </>
  );
}

export function StandardToolbar() {
  const commands = useCommands();
  const { activeDocument, queryStore, visits, navigate } = useWorkspace();
  const { pulse } = useGuide();
  const { locale } = useLanguage();
  const texts = getTexts(locale).shell;
  const store =
    activeDocument !== null && isQueryDocument(activeDocument)
      ? queryStore(activeDocument)
      : null;

  function item(id: CommandId): PopupMenuItem {
    return commandMenuItem(commands, id);
  }

  function button(id: CommandId, icon: ReactNode): RenderedEntry {
    return {
      key: id,
      render: () => <CommandButton command={id} icon={icon} />,
      menu: () => [item(id)],
    };
  }

  function backItems(): PopupMenuItem[] {
    return backVisits(visits).map(({ document, index }) => ({
      key: `${document}-${index}`,
      label: documentFileName(document),
      onSelect: () => navigate(index),
    }));
  }

  function historyItems(direction: "undo" | "redo"): PopupMenuItem[] {
    if (!store) {
      return [];
    }
    return store.getHistoryActions()[direction].map((action, index) => ({
      key: `${direction}-${index}`,
      label: texts.editor.actions[action],
      onSelect: () => {
        store[direction](index + 1);
        store.requestFocus();
      },
    }));
  }

  const entries: RenderedEntry[] = [
    {
      key: "explorer",
      compactOnly: true,
      essential: true,
      render: () => (
        <ExplorerToggle
          label={byLocale((current) => getTexts(current).shell.explorer.title)}
        />
      ),
    },
    {
      key: "back",
      render: () => (
        <SplitButton
          command="navigateBackward"
          icon={<NavigateBackIcon />}
          list="backList"
          items={backItems}
          disabled={!commands.isEnabled("navigateBackward")}
        />
      ),
      menu: () => [item("navigateBackward")],
    },
    button("navigateForward", <NavigateForwardIcon />),
    { key: "files", separator: true },
    {
      key: "open",
      render: () => (
        <SplitButton
          command="openFile"
          icon={<OpenFileIcon />}
          list="openList"
          items={() => [item("openFile"), item("openFolder")]}
          disabled={!commands.isEnabled("openFile")}
        />
      ),
      menu: () => [item("openFile"), item("openFolder")],
    },
    button("save", <SaveIcon />),
    button("saveAll", <SaveAllIcon />),
    { key: "queries", separator: true },
    {
      key: "newQuery",
      essential: true,
      render: () => (
        <CommandButton
          command="newQuery"
          icon={<NewQueryIcon />}
          labelMode="visible"
          data={{
            "data-tour": "new-query",
            "data-highlight": pulse ? "" : undefined,
          }}
        />
      ),
      menu: () => [item("newQuery")],
    },
    button("databaseEngineQuery", <EngineQueryIcon />),
    { key: "history", separator: true },
    {
      key: "undo",
      render: () => (
        <SplitButton
          command="undo"
          icon={<UndoIcon />}
          list="undoList"
          items={() => historyItems("undo")}
          disabled={!commands.isEnabled("undo")}
        />
      ),
      menu: () => [item("undo")],
    },
    {
      key: "redo",
      render: () => (
        <SplitButton
          command="redo"
          icon={<RedoIcon />}
          list="redoList"
          items={() => historyItems("redo")}
          disabled={!commands.isEnabled("redo")}
        />
      ),
      menu: () => [item("redo")],
    },
    { key: "monitor", separator: true },
    button("activityMonitor", <ActivityIcon />),
    { key: "deployment", separator: true },
    button("deploy", <DeployIcon />),
  ];

  return (
    <ToolbarStrip
      label={texts.toolbar.standard}
      moreLabel={
        <LocaleText
          text={byLocale((current) => getTexts(current).shell.toolbar.more)}
        />
      }
      entries={entries}
      compactExtras={() => [item("contact"), item("share")]}
      trailing={() => [item("customizeToolbar")]}
      collapse
      className={layout.standard}
    />
  );
}
