import { pageLocale } from "@/components/locale/page-locale";
import { EXPLORER_TITLE_ID } from "@/components/shell/element-ids";
import { getTexts } from "@/content";
import { ExplorerControls } from "./explorer-controls";
import { explorerNodes } from "./explorer-nodes";
import { ExplorerToolbar } from "./explorer-toolbar";
import { ObjectExplorerTree } from "./object-explorer-tree";
import styles from "./object-explorer.module.css";

export async function ObjectExplorer() {
  const locale = await pageLocale();
  const { explorer, window } = getTexts(locale).shell;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 id={EXPLORER_TITLE_ID} className={styles.title}>
          {explorer.title}
        </h2>
        <ExplorerControls
          text={{ ...window, move: explorer.move, close: explorer.close }}
        />
      </div>
      <p className={styles.hint}>{explorer.hint}</p>
      <ExplorerToolbar
        connectLabel={explorer.connect}
        disconnectLabel={explorer.disconnect}
      />
      <div className={styles.treeScroll}>
        <ObjectExplorerTree
          nodes={explorerNodes(locale)}
          labelledBy={EXPLORER_TITLE_ID}
        />
      </div>
    </div>
  );
}
