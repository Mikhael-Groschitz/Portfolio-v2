import { useId } from "react";
import {
  type ByProfile,
  PROFILES,
  type Profile,
  isProfile,
} from "@/content/profiles";
import type { ConnectText } from "@/content/types";
import { SERVER } from "@/engine/catalog";
import { DisabledCheckRow, FieldRow } from "./field-row";
import styles from "./connect-dialog.module.css";

const MASKED_PASSWORD = "••••••••";

type LoginText = ConnectText["login"];

interface LoginFieldsProps {
  text: LoginText;
  login: ByProfile<string>;
  profile: Profile;
  onProfileChange: (profile: Profile) => void;
}

export function LoginFields({
  text,
  login,
  profile,
  onProfileChange,
}: Readonly<LoginFieldsProps>) {
  const id = useId();

  return (
    <>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>{text.server}</legend>
        <FieldRow label={text.serverType} labelId={`${id}-type`} disabled>
          <select
            className={styles.input}
            aria-labelledby={`${id}-type`}
            defaultValue="engine"
            disabled
          >
            <option value="engine">{text.serverTypeValue}</option>
          </select>
        </FieldRow>
        <FieldRow label={text.serverName} labelId={`${id}-name`}>
          <input
            className={styles.input}
            aria-labelledby={`${id}-name`}
            value={SERVER.name}
            autoComplete="off"
            readOnly
          />
        </FieldRow>
        <FieldRow label={text.authentication} labelId={`${id}-authentication`}>
          <select
            className={styles.input}
            aria-labelledby={`${id}-authentication`}
            value={profile}
            onChange={(event) => {
              if (isProfile(event.target.value)) {
                onProfileChange(event.target.value);
              }
            }}
          >
            {PROFILES.map((option) => (
              <option key={option} value={option}>
                {text.profiles[option]}
              </option>
            ))}
          </select>
        </FieldRow>
        <FieldRow label={text.userName} labelId={`${id}-user`} indent disabled>
          <input
            className={styles.input}
            aria-labelledby={`${id}-user`}
            value={login[profile]}
            disabled
          />
        </FieldRow>
        <FieldRow
          label={text.password}
          labelId={`${id}-password`}
          indent
          disabled
        >
          <input
            className={styles.input}
            aria-labelledby={`${id}-password`}
            value={MASKED_PASSWORD}
            disabled
          />
        </FieldRow>
        <DisabledCheckRow label={text.rememberPassword} />
      </fieldset>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>{text.security}</legend>
        <FieldRow label={text.encryption} labelId={`${id}-encryption`} disabled>
          <select
            className={styles.input}
            aria-labelledby={`${id}-encryption`}
            defaultValue="optional"
            disabled
          >
            <option value="optional">{text.encryptionValue}</option>
          </select>
        </FieldRow>
        <DisabledCheckRow label={text.trustCertificate} />
        <FieldRow label={text.hostName} labelId={`${id}-host`} disabled>
          <input
            className={styles.input}
            aria-labelledby={`${id}-host`}
            disabled
          />
        </FieldRow>
      </fieldset>
    </>
  );
}
