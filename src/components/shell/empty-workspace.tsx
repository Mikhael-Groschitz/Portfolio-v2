import { pageTexts } from "@/components/locale/page-locale";
import styles from "./workspace.module.css";

export async function EmptyWorkspace() {
  const { about, shell } = await pageTexts();

  return (
    <div className={styles.empty}>
      <h1 className={styles.emptyTitle}>{`${about.name} · ${about.role}`}</h1>
      <p className={styles.emptyHint}>{shell.workspace.start}</p>
    </div>
  );
}
