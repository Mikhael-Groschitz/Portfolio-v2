import { pageTexts } from "@/components/locale/page-locale";
import { CornerActions } from "./corner-actions";
import { EditorToolbar } from "./editor-toolbar";
import { QuickAccess } from "./quick-access";
import { StandardToolbar } from "./standard-toolbar";
import styles from "./toolbar.module.css";

export async function Toolbar() {
  const { shell } = await pageTexts();

  return (
    <div className={styles.toolbars}>
      <StandardToolbar />
      <CornerActions text={shell.corner} />
      <EditorToolbar />
      <QuickAccess />
    </div>
  );
}
