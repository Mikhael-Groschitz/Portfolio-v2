import type { ReactNode } from "react";
import styles from "./menu.module.css";

export type MenuItemRole = "menuitem" | "menuitemradio" | "menuitemcheckbox";

interface MenuItemProps {
  label: ReactNode;
  role?: MenuItemRole;
  checked?: boolean;
  disabled?: boolean;
  shortcut?: string;
  keyShortcuts?: string;
  href?: string;
  newTabLabel?: string;
  data?: Record<`data-${string}`, string>;
  onClick: () => void;
}

export function menuItemsIn(container: HTMLElement | null): HTMLElement[] {
  return Array.from(
    container?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [],
  );
}

export function MenuSeparator() {
  return <hr className={styles.separator} />;
}

export function MenuItem({
  label,
  role = "menuitem",
  checked,
  disabled,
  shortcut,
  keyShortcuts,
  href,
  newTabLabel,
  data,
  onClick,
}: Readonly<MenuItemProps>) {
  const common = {
    role,
    tabIndex: -1,
    className: styles.item,
    "aria-checked": role === "menuitem" ? undefined : Boolean(checked),
    "aria-disabled": disabled || undefined,
    "aria-keyshortcuts": keyShortcuts,
    ...data,
  };
  const content = (
    <>
      <span className={styles.itemLabel}>{label}</span>
      {shortcut && <span className={styles.shortcut}>{shortcut}</span>}
    </>
  );
  if (href) {
    return (
      <a
        {...common}
        href={href}
        {...(newTabLabel && {
          target: "_blank",
          rel: "noopener noreferrer",
        })}
        onClick={onClick}
      >
        {content}
        {newTabLabel && (
          <span className="visually-hidden"> ({newTabLabel})</span>
        )}
      </a>
    );
  }
  return (
    <button {...common} type="button" onClick={onClick}>
      {content}
    </button>
  );
}
