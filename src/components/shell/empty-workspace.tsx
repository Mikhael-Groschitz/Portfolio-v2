import { commandLabel } from "@/components/commands/command-model";
import { InputAware } from "@/components/input-variants";
import { pageTexts } from "@/components/locale/page-locale";
import { withLabels } from "@/content";
import { ExplorerToggle } from "./explorer-toggle";
import styles from "./workspace.module.css";

export async function EmptyWorkspace() {
  const { about, shell } = await pageTexts();

  return (
    <div className={styles.empty}>
      <h1 className={styles.emptyTitle}>{`${about.name} · ${about.role}`}</h1>
      <p className={styles.emptyHint}>
        <InputAware text={withLabels(shell.workspace.start, shell.commands)} />
      </p>
      <div data-input="touch">
        <ExplorerToggle
          label={commandLabel(shell.commands.objectExplorer)}
          className={styles.emptyExplorer}
        />
      </div>
    </div>
  );
}
