import { Fragment } from "react";
import type { ResultsText } from "@/content/types";
import type { ExecutionOutcome } from "@/engine/execute";
import { type RunTiming, messageBlocks } from "./messages";
import styles from "./results.module.css";

interface MessagesPaneProps {
  outcome: ExecutionOutcome;
  text: ResultsText;
  timing: RunTiming;
}

export function MessagesPane({
  outcome,
  text,
  timing,
}: Readonly<MessagesPaneProps>) {
  const blocks = messageBlocks(outcome, text, timing);

  return (
    <pre className={styles.messages}>
      {blocks.map((block, index) => (
        <Fragment key={index}>
          {index > 0 && "\n\n"}
          {block.error && <span className={styles.error}>{block.error}</span>}
          {block.text}
        </Fragment>
      ))}
    </pre>
  );
}
