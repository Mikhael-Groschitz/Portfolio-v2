import { AppIcon } from "@/components/icons";
import { LanguageToggle } from "@/components/locale/language-toggle";
import { nextLocale } from "@/components/locale/locale-routing";
import { pageLocale } from "@/components/locale/page-locale";
import { getTexts } from "@/content";
import { AccountButton } from "./account-button";
import { MenuBar } from "./menu-bar";
import { SearchBox } from "./search-box";
import { CONTENT_ID } from "./workspace";
import styles from "./title-bar.module.css";

export async function TitleBar() {
  const locale = await pageLocale();
  const { shell } = getTexts(locale);

  return (
    <div className={styles.titleBar}>
      <a href={`#${CONTENT_ID}`} className={styles.skipLink}>
        {shell.skipToContent}
      </a>
      <AppIcon size={20} className={styles.appIcon} />
      <MenuBar text={shell.menu} />
      <SearchBox label={shell.search.label} />
      <span className={styles.windowTitle}>{shell.windowTitle}</span>
      <LanguageToggle
        label={getTexts(nextLocale(locale)).shell.languageName}
        className={styles.language}
      />
      <AccountButton text={shell.account} />
    </div>
  );
}
