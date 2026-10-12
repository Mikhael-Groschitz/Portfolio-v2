import {
  type KeyboardEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from "react";
import { arrowTarget } from "@/components/interaction";
import styles from "./connect-dialog.module.css";

const OPTION_TABS = [
  "login",
  "connectionProperties",
  "additionalParameters",
] as const;

type OptionsTab = (typeof OPTION_TABS)[number];

interface ConnectOptionsProps {
  stacked: boolean;
  labels: Record<OptionsTab, string>;
  panels: Record<OptionsTab, ReactNode>;
}

export function ConnectOptions({
  stacked,
  labels,
  panels,
}: Readonly<ConnectOptionsProps>) {
  const baseId = useId();
  const [active, setActive] = useState<OptionsTab>("login");
  const tabRefs = useRef(new Map<OptionsTab, HTMLButtonElement>());

  if (stacked) {
    return OPTION_TABS.map((tab) => (
      <section
        key={tab}
        className={styles.section}
        aria-labelledby={`${baseId}-${tab}-title`}
      >
        <h3 id={`${baseId}-${tab}-title`} className={styles.sectionTitle}>
          {labels[tab]}
        </h3>
        <div className={styles.panel}>{panels[tab]}</div>
      </section>
    ));
  }

  function select(tab: OptionsTab) {
    setActive(tab);
    tabRefs.current.get(tab)?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = arrowTarget(
      event.key,
      OPTION_TABS.indexOf(active),
      OPTION_TABS.length,
      "horizontal",
    );
    if (target === undefined) {
      return;
    }
    event.preventDefault();
    select(OPTION_TABS[target]);
  }

  return (
    <>
      <div role="tablist" className={styles.tabs} onKeyDown={handleKeyDown}>
        {OPTION_TABS.map((tab) => (
          <button
            key={tab}
            ref={(element) => {
              if (element) {
                tabRefs.current.set(tab, element);
              }
              return () => {
                tabRefs.current.delete(tab);
              };
            }}
            id={`${baseId}-${tab}-tab`}
            type="button"
            role="tab"
            aria-selected={active === tab}
            aria-controls={`${baseId}-${tab}-panel`}
            tabIndex={active === tab ? 0 : -1}
            className={styles.tab}
            onClick={() => setActive(tab)}
          >
            {labels[tab]}
          </button>
        ))}
      </div>
      {OPTION_TABS.map((tab) => (
        <div
          key={tab}
          id={`${baseId}-${tab}-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-${tab}-tab`}
          hidden={active !== tab}
          className={styles.tabPanel}
        >
          {panels[tab]}
        </div>
      ))}
    </>
  );
}
