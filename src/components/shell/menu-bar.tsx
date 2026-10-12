"use client";

import {
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useCommands } from "@/components/commands/command-context";
import {
  arrowTarget,
  useOutsidePointerDown,
  wrapIndex,
} from "@/components/interaction";
import {
  COMMANDS,
  type MenuDefinition,
  type MenuEntry,
  isMenuCommand,
  isMenuShown,
  shortcutText,
} from "@/components/commands/command-model";
import { MenuIcon } from "@/components/icons";
import { useLanguage } from "@/components/locale/language-context";
import { LocaleText } from "@/components/locale/locale-text";
import {
  MenuItem,
  MenuSeparator,
  menuItemsIn,
} from "@/components/menu/menu-item";
import { commandItemRole } from "@/components/toolbar/command-menu-item";
import { type Localized, mapLocalized } from "@/content/locales";
import type { CommandId, MenuText } from "@/content/types";
import {
  MENU_TRIGGERS,
  MORE_MENUS,
  type MenuTrigger,
  type MenuTriggerId,
  isTabStop,
} from "./menu-model";
import styles from "./menu-bar.module.css";

type ItemFocus = "first" | "last";

interface MenuBarProps {
  text: Localized<MenuText>;
}

const VISIBILITY_CLASS: Record<MenuTrigger["visibility"], string> = {
  compact: styles.compactOnly,
  wide: styles.wideOnly,
  always: "",
};

function focusItem(container: HTMLElement | null, itemFocus: ItemFocus) {
  const items = menuItemsIn(container);
  (itemFocus === "first" ? items[0] : items.at(-1))?.focus();
}

