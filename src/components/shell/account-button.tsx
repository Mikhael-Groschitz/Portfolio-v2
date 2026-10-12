"use client";

import { ProfileText } from "@/components/connect/profile-text";
import { CaretDownIcon, ProfileIcon, SignInIcon } from "@/components/icons";
import { useLanguage } from "@/components/locale/language-context";
import { LocaleText } from "@/components/locale/locale-text";
import { MenuButton } from "@/components/menu/menu-button";
import { type Localized, mapLocalized } from "@/content/locales";
import { byProfile } from "@/content/profiles";
import type { AccountText } from "@/content/types";
import { useWorkspace } from "./workspace-context";
import styles from "./title-bar.module.css";

export function AccountButton({
  text,
}: Readonly<{ text: Localized<AccountText> }>) {
  const { requestConnection, disconnect } = useWorkspace();
  const { locale } = useLanguage();
  const labels = text[locale];
  const profileName = byProfile((profile) =>
    mapLocalized(text, (entry) => entry.profiles[profile]),
  );

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
        <span className={styles.cornerLabel}>
          <LocaleText text={mapLocalized(text, (entry) => entry.signIn)} />
        </span>
      </button>
      <span className={styles.profileMenu}>
        <MenuButton
          label={
            <>
              <LocaleText text={mapLocalized(text, (entry) => entry.label)} />
              {": "}
              <ProfileText text={profileName} />
            </>
          }
          className={styles.corner}
          triggerData={{ "data-profile-menu": "" }}
          items={() => [
            {
              key: "switch",
              label: labels.switchProfile,
              onSelect: () => requestConnection(),
            },
            {
              key: "disconnect",
              label: labels.disconnect,
              onSelect: disconnect,
            },
          ]}
        >
          <ProfileIcon />
          <span className={styles.cornerLabel} aria-hidden="true">
            <ProfileText text={profileName} />
          </span>
          <CaretDownIcon />
        </MenuButton>
      </span>
    </div>
  );
}
