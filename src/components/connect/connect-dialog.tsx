"use client";

import {
  type KeyboardEvent,
  type SubmitEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useGuide } from "@/components/cheatsheet/guide-context";
import { CloseIcon, PlugIcon, SpinnerIcon } from "@/components/icons";
import { useLanguage } from "@/components/locale/language-context";
import { LocaleText } from "@/components/locale/locale-text";
import { COMPACT_MEDIA_QUERY } from "@/components/shell/breakpoints";
import { useMediaQuery } from "@/components/shell/use-media-query";
import { useWorkspace } from "@/components/shell/workspace-context";
import { type Localized, mapLocalized } from "@/content/locales";
import type { ByProfile } from "@/content/profiles";
import type { ConnectText } from "@/content/types";
import {
  type ConnectFormValues,
  INITIAL_FORM_VALUES,
  connectionRecordOf,
  defaultParameters,
  languageFromParameters,
} from "./connect-form";
import { ConnectOptions } from "./connect-options";
import { ConnectionProperties } from "./connection-properties";
import {
  applyConnection,
  readStatusColor,
  storeConnection,
} from "./connection-runtime";
import { markConnecting } from "./connecting-store";
import { HelpPopover } from "./help-popover";
import { LoginFields } from "./login-fields";
import { ParametersField } from "./parameters-field";
import { useConnectionStatus } from "./use-connection-status";
import styles from "./connect-dialog.module.css";

const CONNECT_DELAY_MS = 600;

const FALLBACK_FOCUS = '[data-tour="new-query"]';

const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

function keepFocusInside(
  event: KeyboardEvent<HTMLElement>,
  container: HTMLElement,
) {
  const focusable = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE),
  ).filter((element) => element.getClientRects().length > 0);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

interface ConnectDialogProps {
  text: Localized<ConnectText>;
  login: Localized<ByProfile<string>>;
}

function focusedElement(): HTMLElement | null {
  if (typeof document === "undefined") {
    return null;
  }
  const element = document.activeElement;
  return element instanceof HTMLElement && element !== document.body
    ? element
    : null;
}

export function ConnectDialog(props: Readonly<ConnectDialogProps>) {
  const status = useConnectionStatus();
  if (status === "connected" || status === "disconnected") {
    return null;
  }
  return <ConnectWindow {...props} interactive={status === "pending"} />;
}

interface ConnectWindowProps extends ConnectDialogProps {
  interactive: boolean;
}

