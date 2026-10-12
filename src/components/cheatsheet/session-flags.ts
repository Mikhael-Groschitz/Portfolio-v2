import {
  readStorage,
  removeStorage,
  writeStorage,
} from "@/components/browser-storage";

export type SessionFlag =
  "tour-due" | "tour-seen" | "workspace-started" | "cheatsheet-placed";

const remembered = new Set<SessionFlag>();
const listeners = new Set<() => void>();

export function readFlag(
  flag: SessionFlag,
  storage?: Pick<Storage, "getItem">,
): boolean {
  if (remembered.has(flag)) {
    return true;
  }
  return readStorage("session", flag, storage) === "1";
}

export function setFlag(
  flag: SessionFlag,
  storage?: Pick<Storage, "setItem">,
): boolean {
  remembered.add(flag);
  const persisted = writeStorage("session", flag, "1", storage);
  for (const listener of listeners) {
    listener();
  }
  return persisted;
}

export function clearFlag(
  flag: SessionFlag,
  storage?: Pick<Storage, "removeItem">,
): boolean {
  remembered.delete(flag);
  const forgotten = removeStorage("session", flag, storage);
  for (const listener of listeners) {
    listener();
  }
  return forgotten;
}

export function subscribeToFlags(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
