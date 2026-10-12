import type { CommandsValue } from "@/components/commands/command-context";
import { COMMANDS, shortcutText } from "@/components/commands/command-model";
import type { PopupMenuItem } from "@/components/menu/menu-button";
import type { MenuItemRole } from "@/components/menu/menu-item";
import type { CommandId } from "@/content/types";

export function commandItemRole(
  id: CommandId,
  checked: boolean | undefined,
): MenuItemRole {
  if (checked === undefined) {
    return "menuitem";
  }
  return COMMANDS[id].format ? "menuitemradio" : "menuitemcheckbox";
}

export function commandMenuItem(
  commands: CommandsValue,
  id: CommandId,
): PopupMenuItem {
  const checked = commands.isChecked(id);
  return {
    key: id,
    label: commands.label(id),
    role: commandItemRole(id, checked),
    checked,
    disabled: !commands.isEnabled(id),
    shortcut: shortcutText(id),
    onSelect: () => commands.run(id),
  };
}
