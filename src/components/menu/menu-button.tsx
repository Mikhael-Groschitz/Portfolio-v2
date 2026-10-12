"use client";

import {
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { arrowTarget, useOutsidePointerDown } from "@/components/interaction";
import {
  MenuItem,
  type MenuItemRole,
  MenuSeparator,
  menuItemsIn,
} from "./menu-item";
import styles from "./menu.module.css";

export interface PopupMenuItem {
  key: string;
  label: ReactNode;
  role?: MenuItemRole;
  checked?: boolean;
  disabled?: boolean;
  href?: string;
  newTabLabel?: string;
  shortcut?: string;
  separatorBefore?: boolean;
  onSelect?: () => void;
}

interface MenuButtonProps {
  label: ReactNode;
  items: () => readonly PopupMenuItem[];
  children: ReactNode;
  className: string;
  shortcut?: string;
  disabled?: boolean;
  triggerData?: Record<`data-${string}`, string>;
}

const MARGIN = 4;
const GAP = 3;

function placeMenu(menu: HTMLElement, trigger: DOMRect) {
  const width = menu.offsetWidth;
  const height = menu.offsetHeight;
  const left = Math.min(
    Math.max(trigger.right - width, MARGIN),
    window.innerWidth - width - MARGIN,
  );
  const below = trigger.bottom + GAP;
  const top =
    below + height > window.innerHeight - MARGIN && trigger.top > height + GAP
      ? trigger.top - GAP - height
      : below;
  menu.style.left = `${Math.max(left, MARGIN)}px`;
  menu.style.top = `${Math.max(top, MARGIN)}px`;
}

export function MenuButton({
  label,
  items,
  children,
  className,
  shortcut,
  disabled,
  triggerData,
}: Readonly<MenuButtonProps>) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const menuId = useId();

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const trigger = buttonRef.current?.getBoundingClientRect();
    if (open && menu && trigger) {
      placeMenu(menu, trigger);
    }
  }, [open]);

  useOutsidePointerDown(wrapperRef, open, () => setOpen(false));

  useEffect(() => {
    if (!open) {
      return;
    }
    const entries = menuItemsIn(menuRef.current);
    const checked = entries.find(
      (entry) => entry.getAttribute("aria-checked") === "true",
    );
    (checked ?? entries[0])?.focus();
    function closeOnResize() {
      setOpen(false);
    }
    window.addEventListener("resize", closeOnResize);
    return () => window.removeEventListener("resize", closeOnResize);
  }, [open]);

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) {
      buttonRef.current?.focus();
    }
  }

  function choose(item: PopupMenuItem) {
    if (item.disabled) {
      return;
    }
    item.onSelect?.();
    const focused = document.activeElement;
    const lost =
      focused === null ||
      focused === document.body ||
      (menuRef.current?.contains(focused) ?? false);
    close(lost);
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const entries = menuItemsIn(menuRef.current);
    const index = entries.findIndex(
      (entry) => entry === document.activeElement,
    );
    const target = arrowTarget(event.key, index, entries.length, "vertical");
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    } else if (event.key === "Tab") {
      setOpen(false);
    } else if (target !== undefined) {
      event.preventDefault();
      entries[target]?.focus();
    }
  }

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <span id={labelId} className="visually-hidden">
        {label}
      </span>
      <button
        ref={buttonRef}
        type="button"
        className={className}
        aria-labelledby={labelId}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-keyshortcuts={shortcut}
        disabled={disabled}
        data-tip=""
        {...triggerData}
        onClick={() => (open ? close(true) : setOpen(true))}
        onKeyDown={(event) => {
          if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {children}
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-labelledby={labelId}
          className={styles.menu}
          onKeyDown={handleMenuKeyDown}
        >
          {items().map((item) => (
            <Fragment key={item.key}>
              {item.separatorBefore && <MenuSeparator />}
              <MenuItem
                label={item.label}
                role={item.role}
                checked={item.checked}
                disabled={item.disabled}
                shortcut={item.shortcut}
                href={item.href}
                newTabLabel={item.newTabLabel}
                onClick={() => (item.href ? close(false) : choose(item))}
              />
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
