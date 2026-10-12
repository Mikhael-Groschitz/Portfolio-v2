import type { ReactNode } from "react";
import { DocumentPanel } from "@/components/editor/document-panel";
import { DocumentTabs } from "@/components/editor/document-tabs";
import { EditorBar } from "@/components/editor/editor-bar";
import { pageTexts } from "@/components/locale/page-locale";
import { ResultsPanel } from "@/components/results/results-panel";
import { ConnectionBar } from "./connection-bar";
import { PageHeading } from "./page-heading";
import styles from "./workspace.module.css";

export const CONTENT_ID = "content";

export async function Workspace({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { sections, shell } = await pageTexts();
  const { results } = shell;

  return (
    <main id={CONTENT_ID} tabIndex={-1} className={styles.document}>
      <noscript>
        <p className={styles.noScript}>{shell.workspace.noScript}</p>
      </noscript>
      <PageHeading headings={{ sections, query: shell.query.editorLabel }} />
      <DocumentTabs
        label={shell.editor.tabsLabel}
        openTabsLabel={shell.editor.openTabs}
      />
      <DocumentPanel>
        {children}
        <EditorBar text={shell.editor} />
        <ResultsPanel
          labels={{
            heading: results.heading,
            results: results.results,
            messages: results.messages,
          }}
          text={results}
        />
      </DocumentPanel>
      <ConnectionBar text={shell.connection} />
    </main>
  );
}
