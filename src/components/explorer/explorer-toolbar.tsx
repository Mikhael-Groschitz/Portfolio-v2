"use client";

import type { ReactNode } from "react";
import { useCommands } from "@/components/commands/command-context";
import {
  ActivityIcon,
  FilterIcon,
  PlugIcon,
  RefreshIcon,
  StopIcon,
} from "@/components/icons";
import { useLanguage } from "@/components/locale/language-context";
import { LocaleText } from "@/components/locale/locale-text";
import { CommandButton } from "@/components/toolbar/command-button";
import { commandMenuItem } from "@/components/toolbar/command-menu-item";
import {
  type RenderedEntry,
  ToolbarStrip,
} from "@/components/toolbar/toolbar-strip";
import { getTexts } from "@/content";
import { type Localized, byLocale } from "@/content/locales";
import type { CommandId } from "@/content/types";
import { ConnectButton, DisconnectButton } from "./explorer-connection";
import styles from "./object-explorer.module.css";

interface ExplorerToolbarProps {
  connectLabel: Localized;
  disconnectLabel: Localized;
}

export function ExplorerToolbar({
  connectLabel,
  disconnectLabel,
}: Readonly<ExplorerToolbarProps>) {
  const commands = useCommands();
  const { locale } = useLanguage();

  function tool(id: CommandId, icon: ReactNode): RenderedEntry {
    return {
      key: id,
      render: () => (
        <CommandButton
          command={id}
          icon={icon}
          unstyled
          className={styles.toolButton}
        />
      ),
      menu: () => [commandMenuItem(commands, id)],
    };
  }

  const entries: RenderedEntry[] = [
    {
      key: "connect",
      render: () => <ConnectButton label={connectLabel} />,
      menu: () => [commandMenuItem(commands, "connect")],
    },
    tool("explorerConnect", <PlugIcon />),
    {
      key: "disconnect",
      render: () => <DisconnectButton label={disconnectLabel} />,
      menu: () => [commandMenuItem(commands, "disconnect")],
    },
    tool("explorerStop", <StopIcon />),
    tool("explorerFilter", <FilterIcon />),
    tool("explorerRefresh", <RefreshIcon />),
    tool("activityMonitor", <ActivityIcon />),
  ];

  return (
    <ToolbarStrip
      label={getTexts(locale).shell.toolbar.explorer}
      moreLabel={
        <LocaleText
          text={byLocale((current) => getTexts(current).shell.toolbar.more)}
        />
      }
      entries={entries}
      variant="panel"
    />
  );
}
