"use client";

import { EXPLORER_PANEL_ID } from "@/components/shell/element-ids";
import { useShell } from "@/components/shell/shell-frame";
import {
  ToolWindowControls,
  type ToolWindowText,
} from "@/components/shell/tool-window-controls";
import type { Localized } from "@/content/locales";

export function ExplorerControls({
  text,
}: Readonly<{ text: Localized<ToolWindowText> }>) {
  const { hideExplorer } = useShell();

  return (
    <ToolWindowControls
      windowId="explorer"
      panelId={EXPLORER_PANEL_ID}
      text={text}
      onClose={hideExplorer}
    />
  );
}
