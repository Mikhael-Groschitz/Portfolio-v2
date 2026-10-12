import { localize } from "@/content";
import { CornerActions } from "./corner-actions";
import { EditorToolbar } from "./editor-toolbar";
import { StandardToolbar } from "./standard-toolbar";
import styles from "./toolbar.module.css";

export function Toolbar() {
  return (
    <div className={styles.toolbars}>
      <StandardToolbar />
      <CornerActions text={localize((texts) => texts.shell.corner)} />
      <EditorToolbar />
    </div>
  );
}