export function MenuBar({ text }: Readonly<MenuBarProps>) {
  const { locale } = useLanguage();
  const commands = useCommands();
  const baseId = useId();
  const [openId, setOpenId] = useState<MenuTriggerId | null>(null);
  const [focusedId, setFocusedId] = useState<MenuTriggerId | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef(new Map<MenuTriggerId, HTMLButtonElement>());
  const itemFocusRef = useRef<ItemFocus>("first");
  const shownMenus = (trigger: MenuTrigger): MenuDefinition[] =>
    trigger.menus.filter((menu) => isMenuShown(menu, commands.context));
  const triggers = MENU_TRIGGERS.filter(
    (trigger) => shownMenus(trigger).length > 0,
  );

  useEffect(() => {
    if (openId !== null) {
      focusItem(popupRef.current, itemFocusRef.current);
    }
  }, [openId]);

  useOutsidePointerDown(rootRef, openId !== null, () => setOpenId(null));

  function openMenu(id: MenuTriggerId, itemFocus: ItemFocus = "first") {
    if (openId === id) {
      focusItem(popupRef.current, itemFocus);
      return;
    }
    itemFocusRef.current = itemFocus;
    setOpenId(id);
  }

  function focusTrigger(id: MenuTriggerId) {
    triggerRefs.current.get(id)?.focus();
  }

  function moveTrigger(fromId: MenuTriggerId, step: number | ItemFocus) {
    const visible = MENU_TRIGGERS.filter(
      (trigger) =>
        (triggerRefs.current.get(trigger.id)?.getClientRects().length ?? 0) > 0,
    );
    const index = visible.findIndex((trigger) => trigger.id === fromId);
    let target: MenuTrigger | undefined;
    if (step === "first") {
      target = visible[0];
    } else if (step === "last") {
      target = visible.at(-1);
    } else {
      target = visible[wrapIndex(index + step, visible.length)];
    }
    if (!target) {
      return;
    }
    focusTrigger(target.id);
    if (openId !== null) {
      openMenu(target.id);
    }
  }

  function activate(id: CommandId, trigger: MenuTrigger) {
    if (!commands.isEnabled(id)) {
      return;
    }
    commands.run(id);
    const focusStayed =
      popupRef.current?.contains(document.activeElement) ?? false;
    setOpenId(null);
    if (focusStayed) {
      focusTrigger(trigger.id);
    }
  }

  function handleTriggerKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    trigger: MenuTrigger,
  ) {
    switch (event.key) {
      case "ArrowRight":
        moveTrigger(trigger.id, 1);
        break;
      case "ArrowLeft":
        moveTrigger(trigger.id, -1);
        break;
      case "Home":
        moveTrigger(trigger.id, "first");
        break;
      case "End":
        moveTrigger(trigger.id, "last");
        break;
      case "ArrowDown":
        openMenu(trigger.id, "first");
        break;
      case "ArrowUp":
        openMenu(trigger.id, "last");
        break;
      case "Escape":
        if (openId === null) {
          return;
        }
        setOpenId(null);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  function handlePopupKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    trigger: MenuTrigger,
  ) {
    const items = menuItemsIn(popupRef.current);
    const index = items.findIndex((item) => item === document.activeElement);
    const target = arrowTarget(event.key, index, items.length, "vertical");
    if (target !== undefined) {
      event.preventDefault();
      items[target]?.focus();
      return;
    }
    switch (event.key) {
      case "ArrowRight":
        moveTrigger(trigger.id, 1);
        break;
      case "ArrowLeft":
        moveTrigger(trigger.id, -1);
        break;
      case "Escape":
        setOpenId(null);
        focusTrigger(trigger.id);
        break;
      case "Tab":
        setOpenId(null);
        return;
      default:
        return;
    }
    event.preventDefault();
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (
      event.relatedTarget &&
      !rootRef.current?.contains(event.relatedTarget)
    ) {
      setOpenId(null);
    }
  }

  function renderItem(id: CommandId, trigger: MenuTrigger) {
    const checked = commands.isChecked(id);
    return (
      <MenuItem
        key={id}
        label={commands.label(id)}
        role={commandItemRole(id, checked)}
        checked={checked}
        disabled={!commands.isEnabled(id)}
        shortcut={shortcutText(id)}
        keyShortcuts={COMMANDS[id].shortcut}
        data={{ "data-command": id }}
        onClick={() => activate(id, trigger)}
      />
    );
  }

  function renderEntries(entries: readonly MenuEntry[], trigger: MenuTrigger) {
    return entries.map((entry, index) =>
      isMenuCommand(entry) ? (
        renderItem(entry, trigger)
      ) : (
        <MenuSeparator key={`separator-${index}`} />
      ),
    );
  }

  function renderPopup(
    trigger: MenuTrigger,
    popupId: string,
    triggerId: string,
  ) {
    const menus = shownMenus(trigger);
    const [onlyMenu] = menus;
    return (
      <div
        ref={popupRef}
        id={popupId}
        role="menu"
        tabIndex={-1}
        aria-labelledby={triggerId}
        className={styles.popup}
        onKeyDown={(event) => handlePopupKeyDown(event, trigger)}
      >
        {trigger.id !== MORE_MENUS
          ? renderEntries(onlyMenu.entries, trigger)
          : menus.map((menu) => (
              <div
                key={menu.id}
                role="group"
                aria-label={text[locale].menus[menu.id]}
                className={styles.group}
              >
                <div aria-hidden="true" className={styles.groupLabel}>
                  {text[locale].menus[menu.id]}
                </div>
                {renderEntries(menu.entries, trigger)}
              </div>
            ))}
      </div>
    );
  }

  function triggerLabel({ id }: MenuTrigger): ReactNode {
    if (id === MORE_MENUS) {
      return (
        <>
          <MenuIcon />
          <span className="visually-hidden">
            <LocaleText text={mapLocalized(text, (entry) => entry.more)} />
          </span>
        </>
      );
    }
    return <LocaleText text={mapLocalized(text, (entry) => entry.menus[id])} />;
  }

  const menuBarLabelId = `${baseId}-label`;

  return (
    <>
      <span id={menuBarLabelId} className="visually-hidden">
        <LocaleText text={mapLocalized(text, (entry) => entry.label)} />
      </span>
      <div
        ref={rootRef}
        role="menubar"
        aria-labelledby={menuBarLabelId}
        className={styles.menuBar}
        onBlur={handleBlur}
      >
        {triggers.map((trigger) => {
          const triggerId = `${baseId}-${trigger.id}`;
          const popupId = `${triggerId}-menu`;
          const open = openId === trigger.id;
          return (
            <div
              key={trigger.id}
              role="none"
              className={`${styles.entry} ${VISIBILITY_CLASS[trigger.visibility]}`}
            >
              <button
                ref={(element) => {
                  if (element) {
                    triggerRefs.current.set(trigger.id, element);
                  }
                  return () => {
                    triggerRefs.current.delete(trigger.id);
                  };
                }}
                id={triggerId}
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? popupId : undefined}
                tabIndex={isTabStop(trigger.id, focusedId) ? 0 : -1}
                className={styles.trigger}
                data-tour={trigger.id === "help" ? "help-menu" : undefined}
                onClick={() => (open ? setOpenId(null) : openMenu(trigger.id))}
                onKeyDown={(event) => handleTriggerKeyDown(event, trigger)}
                onFocus={() => setFocusedId(trigger.id)}
                onPointerEnter={() => {
                  if (openId !== null && !open) {
                    openMenu(trigger.id);
                  }
                }}
              >
                {triggerLabel(trigger)}
              </button>
              {open && renderPopup(trigger, popupId, triggerId)}
            </div>
          );
        })}
      </div>
    </>
  );
}
