import { useSyncExternalStore } from "react";
import { readStorage, writeStorage } from "@/components/browser-storage";
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  type Preferences,
  REDUCED_MOTION_QUERY,
  applyPreferences,
  parsePreferences,
} from "./preferences-runtime";

let current: Preferences | null = null;
const listeners = new Set<() => void>();

function systemMotionQuery(): MediaQueryList {
  return window.matchMedia(REDUCED_MOTION_QUERY);
}

function systemReducesMotion(): boolean {
  return systemMotionQuery().matches;
}

export function readPreferences(): Preferences {
  current ??= parsePreferences(readStorage("local", PREFERENCES_STORAGE_KEY));
  return current;
}

export function savePreferences(next: Preferences): void {
  current = next;
  writeStorage("local", PREFERENCES_STORAGE_KEY, JSON.stringify(next));
  applyPreferences(next, systemReducesMotion());
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function serverPreferences(): Preferences {
  return DEFAULT_PREFERENCES;
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, readPreferences, serverPreferences);
}

function subscribeToSystemMotion(listener: () => void): () => void {
  const query = systemMotionQuery();
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

export function useSystemReducesMotion(): boolean {
  return useSyncExternalStore(
    subscribeToSystemMotion,
    systemReducesMotion,
    () => false,
  );
}

export function watchSystemMotion(): () => void {
  return subscribeToSystemMotion(() =>
    applyPreferences(readPreferences(), systemReducesMotion()),
  );
}
