import { writeStorage } from "@/components/browser-storage";
import { PROFILES, type Profile } from "@/content/profiles";
import { type Ink, hexFromRgb } from "@/theme/contrast";

export const CONNECTION_STORAGE_KEY = "connection";
export const CONNECTION_ATTRIBUTE = "data-connection";
export const PROFILE_ATTRIBUTE = "data-profile";

const STATUS_BACKGROUND = "--status-connected";
const STATUS_TEXT = "--text-on-status";
const LIGHT_INK = "var(--text-on-selection)";

export type ConnectionStatus =
  "unknown" | "pending" | "connected" | "disconnected";

export type SettledStatus = Exclude<ConnectionStatus, "unknown">;

const DISCONNECTED: SettledStatus = "disconnected";

interface StatusColors {
  background: string;
  ink: Ink;
}

export interface ConnectionRecord {
  profile: Profile;
  colors: StatusColors | null;
}

type ConnectionRoot = Pick<HTMLElement, "getAttribute" | "setAttribute"> & {
  style: Pick<CSSStyleDeclaration, "setProperty" | "removeProperty">;
};

const json = JSON.stringify;

export const CONNECTION_SCRIPT = `(function(){var root=document.documentElement;var record=null;try{record=JSON.parse(sessionStorage.getItem(${json(CONNECTION_STORAGE_KEY)}))}catch(error){}if(record&&record.status===${json(DISCONNECTED)}){root.setAttribute(${json(CONNECTION_ATTRIBUTE)},${json(DISCONNECTED)})}else if(record&&${json(PROFILES)}.indexOf(record.profile)!==-1){root.setAttribute(${json(CONNECTION_ATTRIBUTE)},"connected");root.setAttribute(${json(PROFILE_ATTRIBUTE)},record.profile);var colors=record.colors;if(colors&&typeof colors.background==="string"&&/^#[0-9a-f]{6}$/i.test(colors.background)&&(colors.ink==="dark"||colors.ink==="light")){root.style.setProperty(${json(STATUS_BACKGROUND)},colors.background);if(colors.ink==="light"){root.style.setProperty(${json(STATUS_TEXT)},${json(LIGHT_INK)})}}}else{root.setAttribute(${json(CONNECTION_ATTRIBUTE)},"pending")}})()`;

export function storeConnection(
  record: ConnectionRecord,
  storage?: Pick<Storage, "setItem">,
): boolean {
  return writeStorage(
    "session",
    CONNECTION_STORAGE_KEY,
    JSON.stringify(record),
    storage,
  );
}

export function storeDisconnected(storage?: Pick<Storage, "setItem">): boolean {
  return writeStorage(
    "session",
    CONNECTION_STORAGE_KEY,
    JSON.stringify({ status: DISCONNECTED }),
    storage,
  );
}

export function applyStatus(
  status: SettledStatus,
  root: Pick<HTMLElement, "setAttribute"> = document.documentElement,
): void {
  root.setAttribute(CONNECTION_ATTRIBUTE, status);
}

export function applyConnection(
  record: ConnectionRecord,
  root: ConnectionRoot = document.documentElement,
): void {
  if (record.colors) {
    root.style.setProperty(STATUS_BACKGROUND, record.colors.background);
  } else {
    root.style.removeProperty(STATUS_BACKGROUND);
  }
  if (record.colors?.ink === "light") {
    root.style.setProperty(STATUS_TEXT, LIGHT_INK);
  } else {
    root.style.removeProperty(STATUS_TEXT);
  }
  root.setAttribute(PROFILE_ATTRIBUTE, record.profile);
  root.setAttribute(CONNECTION_ATTRIBUTE, "connected");
}

export function readConnectionStatus(
  root: Pick<HTMLElement, "getAttribute"> = document.documentElement,
): ConnectionStatus {
  const status = root.getAttribute(CONNECTION_ATTRIBUTE);
  return status === "pending" ||
    status === "connected" ||
    status === DISCONNECTED
    ? status
    : "unknown";
}

export function readStatusColor(): string | null {
  const probe = document.createElement("span");
  probe.hidden = true;
  probe.style.color = `var(${STATUS_BACKGROUND})`;
  document.body.append(probe);
  const color = hexFromRgb(getComputedStyle(probe).color);
  probe.remove();
  return color;
}

export function subscribeToConnection(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [CONNECTION_ATTRIBUTE],
  });
  return () => observer.disconnect();
}
