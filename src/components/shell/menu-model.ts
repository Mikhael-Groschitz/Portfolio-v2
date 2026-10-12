import {
  MENUS,
  type MenuDefinition,
} from "@/components/commands/command-model";
import type { MenuId } from "@/content/types";

export const MORE_MENUS = "more";

export type MenuTriggerId = MenuId | typeof MORE_MENUS;

type TriggerVisibility = "compact" | "wide" | "always";

export interface MenuTrigger {
  id: MenuTriggerId;
  visibility: TriggerVisibility;
  menus: readonly MenuDefinition[];
}

const PINNED_MENU: MenuId = "help";

export const MENU_TRIGGERS: readonly MenuTrigger[] = [
  {
    id: MORE_MENUS,
    visibility: "compact",
    menus: MENUS.filter((menu) => menu.id !== PINNED_MENU),
  },
  ...MENUS.map((menu): MenuTrigger => ({
    id: menu.id,
    visibility: menu.id === PINNED_MENU ? "always" : "wide",
    menus: [menu],
  })),
];

const FIRST_TRIGGER: Record<
  Exclude<TriggerVisibility, "always">,
  MenuTriggerId
> = {
  compact: MORE_MENUS,
  wide: MENUS[0].id,
};

export function isTabStop(
  id: MenuTriggerId,
  focusedId: MenuTriggerId | null,
): boolean {
  const focused = MENU_TRIGGERS.find((trigger) => trigger.id === focusedId);
  if (!focused) {
    return Object.values(FIRST_TRIGGER).includes(id);
  }
  if (id === focused.id) {
    return true;
  }
  if (focused.visibility === "compact") {
    return id === FIRST_TRIGGER.wide;
  }
  if (focused.visibility === "wide") {
    return id === FIRST_TRIGGER.compact;
  }
  return false;
}
