"use client";

import { ProfileText } from "@/components/connect/profile-text";
import { CaretDownIcon, ProfileIcon, SignInIcon } from "@/components/icons";
import { MenuButton } from "@/components/menu/menu-button";
import type { AccountText } from "@/content/types";
import { useWorkspace } from "./workspace-context";
import styles from "./title-bar.module.css";

export function AccountButton({ text }: Readonly<{ text: AccountText }>) {
  const { requestConnection, disconnect } = useWorkspace();

  return (
    <div className={styles.account}>
      <button
        type="button"
        className={`${styles.corner} ${styles.signIn}`}
        data-sign-in=""
        data-tip=""
        onClick={() => requestConnection()}
      >
        <SignInIcon />
        <span className={styles.cornerLabel}>{text.signIn}</span>
      </button>
      <span className={styles.profileMenu}>
        <MenuButton
          label={
            <>
              {text.label}
              {": "}
              <ProfileText text={text.profiles} />
            </>
          }
          className={styles.corner}
          triggerData={{ "data-profile-menu": "" }}
          items={() => [
            {
              key: "switch",
              label: text.switchProfile,
              onSelect: () => requestConnection(),
            },
            {
              key: "disconnect",
              label: text.disconnect,
              onSelect: disconnect,
            },
          ]}
        >
          <ProfileIcon />
          <span className={styles.cornerLabel} aria-hidden="true">
            <ProfileText text={text.profiles} />
          </span>
          <CaretDownIcon />
        </MenuButton>
      </span>
    </div>
  );
}
