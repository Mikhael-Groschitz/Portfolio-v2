import { AppIcon } from "@/components/icons";
import { LanguageToggle } from "@/components/locale/language-toggle";
import { nextLocale } from "@/components/locale/locale-runtime";
import { LocaleText } from "@/components/locale/locale-text";
import { localize } from "@/content";
import { byLocale } from "@/content/locales";
import { AccountButton } from "./account-button";
import { MenuBar } from "./menu-bar";
import { SearchBox } from "./search-box";
import { CONTENT_ID } from "./workspace";
import styles from "./title-bar.module.css";

export function TitleBar() {
  const languageNames = localize((texts) => texts.shell.languageName);

  return (
    <div className={styles.titleBar}>
      <a href={`#${CONTENT_ID}`} className={styles.skipLink}>
        <LocaleText text={localize((texts) => texts.shell.skipToContent)} />
      </a>
      <AppIcon size={20} className={styles.appIcon} />
      <MenuBar text={localize((texts) => texts.shell.menu)} />
      <SearchBox label={localize((texts) => texts.shell.search.label)} />
      <span className={styles.windowTitle}>
        <LocaleText text={localize((texts) => texts.shell.windowTitle)} />
      </span>
      <LanguageToggle
        labels={byLocale((locale) => languageNames[nextLocale(locale)])}
        className={styles.language}
      />
      <AccountButton text={localize((texts) => texts.shell.account)} />
    </div>
  );
}
