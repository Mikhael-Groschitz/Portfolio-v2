import type { ReactNode } from "react";
import { DocumentPanel } from "@/components/editor/document-panel";
import { DocumentTabs } from "@/components/editor/document-tabs";
import { EditorBar } from "@/components/editor/editor-bar";
import { LocaleText } from "@/components/locale/locale-text";
import { ResultsPanel } from "@/components/results/results-panel";
import { localize } from "@/content";
import { mapLocalized } from "@/content/locales";
import { ConnectionBar } from "./connection-bar";
import { PageHeading } from "./page-heading";
import styles from "./workspace.module.css";

export const CONTENT_ID = "content";

export function Workspace({ children }: Readonly<{ children: ReactNode }>) {
  const results = localize((texts) => texts.shell.results);

  return (
    <main id={CONTENT_ID} tabIndex={-1} className={styles.document}>
      <noscript>
        <p className={styles.noScript}>
          <LocaleText
            text={localize((texts) => texts.shell.workspace.noScript)}
          />
        </p>
      </noscript>
      <PageHeading
        headings={localize((texts) => ({
          sections: texts.sections,
          query: texts.shell.query.editorLabel,
        }))}
      />
      <DocumentTabs
        label={localize((texts) => texts.shell.editor.tabsLabel)}
        openTabsLabel={localize((texts) => texts.shell.editor.openTabs)}
      />
      <DocumentPanel>
        {children}
        <EditorBar text={localize((texts) => texts.shell.editor)} />
        <ResultsPanel
          labels={{
            heading: mapLocalized(results, (text) => text.heading),
            results: mapLocalized(results, (text) => text.results),
            messages: mapLocalized(results, (text) => text.messages),
          }}
          text={results}
        />
      </DocumentPanel>
      <ConnectionBar text={localize((texts) => texts.shell.connection)} />
    </main>
  );
}
