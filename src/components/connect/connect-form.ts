import { matchLocale } from "@/components/locale/locale-routing";
import type { Locale } from "@/content/locales";
import { DEFAULT_PROFILE, type Profile } from "@/content/profiles";
import { isHexColor, readableInk } from "@/theme/contrast";
import type { ConnectionRecord } from "./connection-runtime";

export interface ConnectFormValues {
  profile: Profile;
  useCustomColor: boolean;
  color: string | null;
  parameters: string | null;
}

export const INITIAL_FORM_VALUES: ConnectFormValues = {
  profile: DEFAULT_PROFILE,
  useCustomColor: false,
  color: null,
  parameters: null,
};

const LANGUAGE_KEY = "language";

export function defaultParameters(locale: Locale): string {
  return `Language=${locale}`;
}

export function languageFromParameters(parameters: string): Locale | null {
  for (const entry of parameters.split(/[;\r\n]+/)) {
    const separator = entry.indexOf("=");
    const key = entry.slice(0, Math.max(separator, 0)).trim().toLowerCase();
    if (key === LANGUAGE_KEY) {
      return matchLocale(entry.slice(separator + 1));
    }
  }
  return null;
}

export function connectionRecordOf(
  values: ConnectFormValues,
): ConnectionRecord {
  const background =
    values.useCustomColor && values.color !== null && isHexColor(values.color)
      ? values.color.toLowerCase()
      : null;
  return {
    profile: values.profile,
    colors:
      background === null ? null : { background, ink: readableInk(background) },
  };
}
