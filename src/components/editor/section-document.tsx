import { LocaleBlocks } from "@/components/locale/locale-text";
import { documentTabId } from "@/components/shell/element-ids";
import type { SectionId } from "@/content/types";
import type { CodeToken } from "./highlight";
import { scriptLines } from "./section-scripts";
import styles from "./editor.module.css";

function ScriptView({
  section,
  lines,
}: Readonly<{ section: SectionId; lines: readonly CodeToken[][] }>) {
  return (
    <section
      tabIndex={0}
      aria-labelledby={documentTabId(section)}
      data-editor=""
      className={styles.editor}
    >
      <pre className={styles.code}>
        <code>
          {lines.map((line, index) => (
            <span
              key={index}
              className={
                index === 0
                  ? `${styles.line} ${styles.currentLine}`
                  : styles.line
              }
            >
              <span className={styles.lineNumber} aria-hidden="true">
                {index + 1}
              </span>
              <span className={styles.lineText}>
                {line.map((token, position) => (
                  <span
                    key={position}
                    style={token.color ? { color: token.color } : undefined}
                  >
                    {token.content}
                  </span>
                ))}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </section>
  );
}

export function SectionDocument({ section }: Readonly<{ section: SectionId }>) {
  return (
    <LocaleBlocks>
      {(locale) => (
        <ScriptView section={section} lines={scriptLines(section, locale)} />
      )}
    </LocaleBlocks>
  );
}