function ConnectWindow({
  text,
  login,
  interactive,
}: Readonly<ConnectWindowProps>) {
  const { locale, setLocale } = useLanguage();
  const { connect, cancelConnection } = useWorkspace();
  const { afterConnect } = useGuide();
  const compact = useMediaQuery(COMPACT_MEDIA_QUERY);
  const titleId = useId();
  const helpId = useId();
  const optionsId = useId();
  const [values, setValues] = useState<ConnectFormValues>(INITIAL_FORM_VALUES);
  const [expanded, setExpanded] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const connectRef = useRef<HTMLButtonElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const [opener] = useState(focusedElement);
  const timers = useRef(new Set<number>());

  useEffect(() => {
    if (interactive) {
      connectRef.current?.focus();
    }
  }, [interactive]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      markConnecting(false);
      for (const timer of pending) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  const buttons = mapLocalized(text, (entry) => entry.buttons);
  const current = text[locale];

  function cancel() {
    cancelConnection();
    requestAnimationFrame(() => {
      const target = opener?.isConnected
        ? opener
        : document.querySelector<HTMLElement>(FALLBACK_FOCUS);
      target?.focus();
    });
  }

  function finish(submitted: ConnectFormValues) {
    const record = connectionRecordOf(submitted);
    storeConnection(record);
    const language = languageFromParameters(
      submitted.parameters ?? defaultParameters(locale),
    );
    if (language !== null && language !== locale) {
      setLocale(language);
    }
    connect();
    applyConnection(record);
    markConnecting(false);
    afterConnect(record.profile);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (connecting) {
      return;
    }
    setConnecting(true);
    markConnecting(true);
    setHelpOpen(false);
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      finish(values);
    }, CONNECT_DELAY_MS);
    timers.current.add(timer);
  }

  function closeHelp() {
    setHelpOpen(false);
    helpButtonRef.current?.focus();
  }

  function toggleOptions() {
    setValues((previous) => ({
      ...previous,
      color: previous.color ?? readStatusColor(),
    }));
    setExpanded(!expanded);
  }

  function resetAll() {
    setValues({ ...INITIAL_FORM_VALUES, color: readStatusColor() });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (helpOpen) {
        closeHelp();
      } else if (!connecting) {
        cancel();
      }
    } else if (event.key === "Tab" && dialogRef.current) {
      keepFocusInside(event, dialogRef.current);
    }
  }

  const loginFields = (
    <LoginFields
      text={mapLocalized(text, (entry) => entry.login)}
      login={login}
      profile={values.profile}
      onProfileChange={(profile) => setValues({ ...values, profile })}
    />
  );

  return (
    <div className={styles.overlay} data-connect-overlay="">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.titleBar}>
          <PlugIcon />
          <h2 id={titleId} className={styles.title}>
            <LocaleText text={mapLocalized(text, (entry) => entry.title)} />
          </h2>
          <button
            type="button"
            className={styles.close}
            disabled={connecting}
            onClick={cancel}
          >
            <CloseIcon />
            <span className="visually-hidden">
              <LocaleText text={mapLocalized(text, (entry) => entry.close)} />
            </span>
          </button>
        </div>
        <p className={styles.banner}>
          <LocaleText text={mapLocalized(text, (entry) => entry.brand)} />
        </p>
        <form
          className={styles.form}
          autoComplete="off"
          noValidate
          onSubmit={handleSubmit}
        >
          <fieldset
            id={optionsId}
            className={styles.fields}
            disabled={connecting}
          >
            {expanded ? (
              <ConnectOptions
                stacked={compact}
                labels={current.tabs}
                panels={{
                  login: loginFields,
                  connectionProperties: (
                    <ConnectionProperties
                      text={current.properties}
                      values={values}
                      onChange={setValues}
                      onReset={resetAll}
                    />
                  ),
                  additionalParameters: (
                    <ParametersField
                      text={current.parameters}
                      value={values.parameters ?? defaultParameters(locale)}
                      onChange={(parameters) =>
                        setValues({ ...values, parameters })
                      }
                    />
                  ),
                }}
              />
            ) : (
              <div className={styles.panel}>{loginFields}</div>
            )}
          </fieldset>
          {helpOpen && (
            <HelpPopover id={helpId} text={current.help} onClose={closeHelp} />
          )}
          <p role="status" className="visually-hidden">
            {connecting && (
              <LocaleText text={mapLocalized(buttons, (b) => b.connecting)} />
            )}
          </p>
          <div className={styles.buttons}>
            <button
              ref={connectRef}
              type="submit"
              className={`${styles.button} ${styles.default}`}
              aria-disabled={connecting || undefined}
            >
              {connecting && <SpinnerIcon />}
              <LocaleText
                text={mapLocalized(buttons, (b) =>
                  connecting ? b.connecting : b.connect,
                )}
              />
            </button>
            <button
              type="button"
              className={styles.button}
              disabled={connecting}
              onClick={cancel}
            >
              <LocaleText text={mapLocalized(buttons, (b) => b.cancel)} />
            </button>
            <button
              ref={helpButtonRef}
              type="button"
              className={styles.button}
              aria-expanded={helpOpen}
              aria-controls={helpOpen ? helpId : undefined}
              disabled={connecting}
              onClick={() => setHelpOpen(!helpOpen)}
            >
              <LocaleText text={mapLocalized(buttons, (b) => b.help)} />
            </button>
            <button
              type="button"
              className={styles.button}
              aria-expanded={expanded}
              aria-controls={optionsId}
              disabled={connecting}
              onClick={toggleOptions}
            >
              <LocaleText text={mapLocalized(buttons, (b) => b.options)} />
              <span aria-hidden="true">{expanded ? "<<" : ">>"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
