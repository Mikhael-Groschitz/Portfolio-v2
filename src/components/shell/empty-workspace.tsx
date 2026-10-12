import { LocaleText } from "@/components/locale/locale-text";
import { localize } from "@/content";
import styles from "./workspace.module.css";

export function EmptyWorkspace() {
  return (
    <div className={styles.empty}>
      <h1 className={styles.emptyTitle}>
        <LocaleText
          text={localize(
            (texts) => `${texts.about.name} · ${texts.about.role}`,
          )}
        />
      </h1>
      <p className={styles.emptyHint}>
        <LocaleText text={localize((texts) => texts.shell.workspace.start)} />
      </p>
    </div>
  );
}
