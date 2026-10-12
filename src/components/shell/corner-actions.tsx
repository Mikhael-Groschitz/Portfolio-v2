"use client";

import { CaretDownIcon, FeedbackIcon, ShareIcon } from "@/components/icons";
import { useLanguage } from "@/components/locale/language-context";
import { LocaleText } from "@/components/locale/locale-text";
import { MenuButton } from "@/components/menu/menu-button";
import { CommandButton } from "@/components/toolbar/command-button";
import toolbar from "@/components/toolbar/toolbar.module.css";
import { getTexts } from "@/content";
import { type Localized, mapLocalized } from "@/content/locales";
import type { CornerText } from "@/content/types";
import styles from "./toolbar.module.css";

const WEB_URL = /^https?:\/\//;

export function CornerActions({
  text,
}: Readonly<{ text: Localized<CornerText> }>) {
  const { locale } = useLanguage();
  const texts = getTexts(locale);

  return (
    <div className={styles.corner}>
      <div className={styles.group}>
        <CommandButton
          command="contact"
          icon={<FeedbackIcon />}
          labelMode="hidden"
          data={{ "data-contact": "" }}
        />
        <MenuButton
          label={
            <LocaleText text={mapLocalized(text, (entry) => entry.channels)} />
          }
          className={`${toolbar.button} ${styles.split}`}
          triggerData={{ "data-contact-channels": "" }}
          items={() =>
            texts.contact.channels.map((channel) => ({
              key: channel.channel,
              label: `${channel.channel}: ${channel.value}`,
              href: channel.url,
              newTabLabel: WEB_URL.test(channel.url)
                ? texts.shell.results.opensInNewTab
                : undefined,
            }))
          }
        >
          <CaretDownIcon />
        </MenuButton>
      </div>
      <div className={styles.group}>
        <CommandButton
          command="share"
          icon={<ShareIcon />}
          labelMode="hidden"
          data={{ "data-share": "" }}
        />
      </div>
    </div>
  );
}
