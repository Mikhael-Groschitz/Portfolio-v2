import { LocaleText } from "@/components/locale/locale-text";
import { EXPLORER_TITLE_ID } from "@/components/shell/element-ids";
import { localize } from "@/content";
import { mapLocalized } from "@/content/locales";
import { ExplorerControls } from "./explorer-controls";
import { explorerNodes } from "./explorer-nodes";
import { ExplorerToolbar } from "./explorer-toolbar";
import { ObjectExplorerTree } from "./object-explorer-tree";
import styles from "./object-explorer.module.css";

export function ObjectExplorer() {
  const text = localize((texts) => texts.shell.explorer);
  const controls = localize((texts) => ({
    ...texts.shell.window,
    move: texts.shell.explorer.move,
    close: texts.shell.explorer.close,
  }));

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 id={EXPLORER_TITLE_ID} className={styles.title}>
          <LocaleText text={mapLocalized(text, (explorer) => explorer.title)} />
        </h2>
        <ExplorerControls text={controls} />
      </div>
      <ExplorerToolbar
        connectLabel={mapLocalized(text, (explorer) => explorer.connect)}
        disconnectLabel={mapLocalized(text, (explorer) => explorer.disconnect)}
      />
      <div className={styles.treeScroll}>
        <ObjectExplorerTree
          nodes={explorerNodes()}
          labelledBy={EXPLORER_TITLE_ID}
        />
      </div>
    </div>
  );
}
