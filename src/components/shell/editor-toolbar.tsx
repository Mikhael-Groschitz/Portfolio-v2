"use client";

import type { ReactNode } from "react";
import { useCommands } from "@/components/commands/command-context";
import { useConnectionStatus } from "@/components/connect/use-connection-status";
import { EXECUTE_SHORTCUTS } from "@/components/editor/editor-keys";
import { useEasterEggs } from "@/components/easter-eggs/easter-egg-context";
import {
  ActualPlanIcon,
  ClientStatisticsIcon,
  CommentIcon,
  DecreaseIndentIcon,
  DisconnectIcon,
  EstimatedPlanIcon,
  ExecuteIcon,
  IncreaseIndentIcon,
  LiveStatisticsIcon,
  ParseIcon,
  PlugIcon,
  QueryDesignerIcon,
  QueryOptionsIcon,
  ResultsFileIcon,
  ResultsGridIcon,
  ResultsTextIcon,
  StopIcon,
  TemplateParametersIcon,
  UncommentIcon,
} from "@/components/icons";
import { useLanguage } from "@/components/locale/language-context";
import { LocaleText } from "@/components/locale/locale-text";
import type { PopupMenuItem } from "@/components/menu/menu-button";
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
import { DATABASE, V1_DATABASE } from "@/engine/catalog";
import { DatabaseSelect } from "./database-select";
import { useWorkspace } from "./workspace-context";
import layout from "./toolbar.module.css";

export function EditorToolbar() {
  const commands = useCommands();
  const { activeDocument } = useWorkspace();
  const { traveling } = useEasterEggs();
  const connected = useConnectionStatus() === "connected";
  const { locale } = useLanguage();
  const texts = getTexts(locale).shell;

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

  function databaseItem(): PopupMenuItem {
    const database = traveling ? V1_DATABASE : DATABASE;
    return {
      key: "database",
      label: texts.toolbar.database.replace("{database}", database),
      role: "menuitemradio",
      checked: true,
      disabled: !connected || activeDocument === null,
    };
  }

  const entries: RenderedEntry[] = [
    button("editorConnect", <PlugIcon />),
    button("editorDisconnect", <DisconnectIcon />),
    { key: "connection", separator: true },
    {
      key: "database",
      render: () => (
        <label className={styles.database}>
          <span className="visually-hidden">
            <LocaleText
              text={byLocale(
                (current) => getTexts(current).shell.toolbar.databases,
              )}
            />
          </span>
          <DatabaseSelect />
        </label>
      ),
      menu: () => [databaseItem()],
    },
    { key: "run", separator: true },
    {
      key: "execute",
      essential: true,
      render: () => (
        <CommandButton
          command="execute"
          icon={<ExecuteIcon />}
          labelMode="visible"
          keyShortcuts={EXECUTE_SHORTCUTS}
          className={styles.execute}
        />
      ),
      menu: () => [item("execute")],
    },
    button("cancelQuery", <StopIcon />),
    button("parse", <ParseIcon />),
    button("estimatedPlan", <EstimatedPlanIcon />),
    button("queryDesigner", <QueryDesignerIcon />),
    button("queryOptions", <QueryOptionsIcon />),
    { key: "statistics", separator: true },
    button("actualPlan", <ActualPlanIcon />),
    button("liveStatistics", <LiveStatisticsIcon />),
    button("clientStatistics", <ClientStatisticsIcon />),
    { key: "destination", separator: true },
    button("resultsToText", <ResultsTextIcon />),
    button("resultsToGrid", <ResultsGridIcon />),
    button("resultsToFile", <ResultsFileIcon />),
    { key: "comments", separator: true },
    button("commentLines", <CommentIcon />),
    button("uncommentLines", <UncommentIcon />),
    { key: "indentation", separator: true },
    button("decreaseIndent", <DecreaseIndentIcon />),
    button("increaseIndent", <IncreaseIndentIcon />),
    { key: "templates", separator: true },
    button("templateParameters", <TemplateParametersIcon />),
  ];

  return (
    <ToolbarStrip
      label={texts.toolbar.sqlEditor}
      moreLabel={
        <LocaleText
          text={byLocale((current) => getTexts(current).shell.toolbar.more)}
        />
      }
      entries={entries}
      trailing={() => [item("customizeToolbar")]}
      collapse
      className={layout.editor}
    />
  );
}
